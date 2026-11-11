import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { builtInWorkoutEquipment } from '../../models/built-in-workouts';
import { canDoWith, MUSCLE_LABELS, MuscleGroup } from '../../models/exercise';
import { PageSlide } from '../../shared/navigation/page-slide';
import { listMuscles, workoutToFillGaps } from '../../models/fill-gaps';
import { Workout } from '../../models/workout';
import { musclesMissed, musclesWorked } from '../../models/workout-muscles';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { AddToPlanDialogComponent } from '../../shared/components/add-to-plan-dialog/add-to-plan-dialog.component';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { injectPlanOnDays } from '../../shared/plan-on-days';

/**
 * At the foot of the Plan page: what the week's planned workouts work, on the body map; then
 * (LIB-5) the muscle groups they don't work at all. Every muscle listed links to the Exercises
 * list cut down to it, those on the map's key included; then a ready-made workout that does
 * most for the gaps (LIB-7), to plan on days as it is. Nothing while no planned step is an
 * exercise.
 */
@Component({
    selector: 'app-plan-muscles',
    imports: [AddToPlanDialogComponent, BodyMapComponent, MatIconModule],
    templateUrl: './plan-muscles.component.html',
    styleUrl: './plan-muscles.component.scss',
})
export class PlanMusclesComponent {
    private readonly plan = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly focusAfterRender = injectFocusAfterRender();
    private readonly planOnDays = injectPlanOnDays();
    protected readonly slide = inject(PageSlide);

    /** The Exercises list cut down to `muscle`, with ‹ back here. */
    protected exercisesUrl(muscle: MuscleGroup): string {
        return `/exercises?muscles=${muscle}&from=plan`;
    }

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
        return {
            hasExercises: worked.hasExercises,
            main: worked.main,
            supporting: worked.supporting,
            missed: musclesMissed(worked).map((id) => ({ id, label: MUSCLE_LABELS[id] })),
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

    /**
     * Plans the suggested ready-made workout, as it is, on the days chosen, with Undo; focus
     * comes back to the first of those days' Add.
     */
    protected planOn(days: number[]) {
        const suggestion = this.gapFiller();
        this.choosingDay.set(false);
        if (suggestion) {
            this.planOnDays(
                suggestion.workout,
                days,
                days.length ? `plan-add-${days[0]}` : 'plan-muscles-add'
            );
        }
    }

    /** Back on Add to a day, closed without picking. */
    protected closeDays() {
        this.choosingDay.set(false);
        this.focusAfterRender('plan-muscles-add');
    }
}
