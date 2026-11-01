import { LoggedSet, RepSet, TimedSet } from '../models/history';
import { runPosition, stepAsRunAt, StepSwap } from '../models/step-swap';
import {
    endlessRounds,
    repStepsPerRound,
    roundSeconds,
    runPlan,
    Side,
    Step,
    StepPlace,
    stepSeconds,
    Workout,
    workoutSeconds,
} from '../models/workout';

export type WorkoutPhase = 'work' | 'rest' | 'reps' | 'complete';

export interface WorkoutState {
    phase: WorkoutPhase;
    /** The step in progress (null once complete). */
    step: Step | null;
    /**
     * Which step of the round is in progress, starting at 0. Once complete, 0; or, when time
     * ran out, the step it was on, which isn't done.
     */
    stepIndex: number;
    /** Whole seconds left in the current step (0 for reps, and once complete). */
    remainingSeconds: number;
    /** Length of the current step in seconds (0 for reps, and once complete). */
    phaseSeconds: number;
    /**
     * Rounds left, counting the one in progress (0 once complete; Infinity until stopped, or
     * with a time limit).
     */
    roundsLeft: number;
    /**
     * Which round is in progress, starting at 0. Once complete, equal to repeats; or, when
     * time ran out, the round it was in, so it's also how many full rounds were done.
     */
    round: number;
    /** Exact time spent in the current step so far, in ms (0 once complete). */
    phaseElapsedMs: number;
}

/**
 * A timed step or rest skipped part-way (RUN-12): its round, its place in the round, and how
 * much of it was left, in ms. Skip moves the clock on by that much, to the next step.
 */
export interface StepSkip {
    round: number;
    stepIndex: number;
    skippedMs: number;
}

/**
 * Works out where a workout is from how long it has been running, and how many rep steps
 * have been done.
 *
 * Each round runs the workout's steps in order, and rounds repeat `repeats` times. Rest at
 * the end of the last round is skipped, and a workout that runs until stopped never
 * completes. One with a time limit completes when the time's up: the clock plus `repMs`,
 * the time off the clock (see `WorkoutStore.activeOffClockMs`): the time spent on rep steps
 * already done (the one being waited on is still on the clock), less any time skipped.
 *
 * A rep step takes no time on this clock: the workout stops at the first one not yet done
 * and stays there however long it runs, until Done adds it to `repStepsDone` and moves the
 * start time on (see `WorkoutStore.finishRepStep()`), so the clock picks up where it stopped.
 *
 * Deriving this from elapsed time, rather than counting interval ticks, keeps it correct
 * when the browser slows timers down in a background tab or on a locked phone.
 */
export function workoutStateAt(
    workout: Workout,
    elapsedMs: number,
    repStepsDone = 0,
    repMs = 0
): WorkoutState {
    const elapsedMsClamped = Math.max(0, elapsedMs);

    // Time's up: complete, where it had got to the moment it ran out
    if (workout.timeLimitSeconds !== undefined) {
        const limitMs = workout.timeLimitSeconds * 1000;
        if (elapsedMsClamped + repMs >= limitMs) {
            const { timeLimitSeconds: _limit, ...untimed } = workout;
            const cut = workoutStateAt(untimed, limitMs - repMs, repStepsDone);
            return complete(cut.round, cut.stepIndex);
        }
    }

    const { steps } = runPlan(workout);
    const elapsed = Math.floor(elapsedMsClamped / 1000);
    const roundLength = roundSeconds(workout);

    // Waiting on a rep step, once the clock has reached it
    const repStep = nextRepStep(workout, repStepsDone);
    if (repStep && elapsedMsClamped >= repStep.atMs) {
        return {
            phase: 'reps',
            step: steps[repStep.stepIndex],
            stepIndex: repStep.stepIndex,
            remainingSeconds: 0,
            phaseSeconds: 0,
            roundsLeft: endlessRounds(workout) ? Infinity : workout.repeats - repStep.round,
            round: repStep.round,
            phaseElapsedMs: elapsedMsClamped - repStep.atMs,
        };
    }

    if (elapsed >= workoutSeconds(workout)) {
        return complete(workout.repeats, 0);
    }

    // Short of the next rep step (if any), so every rep step passed is done and takes no
    // time. A round of only rep steps never gets here: the next one is always waiting.
    const round = Math.floor(elapsed / roundLength);
    const intoRound = elapsed % roundLength;

    // Find the step that this second of the round falls in
    let stepStart = 0;
    let stepIndex = 0;
    while (intoRound >= stepStart + stepSeconds(steps[stepIndex])) {
        stepStart += stepSeconds(steps[stepIndex]);
        stepIndex++;
    }
    const step = steps[stepIndex];
    const length = stepSeconds(step);
    const stepStartMs = (round * roundLength + stepStart) * 1000;

    return {
        phase: step.kind,
        step,
        stepIndex,
        remainingSeconds: stepStart + length - intoRound,
        phaseSeconds: length,
        roundsLeft: endlessRounds(workout) ? Infinity : workout.repeats - round,
        round,
        phaseElapsedMs: elapsedMsClamped - stepStartMs,
    };
}

