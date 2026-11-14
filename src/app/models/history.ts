import { Synced } from './sync';
import { MAX_WEIGHT_KG } from './weight';
import type { ExpectedTime } from './workout-estimate';
import { MAX_STEP_SECONDS, PlacedHeading, PlacedSuperset, Side } from './workout';

/** One workout in the history: a workout run that finished, or was stopped part-way. */
export interface HistoryEntry extends Synced {
    /** Unique per run: the run's start time and the workout's id. */
    id: string;
    workoutId: string;
    /** The workout's title when it ran (it may be renamed or deleted later). */
    title: string;
    /** When the run began, in ms since the epoch. */
    startedAt: number;
    /** When it finished or was stopped, in ms since the epoch. */
    endedAt: number;
    /** Time spent running, in whole seconds; pauses don't count. */
    activeSeconds: number;
    /** Full rounds done. */
    roundsCompleted: number;
    /** Rounds the workout was set to, or 0 for one that runs until stopped or to a time limit. */
    totalRounds: number;
    /** The workout's time limit, in whole seconds. Missing for none. */
    timeLimitSeconds?: number;
    /**
     * With a time limit it ran out of, the steps done of the round it ran out in, rests left
     * out: the 3 of "7 rounds + 3". Missing otherwise.
     */
    stepsIntoRound?: number;
    outcome: 'finished' | 'stopped';
    /** A short line of the user's own, e.g. "felt strong". Missing when there isn't one. */
    note?: string;
    /**
     * The sets done, in the order they were done: one per Done on a rep step, and one per
     * timed work step of an exercise that ran to its end. Missing when there were none.
     */
    sets?: LoggedSet[];
    /**
     * The workout's headings as they were when it ran, each with the number of the first step
     * after it, so its sets can be grouped under them (BLD-13). Missing for none.
     */
    headings?: PlacedHeading[];
    /**
     * The workout's supersets and giant sets as they were when it ran, each with the steps
     * it covers, so their sets can be grouped under them (BLD-12). Missing for none.
     */
    supersets?: PlacedSuperset[];
    /**
     * How long the workout, as it was when it ran, was expected to take: its clock and the guess
     * for its rep steps, so the estimate can learn your pace from what it really took. Missing
     * for one that runs until stopped or to a time limit, and in runs from before estimates.
     */
    expected?: ExpectedTime;
}

/** Long enough for a line about how it went, short enough to sit under the entry. */
export const MAX_NOTE_LENGTH = 120;

export function historyId(startedAt: number, workoutId: string): string {
    return `${startedAt}-${workoutId}`;
}

/** One set: reps (with a weight where there was one), or a time held, e.g. a plank. */
export type LoggedSet = RepSet | TimedSet;

/** One set of a rep step, logged when Done is pressed. */
export interface RepSet {
    /** Which round of the whole workout it was in, from 0. */
    round: number;
    /** Which step of the workout it was, from 0, counting each once (see `allSteps()`). */
    step: number;
    /** Which round of its group (set of its exercise) it was, from 0. Missing means 0. */
    set?: number;
    /** Which side, for a step done each side (BLD-10); missing for one that isn't. */
    side?: Side;
    /** The step's name as it ran; empty when it has none. */
    name: string;
    reps: number;
    /** In kg, as on the step. Missing for none. */
    weight?: number;
    /** The exercise it was, so its history can be followed. Missing for an unnamed step. */
    exerciseId?: string;
}

/**
 * One timed work step of an exercise that ran to its end, or was skipped part-way (RUN-12). A
 * step stopped part-way isn't a set, and nor is an unnamed or rest step, which isn't an
 * exercise.
 */
export interface TimedSet {
    round: number;
    step: number;
    set?: number;
    side?: Side;
    name: string;
    /** How long it ran: the step's whole length, or up to where it was skipped. */
    seconds: number;
    exerciseId?: string;
}

export function isTimedSet(set: LoggedSet): set is TimedSet {
    return 'seconds' in set;
}

/**
 * Whether a saved value is a usable set: whole rounds, steps and reps (or seconds), and a
 * sane weight.
 */
export function isLoggedSet(value: unknown): value is LoggedSet {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const set = value as Record<string, unknown>;
    const whole = (n: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
        Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
    const weight = set['weight'];
    const measured =
        'seconds' in set
            ? whole(set['seconds'], 1, MAX_STEP_SECONDS) &&
              set['reps'] === undefined &&
              weight === undefined
            : whole(set['reps'], 1) &&
              (weight === undefined ||
                  (typeof weight === 'number' && weight > 0 && weight <= MAX_WEIGHT_KG));
    return (
        whole(set['round'], 0) &&
        whole(set['step'], 0) &&
        (set['set'] === undefined || whole(set['set'], 0)) &&
        (set['side'] === undefined || set['side'] === 'left' || set['side'] === 'right') &&
        typeof set['name'] === 'string' &&
        measured &&
        (set['exerciseId'] === undefined || typeof set['exerciseId'] === 'string')
    );
}
