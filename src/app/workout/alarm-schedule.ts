import {
    endlessRounds,
    roundSeconds,
    runPlan,
    stepSeconds,
    Workout,
    workoutSeconds,
} from '../models/workout';
import { nextRepStep } from './workout-state';

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
 * (`TIME_LIMIT_COUNTDOWN`) and the finish as it does. That moment is known even while a rep
 * step is waited on: `startedAt` plus the limit, less `repMs`, the time on rep steps already
 * done, as Done moves `startedAt` on by just what it adds to `repMs`.
 *
 * With `stepCountdown`, each timed step and rest of `STEP_COUNTDOWN_MIN_SECONDS` or more
 * counts down to its end (`STEP_COUNTDOWN`) with the same beep. With a time limit, the
 * limit's own countdown has its last 10 seconds to itself.
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
    const endMs = timeLimited
        ? startedAt + workout.timeLimitSeconds! * 1000 - repMs
        : startedAt + workoutSeconds(workout) * 1000;
    const events: AlarmEvent[] = [];
    const quietFrom = timeLimited ? endMs - TIME_LIMIT_COUNTDOWN[0] * 1000 : Infinity;
    const timeUp = () => [
        ...TIME_LIMIT_COUNTDOWN.map((seconds) => ({
            kind: 'countdown' as const,
            at: endMs - seconds * 1000,
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
                    events.push(...countdownTo(at + seconds * 1000, quietFrom));
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

/** A step's countdown beeps, leaving out any from `quietFrom` on. */
function countdownTo(endsAt: number, quietFrom: number): AlarmEvent[] {
    return STEP_COUNTDOWN.map((seconds) => ({
        kind: 'countdown' as const,
        at: endsAt - seconds * 1000,
    })).filter((event) => event.at < quietFrom);
}
