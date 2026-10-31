import {
    afterNextRender,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    model,
    signal,
    viewChild,
} from '@angular/core';
import { Pose } from '../../../models/exercise-motion';
import type { FigureScene } from './figure-scene';

/** How far it turns for each pixel dragged, in degrees. */
const DEGREES_PER_PIXEL = 0.6;

/**
 * The 3D figure of an exercise's demo in one pose (EXR-13), drawn by its `FigureScene` onto a
 * canvas. Dragging it sideways turns it round (`yaw`); the demo's Turn button does the same
 * without dragging. Hidden from screen readers: the how-to steps say the same in words.
 */
@Component({
    selector: 'app-exercise-figure-3d',
    template: `<canvas
        #canvas
        class="figure3d"
        [style.aspect-ratio]="scene().aspect"
        (pointerdown)="grab($event)"
        (pointermove)="drag($event)"
        (pointerup)="letGo($event)"
        (pointercancel)="letGo($event)"
    ></canvas>`,
    styles: `
        :host {
            display: block;
        }

        .figure3d {
            display: block;
            width: 100%;
            max-height: var(--figure-max-height, 15rem);
            /* Sideways drags turn it; up and down still scroll the page */
            touch-action: pan-y;
            cursor: grab;
        }

        .figure3d:active {
            cursor: grabbing;
        }
    `,
    host: { 'aria-hidden': 'true' },
})
export class ExerciseFigure3dComponent {
    readonly scene = input.required<FigureScene>();
    readonly pose = input.required<Pose>();
    /** How far it's turned from the way it's first seen, in degrees. */
    readonly yaw = model(0);
    /** Changed when the scene's colours or muscles are, so it's drawn again. */
    readonly paint = input(0);

    private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
    /** The canvas's size on screen, in device pixels. */
    private readonly size = signal({ width: 0, height: 0 });
    private dragging: { id: number; x: number; yaw: number } | null = null;

    constructor() {
        effect(() => {
            const { width, height } = this.size();
            const canvas = this.canvas().nativeElement;
            this.paint();
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            this.scene().draw(this.pose(), this.yaw(), canvas);
        });

        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const canvas = this.canvas().nativeElement;
            const observer = new ResizeObserver(() => {
                // Sharp on a high-density screen, but no more than twice over, to save battery
                const ratio = Math.min(window.devicePixelRatio || 1, 2);
                this.size.set({
                    width: Math.round(canvas.clientWidth * ratio),
                    height: Math.round(canvas.clientHeight * ratio),
                });
            });
            observer.observe(canvas);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    protected grab(event: PointerEvent) {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
            return;
        }
        this.dragging = { id: event.pointerId, x: event.clientX, yaw: this.yaw() };
        (event.target as Element).setPointerCapture?.(event.pointerId);
    }

    protected drag(event: PointerEvent) {
        if (this.dragging?.id !== event.pointerId) {
            return;
        }
        this.yaw.set(this.dragging.yaw - (event.clientX - this.dragging.x) * DEGREES_PER_PIXEL);
    }

    protected letGo(event: PointerEvent) {
        if (this.dragging?.id === event.pointerId) {
            this.dragging = null;
        }
    }
}
