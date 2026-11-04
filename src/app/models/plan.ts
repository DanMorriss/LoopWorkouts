import { HistoryEntry } from './history';

/** The days of the week, Monday first: a plan's days, and the order This week shows them in. */
export const WEEKDAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
] as const;

/** At most this many workouts on one day, which is more than anyone does. */
export const MAX_WORKOUTS_A_DAY = 10;

/**
 * The weekly plan (PLN-1): which workouts are done on which days, the same every week. Synced
 * as one record of its own, like the library's order, so planning on one device and editing a
 * workout on another don't overwrite each other.
 */
export interface WeekPlan {
    /** For each day, Monday first, the ids of the workouts planned on it, in order. */
    days: string[][];
    /** When it last changed, in ms since the epoch, or 0 if it never has. */
    updatedAt: number;
    /**
     * When each workout was put on its day, by the device's clock, keyed by `plannedKey()`, so a
     * day already gone by when it was planned isn't counted as missed (PLN-3). Missing for
     * those planned before this came in (2026-11-04), which count as they always did.
     */
    plannedAt?: Record<string, number>;
}

/** The key of a workout on a day in `plannedAt`: "2:workout-id" for Wednesday. */
export function plannedKey(day: number, workoutId: string): string {
    return `${day}:${workoutId}`;
}

export const EMPTY_PLAN: WeekPlan = { days: WEEKDAYS.map(() => []), updatedAt: 0 };

/** Whether a saved value is a usable plan: seven days of workout ids, and when it changed. */
export function isWeekPlan(value: unknown): value is WeekPlan {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const plan = value as Record<string, unknown>;
    return (
        Array.isArray(plan['days']) &&
        plan['days'].length === WEEKDAYS.length &&
        plan['days'].every(
            (day) =>
                Array.isArray(day) &&
                day.length <= MAX_WORKOUTS_A_DAY &&
                day.every((id) => typeof id === 'string' && id !== '')
        ) &&
        Number.isSafeInteger(plan['updatedAt']) &&
        (plan['updatedAt'] as number) >= 0 &&
        (plan['plannedAt'] === undefined ||
            (typeof plan['plannedAt'] === 'object' && plan['plannedAt'] !== null))
    );
}

/**
 * A copy of a plan, so a saved or fetched one shares nothing with what's kept. Of
 * `plannedAt`, only the times of workouts still planned, and only those that are times, are
 * kept; with none, it's left out.
 */
export function copyPlan(plan: WeekPlan): WeekPlan {
    const days = plan.days.map((day) => [...day]);
    const plannedAt: Record<string, number> = {};
    days.forEach((ids, day) =>
        ids.forEach((id) => {
            const at = plan.plannedAt?.[plannedKey(day, id)];
            if (Number.isSafeInteger(at) && at! >= 0) {
                plannedAt[plannedKey(day, id)] = at!;
            }
        })
    );
    return Object.keys(plannedAt).length
        ? { days, updatedAt: plan.updatedAt, plannedAt }
        : { days, updatedAt: plan.updatedAt };
}

/** Which day of the week `time` is on the device's calendar, from 0 for Monday. */
export function weekdayOf(time: number): number {
    return (new Date(time).getDay() + 6) % 7;
}

/** The start of `time`'s day on the device's calendar, in ms since the epoch. */
export function startOfDay(time: number): number {
    const date = new Date(time);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The start of the Monday of `time`'s week, on the device's calendar. */
export function startOfWeek(time: number): number {
    const date = new Date(startOfDay(time));
    date.setDate(date.getDate() - weekdayOf(time));
    return date.getTime();
}

/**
 * Where a planned workout is this week (PLN-3): done (it was run that day, finished or
 * stopped), missed (its day has gone by without it), due today, still to come, or from next
 * week (its day had already gone by this week when it was planned, so it isn't counted).
 */
export type PlannedStatus = 'done' | 'missed' | 'today' | 'to come' | 'next week';

export interface PlannedWorkout {
    workoutId: string;
    status: PlannedStatus;
}

/**
 * This week's plan, day by day from Monday, with where each workout planned is (see
 * `PlannedStatus`). Workouts no longer in the library are left out (`exists`).
 */
export function thisWeek(
    plan: WeekPlan,
    entries: readonly Pick<HistoryEntry, 'workoutId' | 'startedAt'>[],
    now: number,
    exists: (workoutId: string) => boolean
): PlannedWorkout[][] {
    const today = weekdayOf(now);
    const monday = startOfWeek(now);
    // Which workouts were run on which day this week
    const ran = new Set<string>();
    for (const entry of entries) {
        if (entry.startedAt >= monday && entry.startedAt <= now) {
            ran.add(`${weekdayOf(entry.startedAt)}/${entry.workoutId}`);
        }
    }
    return plan.days.map((ids, day) =>
        ids.filter(exists).map((workoutId): PlannedWorkout => {
            if (ran.has(`${day}/${workoutId}`)) {
                return { workoutId, status: 'done' };
            }
            if (day === today) {
                return { workoutId, status: 'today' };
            }
            if (day > today) {
                return { workoutId, status: 'to come' };
            }
            // Planned once its day this week had gone by: it starts next week
            const plannedAt = plan.plannedAt?.[plannedKey(day, workoutId)];
            const dayEnded = dayAfter(monday, day);
            return {
                workoutId,
                status: plannedAt !== undefined && plannedAt >= dayEnded ? 'next week' : 'missed',
            };
        })
    );
}

/** The start of the day after `monday`'s `day` (from 0), on the device's calendar. */
function dayAfter(monday: number, day: number): number {
    const date = new Date(monday);
    date.setDate(date.getDate() + day + 1);
    return date.getTime();
}

/** The workouts planned for today and not yet run today (PLN-2), in the plan's order. */
export function dueToday(
    plan: WeekPlan,
    entries: readonly Pick<HistoryEntry, 'workoutId' | 'startedAt'>[],
    now: number,
    exists: (workoutId: string) => boolean
): string[] {
    return thisWeek(plan, entries, now, exists)
        [weekdayOf(now)].filter((planned) => planned.status === 'today')
        .map((planned) => planned.workoutId);
}
