import { counted } from '../shared/format-count';
import { HistoryEntry, isTimedSet, RepSet } from './history';
import { endlessRounds, RunningWorkout, runPlan, workoutSeconds } from './workout';

/**
 * How long a workout is expected to take, in whole seconds, in two parts: its clock (timed
 * steps and rests, which take exactly that) and its rep steps, which take as long as they
 * take, so are a guess.
 */
interface ExpectedTime {
    timedSeconds: number;
    repSeconds: number;
}

/** The guess for a rep: about 3 seconds, a steady pace with a little pause between. */
const SECONDS_PER_REP = 3;
/** And for getting into place before a set of reps, e.g. picking up the weights. */
const SECONDS_PER_REP_SET = 5;

/**
 * How many of a workout's latest runs its pace is taken from, so it follows how you
 * do it now rather than how you did months ago.
 */
const PACE_RUNS = 3;

/**
 * The slowest and quickest a pace on rep steps is taken as, against the guess, so a run left
 * waiting on Done (or a step skipped straight away) can't make the estimate silly.
 */
const PACE_RANGE = { min: 0.25, max: 4 };

/** The guess for one set of reps, e.g. 10 reps: 35 seconds. Each side of one is a set. */
function repSetSeconds(reps: number): number {
    return reps * SECONDS_PER_REP + SECONDS_PER_REP_SET;
}

/**
 * A workout's expected time, as it is now, or null for one whose rounds aren't counted (until
 * stopped, or a time limit), which has no end to expect. A step done each side counts twice,
 * with Switch sides between a timed one's, as `sides` has them.
 */
function expectedTime(
    workout: Pick<RunningWorkout, 'blocks' | 'repeats' | 'sides'>
): ExpectedTime | null {
    if (endlessRounds(workout)) {
        return null;
    }
    const repsPerRound = runPlan(workout).steps.reduce(
        (total, step) => (step.kind === 'reps' ? total + repSetSeconds(step.reps) : total),
        0
    );
    return {
        timedSeconds: workoutSeconds(workout),
        repSeconds: workout.repeats * repsPerRound,
    };
}

/** What a run's pace is worked out from: the time it spent on rep steps, and its sets. */
export type PacedRun = Pick<HistoryEntry, 'repSeconds' | 'sets'>;

/**
 * Your pace on a workout's rep steps against the guess, e.g. 1.5 for half as long again, from
 * the median of its latest runs (newest first, as the history keeps them) that logged their
 * time on rep steps and did some; null with none. Each run's is its time on rep steps
 * (`HistoryEntry.repSeconds`, pauses left out) against the guess for the sets of reps it
 * logged, so a step skipped, a run stopped part-way or one to a time limit counts only what
 * was done.
 */
export function repPace(runs: readonly PacedRun[]): number | null {
    const paces = runs
        .flatMap(({ repSeconds, sets = [] }) => {
            const guess = sets
                .filter((set): set is RepSet => !isTimedSet(set))
                .reduce((total, set) => total + repSetSeconds(set.reps), 0);
            return repSeconds !== undefined && guess > 0 ? [clamp(repSeconds / guess)] : [];
        })
        .slice(0, PACE_RUNS)
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
 * `yours` has them at your pace from your runs, so it's how long it takes you; a `limit`
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
    runs: readonly PacedRun[]
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
