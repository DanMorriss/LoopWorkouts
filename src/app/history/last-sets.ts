import { HistoryEntry, isTimedSet, RepSet } from '../models/history';

/**
 * The rep sets of an exercise from the most recent workout in `entries` (newest first) with
 * any, leaving out `runId`, the run in progress, which is in the history once it's ended.
 */
export function lastRepSets(
    entries: readonly HistoryEntry[],
    exerciseId: string,
    runId: string | null
): RepSet[] {
    for (const entry of entries) {
        const sets = (entry.sets ?? []).filter(
            (set): set is RepSet => !isTimedSet(set) && set.exerciseId === exerciseId
        );
        if (entry.id !== runId && sets.length > 0) {
            return sets;
        }
    }
    return [];
}