function complete(round: number, stepIndex: number): WorkoutState {
    return {
        phase: 'complete',
        step: null,
        stepIndex,
        remainingSeconds: 0,
        phaseSeconds: 0,
        roundsLeft: 0,
        round,
        phaseElapsedMs: 0,
    };
}

/**
 * The first rep step not yet done: its round, its place in the round, and where it falls
 * on the clock (ms of countdown before it). Null if there are none left.
 */
export function nextRepStep(
    workout: Workout,
    repStepsDone: number
): { round: number; stepIndex: number; atMs: number } | null {
    const perRound = repStepsPerRound(workout);
    if (perRound === 0) {
        return null;
    }
    const round = Math.floor(repStepsDone / perRound);
    if (!endlessRounds(workout) && round >= workout.repeats) {
        return null;
    }
    // Which rep step of the round it is, then which step of the round that is
    let repsToSkip = repStepsDone % perRound;
    let atSeconds = round * roundSeconds(workout);
    for (const [stepIndex, step] of runPlan(workout).steps.entries()) {
        if (step.kind === 'reps') {
            if (repsToSkip === 0) {
                return { round, stepIndex, atMs: atSeconds * 1000 };
            }
            repsToSkip--;
        }
        atSeconds += stepSeconds(step);
    }
    return null;
}

/**
 * How many steps of the round time ran out in were done, rests left out: the 3 of
 * "7 rounds + 3". The step it was on isn't done.
 */
export function stepsIntoRound(workout: Pick<Workout, 'blocks'>, state: WorkoutState): number {
    return runPlan(workout)
        .steps.slice(0, state.stepIndex)
        .filter((step) => step.kind !== 'rest').length;
}

/**
 * Where the step at `stepIndex` of the run's round comes from (see `runPlan()`): null for a
 * rest between a group's rounds, Switch sides, or past the end.
 */
export function placeAt(workout: Pick<Workout, 'blocks'>, stepIndex: number): StepPlace | null {
    return runPlan(workout).places[stepIndex] ?? null;
}

/**
 * A logged set's `set` and `side` fields for its place: `set` left out for a group's first
 * round, as for every set before groups, and `side` for a step not done each side.
 */
export function placeFields({ set, side }: StepPlace): { set?: number; side?: Side } {
    return { ...(set === 0 ? {} : { set }), ...(side === undefined ? {} : { side }) };
}

/** Whether a logged set is of this round and place in it. */
export function isSetAt(set: LoggedSet, round: number, place: StepPlace): boolean {
    return (
        set.round === round &&
        set.step === place.step &&
        (set.set ?? 0) === place.set &&
        set.side === place.side
    );
}

/**
 * The sets a run has done by `state`: its rep sets, as logged on Done, and a timed set for
 * each work step of an exercise that has run to its end, in the order they were done. A
 * step swapped for another exercise part-way (RUN-11) is named as it was at the time, from
 * `swaps`. One skipped part-way (RUN-12, in `skips`) is the time it ran, in whole seconds,
 * and isn't a set if that's under one.
 */
export function setsDone(
    workout: Workout,
    state: WorkoutState,
    repSets: readonly RepSet[],
    swaps: readonly StepSwap[] = [],
    skips: readonly StepSkip[] = []
): LoggedSet[] {
    const { steps, places } = runPlan(workout);
    const skipped = new Map(skips.map((skip) => [`${skip.round}/${skip.stepIndex}`, skip]));
    const timed: TimedSet[] = [];
    // Once complete, `round` is the rounds there were and `stepIndex` 0, so all of them count;
    // when time ran out, the steps before the one it was on count, and that one doesn't
    for (let round = 0; round <= state.round; round++) {
        const stepsDone = round < state.round ? steps.length : state.stepIndex;
        steps.slice(0, stepsDone).forEach((step, stepIndex) => {
            const place = places[stepIndex];
            const asRun = place
                ? stepAsRunAt(swaps, place.step, runPosition(round, stepIndex, steps.length))
                : undefined;
            const { name, exerciseId } = asRun ?? step;
            if (step.kind === 'work' && exerciseId !== undefined && place) {
                const skippedMs = skipped.get(`${round}/${stepIndex}`)?.skippedMs ?? 0;
                const seconds = Math.floor((step.seconds * 1000 - skippedMs) / 1000);
                if (seconds < 1) {
                    return;
                }
                timed.push({
                    round,
                    step: place.step,
                    ...placeFields(place),
                    name,
                    seconds,
                    exerciseId,
                });
            }
        });
    }
    if (timed.length === 0) {
        return [...repSets];
    }
    // In the order they ran: by round, then by where they come in it
    const order = new Map(
        places.map((place, i) => [place && `${place.step}/${place.set}/${place.side}`, i] as const)
    );
    const at = (set: LoggedSet) => order.get(`${set.step}/${set.set ?? 0}/${set.side}`) ?? set.step;
    return [...repSets, ...timed].sort((a, b) => a.round - b.round || at(a) - at(b));
}
