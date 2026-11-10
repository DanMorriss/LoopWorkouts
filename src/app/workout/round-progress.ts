import { GroupSet, runPlan, Side, Workout } from '../models/workout';
import { RoundDot } from './round-dots/round-dots.component';

// Where the run is in its round and its sets, as the round line and Next say it: plain
// functions of the workout, for WorkoutView.

// Above this many rounds, the dots under "round 2 of 20" would wrap on a phone, so only the line shows
const MAX_ROUND_DOTS = 15;

/** Which set it is, e.g. "set 2 of 3", or a superset's round, "superset round 2 of 3". */
export function setText(set: GroupSet): string {
    const count = `${set.set + 1} of ${set.of}`;
    return set.group === 'exercise' ? `set ${count}` : `${set.group} round ${count}`;
}

/** One dot per round, `current` from 0, when there are few enough rounds to fit. */
export function roundDots(total: number, current: number): RoundDot[] {
    if (total > MAX_ROUND_DOTS) {
        return [];
    }
    return Array.from({ length: total }, (_, i) =>
        i === current ? 'current' : i < current ? 'done' : 'left'
    );
}

/** One dot per set, as for rounds, when there are few enough to fit. */
export function setDots(set: GroupSet): RoundDot[] {
    if (set.of > MAX_ROUND_DOTS) {
        return [];
    }
    return Array.from({ length: set.of }, (_, i) =>
        i === set.set ? 'current' : i < set.set ? 'done' : 'left'
    );
}

/**
 * The side of step `stepIndex` of the round, when it's a step's second side in its set:
 * the side before it, maybe with Switch sides between, is the same step and set.
 */
export function secondSide(workout: Workout, stepIndex: number): Side | null {
    const { places } = runPlan(workout);
    const place = places[stepIndex];
    let i = stepIndex - 1;
    while (i >= 0 && places[i] === null) {
        i--;
    }
    const before = places[i];
    return place?.side && before?.step === place.step && before.set === place.set
        ? place.side
        : null;
}

/** Whether step `stepIndex` of the round is the first of its set (or a superset's round). */
export function startsSet(workout: Workout, stepIndex: number): boolean {
    const { places, sets } = runPlan(workout);
    return (
        places.findIndex((place, i) => place !== null && sets[i] === sets[stepIndex]) === stepIndex
    );
}

/** The set step `stepIndex` of the round is in, for an exercise of more than one. */
export function setOf(workout: Workout, stepIndex: number): GroupSet | null {
    const set = runPlan(workout).sets[stepIndex];
    return set && set.of > 1 ? set : null;
}
