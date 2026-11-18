import { AlarmEvent, STEP_COUNTDOWN, STEP_COUNTDOWN_MIN_SECONDS } from './alarm-schedule';
import { runPlan, RunningWorkout, Step } from './workout';
import { WorkoutState } from './workout-state';

/**
 * An exercise skipped part of the way through a run, put aside to do later (RUN-16): its
 * round, and its place in the round's run plan (see `runPlan()`).
 */
export interface LaterStep {
    round: number;
    stepIndex: number;
}

/**
 * Steps put aside and picked to do next, in order: they run one after another once the clock
 * is at `atMs`, the end of the step they were picked in, and `repStepsDone` rep steps are
 * done (one more than then, when that was a rep step, as its end is Done). The clock holds
 * there while they run, as it does at a rep step, and moves on by the time each took.
 */
export interface LaterQueue {
    atMs: number;
    repStepsDone: number;
    steps: LaterStep[];
}

/** A timed exercise done later, and how long it ran, in ms, for its set. */
export interface DoneLater extends LaterStep {
    ranMs: number;
}

/** What a run has put aside, picked to do next and done later (RUN-16). */
export interface RunLater {
    /** Skipped exercises waiting to be done, in the order they were skipped. */
    aside: LaterStep[];
    /** Those picked to do next, if any. */
    queue: LaterQueue | null;
    /**
     * Time spent on steps done later (or skipped again part-way), timed ones and rep steps
     * skipped, in ms. It's off the clock, as the time on rep steps is (see
     * `WorkoutStore.activeOffClockMs`); the time on a rep step done later counts as rep time.
     */
    ms: number;
    /** Timed exercises done later, for their sets. */
    done: DoneLater[];
}

export const NO_LATER: RunLater = { aside: [], queue: null, ms: 0, done: [] };

export function sameStep(a: LaterStep, b: LaterStep): boolean {
    return a.round === b.round && a.stepIndex === b.stepIndex;
}

/** `step` put aside, at the end of the list, unless it's there already. */
export function putAside(later: RunLater, step: LaterStep): RunLater {
    const queued = later.queue?.steps.some((other) => sameStep(other, step));
    return later.aside.some((other) => sameStep(other, step)) || queued
        ? later
        : { ...later, aside: [...later.aside, { round: step.round, stepIndex: step.stepIndex }] };
}

/** The step a later one runs as: its own in the run plan. */
export function laterPlanStep(workout: RunningWorkout, step: LaterStep): Step | undefined {
    return runPlan(workout).steps[step.stepIndex];
}

/** How long a step done later takes on the clock: a timed one's time, or null for reps. */
function laterLengthMs(workout: RunningWorkout, step: LaterStep): number | null {
    const planned = laterPlanStep(workout, step);
    return planned?.kind === 'work' ? planned.seconds * 1000 : null;
}

/** Whether the queue has been reached: the clock's at its place, and the rep steps before it done. */
function reached(queue: LaterQueue, clockMs: number, repStepsDone: number): boolean {
    return clockMs >= queue.atMs && repStepsDone >= queue.repStepsDone;
}

/**
 * Where a run is with steps picked to do next taken into account, from `clockMs`, how long
 * its clock has run: the clock as the workout has it, held at the queue's place while they
 * run, and less the time of those that have run already; and the step done later that's on
 * now, if any, with how long it's been going. A timed one ends on its own, and a rep step
 * with Done, so nothing after one is known till then.
 */
export function laterAt(
    workout: RunningWorkout,
    queue: LaterQueue | null,
    clockMs: number,
    repStepsDone: number
): { clockMs: number; on: { step: LaterStep; ms: number; first: boolean } | null } {
    if (!queue || !reached(queue, clockMs, repStepsDone)) {
        return { clockMs, on: null };
    }
    let ms = clockMs - queue.atMs;
    let ran = 0;
    for (const [i, step] of queue.steps.entries()) {
        const length = laterLengthMs(workout, step);
        if (length === null || ms < length) {
            return { clockMs: queue.atMs, on: { step, ms, first: i === 0 } };
        }
        ms -= length;
        ran += length;
    }
    return { clockMs: clockMs - ran, on: null };
}

/**
 * The timed step at the front of the queue, once it's run its full time on `clockMs`: to be
 * taken off it, with the clock moved on by its length (see `ActiveRunService.sync()`).
 */
