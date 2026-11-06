import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
    BUILT_IN_WORKOUTS,
    builtInWorkoutEquipment,
    copyOfBuiltIn,
} from '../../models/built-in-workouts';
import { canDoWith, MUSCLE_LABELS, MuscleGroup } from '../../models/exercise';
import { listMuscles, workoutToFillGaps } from '../../models/fill-gaps';
import { Workout } from '../../models/workout';
import { musclesMissed, musclesWorked } from '../../models/workout-muscles';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';

/**
 * At the foot of the Plan page (LIB-5): the muscle groups the workouts in the plan don't work
 * at all, and those they only work as a supporting muscle, each linking to the Exercises list
 * cut down to it; then a ready-made workout that does most for them (LIB-7), to add to your
 * workouts and plan. Nothing while no planned step is an exercise.
 */
@Component({
    selector: 'app-plan-muscles',
    imports: [MatIconModule, RouterLink],
    templateUrl: './plan-muscles.component.html',
    styleUrl: './plan-muscles.component.scss',
})
export class PlanMusclesComponent {
    private readonly plan = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly undo = inject(UndoService);

    /** The workouts on any day of the plan, each once. */
    private readonly planned = computed(() =>
        [...new Set(this.plan.plan().days.flat())]
            .map((id) => this.workouts.findWorkoutById(id))
            .filter((workout): workout is Workout => workout !== null)
    );

    private readonly worked = computed(() =>
        musclesWorked(this.planned(), (id) => this.exercises.byId(id))
    );

    protected readonly planMuscles = computed(() => {
        const worked = this.worked();
        const named = (muscles: MuscleGroup[]) =>
            muscles.map((id) => ({ id, label: MUSCLE_LABELS[id] }));
        return {
            hasExercises: worked.hasExercises,
            missed: named(musclesMissed(worked)),
            light: named(worked.supporting),
        };
    });

    /**
     * A ready-made workout for the muscles left out (LIB-7): of those not in your workouts
     * already (by title) and, with Only what I have on, doable with your equipment, the one that
     * does most for them. Null when there are no gaps, or no ready-made workout helps.
     */
    protected readonly gapFiller = computed(() => {
        const worked = this.worked();
        if (!worked.hasExercises) {
            return null;
        }
        const titles = new Set(
            this.workouts.workouts().map((workout) => workout.title.trim().toLowerCase())
        );
        const kit = this.settings.myEquipment();
        const onlyMine = this.settings.onlyMyEquipment();
        const candidates = BUILT_IN_WORKOUTS.filter(
            (workout) =>
                !titles.has(workout.title.toLowerCase()) &&
                (!onlyMine || canDoWith({ equipment: builtInWorkoutEquipment(workout) }, kit))
        );
        const best = workoutToFillGaps(candidates, musclesMissed(worked), worked.supporting, (id) =>
            this.exercises.byId(id)
        );
        return (
            best && {
                workout: best.workout,
                fills: `Adds ${listMuscles(best.fills.map((muscle) => MUSCLE_LABELS[muscle]))}.`,
            }
        );
    });

    /** Adds the suggested ready-made workout as a copy of your own, with Undo. */
    protected addGapFiller() {
        const suggestion = this.gapFiller();
        if (!suggestion) {
            return;
        }
        const added = this.workouts.addWorkout(copyOfBuiltIn(suggestion.workout));
        this.undo.offerUndo({
            message: `Added "${added.title}" to your workouts`,
            undo: () => this.workouts.deleteWorkout(added.id),
        });
    }
}
