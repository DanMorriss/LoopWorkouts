import { Signal } from '@angular/core';
import { project, rubberband, VelocityTracker } from '../../gesture';
import { spring, springCurve } from '../../spring';

/**
 * How far a mouse has to move (px) before a press counts as a drag rather than a click. The
 * wheel then follows from there, rather than jumping to catch up.
 */
const DRAG_THRESHOLD = 10;

/** How quickly a mouse-thrown wheel comes to rest on its row (Apple's spring response, s). */
const GLIDE_RESPONSE = 0.3;

export interface WheelDragOptions {
    viewport(): HTMLElement;
    track(): HTMLElement;
    rowHeight(): number;
    indexAtScroll(): number;
    lastIndex(): number;
    selectIndex(index: number): void;
    reducedMotion: Signal<boolean>;
}

/**
 * A wheel dragged and thrown with a mouse, as touch and pens already scroll natively. It follows
 * from past a small threshold, stretches past either end, and on letting go glides on to where
 * the flick would carry it, on a spring.
 */
export class WheelDrag {
    constructor(private readonly options: WheelDragOptions) {}

    private drag: {
        pointerId: number;
        startY: number;
        startScroll: number;
        dragging: boolean;
        tracker: VelocityTracker;
        /** How far (px) the numbers are stretched past an end, as the mouse pulls them. */
        stretch: number;
    } | null = null;
    /** The frame a mouse-thrown wheel is gliding on, while it glides to rest. */
    private glideFrame: number | null = null;

    /** Being dragged or gliding, so it settles itself when it's done. */
    get moving(): boolean {
        return !!this.drag?.dragging || this.glideFrame !== null;
    }

    get gliding(): boolean {
        return this.glideFrame !== null;
    }

    /** A press on the wheel, which may turn into a drag. */
    press(event: PointerEvent) {
        // Mouse dragging. Touch and pens already scroll natively, so only the mouse needs this.
        if (event.pointerType !== 'mouse') {
            this.options.viewport().classList.remove('wheel-picker__viewport--dragging');
            return;
        }
        const tracker = new VelocityTracker();
        const startScroll = this.options.viewport().scrollTop;
        tracker.add(startScroll, event.timeStamp);
        this.drag = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startScroll,
            dragging: false,
            tracker,
            stretch: 0,
        };
    }

    move(event: PointerEvent) {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const viewport = this.options.viewport();
        const moved = event.clientY - drag.startY;
        if (!drag.dragging && Math.abs(moved) > DRAG_THRESHOLD) {
            // Only capture once it's a real drag, so a plain click still reaches the number
            drag.dragging = true;
            viewport.setPointerCapture(event.pointerId);
            viewport.classList.add('wheel-picker__viewport--dragging');
            // Follow from here, rather than jumping the threshold's worth to catch up
            drag.startY += Math.sign(moved) * DRAG_THRESHOLD;
        }
        if (!drag.dragging) {
            return;
        }
        const wanted = drag.startScroll - (event.clientY - drag.startY);
        const end = viewport.scrollHeight - viewport.clientHeight;
        const top = Math.min(end, Math.max(0, wanted));
        viewport.scrollTop = top;
        // Past either end, the numbers stretch after the pointer, resisting more the further
        // they're pulled, rather than stopping dead
        drag.stretch = -rubberband(wanted - top, viewport.clientHeight);
        this.options.track().style.translate = drag.stretch ? `0 ${drag.stretch}px` : '';
        drag.tracker.add(top, event.timeStamp);
    }

    end(event: PointerEvent) {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        this.drag = null;
        const viewport = this.options.viewport();
        if (!drag.dragging) {
            viewport.classList.remove('wheel-picker__viewport--dragging');
            return;
        }
        viewport.releasePointerCapture(event.pointerId);
        if (drag.stretch) {
            // Let go past an end: the numbers spring back, and the end row is chosen
            this.springBack(drag.stretch);
            viewport.classList.remove('wheel-picker__viewport--dragging');
            this.options.selectIndex(this.options.indexAtScroll());
            return;
        }
        // Thrown: it glides on to where the flick would carry it, and rests on that row
        const velocity = drag.tracker.velocity(event.timeStamp);
        const last = this.options.lastIndex();
        const projected = Math.round(
            (viewport.scrollTop + project(velocity)) / this.options.rowHeight()
        );
        this.glideTo(Math.min(last, Math.max(0, projected)), velocity);
    }

    /**
     * Glides the wheel to the row at `index` on a spring, setting off at the mouse's `velocity`
     * (px/s) so there's no seam where the drag let go, then selects it. A press stops it.
     * With reduced motion it's just there.
     */
    private glideTo(index: number, velocity: number) {
        const viewport = this.options.viewport();
        const from = viewport.scrollTop;
        const distance = index * this.options.rowHeight() - from;
        const done = () => {
            this.glideFrame = null;
            viewport.classList.remove('wheel-picker__viewport--dragging');
            this.options.selectIndex(index);
        };
        if (this.options.reducedMotion() || Math.abs(distance) < 0.5) {
            viewport.scrollTop = from + distance;
            done();
            return;
        }
        // The spring wants speed as a share of the distance left per second. Capped where it
        // would carry past the row: a flick clamped to an end row would otherwise run into
        // the end of the scroll and stop dead there.
        const omega = (2 * Math.PI) / GLIDE_RESPONSE;
        const curve = springCurve(GLIDE_RESPONSE, {
            velocity: Math.min(velocity / distance, omega),
        });
        const start = performance.now();
        const step = (now: number) => {
            const t = (now - start) / 1000;
            if (t >= curve.settledAt) {
                viewport.scrollTop = from + distance;
                done();
                return;
            }
            viewport.scrollTop = from + distance * curve.progress(t);
            this.glideFrame = requestAnimationFrame(step);
        };
        this.glideFrame = requestAnimationFrame(step);
    }

    stopGlide() {
        if (this.glideFrame !== null) {
            cancelAnimationFrame(this.glideFrame);
            this.glideFrame = null;
        }
    }

    /** Stops a glide for good, letting the rows snap again (not a press, which may drag on). */
    endGlide() {
        if (this.glideFrame !== null) {
            this.stopGlide();
            this.options.viewport().classList.remove('wheel-picker__viewport--dragging');
        }
    }

    /** Springs the numbers back from `stretch` px past an end. */
    private springBack(stretch: number) {
        const track = this.options.track();
        track.style.translate = '';
        if (!this.options.reducedMotion()) {
            const { easing, duration } = spring(GLIDE_RESPONSE);
            track.animate([{ translate: `0 ${stretch}px` }, { translate: '0 0' }], {
                duration,
                easing,
            });
        }
    }
}