export function laterRunOut(
    workout: RunningWorkout,
    queue: LaterQueue | null,
    clockMs: number,
    repStepsDone: number
): DoneLater | null {
    const first = queue?.steps[0];
    if (!queue || !first || !reached(queue, clockMs, repStepsDone)) {
        return null;
    }
    const length = laterLengthMs(workout, first);
    return length !== null && clockMs - queue.atMs >= length ? { ...first, ranMs: length } : null;
}

/** `later` with the step at the front of its queue done with: off the queue, and the list. */
export function passFirst(later: RunLater): RunLater {
    const rest = later.queue?.steps.slice(1) ?? [];
    return {
        ...later,
        queue: later.queue && rest.length > 0 ? { ...later.queue, steps: rest } : null,
    };
}

/**
 * The state of a step done later, `ms` into it, shown as the step it was (its round and
 * place, so its set is logged there), with the rounds left of `clock`, where the run is.
 */
export function laterState(
    workout: RunningWorkout,
    step: LaterStep,
    ms: number,
    clock: WorkoutState
): WorkoutState | null {
    const planned = laterPlanStep(workout, step);
    if (!planned || planned.kind === 'rest') {
        return null;
    }
    const seconds = planned.kind === 'work' ? planned.seconds : 0;
    return {
        phase: planned.kind,
        step: planned,
        stepIndex: step.stepIndex,
        remainingSeconds: planned.kind === 'work' ? seconds - Math.floor(ms / 1000) : 0,
        phaseSeconds: seconds,
        roundsLeft: clock.roundsLeft,
        round: step.round,
        phaseElapsedMs: ms,
        later: true,
    };
}

/**
 * The run's alarms (`events`, booked from `startedAt` as `alarmEvents()` has them) with the
 * steps picked to do next in: each one's start, and a timed one's countdown (with
 * `stepCountdown`), with everything after their place moved on by the time they take. Nothing
 * after a rep step done later is known till Done, so the list stops there.
 */
export function withLaterAlarms(
    events: readonly AlarmEvent[],
    workout: RunningWorkout,
    queue: LaterQueue | null,
    startedAt: number,
    repStepsDone: number,
    stepCountdown: boolean
): AlarmEvent[] {
    if (!queue || repStepsDone < queue.repStepsDone) {
        return [...events];
    }
    const at = startedAt + queue.atMs;
    const before = events.filter((event) => event.at < at);
    const added: AlarmEvent[] = [];
    let start = at;
    for (const step of queue.steps) {
        added.push({ kind: 'work', at: start });
        const length = laterLengthMs(workout, step);
        if (length === null) {
            return [...before, ...added];
        }
        if (stepCountdown && length >= STEP_COUNTDOWN_MIN_SECONDS * 1000) {
            for (const seconds of STEP_COUNTDOWN) {
                added.push({ kind: 'countdown', at: start + length - seconds * 1000 });
            }
        }
        start += length;
    }
    const after = events
        .filter((event) => event.at >= at)
        .map((event) => ({ ...event, at: event.at + start - at }));
    return [...before, ...added, ...after];
}

/** What's saved of a run's steps done later, read back, with anything broken left out. */
export function readLater(saved: string | null): RunLater {
    try {
        const value = JSON.parse(saved ?? 'null') as Partial<
            Record<keyof RunLater, unknown>
        > | null;
        const queue = value?.queue as Partial<Record<keyof LaterQueue, unknown>> | null;
        const steps = readSteps(queue?.steps);
        return {
            aside: readSteps(value?.aside),
            queue:
                isCount(queue?.atMs) && isCount(queue.repStepsDone) && steps.length > 0
                    ? { atMs: queue.atMs, repStepsDone: queue.repStepsDone, steps }
                    : null,
            ms: isCount(value?.ms) ? value.ms : 0,
            done: readSteps(value?.done, true) as DoneLater[],
        };
    } catch {
        return NO_LATER;
    }
}

/** The steps in `value`, if it's a list; with `ran`, done later, each with how long it ran. */
function readSteps(value: unknown, ran = false): LaterStep[] {
    return Array.isArray(value)
        ? value.flatMap((step: Partial<DoneLater> | null) =>
              isCount(step?.round) && isCount(step.stepIndex) && (!ran || isCount(step.ranMs))
                  ? [
                        ran
                            ? { round: step.round, stepIndex: step.stepIndex, ranMs: step.ranMs }
                            : { round: step.round, stepIndex: step.stepIndex },
                    ]
                  : []
          )
        : [];
}

function isCount(value: unknown): value is number {
    return Number.isSafeInteger(value) && (value as number) >= 0;
}
