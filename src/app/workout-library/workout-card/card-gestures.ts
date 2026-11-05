import { Signal, signal } from '@angular/core';
import { project, rubberband, VelocityTracker } from '../../shared/gesture';
import { criticallyDampedSpring } from '../../shared/spring';

/**
 * How long a press is held, still, before the card lifts. The library's drop list waits as
 * long before it lets a drag start, so a swipe or a scroll before then stays one.
 */
export const HOLD_MS = 500;

/** How far a press moves (px) before it counts as a swipe or a scroll, and which. */
const DIRECTION_THRESHOLD = 10;

/** The part of Delete behind that a card slid `offset` px across leaves showing. */
function revealClip(offset: number): string {
    return `inset(0 0 0 calc(100% - ${Math.max(0, -offset)}px) round 0.9rem)`;
}

export interface CardGesturesOptions {
    /** The face of the card, which slides. */
    face(): HTMLElement;
    host: HTMLElement;
    reducedMotion: Signal<boolean>;
    menuOpen(): boolean;
    toggleMenu(): void;
    requestDelete(): void;
}

/**
 * Gestures on the card, as on an iPhone list. A tap opens its details. A swipe to the
 * left follows the finger, showing Delete behind; let go, and where the flick would carry
 * it decides: past halfway it carries on off the card and deletes (with Undo), otherwise
 * it springs back, from the finger's speed either way. Holding still on it lifts it: moved
 * then, the drop list drags it; let go of without moving, its options open. Up and down is
 * left to the page, which scrolls.
 */
export class CardGestures {
    constructor(private readonly options: CardGesturesOptions) {}

    private gesture: {
        pointerId: number;
        startX: number;
        startY: number;
        startOffset: number;
        offset: number;
        /** Which way it's going, once it has moved far enough to tell. */
        axis: 'x' | 'y' | null;
        tracker: VelocityTracker;
    } | null = null;
    private holdTimer: ReturnType<typeof setTimeout> | undefined;
    /** The press was a swipe or a hold, so the click that ends it does nothing. */
    private swallowClick = false;
    /** Counts presses, so a swipe's spring knows if a new press caught the card mid-way. */
    private presses = 0;
    /** Held still long enough to pick up: where the press was, until it moves or lets go. */
    private held: { pointerId: number; x: number; y: number } | null = null;
    readonly lifted = signal(false);

    /** Stops waiting on a hold, as the card goes. */
    stop() {
        clearTimeout(this.holdTimer);
    }

    /** Whether this click only ends a swipe or a hold, so it's dropped. */
    swallowed(event: Event): boolean {
        if (!this.swallowClick) {
            return false;
        }
        this.swallowClick = false;
        event.preventDefault();
        // Nor does it reach the library, which would close the options a hold just opened
        event.stopPropagation();
        return true;
    }

    press(event: PointerEvent) {
        const target = event.target as Element;
        if (
            (event.pointerType === 'mouse' && event.button !== 0) ||
            target.closest('.workout-card__menu-wrap')
        ) {
            return;
        }
        this.swallowClick = false;
        this.putDown();
        this.presses++;
        // Where it is on screen now, mid-spring included, and stop it there
        const offset = new DOMMatrix(getComputedStyle(this.options.face()).transform).m41;
        this.options.host.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        this.moveTo(offset);
        const tracker = new VelocityTracker();
        tracker.add(offset, event.timeStamp);
        this.gesture = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startOffset: offset,
            offset,
            axis: null,
            tracker,
        };
        // Held still for as long as the drop list waits before a drag: it lifts
        clearTimeout(this.holdTimer);
        this.holdTimer = setTimeout(() => {
            const gesture = this.gesture;
            if (gesture && !gesture.axis) {
                this.held = { pointerId: gesture.pointerId, x: gesture.startX, y: gesture.startY };
                this.gesture = null;
                this.swallowClick = true;
                this.lifted.set(true);
                navigator.vibrate?.(10);
            }
        }, HOLD_MS);
    }

    move(event: PointerEvent) {
        const held = this.held;
        if (held?.pointerId === event.pointerId) {
            // Moving off with it: the drag takes over
            if (Math.hypot(event.clientX - held.x, event.clientY - held.y) >= DIRECTION_THRESHOLD) {
                this.held = null;
            }
            return;
        }
        const gesture = this.gesture;
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        if (!gesture.axis) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_THRESHOLD) {
                return;
            }
            clearTimeout(this.holdTimer);
            gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (gesture.axis === 'y') {
                // The page scrolls; nothing more for the card to do
                this.gesture = null;
                return;
            }
            this.swallowClick = true;
            (event.currentTarget as Element).setPointerCapture(event.pointerId);
        }
        const width = this.width();
        const pulled = gesture.startOffset + dx;
        // Left follows the finger; right, where there's nothing to show, resists
        const offset = pulled > 0 ? rubberband(pulled, width) : pulled;
        const wasPast = gesture.offset < -width / 2;
        gesture.offset = offset;
        gesture.tracker.add(offset, event.timeStamp);
        this.moveTo(offset);
        // A tick as it crosses the point where letting go would delete it
        if (wasPast !== offset < -width / 2) {
            navigator.vibrate?.(8);
        }
    }

    async release(event: PointerEvent) {
        const gesture = this.gesture;
        clearTimeout(this.holdTimer);
        // Picked up and let go of where it was: its options
        if (this.held?.pointerId === event.pointerId) {
            this.putDown();
            if (event.type === 'pointerup' && !this.options.menuOpen()) {
                this.options.toggleMenu();
            }
            return;
        }
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }
        this.gesture = null;
        if (gesture.axis !== 'x') {
            return;
        }
        const velocity = gesture.tracker.velocity(event.timeStamp);
        const width = this.width();
        // Where the flick would come to rest decides, not where the finger let go
        const away = gesture.offset + project(velocity) < -width / 2;
        const press = this.presses;
        await this.springTo(away ? -width : 0, gesture.offset, velocity);
        // Caught again on its way off: the new press has it now, so it isn't deleted
        if (away && press === this.presses) {
            this.options.requestDelete();
        }
    }

    putDown() {
        this.held = null;
        this.lifted.set(false);
    }

    private width(): number {
        return this.options.host.offsetWidth || 1;
    }

    /** Slides the card `offset` px across, showing as much of Delete behind as it leaves. */
    private moveTo(offset: number) {
        this.options.face().style.transform = offset ? `translateX(${offset}px)` : '';
        const host = this.options.host;
        host.style.setProperty('--reveal', `${Math.max(0, -offset)}px`);
        host.classList.toggle('workout-card--past-delete', offset < -this.width() / 2);
    }

    /**
     * Springs the card from `from` to `to` px across, setting off at the finger's `velocity`
     * (px/s), so there's no seam where the swipe lets go. With reduced motion it's just there.
     */
    private async springTo(to: number, from: number, velocity: number) {
        const distance = to - from;
        this.moveTo(to);
        if (this.options.reducedMotion() || Math.abs(distance) < 1) {
            return;
        }
        // The spring wants speed as a share of the distance left per second
        const { easing, duration } = criticallyDampedSpring(0.3, {
            velocity: velocity / distance,
        });
        const timing = { duration, easing };
        // Delete behind shows as much as the card leaves, all the way along
        this.options.host
            .querySelector('.workout-card__delete')
            ?.animate([{ clipPath: revealClip(from) }, { clipPath: revealClip(to) }], timing);
        await this.options
            .face()
            .animate(
                [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
                timing
            )
            .finished.catch(() => undefined);
    }
}
