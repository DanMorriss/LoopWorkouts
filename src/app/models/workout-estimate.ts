import { counted } from '../shared/format-count';
import type { HistoryEntry } from './history';
import { endlessRounds, RunningWorkout, runPlan, workoutSeconds } from './workout';

/**
 * How long a run of a workout is expected to take, in whole seconds, in two parts: its clock
 * (timed steps and rests, which take exactly that) and its rep steps, which take as long as
 * they take, so are a guess. Kept on each run in the history (`HistoryEntry.expected`), so
 * what it really took can be set against what was expected of the workout as it was then.
 */
export interface ExpectedTime {
    timedSeconds: number;
    repSeconds: number;
}

/** The guess for a rep: about 3 seconds, a steady pace with a little pause between. */
const SECONDS_PER_REP = 3;
/** And for getting into place before a set of reps, e.g. picking up the weights. */
const SECONDS_PER_REP_SET = 5;

/**
 * How many of a workout's latest finished runs its pace is taken from, so it follows how you
 * do it now rather than how you did months ago.
 */
const PACE_RUNS = 3;

/**
 * The slowest and quickest a pace on rep steps is taken as, against the guess, so a run left
 * waiting on Done (or a step skipped straight away) can't make the estimate silly.
 */
const PACE_RANGE = { min: 0.25, max: 4 };

/**
 * A workout's expected time, as it is now, or null for one whose rounds aren't counted (until
 * stopped, or a time limit), which has no end to expect. A step done each side counts twice,
 * with Switch sides between a timed one's, as `sides` has them.
 */
export function expectedTime(
    workout: Pick<RunningWorkout, 'blocks' | 'repeats' | 'sides'>
): ExpectedTime | null {
    if (endlessRounds(workout)) {
        return null;
    }
    const repsPerRound = runPlan(workout).steps.reduce(
        (total, step) =>
            step.kind === 'reps'
                ? total + step.reps * SECONDS_PER_REP + SECONDS_PER_REP_SET
                : total,
        0
    );
    return {
        timedSeconds: workoutSeconds(workout),
        repSeconds: workout.repeats * repsPerRound,
    };
}

/**
 * Your pace on a workout's rep steps against the guess, e.g. 1.5 for half as long again, from
 * the median of its latest finished runs (newest first, as the history keeps them) that
 * kept what was expected of them and had rep steps; null with none. A run's time on rep steps
 * is its time, pauses left out, less its clock.
 */
export function repPace(
    runs: readonly Pick<HistoryEntry, 'outcome' | 'activeSeconds' | 'expected'>[]
): number | null {
    const paces = runs
        .filter(
            (run): run is typeof run & { expected: ExpectedTime } =>
                run.outcome === 'finished' && (run.expected?.repSeconds ?? 0) > 0
        )
        .slice(0, PACE_RUNS)
        .map(({ activeSeconds, expected }) =>
            clamp((activeSeconds - expected.timedSeconds) / expected.repSeconds)
        )
        .sort((a, b) => a - b);
    if (paces.length === 0) {
        return null;
    }
    const middle = Math.floor(paces.length / 2);
    return paces.length % 2 ? paces[middle] : (paces[middle - 1] + paces[middle]) / 2;
}

function clamp(pace: number): number {
    return Math.min(PACE_RANGE.max, Math.max(PACE_RANGE.min, pace));
}

/**
 * How long a workout will take: `seconds`, and what it's from. A `clock` is all timed steps
 * and rests, which take that long whoever does them; a `guess` has rep steps, guessed at;
 * `yours` has them at your pace from finished runs, so it's how long it takes you; a `limit`
 * is its time limit, exactly.
 */
export interface Estimate {
    seconds: number;
    basis: EstimateBasis;
}

export type EstimateBasis = 'clock' | 'guess' | 'yours' | 'limit';

/**
 * How long `workout` will take, as it is now, from its steps and your pace on its rep steps
 * in `runs` (its own, newest first), so adding an exercise or changing its sets changes the
 * estimate at once, keeping your pace. Null for one that runs until stopped.
 */
export function estimateWorkout(
    workout: Pick<RunningWorkout, 'blocks' | 'repeats' | 'sides' | 'timeLimitSeconds'>,
    runs: readonly Pick<HistoryEntry, 'outcome' | 'activeSeconds' | 'expected'>[]
): Estimate | null {
    if (workout.timeLimitSeconds !== undefined) {
        return { seconds: workout.timeLimitSeconds, basis: 'limit' };
    }
    const expected = expectedTime(workout);
    if (!expected) {
        return null;
    }
    if (expected.repSeconds === 0) {
        return { seconds: expected.timedSeconds, basis: 'clock' };
    }
    const pace = repPace(runs);
    return {
        seconds: Math.round(expected.timedSeconds + expected.repSeconds * (pace ?? 1)),
        basis: pace === null ? 'guess' : 'yours',
    };
}

/**
 * An estimate as it's shown, in whole minutes: "About 25 min", "About 1 hr 5 min", "Under a
 * minute", or a time limit's "20 min"; and as screen readers hear it, "about 25 minutes".
 */
export function estimateText(estimate: Estimate): { text: string; spoken: string } {
    const minutes = Math.round(estimate.seconds / 60);
    if (minutes === 0) {
        return { text: 'Under a minute', spoken: 'under a minute' };
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const short = [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
    const long = [h ? counted(h, 'hour') : '', m ? counted(m, 'minute') : '']
        .filter(Boolean)
        .join(' ');
    return estimate.basis === 'limit'
        ? { text: short, spoken: long }
        : { text: `About ${short}`, spoken: `about ${long}` };
}
