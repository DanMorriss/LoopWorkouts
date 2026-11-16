import { computed, inject, Injectable } from '@angular/core';
import {
    MAX_WORKOUTS_A_DAY,
    PlannedStatus,
    PlannedWorkout,
    thisWeek,
    weekdayOf,
    WEEKDAYS,
} from '../models/plan';
import { aToZ, isReadyMade } from '../models/workout';
import { WorkoutChoice } from '../shared/components/workout-choice-dialog/workout-choice-dialog.component';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/**
 * How a planned workout's place this week reads, e.g. "Done". "To come" says nothing, unless
 * it's active rest (see `statusLabel`).
 */
const STATUS_TEXT: Record<PlannedStatus, string> = {
    done: 'Done',
    missed: 'Missed',
    rested: 'Rested',
    today: 'Due',
    'to come': '',
    'next week': 'From next week',
};

/** A planned workout as a row of the Plan page shows it. */
export interface PlanRow extends PlannedWorkout {
    /** The day it's shown on, from 0 for Monday. */
    day: number;
    name: string;
    /** Where it is this week: "Done", "Missed", or '' for one still to come. */
    label: string;
    /** Whether it can be done today instead, this week only (see `PlanStore.moveThisWeek`). */
    canDoToday: boolean;
}

/** What the Plan page shows, worked out from the plan and the history. One for each page. */
@Injectable()
export class PlanPageView {
    private readonly planStore = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly now = Date.now();
    readonly today = weekdayOf(this.now);

    readonly names = computed(
        () =>
            new Map(
                this.workouts
                    .allWorkouts()
                    .map((workout) => [workout.id, workout.title.trim() || 'Untitled workout'])
            )
    );

    /** Each day, Monday first, with its workouts and where each is this week. */
    readonly days = computed(() => {
        const week = thisWeek(
            this.planStore.plan(),
            this.history.entries(),
            this.now,
            (id) => this.names().has(id),
            (id) => this.workouts.isActiveRest(id)
        );
        const onToday = new Set(week[this.today].map((item) => item.workoutId));
        return week.map((planned, day) => ({
            day,
            name: WEEKDAYS[day],
            workouts: planned.map(
                (item): PlanRow => ({
                    ...item,
                    day,
                    name: this.names().get(item.workoutId)!,
                    label: statusLabel(item),
                    canDoToday:
                        day !== this.today &&
                        item.movedFrom === undefined &&
                        item.status !== 'done' &&
                        !onToday.has(item.workoutId),
                })
            ),
        }));
    });

    /**
     * "2 of 5 done this week", counting only days gone by and today, and not those planned once
     * their day had gone by (from next week).
     */
    readonly weekSoFar = computed(() => {
        const sofar = this.days()
            .filter(({ day }) => day <= this.today)
            .flatMap(({ workouts }) => workouts)
            .filter((item) => item.status !== 'next week' && !item.activeRest);
        const done = sofar.filter((item) => item.status === 'done').length;
        return sofar.length ? `${done} of ${sofar.length} done so far this week` : '';
    });

    canAdd(day: number): boolean {
        return this.days()[day].workouts.length < MAX_WORKOUTS_A_DAY;
    }

    /**
     * What a day's Add offers: yours A to Z, then the ready-made ones A to Z, each already
     * planned that day saying so, and not to be picked.
     */
    choicesFor(day: number | null): WorkoutChoice[] {
        const planned = day === null ? [] : this.planStore.plan().days[day];
        return [...aToZ(this.workouts.workouts()), ...aToZ(this.workouts.readyMade())].map(
            (workout) => {
                const already = planned.includes(workout.id);
                return {
                    id: workout.id,
                    name: this.names().get(workout.id)!,
                    detail: already ? 'Planned' : '',
                    disabled: already,
                    readyMade: isReadyMade(workout),
                };
            }
        );
    }
}

/** What a planned workout's place this week says: active rest still to do says so, as it's optional. */
function statusLabel(item: PlannedWorkout): string {
    return item.activeRest && (item.status === 'today' || item.status === 'to come')
        ? 'Active rest'
        : STATUS_TEXT[item.status];
}
