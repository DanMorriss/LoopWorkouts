import { computed, Signal, signal } from '@angular/core';
import { project, rubberband, VelocityTracker } from '../../shared/gesture';
import { spring } from '../../shared/spring';

/** px/s: let go faster than this, the sheet was thrown rather than set down. */
const THROWN = 300;

/** px a finger moves on the content before it's taken as a drag or a scroll. */
const TOUCH_SLOP = 8;

/** The touch with this id among those that changed, if it's one of them. */
function touchById(event: TouchEvent, id: number | undefined): Touch | undefined {
    return id === undefined
        ? undefined
        : Array.from(event.changedTouches).find((touch) => touch.identifier === id);
}

/**
 * Whether something between `target` and `container` is scrolled down, e.g. a wheel picker:
 * a finger moving down there scrolls that back, rather than dragging the sheet.
 */
function scrolledWithin(target: Element, container: Element): boolean {
    for (let el: Element | null = target; el && el !== container; el = el.parentElement) {
        if (el.scrollTop > 0) {
            return true;
        }
    }
    return false;
}

export interface SheetDragOptions {
    sheet(): HTMLElement;
    /** Showing only on a phone, where the sheet drags. */
    grabber(): HTMLElement | undefined;
    /** What holds the sheet, whose --dim and ::before dim the page behind. */
    host: HTMLElement;
    /** A finished workout has nothing to go back to, so its heading doesn't drag the sheet. */
    finished: Signal<boolean>;
    reducedMotion: Signal<boolean>;
    /** It was dragged away, so back to the workout. */
    goBack(): void;
}

/**
 * Dragging the summary's sheet down, on a phone, to go back to the workout. It follows the
 * finger 1:1 from where it was grabbed, resists being pulled up (rubber-banding), and on
 * letting go the flick decides: projected past halfway, it carries on down at the finger's
 * speed and goes back; otherwise it springs home, also from the finger's speed. It can be
 * grabbed again mid-spring, from wherever it is.
 */
export class SheetDrag {
    constructor(private readonly options: SheetDragOptions) {}

    /** Gone by dragging, so it doesn't play its closing animation on top. */
    readonly draggedAway = signal(false);
    private dragging: {
        /** The pointer's id, or the touch's if it's dragged by the content (`byTouch`). */
        pointerId: number;
        byTouch: boolean;
        startY: number;
        startOffset: number;
        offset: number;
        tracker: VelocityTracker;
    } | null = null;
    /** Counts grabs, so a spring knows if a new grab caught the sheet mid-way. */
    private grabs = 0;
    /** The sheet's content is scrolled to the top, so its heading can drag it too. */
    private readonly atTop = signal(true);
    /** On a phone, the sheet's heading and title drag it while it's scrolled to the top. */
    readonly headDraggable = computed(() => !this.options.finished() && this.atTop());

    onBodyScroll(event: Event) {
        this.atTop.set((event.target as HTMLElement).scrollTop <= 0);
    }

    /** A press on the heading or title: a grab, where the grabber would take one. */
    grabByHead(event: PointerEvent) {
        // Only where the styles hand the finger to the sheet (on a phone: a card on a wider
        // screen isn't dragged, as it has no grabber), so the breakpoint lives in one place
        const head = event.currentTarget as Element;
        if (this.headDraggable() && getComputedStyle(head).touchAction === 'none') {
            this.grab(event);
        }
    }

