import { inject } from '@angular/core';
import { daysPlannedOn, planChangeText } from '../models/plan';
import { Workout } from '../models/workout';
import { injectFocusAfterRender } from './focus-after-render';
import { PlanStore } from './state/plan-store.service';
import { UndoService } from './undo/undo.service';

/**
 * Gives what plans a workout on just the days chosen in Add to plan (PLN-1), taking it off the
 * others, and offers Undo saying what changed: "Legs planned on Monday and Thursday". Focus
 * goes to the Undo bar, then back to the element with `focusId` once it's closed or used, as it
 * does straight away when nothing changed. Returns the days it was added to. Call it in an
 * injection context.
 */
export function injectPlanOnDays(): (
    workout: Workout,
    days: readonly number[],
    focusId: string
) => number[] {
    const plan = inject(PlanStore);
    const undo = inject(UndoService);
    const focus = injectFocusAfterRender();

    return (workout, days, focusId) => {
        const before = plan.plan();
        const was = daysPlannedOn(before, workout.id);
        plan.setDays(workout.id, days);
        const now = daysPlannedOn(plan.plan(), workout.id);
        const added = now.filter((day) => !was.includes(day));
        const removed = was.filter((day) => !now.includes(day));
        if (added.length === 0 && removed.length === 0) {
            focus(focusId);
            return [];
        }
        undo.offerUndo({
            message: planChangeText(workout.title.trim() || 'Untitled workout', added, removed),
            undo: () => {
                plan.restore(before);
                focus(focusId);
            },
            dismissed: () => focus(focusId),
        });
        return added;
    };
}
