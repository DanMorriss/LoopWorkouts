import { project, rubberband, VelocityTracker } from './gesture';

/** px a finger moves before it's taken as a swipe or a scroll. */
const SLOP = 10;

/** What a swipe moves, and what it does once it's let go. */
export interface SideSwipeOptions {
    /** What follows the finger, and is measured: its width is the way across. */
    element(): HTMLElement | undefined;
    /** Whether a press can start a swipe, e.g. not with a mouse or while something's over it. */
    canStart(event: PointerEvent): boolean;
    /** Where it is now (px right of where it rests), caught mid-spring or mid-slide. */
    caughtAt(element: HTMLElement): number;
    /** Puts it `offset` px right of where it rests, as the finger moves it. */
    moveTo(offset: number): void;
    /**
     * Let go after a swipe: `velocity` is how fast it was going (px/s, right), and `past`
     * whether a flick would carry it more than halfway over.
     */
    released(velocity: number, past: boolean): void;
    /** Let go without swiping (a tap, or a scroll), or cancelled: it goes back into place. */
    settle(): void;
}

/**
 * Swiping something to the right with a finger, as a page swiped back or the run bar swiped
 * away do: touch and pen only, it follows the finger once it's moved SLOP mostly rightwards
 * (anything else is a scroll, and left alone), resists being pulled left of where it rests,
 * and on letting go says how far and how fast. The click a swipe would make on what it began
 * on is dropped. A plain class, for the component or directive that moves it to drive with
 * its pointer events and `swallowed()` on its clicks.
 */
export class SideSwipe {
    constructor(private readonly options: SideSwipeOptions) {}

    /** The finger being followed, from where it went down. */
    private start?: { id: number; x: number; y: number };
    /** Moved sideways past SLOP: it's following the finger. */
    private swiping = false;
    /** Where it was when the finger went down (px), caught mid-spring. */
    private startOffset = 0;
    /** Its move with the finger (px). */
    private offset = 0;
    private tracker = new VelocityTracker();
    /** A swipe just ended, so the click it would make is dropped. */
    private swallowClick = false;
    /** Counts presses, so what a release started can tell if a new press caught it. */
    presses = 0;

    press(event: PointerEvent) {
        const element = this.options.element();
        if (!element || event.pointerType === 'mouse' || !event.isPrimary) {
            return;
        }
        if (!this.options.canStart(event)) {
            return;
        }
        this.presses++;
        const offset = this.options.caughtAt(element);
        this.place(offset);
        this.start = { id: event.pointerId, x: event.clientX, y: event.clientY };
        this.swiping = false;
        this.startOffset = offset;
        this.tracker = new VelocityTracker();
        this.tracker.add(event.clientX, event.timeStamp);
    }

    move(event: PointerEvent) {
        const start = this.start;
        const element = this.options.element();
        if (!start || !element || event.pointerId !== start.id) {
            return;
        }
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!this.swiping) {
            if (Math.hypot(dx, dy) < SLOP) {
                return;
            }
            // Mostly rightwards is a swipe; anything else is the page's, so let it go (and
            // something caught on its way back into place carries on there)
            if (dx <= Math.abs(dy)) {
                this.start = undefined;
                this.options.settle();
                return;
            }
            this.swiping = true;
            element.setPointerCapture(event.pointerId);
        }
        // Left of where it rests, it resists more the further it's pulled, rather than
        // stopping dead
        const pulled = this.startOffset + dx;
        this.place(pulled < 0 ? rubberband(pulled, element.offsetWidth || 1) : pulled);
        this.tracker.add(event.clientX, event.timeStamp);
    }

    release(event: PointerEvent) {
        const element = this.options.element();
        if (!this.start || !element || event.pointerId !== this.start.id) {
            return;
        }
        this.start = undefined;
        if (!this.swiping) {
            // A tap on it caught mid-spring: it carries on into place
            this.options.settle();
            return;
        }
        this.swiping = false;
        this.swallowClick = true;
        // Cleared after the click this pointerup makes, if any, has gone by
        setTimeout(() => (this.swallowClick = false));
        const velocity = this.tracker.velocity(event.timeStamp);
        // Where a flick would carry it: past halfway over, it goes
        const past = this.offset + project(velocity) > element.offsetWidth / 2;
        this.options.released(velocity, past);
    }

    cancel() {
        this.start = undefined;
        this.swiping = false;
        this.options.settle();
    }

    /**
     * Drops the click a swipe just made, on the way down (`capture`), before what it would
     * land on hears it.
     */
    swallowed(event: MouseEvent) {
        if (this.swallowClick) {
            this.swallowClick = false;
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /** Where it's moved to, kept so a release knows where it is. */
    private place(offset: number) {
        this.offset = offset;
        this.options.moveTo(offset);
    }
}
