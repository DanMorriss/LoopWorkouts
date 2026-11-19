import { RunLater, LaterStep, sameStep } from './later';
import { RunningWorkout } from './workout';
import { placeAt, WorkoutState } from './workout-state';

// Picking what's put aside to do later (RUN-16): only on the workout page, so not in the first
// download with the rest of the run (see later.ts)

/**
 * Whether a step skipped at `state` is put aside to do later: an exercise, named, timed or
 * reps. Not a rest or Switch sides, and not in a workout with a time limit, where a skip's
 * time goes to more rounds instead.
 */
export function canPutAside(workout: RunningWorkout, state: WorkoutState): boolean {
    const step = state.step;
    return (
        workout.timeLimitSeconds === undefined &&
        !state.later &&
        (state.phase === 'work' || state.phase === 'reps') &&
        !!step?.name &&
        placeAt(workout, state.stepIndex) !== null
    );
}

/**
 * `later` with `step` picked to do next, from `state`, the step on now (`clock`, where the
 * clock is): straight after it, or, when it's a step done later itself, after that one.
 * Steps picked before and not yet started follow it. Taken off the list put aside.
 */
export function pickNext(
    later: RunLater,
    step: LaterStep,
    state: WorkoutState,
    clock: { elapsedMs: number; repStepsDone: number }
): RunLater {
    const aside = later.aside.filter((other) => !sameStep(other, step));
    const picked = { round: step.round, stepIndex: step.stepIndex };
    if (state.later && later.queue) {
        const [on, ...rest] = later.queue.steps;
        return { ...later, aside, queue: { ...later.queue, steps: [on, picked, ...rest] } };
    }
    const atMs = clock.elapsedMs - state.phaseElapsedMs + state.phaseSeconds * 1000;
    const repStepsDone = clock.repStepsDone + (state.phase === 'reps' ? 1 : 0);
    const queued = later.queue?.atMs === atMs ? later.queue.steps : [];
    // A queue from somewhere else (it can't be, but if) goes back on the list
    const stale = later.queue && later.queue.atMs !== atMs ? later.queue.steps : [];
    return {
        ...later,
        aside: [...aside, ...stale],
        queue: { atMs, repStepsDone, steps: [picked, ...queued] },
    };
}

/** `later` with `step` taken off the queue, before it's started, and back on the list. */
export function unpick(later: RunLater, step: LaterStep): RunLater {
    const steps = later.queue?.steps.filter((other) => !sameStep(other, step)) ?? [];
    if (steps.length === later.queue?.steps.length) {
        return later;
    }
    return {
        ...later,
        aside: [...later.aside, step],
        queue: later.queue && steps.length > 0 ? { ...later.queue, steps } : null,
    };
}
