import { HistoryEntry, isTimedSet, LoggedSet } from './history';
import { exerciseBests, sessionsByExercise } from './progress';

/** A set as the summary compares it: its weight and reps, or a timed set's seconds. */
export interface Mark {
    weight?: number;
    reps?: number;
    seconds?: number;
}

/**
 * How an exercise in a run did against the times before it (PRG-2), for the workout summary's
 * card: a new best, with the best it beat, or, without one, its top set beside last time's.
 * Measured as the exercise's bests are: by weight where there was one, then reps, then time.
 */
export interface SinceLastTime {
    exerciseId: string;
    /** A new best: `now` beat every earlier session's, `before` the best it beat. */
    best: boolean;
    now: Mark;
    /** The earlier best, for a new one; otherwise last time's top set. */
    before: Mark;
}

/**
 * Each exercise `entry` did that had been done before, in the order it first did them, against
 * the history before it (`history`, newest first, which may include `entry`). An exercise done
 * for the first time has nothing to compare with, so it's left out.
 */
export function sinceLastTime(
    entry: HistoryEntry,
    history: readonly HistoryEntry[]
): SinceLastTime[] {
    const earlier = sessionsByExercise(
        history.filter((other) => other.id !== entry.id && other.startedAt < entry.startedAt)
    );
    const lines: SinceLastTime[] = [];
    for (const [exerciseId, [session]] of sessionsByExercise([entry])) {
        const before = earlier.get(exerciseId);
        if (!before?.length) {
            continue;
        }
        const now = topSet(session.sets);
        const was = exerciseBests(before);
        const best =
            now.weight !== undefined
                ? beats(
                      now,
                      was.heaviest && { weight: was.heaviest.weight, reps: was.heaviest.reps }
                  )
                : now.reps !== undefined
                  ? beats(now, was.mostReps && { reps: was.mostReps.reps })
                  : beats(now, was.longest && { seconds: was.longest.seconds });
        lines.push(
            best
                ? { exerciseId, best: true, now, before: best }
                : { exerciseId, best: false, now, before: topSet(before[0].sets) }
        );
    }
    return lines;
}

/**
 * A run's top set of an exercise: the heaviest (most reps at it) where any had a weight, then
 * the most reps, then the longest held.
 */
function topSet(sets: readonly LoggedSet[]): Mark {
    let top: Mark = {};
    for (const set of sets) {
        if (isTimedSet(set)) {
            if (top.reps === undefined && set.seconds > (top.seconds ?? 0)) {
                top = { seconds: set.seconds };
            }
        } else if (set.weight !== undefined) {
            if (
                top.weight === undefined ||
                set.weight > top.weight ||
                (set.weight === top.weight && set.reps > (top.reps ?? 0))
            ) {
                top = { weight: set.weight, reps: set.reps };
            }
        } else if (top.weight === undefined && set.reps > (top.reps ?? 0)) {
            top = { reps: set.reps };
        }
    }
    return top;
}

/** The earlier best `now` beats, if it does: more weight, or more reps at the same, or more. */
function beats(now: Mark, was: Mark | undefined): Mark | null {
    if (!was) {
        return null;
    }
    if (now.weight !== undefined) {
        if (was.weight === undefined) {
            return null;
        }
        const more =
            now.weight > was.weight || (now.weight === was.weight && now.reps! > was.reps!);
        return more ? was : null;
    }
    if (now.reps !== undefined) {
        return was.reps !== undefined && now.reps > was.reps ? was : null;
    }
    return was.seconds !== undefined && now.seconds! > was.seconds ? was : null;
}
