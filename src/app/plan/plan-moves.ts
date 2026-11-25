import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { WEEKDAYS } from '../models/plan';
import { PlanStore } from '../shared/state/plan-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { PlannedDrag } from './plan-drag';
import { PlanPageView, PlanRow } from './plan-page-view';
import { planNameId } from './plan-workout/plan-workout.component';

/** The id of a planned workout's handle on the Plan page, for focus. */
export function planMoveId(day: number, workoutId: string): string {
    return `plan-move-${day}-${workoutId}`;
}

/**
 * Moving the Plan page's workouts (PLN-1, PLN-3), each with Undo, which puts the whole week back
 * as it was: dragged to another place on its day or onto another day, moved up or down from
 * its menu, taken off with ✕, or done today instead this week only. One for each Plan page.
 */
export class PlanMoves {
    constructor(
        private readonly plan: PlanStore,
        private readonly undo: UndoService,
        private readonly view: PlanPageView,
        /** Shows `day` and puts focus on `id` there, once it's on the page. */
        private readonly focusOn: (day: number, id: string) => void
    ) {}

    private name(workoutId: string): string {
        return this.view.names().get(workoutId) ?? 'Untitled workout';
    }

    /**
     * Let go of: onto another day in the week over it (`onto`), it's moved there, at the end;
     * on its own day, to its new place. Focus stays on its handle, where it's gone.
     */
    dropped(event: CdkDragDrop<number, number, PlannedDrag>, onto: number | null) {
        const { day: from, workoutId } = event.item.data;
        if (onto !== null && onto !== from) {
            this.moveTo(workoutId, from, onto, null);
            return;
        }
        if (event.previousIndex === event.currentIndex) {
            return;
        }
        // Where it's let go among those shown there, without it
        const shown = this.view
            .days()
            [from].workouts.map((planned) => planned.workoutId)
            .filter((id) => id !== workoutId);
        this.moveTo(workoutId, from, from, shown[event.currentIndex] ?? null);
    }

    /** Up or down one on its day, from its menu: the way to change the order without dragging. */
    nudge(row: PlanRow, by: -1 | 1) {
        const ids = this.plan.plan().days[row.day];
        const at = ids.indexOf(row.workoutId);
        // Before the one above it, or before the one after the one below it
        const before = by < 0 ? ids[at - 1] : (ids[at + 2] ?? null);
        this.moveTo(row.workoutId, row.day, row.day, before, planNameId(row.day, row.workoutId));
    }

    private moveTo(
        workoutId: string,
        from: number,
        to: number,
        before: string | null,
        focus = planMoveId(to, workoutId)
    ) {
        const was = this.plan.plan();
        this.plan.move(workoutId, from, to, before);
        const ids = this.plan.plan().days[to];
        if (!ids.includes(workoutId)) {
            return;
        }
        const name = this.name(workoutId);
        this.undo.offerUndo({
            message:
                from === to
                    ? `${name} moved to ${ids.indexOf(workoutId) + 1} of ${ids.length} on ${WEEKDAYS[to]}`
                    : `${name} moved to ${WEEKDAYS[to]}`,
            undo: () => {
                this.plan.restore(was);
                this.focusOn(from, planMoveId(from, workoutId));
            },
            keepFocus: true,
        });
        this.focusOn(to, focus);
    }

    /** Takes it off the day, with Undo: focus to the Undo bar, then the day's Add. */
    remove(day: number, workoutId: string) {
        const was = this.plan.plan();
        this.plan.remove(day, workoutId);
        this.undo.offerUndo({
            message: `${this.name(workoutId)} taken off ${WEEKDAYS[day]}`,
            undo: () => {
                this.plan.restore(was);
                this.focusOn(day, planMoveId(day, workoutId));
            },
            dismissed: () => this.focusOn(day, `plan-add-${day}`),
        });
    }

    /**
     * Done today instead, this week only (PLN-3): it shows today, due, and isn't missed on its
     * own day. With Undo; focus to the Undo bar, then its name, today.
     */
    doToday(row: PlanRow) {
        const was = this.plan.plan();
        const today = this.view.today;
        this.plan.moveThisWeek(row.workoutId, row.day, today);
        this.undo.offerUndo({
            message: `${row.name} moved to today`,
            undo: () => {
                this.plan.restore(was);
                this.focusOn(row.day, planNameId(row.day, row.workoutId));
            },
            dismissed: () => this.focusOn(today, planNameId(today, row.workoutId)),
        });
    }
}
