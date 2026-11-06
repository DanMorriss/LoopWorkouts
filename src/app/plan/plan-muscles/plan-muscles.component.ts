import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { RouterLink } from '@angular/router';
import { builtInWorkoutEquipment } from '../../models/built-in-workouts';
import { canDoWith, MUSCLE_LABELS } from '../../models/exercise';
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
import { MAX_WORKOUTS_A_DAY, weekdayOf, WEEKDAYS } from '../../models/plan';
import { injectFocusAfterRender } from '../../shared/focus-after-render';

/**
 * At the foot of the Plan page: what the week's planned workouts work, on the body map; then
 * (LIB-5) the muscle groups they don't work at all. Every muscle listed links to the Exercises
 * list cut down to it, those on the map's key included; then a ready-made workout that does
 * most for the gaps (LIB-7), to plan on a day as it is. Nothing while no planned step is an
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

    /** The days to plan the suggestion on; one it's on already (or that's full) can't be. */
    /**
     * The days to plan the suggestion on, each with what's on it already: its workouts and their
     * main muscles, so a day can be picked to suit ("Legs day: Glutes, Quads"), or "Nothing
     * planned". One it's on already, or that's full, can't be picked.
     */
    protected readonly days = computed((): WorkoutChoice[] => {
        const id = this.gapFiller()?.workout.id;
        const today = weekdayOf(Date.now());
        return this.plan.plan().days.map((day, i) => {
            const planned = day
                .map((workoutId) => this.workouts.findAnyWorkout(workoutId))
                .filter((workout): workout is Workout => workout !== null);
            const already = id !== undefined && day.includes(id);
            const full = planned.length >= MAX_WORKOUTS_A_DAY;
            return {
                id: String(i),
                name: i === today ? `${WEEKDAYS[i]} (today)` : WEEKDAYS[i],
                note: planned.length
                    ? planned.map((workout) => this.dayLine(workout)).join(' · ')
                    : 'Nothing planned',
                detail: already ? 'Planned' : full ? 'Full' : '',
                disabled: already || full,
                icon: 'event',
            };
        });
    });

    /** "Legs day: Glutes, Quads": a planned workout and its main muscles, the first three. */
    private dayLine(workout: Workout): string {
        const name = workout.title.trim() || 'Untitled workout';
        const { main } = musclesWorked([workout], (id) => this.exercises.byId(id));
        if (main.length === 0) {
            return name;
        }
        const shown = main.slice(0, 3).map((muscle) => MUSCLE_LABELS[muscle]);
        return `${name}: ${shown.join(', ')}${main.length > 3 ? ' and more' : ''}`;
    }

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
