import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    InjectionToken,
    input,
    linkedSignal,
    signal,
} from '@angular/core';
import { Exercise } from '../../../models/exercise';
import { poseAt } from '../../../models/exercise-motion';
import { injectPrefersReducedMotion } from '../../reduced-motion';
import { ExerciseStore } from '../../state/exercise-store.service';
import { ThemeService } from '../../theme/theme.service';
import { ExerciseFigure3dComponent } from './exercise-figure-3d.component';
import { ExerciseFigureComponent } from './exercise-figure.component';
import type { FigureColors, FigureScene } from './figure-scene';

/** Whether to draw the figure in 3D where the browser can; the flat figure if not. */
export const DEMO_IN_3D = new InjectionToken<boolean>('DEMO_IN_3D', { factory: () => true });

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
 * dragging it or with Turn. Without WebGL it's drawn flat, as it was drawn before.
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
    private readonly theme = inject(ThemeService);
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

    /** How it's drawn: in 3D, flat (no WebGL), or not yet known (three.js loading). */
    protected readonly drawing = signal<'loading' | '3d' | 'flat'>(
        inject(DEMO_IN_3D) ? 'loading' : 'flat'
    );
    private readonly sceneModule = signal<typeof import('./figure-scene') | null>(null);
    /** The 3D figure of this exercise's motion, its muscles shaded in the theme's colours. */
    protected readonly scene = signal<FigureScene | null>(null);
    /** Counts each time the scene is repainted, so its figures are drawn again. */
    protected readonly paint = signal(0);
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

        effect((onCleanup) => {
            const module = this.sceneModule();
            const motion = this.motion();
            if (!module || !motion) {
                return;
            }
            const scene = new module.FigureScene(motion);
            this.scene.set(scene);
            onCleanup(() => {
                this.scene.set(null);
                scene.dispose();
            });
        });

        // Its muscles, in the theme's colours, read from the page once the theme has changed
        effect(() => {
            const scene = this.scene();
            const exercise = this.exercise();
            this.theme.applied();
            if (!scene) {
                return;
            }
            scene.setColors(this.colors());
            scene.setMuscles(exercise.mainMuscles, exercise.supportingMuscles);
            this.paint.update((count) => count + 1);
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

            if (this.drawing() === 'loading') {
                import('./figure-scene').then(
                    (module) => {
                        if (module.canDraw3d()) {
                            this.sceneModule.set(module);
                            this.drawing.set('3d');
                        } else {
                            this.drawing.set('flat');
                        }
                    },
                    () => this.drawing.set('flat')
                );
            }
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

    /** The theme's colours for the figure, as the body map shades its muscles. */
    private colors(): FigureColors {
        const style = getComputedStyle(this.host);
        const css = (name: string) => solid(style.getPropertyValue(name).trim());
        return {
            main: css('--muscle-main'),
            supporting: css('--muscle-supporting'),
            idle: css('--muscle-idle'),
            other: css('--muscle-other'),
            outline: css('--muscle-outline'),
            metal: css('--text-muted'),
            floor: css('--border'),
        };
    }
}

/** A CSS colour as plain rgb(), its see-through part dropped, as three.js reads colours. */
function solid(color: string): string {
    const context = document.createElement('canvas').getContext('2d');
    if (!context || !color) {
        return color || '#808080';
    }
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
}
