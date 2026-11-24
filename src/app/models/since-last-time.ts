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

/** What Today says of a workout from the history (PRG-17): its lead exercise's top set. */
export interface LastTime {
    /** The exercise's name as it ran, e.g. "Kettlebell swing". */
    name: string;
    mark: Mark;
}

/**
 * The last time a workout was done before `before` (history newest first): its first
 * exercise's top set that time, by its name as it ran, or null if it's never been done with a
 * set logged. The first exercise, as a workout leads with its main lift.
 */
export function lastTime(
    workoutId: string,
    history: readonly HistoryEntry[],
    before = Infinity
): LastTime | null {
    const entry = history.find(
        (one) => one.workoutId === workoutId && one.startedAt < before && one.sets?.length
    );
    const first = entry?.sets?.find((set) => set.name);
    if (!entry || !first) {
        return null;
    }
    const sets = entry.sets!.filter((set) =>
        first.exerciseId !== undefined
            ? set.exerciseId === first.exerciseId
            : set.name === first.name
    );
    return { name: first.name, mark: topSet(sets) };
}

/**
 * A run's new best, if it set one (PRG-2): its first exercise to beat every earlier session,
 * by its name as it ran.
 */
export function newBestIn(entry: HistoryEntry, history: readonly HistoryEntry[]): LastTime | null {
    const best = sinceLastTime(entry, history).find((line) => line.best);
    const set = best && entry.sets?.find((one) => one.exerciseId === best.exerciseId);
    return best && set?.name ? { name: set.name, mark: best.now } : null;
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
