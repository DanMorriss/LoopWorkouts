import { Component, computed, inject, input, output } from '@angular/core';
import { MUSCLE_LABELS } from '../../../models/exercise';
import { daysPlannedOn, MAX_WORKOUTS_A_DAY, weekdayOf, WEEKDAYS } from '../../../models/plan';
import { Workout } from '../../../models/workout';
import { musclesWorked } from '../../../models/workout-muscles';
import { ExerciseStore } from '../../state/exercise-store.service';
import { PlanStore } from '../../state/plan-store.service';
import { WorkoutStore } from '../../state/workout-store.service';
import {
    WorkoutChoice,
    WorkoutChoiceDialogComponent,
} from '../workout-choice-dialog/workout-choice-dialog.component';

/**
 * Add to plan (PLN-1): the seven days, Monday first, to plan a workout on, as many as wanted,
 * each saying what's on it already and the muscles those work ("Legs: Glutes, Quads"), so a
 * day can be picked to suit. The days it's on already start chosen, so unchoosing one takes it
 * off. A full day it isn't on can't be chosen. Done gives the days chosen (`done`); ‹ Back,
 * Escape or a click outside change nothing (`closed`). Where it's used, it has
 * animate.leave="dialog-leave", and `injectPlanOnDays()` makes the change.
 */
@Component({
    selector: 'app-add-to-plan-dialog',
    imports: [WorkoutChoiceDialogComponent],
    template: `
        <app-workout-choice-dialog
            [heading]="'Plan ' + name() + ' on…'"
            hint="Pick as many days as you like. Each says what's on it already, and the muscles those work."
            [choices]="days()"
            [chosen]="chosen()"
            (closed)="closed.emit()"
            (done)="done.emit($event.map(toDay))"
        />
    `,
})
export class AddToPlanDialogComponent {
    readonly workout = input.required<Workout>();
    readonly closed = output<void>();
    /** The days chosen, from 0 for Monday. */
    readonly done = output<number[]>();

    private readonly plan = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);

    protected readonly toDay = Number;
    protected readonly name = computed(() => this.workout().title.trim() || 'Untitled workout');

    /** The days it's on now, which start chosen. */
    protected readonly chosen = computed(() =>
        daysPlannedOn(this.plan.plan(), this.workout().id).map(String)
    );

    protected readonly days = computed((): WorkoutChoice[] => {
        const id = this.workout().id;
        const today = weekdayOf(Date.now());
        return this.plan.plan().days.map((day, i) => {
            const planned = day
                .filter((workoutId) => workoutId !== id)
                .map((workoutId) => this.workouts.findAnyWorkout(workoutId))
                .filter((workout): workout is Workout => workout !== null);
            const full = !day.includes(id) && day.length >= MAX_WORKOUTS_A_DAY;
            return {
                id: String(i),
                name: i === today ? `${WEEKDAYS[i]} (today)` : WEEKDAYS[i],
                note: planned.length
                    ? planned.map((workout) => this.dayLine(workout)).join(' · ')
                    : 'Nothing planned',
                detail: full ? 'Full' : '',
                disabled: full,
                icon: 'event',
            };
        });
    });

    /** "Legs: Glutes, Quads": a planned workout and its main muscles, the first three. */
    private dayLine(workout: Workout): string {
        const name = workout.title.trim() || 'Untitled workout';
        const { main } = musclesWorked([workout], (id) => this.exercises.byId(id));
        if (main.length === 0) {
            return name;
        }
        const shown = main.slice(0, 3).map((muscle) => MUSCLE_LABELS[muscle]);
        return `${name}: ${shown.join(', ')}${main.length > 3 ? ' and more' : ''}`;
    }
}
