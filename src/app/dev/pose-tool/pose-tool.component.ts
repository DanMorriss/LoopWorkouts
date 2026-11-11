import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isBuiltIn } from '../../models/exercise';
import { Pose, poseAt } from '../../models/exercise-motion';
import { motionCode, poseCode } from '../../models/motion-code';
import { withFramePose } from '../../models/pose-editing';
import { injectDemoScene } from '../../shared/components/exercise-demo/demo-scene';
import { ExerciseFigure3dComponent } from '../../shared/components/exercise-demo/exercise-figure-3d.component';
import { ExerciseFigureComponent } from '../../shared/components/exercise-demo/exercise-figure.component';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { PoseSlidersComponent } from './pose-sliders.component';

/**
 * The posing tool, only in development builds (`ng serve`, at /dev/pose): a built-in
 * exercise's demo, each of its positions changed with sliders and drawn as they move, in 3D and
 * flat, then copied as code to paste into `built-in-exercise-motion.ts`. Nothing is saved: a
 * reload starts again from the motions as written.
 */
@Component({
    selector: 'app-pose-tool',
    imports: [ExerciseFigure3dComponent, ExerciseFigureComponent, PoseSlidersComponent],
    templateUrl: './pose-tool.component.html',
    styleUrl: './pose-tool.component.scss',
})
export class PoseToolComponent {
    private readonly store = inject(ExerciseStore);
    private readonly router = inject(Router);

    /** The built-in exercises with a demo, A to Z. */
    protected readonly choices = computed(() =>
        this.store
            .exercises()
            .filter((exercise) => isBuiltIn(exercise) && this.store.motionOf(exercise))
            .sort((a, b) => a.name.localeCompare(b.name))
    );
    /** Which is posed: from the address (`?exercise=push-up`), else the first. */
    protected readonly exerciseId = signal(
        inject(ActivatedRoute).snapshot.queryParamMap.get('exercise') ?? ''
    );
    protected readonly exercise = computed(() => {
        const choices = this.choices();
        const id = `builtin:${this.exerciseId()}`;
        return choices.find((exercise) => exercise.id === id) ?? choices[0];
    });
    /** Its motion as written. */
    private readonly original = computed(() => {
        const exercise = this.exercise();
        return exercise && this.store.motionOf(exercise);
    });
    /** Its motion as changed here. */
    protected readonly motion = linkedSignal(() => this.original());
    protected readonly frame = linkedSignal({ source: this.original, computation: () => 0 });
    protected readonly pose = computed(() => this.motion()?.frames[this.frame()]?.pose);

    /** Playing the motion through, as the demo does, rather than standing in one position. */
    protected readonly playing = signal(false);
    private readonly elapsed = signal(0);
    protected readonly shown = computed(() => {
        const motion = this.motion();
        return motion && (this.playing() ? poseAt(motion, this.elapsed()) : this.pose());
    });

    /**
     * What the 3D figure is framed for: the motion as written, until Reframe frames it for the
     * changes, when they take it out of view.
     */
    private readonly framed = linkedSignal(() => this.original());
    private readonly figure = injectDemoScene(this.framed, () => ({
        main: this.exercise()?.mainMuscles ?? [],
        supporting: this.exercise()?.supportingMuscles ?? [],
    }));
    protected readonly drawing = this.figure.drawing;
    protected readonly scene = this.figure.scene;
    protected readonly paint = this.figure.paint;
    protected readonly yaw = linkedSignal({ source: this.original, computation: () => 0 });

    protected readonly code = computed(() => {
        const pose = this.pose();
        return pose ? poseCode(pose) : '';
    });
    /** Said once something's copied. */
    protected readonly status = signal('');

    constructor() {
        void this.store.loadMotion();
        effect((onCleanup) => {
            if (!this.playing()) {
                return;
            }
            let last: number | null = null;
            const tick = (now: number) => {
                this.elapsed.update((elapsed) => elapsed + (last === null ? 0 : now - last));
                last = now;
                frame = requestAnimationFrame(tick);
            };
            let frame = requestAnimationFrame(tick);
            onCleanup(() => cancelAnimationFrame(frame));
        });
    }

    protected pick(id: string) {
        const slug = id.replace(/^builtin:/, '');
        this.exerciseId.set(slug);
        this.status.set('');
        void this.router.navigate([], { queryParams: { exercise: slug }, replaceUrl: true });
    }

    protected show(frame: number) {
        this.playing.set(false);
        this.frame.set(frame);
    }

    protected setPose(pose: Pose) {
        this.motion.update((motion) => motion && withFramePose(motion, this.frame(), pose));
    }

    protected togglePlay() {
        this.elapsed.set(0);
        this.playing.update((playing) => !playing);
    }

    /** This position back as it's written. */
    protected reset() {
        const pose = this.original()?.frames[this.frame()]?.pose;
        if (pose) {
            this.setPose(pose);
        }
    }

    protected reframe() {
        this.framed.set(this.motion());
    }

    protected copyPose() {
        void this.copy(this.code(), 'Copied this position’s pose');
    }

    protected copyMotion() {
        const motion = this.motion();
        if (motion) {
            void this.copy(motionCode(motion), 'Copied the whole motion');
        }
    }

    private async copy(text: string, done: string) {
        try {
            await navigator.clipboard.writeText(text);
            this.status.set(`${done}. Paste it in, then run npm run format.`);
        } catch {
            this.status.set('Couldn’t copy: select the code below instead.');
        }
    }
}