    grab(event: PointerEvent) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
        this.startDrag(event.pointerId, event.clientY, event.timeStamp);
    }

    drag(event: PointerEvent) {
        if (!this.dragging?.byTouch) {
            this.moveDrag(event.pointerId, event.clientY, event.timeStamp);
        }
    }

    letGo(event: PointerEvent) {
        if (!this.dragging?.byTouch) {
            this.endDrag(event.pointerId, event.timeStamp);
        }
    }

    // Anywhere in the content drags the sheet too while it's scrolled to the top, as an iOS
    // sheet does. Which way a finger goes isn't known until it moves, so the content can't
    // hand it over with touch-action (and Safari has no pan-down): its first move decides.
    // Down, and the sheet takes it, stopping the scroll; any other way, and the content
    // scrolls. Touch only, as the sheet only drags on a phone.

    /** A touch on the content that hasn't moved far enough yet to tell a drag from a scroll. */
    private touch: { id: number; x: number; y: number } | null = null;

    onBodyTouchStart(event: TouchEvent) {
        const finger = event.changedTouches[0];
        // Not a second finger, or one on the heading or title, which drag the sheet themselves
        this.touch =
            event.touches.length === 1 && !this.dragging
                ? { id: finger.identifier, x: finger.clientX, y: finger.clientY }
                : null;
    }

    onBodyTouchMove(event: TouchEvent) {
        const finger = touchById(event, this.touchDragId() ?? this.touch?.id);
        if (!finger) {
            return;
        }
        if (this.touchDragId() !== undefined) {
            event.preventDefault();
            this.moveDrag(finger.identifier, finger.clientY, event.timeStamp);
            return;
        }
        const touch = this.touch!;
        const dx = finger.clientX - touch.x;
        const dy = finger.clientY - touch.y;
        if (Math.hypot(dx, dy) < TOUCH_SLOP) {
            return;
        }
        this.touch = null;
        const body = event.currentTarget as HTMLElement;
        if (
            dy > Math.abs(dx) &&
            event.cancelable &&
            this.sheetDrags() &&
            body.scrollTop <= 0 &&
            !scrolledWithin(event.target as Element, body)
        ) {
            event.preventDefault();
            // From where the finger went down, so the sheet catches up with it
            this.startDrag(finger.identifier, touch.y, event.timeStamp, true);
            this.moveDrag(finger.identifier, finger.clientY, event.timeStamp);
        }
    }

    onBodyTouchEnd(event: TouchEvent) {
        this.touch = null;
        const finger = touchById(event, this.touchDragId());
        if (finger) {
            // No click on whatever the drag started on
            event.preventDefault();
            this.endDrag(finger.identifier, event.timeStamp);
        }
    }

    /** The touch dragging the sheet, if it's dragged by the content. */
    private touchDragId(): number | undefined {
        return this.dragging?.byTouch ? this.dragging.pointerId : undefined;
    }

    /** Whether the sheet drags here: on a phone, where it has a grabber. */
    private sheetDrags(): boolean {
        const grabber = this.options.grabber();
        return !!grabber && getComputedStyle(grabber).display !== 'none';
    }

    private startDrag(id: number, y: number, time: number, byTouch = false) {
        this.grabs++;
        const sheet = this.options.sheet();
        // Where it is on screen now, mid-spring included, and stop it there
        const offset = new DOMMatrix(getComputedStyle(sheet).transform).m42;
        this.options.host
            .getAnimations({ subtree: true })
            .forEach((animation) => animation.cancel());
        this.moveTo(offset);
        const tracker = new VelocityTracker();
        tracker.add(offset, time);
        this.dragging = { pointerId: id, byTouch, startY: y, startOffset: offset, offset, tracker };
    }

    private moveDrag(id: number, y: number, time: number) {
        const dragging = this.dragging;
        if (!dragging || id !== dragging.pointerId) {
            return;
        }
        const pulled = dragging.startOffset + y - dragging.startY;
        // Down follows the finger; up, past where it sits, resists more the further it goes
        const offset = pulled < 0 ? rubberband(pulled, this.height()) : pulled;
        dragging.offset = offset;
        dragging.tracker.add(offset, time);
        this.moveTo(offset);
    }

    private async endDrag(id: number, time: number) {
        const dragging = this.dragging;
        if (!dragging || id !== dragging.pointerId) {
            return;
        }
        this.dragging = null;
        const velocity = dragging.tracker.velocity(time);
        const height = this.height();
        // Where the flick would come to rest decides, not where the finger let go
        const away = dragging.offset + project(velocity) > height / 2;
        const grab = this.grabs;
        // Flicked back up, it settles home with a little bounce, as something thrown does
        const thrown = !away && velocity < -THROWN;
        await this.springTo(away ? height : 0, dragging.offset, velocity, thrown ? 0.8 : 1);
        // Caught again on its way down: it follows the finger instead of going
        if (away && grab === this.grabs) {
            this.draggedAway.set(true);
            this.options.goBack();
        }
    }

    private height(): number {
        return this.options.sheet().offsetHeight || window.innerHeight;
    }

    /** Puts the sheet `offset` px down, and fades the dimming behind to match. */
    private moveTo(offset: number) {
        this.options.sheet().style.transform = `translateY(${offset}px)`;
        this.options.host.style.setProperty('--dim', String(this.dim(offset)));
    }

    /** How dimmed the page behind is with the sheet `offset` px down: fully at the top, not at all off the bottom. */
    private dim(offset: number): number {
        return 1 - Math.min(1, Math.max(0, offset / this.height()));
    }

    /**
     * Springs the sheet from `from` to `to` px down, setting off at the finger's `velocity`
     * (px/s), so there's no seam where the drag lets go. With reduced motion it's just there.
     */
    private async springTo(to: number, from: number, velocity: number, dampingRatio = 1) {
        const distance = to - from;
        this.moveTo(to);
        if (this.options.reducedMotion() || Math.abs(distance) < 1) {
            return;
        }
        // The spring wants speed as a share of the distance left per second
        const { easing, duration } = spring(0.3, {
            velocity: velocity / distance,
            dampingRatio,
        });
        const timing = { duration, easing };
        // The dimming behind, on the host's ::before, fades with it
        this.options.host.animate([{ opacity: this.dim(from) }, { opacity: this.dim(to) }], {
            ...timing,
            pseudoElement: '::before',
        });
        await this.options
            .sheet()
            .animate(
                [{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }],
                timing
            )
            .finished.catch(() => undefined);
    }
}
