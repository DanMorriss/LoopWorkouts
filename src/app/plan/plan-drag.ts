import { signal } from '@angular/core';
import { DropSpring } from '../shared/drop-spring';
import { MAX_WORKOUTS_A_DAY, WeekPlan } from '../models/plan';

/** What a planned workout dragged on the Plan page carries: its day and which it is. */
export interface PlannedDrag {
    day: number;
    workoutId: string;
}

/**
 * Dragging a planned workout by its handle, to another place on its day, or onto another day
 * in the week over it (PLN-1). One for each Plan page.
 */
export class PlanDrag {
    /** While one's dragged, so the page doesn't swipe back under it. */
    readonly dragging = signal(false);
    /** One let go settles into its place at the finger's speed. */
    readonly drop = new DropSpring();
    /** A drag ends with a click on its handle, which isn't a press: see `pressed`. */
    private justDragged = false;

    constructor(private readonly plan: () => WeekPlan) {}

    started() {
        this.dragging.set(true);
        this.justDragged = true;
    }

    ended() {
        this.dragging.set(false);
        // The click that follows the drop, if any, comes first
        setTimeout(() => (this.justDragged = false));
    }

    /** Whether the handle's click was a press, rather than the end of a drag. */
    pressed(): boolean {
        const press = !this.justDragged;
        this.justDragged = false;
        return press;
    }

    /**
     * Whether it can go to `to` from `from`: its own day, in another place, or any other it
     * isn't on yet that isn't full, as a workout's only once on a day.
     */
    canGo(workoutId: string, from: number, to: number): boolean {
        const ids = this.plan().days[to] ?? [];
        return to === from || (!ids.includes(workoutId) && ids.length < MAX_WORKOUTS_A_DAY);
    }
}
