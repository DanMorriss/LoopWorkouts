import {
    endlessRounds,
    roundSeconds,
    RunningWorkout,
    runPlan,
    stepSeconds,
    SWITCH_SIDES,
} from './workout';

/** A rest this long or longer has a timed exercise after it wait for Start. */
export const WAIT_AFTER_REST_SECONDS = 30;

/**
 * A timed exercise that waits for Start: where it is in the run (`position`, as
 * `runPosition()` counts), its round and place in the round, and when it's due on the clock
 * (ms of countdown before it, as `nextRepStep()` has it).
 */
export interface StartWait {
    position: number;
    round: number;
    stepIndex: number;
    atMs: number;
}

/**
 * The first timed exercise after position `after` that waits for Start (with the setting on):
 * one straight after a rest of `WAIT_AFTER_REST_SECONDS` or more, the rest between sets or
 * exercises, or between rounds, so a long rest can run out without the exercise starting
 * before you're ready. A short rest, as in an interval circuit, runs straight on, as does the
 * second side after Switch sides. A workout with a time limit never waits, as it's against
 * the clock. Null if none is left.
 */
export function nextWait(workout: RunningWorkout, after: number): StartWait | null {
    if (workout.timeLimitSeconds !== undefined) {
        return null;
    }
    const { steps } = runPlan(workout);
    const count = steps.length;
    const end = endlessRounds(workout) ? Infinity : workout.repeats * count;
    // Whether a step waits depends only on its place in the round (and the first round's first
    // step has no rest before it), so a round and a step past `after` covers them all
    for (let position = after + 1; position <= after + count + 1 && position < end; position++) {
        const round = Math.floor(position / count);
        const stepIndex = position % count;
        const before = stepIndex > 0 ? steps[stepIndex - 1] : round > 0 ? steps[count - 1] : null;
        const waits =
            steps[stepIndex].kind === 'work' &&
            before?.kind === 'rest' &&
            before.name !== SWITCH_SIDES &&
            before.seconds >= WAIT_AFTER_REST_SECONDS;
        if (waits) {
            const intoRound = steps
                .slice(0, stepIndex)
                .reduce((total, step) => total + stepSeconds(step), 0);
            const atMs = (round * roundSeconds(workout) + intoRound) * 1000;
            return { position, round, stepIndex, atMs };
        }
    }
    return null;
}
