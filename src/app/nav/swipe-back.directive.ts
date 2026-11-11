import { booleanAttribute, Directive, ElementRef, inject, input } from '@angular/core';
import { SideSwipe } from '../shared/side-swipe';
import { criticallyDampedSpring } from '../shared/spring';
import { PageSlide } from '../shared/navigation/page-slide';
import { prefersReducedMotion } from '../shared/reduced-motion';

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
        '(pointerdown)': 'swipe.press($event)',
        '(pointermove)': 'swipe.move($event)',
        '(pointerup)': 'swipe.release($event)',
        '(pointercancel)': 'swipe.cancel()',
    },
})
export class SwipeBackDirective {
    /** Where a swipe back goes, e.g. "/exercises?muscles=quads". */
    readonly appSwipeBack = input.required<string>();
    /** Off while something sits over the page, such as a dialog. */
    readonly swipeBackDisabled = input(false, { transform: booleanAttribute });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly slide = inject(PageSlide);

    /** The page's move with the finger (px). */
    private offset = 0;
    protected readonly swipe = new SideSwipe({
        element: () => this.host,
        canStart: (event) =>
            !this.swipeBackDisabled() &&
            !(event.target instanceof Element && event.target.closest(OWN_GESTURES)),
        // Where it is on screen now, mid-spring or mid-slide in included, and stop it there
        caughtAt: (host) => {
            const offset =
                new DOMMatrix(getComputedStyle(host).transform).m41 + this.slide.takeCaught();
            host.getAnimations().forEach((animation) => animation.cancel());
            return offset;
        },
        moveTo: (offset) => this.moveTo(offset),
        released: (velocity, past) => {
            if (past) {
                // Left where it is, so the old picture is taken from under the finger
                this.slide.navigate(this.appSwipeBack(), 'out', velocity);
            } else {
                this.settle(velocity);
            }
        },
        settle: () => this.settle(0),
    });

    constructor() {
        // On the way down, so it's dropped before what it would land on hears it
        this.host.addEventListener('click', (event) => this.swipe.swallowed(event), {
            capture: true,
        });
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
        if (Math.abs(from) < 0.5 || prefersReducedMotion()) {
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
