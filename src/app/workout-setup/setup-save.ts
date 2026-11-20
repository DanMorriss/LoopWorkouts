import { inject, Injectable } from '@angular/core';
import { submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { kettlebellSteps, oneKettlebellWeight } from '../models/kettlebell';
import { allSteps, Workout } from '../models/workout';
import { PageSlide } from '../shared/navigation/page-slide';
import { ActiveRunService } from '../shared/run/active-run.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { WorkoutSetupForm } from './workout-setup-form';

/**
 * Saving in Create: Start, which saves the workout and starts it, and Save (BLD-15), which
 * saves it and slides back out. Both are checked first, by the form's own checks. One for each
 * Create page, working on its WorkoutSetupForm.
 */
@Injectable()
export class SetupSave {
    private readonly form = inject(WorkoutSetupForm);
    private readonly workoutStore = inject(WorkoutStore);
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly slide = inject(PageSlide);
    private readonly exercises = inject(ExerciseStore);
    private readonly plan = inject(PlanStore);
    private readonly settings = inject(SettingsStore);

    /**
     * Start (the form's submit, by its button or Enter in a box): saves the workout, starts it
     * and opens the workout page.
     */
    async saveAndStart(): Promise<void> {
        await submit(this.form.workoutForm, async () => {
            const savedWorkout = this.save();
            this.form.load(null);
            this.run.start(savedWorkout);
            await this.router.navigate(['/workout']);
            return undefined;
        });
    }

    /**
     * Save (BLD-15), checked as Start is: saves the workout without starting it, and slides back
     * out, as ‹ does: an edited one to its details, where the change shows, a new one to
     * Workouts, with it highlighted, or, made for a day of the plan, to the Plan page, with it
     * highlighted on that day. All say it was saved.
     */
    async saveOnly(): Promise<void> {
        await submit(this.form.workoutForm, async () => {
            const editing = this.form.editingWorkoutId() !== null;
            const planned = !editing && this.form.planOn() !== null;
            const savedWorkout = this.save();
            // Kept as it is, so the page slides out showing what was saved; only marked saved,
            // so leaving doesn't ask about changes
            this.form.savedState.set(JSON.stringify(this.form.model()));
            this.slide.navigate(
                editing
                    ? `/library/${savedWorkout.id}?saved=${this.savedForRun(savedWorkout)}`
                    : planned
                      ? `/plan?saved=${savedWorkout.id}`
                      : `/library?saved=${savedWorkout.id}`,
                'out'
            );
            return undefined;
        });
    }

    /**
     * What a saved edit means for the workout running, for its Details to say: `running` when
     * it's that workout and has taken the change from where it is, `later` when it carries on
     * as it was (see `ActiveRunService.takeEdit()`), and `1` when it isn't running.
     */
    private savedForRun(saved: Workout): 'running' | 'later' | '1' {
        const running = this.run.workout();
        if (running?.id !== saved.id || this.run.summaryOpen()) {
            return '1';
        }
        return this.run.takeEdit(saved) ? 'running' : 'later';
    }

    /**
     * Saves the form to the library, as a new workout or over the one being edited. A
     * kettlebell workout at one weight makes it your kettlebell (PRG-14), as one set
     * mid-workout does, so starting it doesn't move it back to the one you had.
     */
    private save(): Workout {
        const workout = this.form.fields();
        const steps = allSteps(workout);
        const kettlebell = kettlebellSteps(steps, (id) => this.exercises.byId(id));
        const kg = oneKettlebellWeight(
            [...kettlebell].flatMap((i) => {
                const step = steps[i];
                return step.kind === 'reps' ? (step.sets ?? [step]).map((set) => set.weight) : [];
            })
        );
        if (kg) {
            this.settings.update({ kettlebellWeight: kg });
        }

        const editingId = this.form.editingWorkoutId();
        if (editingId) {
            return (
                this.workoutStore.updateWorkout(editingId, workout) ??
                this.workoutStore.addWorkout(workout)
            );
        }
        const added = this.workoutStore.addWorkout(workout);
        // Made for a day of the plan: it goes on that day, by Save or Start
        const day = this.form.planOn();
        if (day !== null) {
            this.plan.add(day, added.id);
        }
        return added;
    }
}
