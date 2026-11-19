import { inject } from '@angular/core';
import { PlannedWorkout, thisWeek } from '../../models/plan';
import { HistoryStore } from './history-store.service';
import { PlanStore } from './plan-store.service';
import { WorkoutStore } from './workout-store.service';

/**
 * Gives what works out this week of the plan as it stands at `now` (`thisWeek()`): each day's
 * workouts, with what's been run, from the plan, the history and the workouts there are. It
 * reads their signals, so a `computed()` that calls it follows them. Call it in an injection
 * context.
 */
export function injectThisWeek(): (now: number) => PlannedWorkout[][] {
    const plan = inject(PlanStore);
    const history = inject(HistoryStore);
    const workouts = inject(WorkoutStore);
    return (now) =>
        thisWeek(
            plan.plan(),
            history.entries(),
            now,
            (id) => workouts.findAnyWorkout(id) !== null,
            (id) => workouts.isActiveRest(id)
        );
}
