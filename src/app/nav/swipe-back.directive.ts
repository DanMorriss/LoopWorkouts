import { booleanAttribute, Directive, ElementRef, inject, input } from '@angular/core';
import { project, rubberband, VelocityTracker } from '../shared/gesture';
import { criticallyDampedSpring } from '../shared/spring';
import { PageSlide } from './page-slide';

/** px a finger moves before it's taken as a swipe back or a scroll. */
const SLOP = 10;

/**
 * Where a swipe can't start: things a finger moves sideways on for their own sake (the
 * progress chart, which follows a finger across it), and anything typed in.
 */
const OWN_GESTURES =
    '.progress__svg, app-exercise-figure-3d, input, textarea, select, [contenteditable]';

/**
 * Swiping right on a page goes back to `appSwipeBack` (a url), as on a phone: the page
 * follows the finger, and let go far enough over (or flicked) it slides the rest of the way off
 * as the page behind comes back (PageSlide); short of that it springs back into place.
 *
 * Only for touch and a pen: a mouse drag selects text, and a mouse has the back link. The page
 * still scrolls up and down as usual (`touch-action: pan-y`), and a swipe that starts on a
 * button doesn't press it.
 */
@Directive({
    selector: '[appSwipeBack]',
    host: {
        style: 'touch-action: pan-y',
        '(pointerdown)': 'onPointerDown($event)',
        '(pointermove)': 'onPointerMove($event)',
        '(pointerup)': 'onPointerUp($event)',
        '(pointercancel)': 'cancel()',
    },
})
export class SwipeBackDirective {
    /** Where a swipe back goes, e.g. "/exercises?muscles=quads". */
    readonly appSwipeBack = input.required<string>();
    /** Off while something sits over the page, such as a dialog. */
    readonly swipeBackDisabled = input(false, { transform: booleanAttribute });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly slide = inject(PageSlide);

    constructor() {
        // On the way down, so it's dropped before what it would land on hears it
        this.host.addEventListener('click', (event) => this.onClick(event), { capture: true });
    }

    /** The finger being followed, from where it went down. */
    private start?: { id: number; x: number; y: number };
    /** Moved sideways past SLOP: the page is following it. */
    private swiping = false;
    /** Where the page was when the finger went down (px), caught mid-spring or mid-slide. */
    private startOffset = 0;
    /** The page's move with the finger (px), and how fast it was going. */
    private offset = 0;
    private tracker = new VelocityTracker();
    /** A swipe just ended, so the click it would make on what it started on is dropped. */
    private swallowClick = false;

    protected onPointerDown(event: PointerEvent) {
        if (
            event.pointerType === 'mouse' ||
            !event.isPrimary ||
            this.swipeBackDisabled() ||
            (event.target instanceof Element && event.target.closest(OWN_GESTURES))
        ) {
            return;
        }
        // Where it is on screen now, mid-spring or mid-slide in included, and stop it there
        const offset =
            new DOMMatrix(getComputedStyle(this.host).transform).m41 + this.slide.takeCaught();
        this.host.getAnimations().forEach((animation) => animation.cancel());
        this.moveTo(offset);
        this.start = { id: event.pointerId, x: event.clientX, y: event.clientY };
        this.swiping = false;
        this.startOffset = offset;
        this.tracker = new VelocityTracker();
        this.tracker.add(event.clientX, event.timeStamp);
    }

    protected onPointerMove(event: PointerEvent) {
        const start = this.start;
        if (!start || event.pointerId !== start.id) {
            return;
        }
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!this.swiping) {
            if (Math.hypot(dx, dy) < SLOP) {
                return;
            }
            // Mostly rightwards is a swipe back; anything else is the page's, so let it go (and
            // a page caught on its way back into place carries on there)
            if (dx <= Math.abs(dy)) {
                this.start = undefined;
                this.settle(0);
                return;
            }
            this.swiping = true;
            this.host.setPointerCapture(event.pointerId);
        }
        // Left of where it rests, it resists more the further it's pulled, rather than
        // stopping dead
        const pulled = this.startOffset + dx;
        this.moveTo(pulled < 0 ? rubberband(pulled, this.host.offsetWidth || 1) : pulled);
        this.tracker.add(event.clientX, event.timeStamp);
    }

    protected onPointerUp(event: PointerEvent) {
        if (!this.start || event.pointerId !== this.start.id) {
            return;
        }
        this.start = undefined;
        if (!this.swiping) {
            // A tap on a page caught mid-spring: it carries on into place
            this.settle(0);
            return;
        }
        this.swiping = false;
        this.swallowClick = true;
        // Cleared after the click this pointerup makes, if any, has gone by
        setTimeout(() => (this.swallowClick = false));
        const velocity = this.tracker.velocity(event.timeStamp);
        // Where a flick would carry it: past halfway over, it goes back
        if (this.offset + project(velocity) > this.host.offsetWidth / 2) {
            // Left where it is, so the old picture is taken from under the finger
            this.slide.navigate(this.appSwipeBack(), 'out', velocity);
        } else {
            this.settle(velocity);
        }
    }

    protected cancel() {
        this.start = undefined;
        this.swiping = false;
        this.settle(0);
    }

    private onClick(event: MouseEvent) {
        if (this.swallowClick) {
            this.swallowClick = false;
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /** Moves the page `offset` px right of where it rests. */
    private moveTo(offset: number) {
        this.offset = offset;
        this.host.style.transform = offset ? `translateX(${offset}px)` : '';
    }

    /** Back into place on a spring, carrying on at the finger's speed (px/s, right). */
    private settle(velocity: number) {
        const from = this.offset;
        this.moveTo(0);
        if (Math.abs(from) < 0.5 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        // Moving left towards 0 is moving the way it's going
        const timing = criticallyDampedSpring(0.3, { velocity: -velocity / from });
        this.host.animate(
            [{ transform: `translateX(${from}px)` }, { transform: 'translateX(0)' }],
            timing
        );
    }
}
