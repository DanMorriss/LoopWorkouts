import { HistoryEntry } from './history';
import { startOfWeek } from './plan';

/** One week's workouts, Monday to Sunday on the device's calendar. */
export interface WeekTotal {
    /** The start of its Monday, in ms since the epoch. */
    start: number;
    /** Time spent in its workouts, in whole seconds (pauses don't count). */
    seconds: number;
    workouts: number;
}

/**
 * The time spent working out in each of the last `weeks` weeks, oldest first, ending with
 * the week `now` is in. A workout counts in the week it started, as the history groups it
 * by the day it started. The weeks start no earlier than the first workout's, so someone new
 * isn't shown weeks from before they began; with no workouts there's only this week.
 */
export function timePerWeek(
    entries: readonly Pick<HistoryEntry, 'startedAt' | 'activeSeconds'>[],
    now: number,
    weeks: number
): WeekTotal[] {
    const thisWeek = new Date(startOfWeek(now));
    // The week of the first workout so far, or this week with none
    const firstWeek = startOfWeek(
        Math.min(now, ...entries.filter((e) => e.startedAt <= now).map((e) => e.startedAt))
    );
    const totals = new Map<number, WeekTotal>();
    for (let back = weeks - 1; back >= 0; back--) {
        // By the calendar, not 7 × 24 hours, so a week with a clock change still starts at midnight
        const monday = new Date(thisWeek);
        monday.setDate(monday.getDate() - 7 * back);
        if (monday.getTime() < firstWeek) {
            continue;
        }
        totals.set(monday.getTime(), { start: monday.getTime(), seconds: 0, workouts: 0 });
    }
    for (const entry of entries) {
        const week = totals.get(startOfWeek(entry.startedAt));
        if (week && entry.startedAt <= now) {
            week.seconds += entry.activeSeconds;
            week.workouts += 1;
        }
    }
    return [...totals.values()];
}
