import { Synced } from './sync';
import { MAX_WEIGHT_KG } from './weight';
import { MAX_STEP_SECONDS, PlacedHeading, PlacedSuperset, RepSetAmount, Side } from './workout';

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
     * Time spent on rep steps, in whole seconds, pauses left out, so the estimate of how long
     * the workout takes can learn your pace from its sets of reps (LIB-9). Missing with no
     * rep steps, and in runs from before 2026-11-14.
     */
    repSeconds?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the last 7 days began: what "this week" means on Progress and Today (not the plan's). */
export function lastSevenDaysFrom(now: number): number {
    return now - 7 * DAY_MS;
}

/** The runs started in the 7 × 24 hours up to `now`. */
export function inLastSevenDays<T extends Pick<HistoryEntry, 'startedAt'>>(
    entries: readonly T[],
    now: number
): T[] {
    const from = lastSevenDaysFrom(now);
    return entries.filter((entry) => entry.startedAt >= from);
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
 * A step's rep sets, to correct them (on the workout summary, or a workout on Progress): where
 * each is in `sets`, its reps and weight (kg), and its name, in the order done: "Set 2", or
 * "Set 2, left" for an exercise done each side. Timed sets ran as set, so aren't among them.
 */
export function repSetsOfStep(
    sets: readonly LoggedSet[],
    step: number
): { indexes: number[]; amounts: RepSetAmount[]; names: string[] } {
    const indexes = sets.flatMap((set, index) =>
        set.step === step && !isTimedSet(set) ? [index] : []
    );
    const repSets = indexes.map((index) => sets[index] as RepSet);
    return {
        indexes,
        amounts: repSets.map(({ reps, weight }) => ({
            reps,
            ...(weight === undefined ? {} : { weight }),
        })),
        names: repSets.map(({ side }, i) => {
            const number = repSets.slice(0, i).filter((other) => other.side === side).length + 1;
            return `Set ${number}${side ? `, ${side}` : ''}`;
        }),
    };
}

/** A set corrected: where it is in the sets, and its reps and weight (kg, missing for none). */
export interface SetChange {
    index: number;
    reps: number;
    weight?: number;
}

/** The sets at `indexes` whose reps or weight `amounts` change, as changes to make. */
export function setChanges(
    sets: readonly LoggedSet[],
    indexes: readonly number[],
    amounts: readonly RepSetAmount[]
): SetChange[] {
    return indexes.flatMap((index, i) => {
        const set = sets[index];
        const amount = amounts[i];
        if (!set || isTimedSet(set) || !amount) {
            return [];
        }
        return set.reps === amount.reps && set.weight === amount.weight
            ? []
            : [
                  {
                      index,
                      reps: amount.reps,
                      ...(amount.weight === undefined ? {} : { weight: amount.weight }),
                  },
              ];
    });
}

/** `sets` with the changes made: each changed set's reps and weight, the rest as they were. */
export function withSetChanges(
    sets: readonly LoggedSet[],
    changes: readonly SetChange[]
): LoggedSet[] {
    return sets.map((set, index) => {
        const change = changes.find((c) => c.index === index);
        if (!change || isTimedSet(set)) {
            return set;
        }
        const { weight: _old, ...rest } = set;
        return {
            ...rest,
            reps: change.reps,
            ...(change.weight === undefined ? {} : { weight: change.weight }),
        };
    });
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
