import { signal } from '@angular/core';
import { WEEKDAYS } from '../models/plan';
import { PlanStore } from '../shared/state/plan-store.service';
import { UndoService } from '../shared/undo/undo.service';

/** The id of a day's Swap on the Plan page, for focus. */
export function planSwapId(day: number): string {
    return `plan-swap-${day}`;
}

/**
 * Swapping two days on the Plan page (PLN-1): a day's Swap pressed picks it, and the next day
 * picked in the week swaps everything on the two, with Undo. That day picked again, Cancel, or
 * Escape puts it down. One for each Plan page.
 */
export class PlanDaySwap {
    /** The day picked to swap, waiting for the other; null for none. */
    readonly picked = signal<number | null>(null);

    constructor(
        private readonly plan: PlanStore,
        private readonly undo: UndoService,
        private readonly announce: (said: string) => void,
        private readonly focus: (id: string) => void
    ) {}

    /** The first press picks a day; the next swaps it with this one, or, on itself, puts it down. */
    press(day: number) {
        const picked = this.picked();
        if (picked === null) {
            this.picked.set(day);
            this.announce(`${WEEKDAYS[day]} picked. Now pick the day to swap it with.`);
            return;
        }
        this.picked.set(null);
        if (picked === day) {
            this.announce(`${WEEKDAYS[day]} put down`);
            return;
        }
        this.swap(picked, day);
    }

    /** Escape: the day picked is put down. */
    cancel() {
        const picked = this.picked();
        if (picked !== null) {
            this.picked.set(null);
            this.announce(`${WEEKDAYS[picked]} put down`);
        }
    }

    /** Focus to Undo, then back to the second day's ⇄; undone, to the first's. */
    private swap(first: number, second: number) {
        const before = this.plan.plan();
        this.plan.swapDays(first, second);
        this.undo.offerUndo({
            message: `${WEEKDAYS[first]} and ${WEEKDAYS[second]} swapped`,
            undo: () => {
                this.plan.restore(before);
                this.focus(planSwapId(first));
            },
            dismissed: () => this.focus(planSwapId(second)),
        });
    }
}
