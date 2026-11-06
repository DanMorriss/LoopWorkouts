import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { RouterLink } from '@angular/router';
import { builtInWorkoutEquipment } from '../../models/built-in-workouts';
import { canDoWith, MUSCLE_LABELS, MuscleGroup } from '../../models/exercise';
import { listMuscles, workoutToFillGaps } from '../../models/fill-gaps';
import { Workout } from '../../models/workout';
import { musclesMissed, musclesWorked } from '../../models/workout-muscles';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import {
    WorkoutChoice,
    WorkoutChoiceDialogComponent,
} from '../../shared/components/workout-choice-dialog/workout-choice-dialog.component';
import { MAX_WORKOUTS_A_DAY, WEEKDAYS } from '../../models/plan';
import { injectFocusAfterRender } from '../../shared/focus-after-render';

/**
 * At the foot of the Plan page: what the week's planned workouts work, on the body map; then
 * (LIB-5) the muscle groups they don't work at all, and those they only work as a supporting
 * muscle, each linking to the Exercises list cut down to it; then a ready-made workout that
 * does most for them (LIB-7), to plan on a day as it is. Nothing while no planned step is an
 * exercise.
 */
@Component({
    selector: 'app-plan-muscles',
    imports: [BodyMapComponent, MatIconModule, RouterLink, WorkoutChoiceDialogComponent],
    templateUrl: './plan-muscles.component.html',
    styleUrl: './plan-muscles.component.scss',
})
export class PlanMusclesComponent {
    private readonly plan = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly focusAfterRender = injectFocusAfterRender();
    /** Picking the day to plan the suggestion on. */
    protected readonly choosingDay = signal(false);

    /** The workouts on any day of the plan, each once. */
    private readonly planned = computed(() =>
        [...new Set(this.plan.plan().days.flat())]
            .map((id) => this.workouts.findAnyWorkout(id))
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
            main: worked.main,
            supporting: worked.supporting,
            missed: named(musclesMissed(worked)),
            light: named(worked.supporting),
        };
    });

    /**
     * A ready-made workout for the muscles left out (LIB-7): of those not planned already and,
     * with Only what I have on, doable with your equipment, the one that does most for them.
     * Null when there are no gaps, or no ready-made workout helps.
     */
    protected readonly gapFiller = computed(() => {
        const worked = this.worked();
        if (!worked.hasExercises) {
            return null;
        }
        const planned = new Set(this.plan.plan().days.flat());
        const kit = this.settings.myEquipment();
        const onlyMine = this.settings.onlyMyEquipment();
        const candidates = this.workouts
            .readyMade()
            .filter(
                (workout) =>
                    !planned.has(workout.id) &&
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

    /** The days to plan the suggestion on; one it's on already (or that's full) can't be. */
    protected readonly days = computed((): WorkoutChoice[] => {
        const id = this.gapFiller()?.workout.id;
        return this.plan.plan().days.map((day, i) => ({
            id: String(i),
            name: WEEKDAYS[i],
            detail: id && day.includes(id) ? 'Planned' : '',
            disabled: (id !== undefined && day.includes(id)) || day.length >= MAX_WORKOUTS_A_DAY,
            icon: 'event',
        }));
    });

    /** Plans the suggested ready-made workout on the day picked, as it is. */
    protected planOn(day: string | null) {
        const suggestion = this.gapFiller();
        this.choosingDay.set(false);
        if (day === null || !suggestion) {
            return;
        }
        this.plan.add(Number(day), suggestion.workout.id);
        this.focusAfterRender(`plan-add-${day}`);
    }

    /** Back on Add to a day, closed without picking. */
    protected closeDays() {
        this.choosingDay.set(false);
        this.focusAfterRender('plan-muscles-add');
    }
}
