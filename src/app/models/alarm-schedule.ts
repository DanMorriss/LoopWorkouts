import {
    endlessRounds,
    roundSeconds,
    runPlan,
    stepSeconds,
    Workout,
    workoutSeconds,
} from './workout';
import { nextRepStep, timeLimitEnd } from './workout-state';

export type AlarmKind = 'work' | 'rest' | 'finish' | 'countdown';

export interface AlarmEvent {
    kind: AlarmKind;
    /** When it should sound, in ms since the epoch. */
    at: number;
}

/** Seconds before a time limit runs out that a countdown beep sounds. */
export const TIME_LIMIT_COUNTDOWN = [10, 3, 2, 1];

/** Seconds before a timed step or rest ends that a countdown beep sounds, if asked for. */
export const STEP_COUNTDOWN = [3, 2, 1];

/** Steps shorter than this have no countdown, so a short one isn't all beeps. */
export const STEP_COUNTDOWN_MIN_SECONDS = 10;

/**
 * The alarms in a workout, in order: the start of each step, then the finish. Uses the
 * same timings as `workoutStateAt()`, so they line up with the countdown. Rest at the end of
 * the last round has no alarm.
 *
 * A rep step sounds the work alarm as it starts. Nothing after it can be booked, as no one
 * knows when it will be done, so the list stops there; after Done (`repStepsDone` one
 * higher, and `startedAt` moved on) it carries on from the next step. Rep steps already
 * done have no alarm.
 *
 * A workout that runs until stopped has no end, so only the `roundCount` rounds starting
 * at round `fromRound` (counting from 0) are listed; finite workouts stop at their last round.
 *
 * With a time limit, steps stop where time runs out, with a countdown beep before it
 * (`TIME_LIMIT_COUNTDOWN`) and the finish as it does, or, when it runs out part-way through a
 * timed exercise, as that ends (see `timeLimitEnd()`). That moment is known even while a rep
 * step is waited on: `startedAt` plus the limit, less `repMs`, the time off the clock (the
 * time on rep steps already done, less any skipped), as Done moves `startedAt` on by just
 * what it adds to `repMs`, and Skip moves it back by just what it takes off.
 *
 * With `stepCountdown`, each timed step and rest of `STEP_COUNTDOWN_MIN_SECONDS` or more
 * counts down to its end (`STEP_COUNTDOWN`) with the same beep. With a time limit, the
 * limit's own countdown has its last 10 seconds to itself; a last exercise that runs on past
 * it counts down to its end as usual.
 */
export function alarmEvents(
    workout: Workout,
    startedAt: number,
    fromRound = 0,
    roundCount = 100,
    repStepsDone = 0,
    repMs = 0,
    stepCountdown = false
): AlarmEvent[] {
    const roundMs = roundSeconds(workout) * 1000;
    const waitingOn = nextRepStep(workout, repStepsDone);
    const endless = endlessRounds(workout);
    const timeLimited = workout.timeLimitSeconds !== undefined;
    const endRound = endless
        ? fromRound + roundCount
        : Math.min(workout.repeats, fromRound + roundCount);
    // Time runs out at limitMs, and the workout ends at endMs: then, or once the timed
    // exercise it ran out in has run to its end
    const limitMs = timeLimited ? startedAt + workout.timeLimitSeconds! * 1000 - repMs : Infinity;
    const endMs = timeLimited
        ? startedAt + timeLimitEnd(workout, repStepsDone, repMs).endMs
        : startedAt + workoutSeconds(workout) * 1000;
    const events: AlarmEvent[] = [];
    // A step's countdown is quiet for the limit's, and after the end
    const quiet = (at: number) =>
        (at >= limitMs - TIME_LIMIT_COUNTDOWN[0] * 1000 && at <= limitMs) || at >= endMs;
    const timeUp = () => [
        ...TIME_LIMIT_COUNTDOWN.map((seconds) => ({
            kind: 'countdown' as const,
            at: limitMs - seconds * 1000,
        })).filter((event) => event.at > startedAt),
        { kind: 'finish' as const, at: endMs },
    ];

    for (let round = fromRound; round < endRound; round++) {
        let at = startedAt + round * roundMs;
        for (const [stepIndex, step] of runPlan(workout).steps.entries()) {
            if (round === waitingOn?.round && stepIndex === waitingOn.stepIndex) {
                // Rep steps take no time on the clock, so without a time limit one can start
                // right at the end of the countdown, and still needs its alarm
                if (!timeLimited || at < endMs) {
                    events.push({ kind: 'work', at });
                }
                return timeLimited ? [...events, ...timeUp()] : events;
            }
            // Done already, and takes no time on the clock
            if (step.kind === 'reps') {
                continue;
            }
            // Past the end only happens for rest at the end of the last round, or once a
            // time limit has run out
            const seconds = stepSeconds(step);
            if (at < endMs) {
                events.push({ kind: step.kind, at });
                if (stepCountdown && seconds >= STEP_COUNTDOWN_MIN_SECONDS) {
                    events.push(...countdownTo(at + seconds * 1000, quiet));
                }
            }
            at += seconds * 1000;
        }
    }

    if (timeLimited) {
        return [...events, ...timeUp()];
    }
    if (!endless && endRound === workout.repeats) {
        events.push({ kind: 'finish', at: endMs });
    }
    return events;
}

/** A step's countdown beeps, leaving out any that are `quiet`. */
function countdownTo(endsAt: number, quiet: (at: number) => boolean): AlarmEvent[] {
    return STEP_COUNTDOWN.map((seconds) => ({
        kind: 'countdown' as const,
        at: endsAt - seconds * 1000,
    })).filter((event) => !quiet(event.at));
}
