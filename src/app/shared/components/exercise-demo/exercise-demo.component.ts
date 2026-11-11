import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    linkedSignal,
    signal,
} from '@angular/core';
import { Exercise } from '../../../models/exercise';
import { poseAt } from '../../../models/exercise-motion';
import { injectPrefersReducedMotion } from '../../reduced-motion';
import { ExerciseStore } from '../../state/exercise-store.service';
import { injectDemoScene } from './demo-scene';
import { ExerciseFigure3dComponent } from './exercise-figure-3d.component';
import { ExerciseFigureComponent } from './exercise-figure.component';

/** How far the Turn button turns the figure, in degrees, and how long it takes. */
const TURN = 45;
const TURN_MS = 450;

/**
 * An exercise's animated demo (EXR-13): a figure doing the exercise, in a loop, with a button
 * to pause it. With reduced motion asked for, its key positions stand side by side instead;
 * a hold, such as a plank, with one position, is always still.
 * Nothing for an exercise without a motion (your own, and built-in ones not done yet).
 *
 * The figure is drawn in 3D (three.js, loaded with the first demo), and can be turned round by
 * dragging it or with Turn: in a worker where the browser can, so it never holds the page up,
 * and on the page otherwise. Without WebGL it's drawn flat, as it was drawn before.
 */
@Component({
    selector: 'app-exercise-demo',
    imports: [ExerciseFigureComponent, ExerciseFigure3dComponent],
    templateUrl: './exercise-demo.component.html',
    styleUrl: './exercise-demo.component.scss',
})
export class ExerciseDemoComponent {
    readonly exercise = input.required<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    private readonly host: HTMLElement = inject(ElementRef).nativeElement;
    protected readonly motion = computed(() => this.exercises.motionOf(this.exercise()));
    protected readonly reduced = injectPrefersReducedMotion();
    /** Playing, unless paused with the button. */
    protected readonly playing = signal(true);
    /** Whether any of it is on screen; it stops when scrolled away, to save battery. */
    private readonly onScreen = signal(false);
    /** How far into its loop it is, in milliseconds: from the start for each exercise. */
    private readonly elapsed = linkedSignal({ source: this.motion, computation: () => 0 });
    protected readonly pose = computed(() => {
        const motion = this.motion();
        return motion && poseAt(motion, this.elapsed());
    });

    /** The 3D figure, once three.js has loaded, or whether to draw it flat. */
    private readonly figure = injectDemoScene(this.motion, () => ({
        main: this.exercise().mainMuscles,
        supporting: this.exercise().supportingMuscles,
    }));
    protected readonly drawing = this.figure.drawing;
    protected readonly scene = this.figure.scene;
    protected readonly paint = this.figure.paint;
    /** How far the 3D figure is turned from the way it's first seen, in degrees. */
    protected readonly yaw = linkedSignal({ source: this.motion, computation: () => 0 });
    /** A turn under way: where it's turning to, and its next frame. */
    private turning: { to: number; frame: number } | null = null;

    constructor() {
        void this.exercises.loadMotion();

        effect((onCleanup) => {
            const motion = this.motion();
            if (!motion || motion.frames.length < 2) {
                return;
            }
            if (!this.playing() || this.reduced() || !this.onScreen()) {
                return;
            }
            let last: number | null = null;
            const tick = (now: number) => {
                // A frame late by more than a few (e.g. back in a tab) carries on from where it
                // was, rather than jumping ahead
                const step = last === null ? 0 : Math.min(now - last, 100);
                last = now;
                this.elapsed.update((elapsed) => elapsed + step);
                frame = requestAnimationFrame(tick);
            };
            let frame = requestAnimationFrame(tick);
            onCleanup(() => cancelAnimationFrame(frame));
        });

        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const observer = new IntersectionObserver(([entry]) =>
                this.onScreen.set(entry.isIntersecting)
            );
            observer.observe(this.host);
            destroyRef.onDestroy(() => {
                observer.disconnect();
                if (this.turning) {
                    cancelAnimationFrame(this.turning.frame);
                }
            });
        });
    }

    protected toggle(): void {
        this.playing.update((playing) => !playing);
    }

    /** Turns the 3D figure round a step, smoothly unless motion is reduced. */
    protected turn(): void {
        // Pressed again mid-turn, it carries on from where it is to a step further on
        const to = (this.turning?.to ?? this.yaw()) + TURN;
        if (this.turning) {
            cancelAnimationFrame(this.turning.frame);
        }
        this.turning = null;
        if (this.reduced()) {
            this.yaw.set(to);
            return;
        }
        const from = this.yaw();
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / TURN_MS);
            // Easing out, as a turned thing slows to a stop
            this.yaw.set(from + (to - from) * (1 - (1 - t) ** 3));
            this.turning = t < 1 ? { to, frame: requestAnimationFrame(step) } : null;
        };
        this.turning = { to, frame: requestAnimationFrame(step) };
    }
}
