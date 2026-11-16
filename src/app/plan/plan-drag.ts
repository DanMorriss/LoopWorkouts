import type { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import { DropSpring } from '../shared/drop-spring';
import { MAX_WORKOUTS_A_DAY, WeekPlan } from '../models/plan';

/** What a planned workout dragged on the Plan page carries: its day and which it is. */
export interface PlannedDrag {
    day: number;
    workoutId: string;
}

/**
 * Dragging a planned workout by its handle, to another day or another place on its own (PLN-1).
 * One for each Plan page.
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
     * Which days it can go to: its own, in another place, and any other it isn't on yet that
     * isn't full, as a workout's only once on a day.
     */
    readonly canEnter = (drag: CdkDrag<PlannedDrag>, list: CdkDropList<number>): boolean => {
        const { day, workoutId } = drag.data;
        const ids = this.plan().days[list.data] ?? [];
        return list.data === day || (!ids.includes(workoutId) && ids.length < MAX_WORKOUTS_A_DAY);
    };
}
