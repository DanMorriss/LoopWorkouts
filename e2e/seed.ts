// Data to start a test with, in the shapes the app saves (docs/features/data.md), as
// localStorage entries for the `storage` option:
//
//     test.use({ storage: { ...seed.workouts([legs]), ...seed.history([run]) } });
//
// Each helper returns the keys it sets, so they spread together. The history goes in through
// `history-pending`, which the history store saves to IndexedDB as it loads, rather than
// IndexedDB itself.

/** The shape of the saved data these are in (`data-version`): older data would be converted. */
const DATA_VERSION = { 'data-version': '5' };

/** The time every test starts at unless it says otherwise: Wednesday 11 November 2026, 09:00. */
export const NOW = '2026-11-11T09:00:00Z';

/** A time on the test's clock, in ms since 1970: `at('2026-11-09T18:00')` is Monday at 18:00. */
export function at(time: string): number {
    return Date.parse(time.endsWith('Z') ? time : `${time}Z`);
}

// Steps, groups and workouts, as `models/workout.ts` has them. Only the fields a test cares
// about need giving.

export interface TimedStep {
    kind: 'work' | 'rest';
    seconds: number;
    name: string;
    exerciseId?: string;
    eachSide?: true;
}
export interface RepStep {
    kind: 'reps';
    reps: number;
    name: string;
    weight?: number;
    exerciseId?: string;
    eachSide?: true;
}
export type Step = TimedStep | RepStep;
export interface Group {
    kind: 'group';
    rounds: number;
    restSeconds: number;
    steps: Step[];
}
export interface Heading {
    kind: 'heading';
    text: string;
}
export type Block = Group | Heading;
export interface Workout {
    id: string;
    title: string;
    updatedAt: number;
    repeats: number;
    blocks: Block[];
    timeLimitSeconds?: number;
    favourite?: true;
}

/** A timed step: `timed(30, 'Plank', 'plank')` links it to the built-in Plank. */
export function timed(seconds: number, name = '', exercise?: string): TimedStep {
    return { kind: 'work', seconds, name, ...(exercise && { exerciseId: `builtin:${exercise}` }) };
}

export function rest(seconds: number): TimedStep {
    return { kind: 'rest', seconds, name: '' };
}

/** A rep step: `reps(10, 'Back squat', { exercise: 'back-squat', weight: 60 })`. */
export function reps(
    count: number,
    name = '',
    { exercise, weight }: { exercise?: string; weight?: number } = {}
): RepStep {
    return {
        kind: 'reps',
        reps: count,
        name,
        ...(weight !== undefined && { weight }),
        ...(exercise && { exerciseId: `builtin:${exercise}` }),
    };
}

/** Steps run together `rounds` times, resting `restSeconds` after each: sets, or a superset. */
export function group(steps: Step[], rounds = 1, restSeconds = 0): Group {
    return { kind: 'group', rounds, restSeconds, steps };
}

export function heading(text: string): Heading {
    return { kind: 'heading', text };
}

/**
 * A workout of your own. `steps` are one group run once a round, as a simple workout is;
 * `blocks` gives the groups and headings instead. Its id is its title in kebab case unless
 * given.
 */
export function workout(
    title: string,
    {
        id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        steps,
        blocks,
        repeats = 1,
        timeLimitSeconds,
    }: {
        id?: string;
        steps?: Step[];
        blocks?: Block[];
        repeats?: number;
        timeLimitSeconds?: number;
    }
): Workout {
    return {
        id,
        title,
        updatedAt: 1,
        blocks: blocks ?? [group(steps ?? [])],
        ...(timeLimitSeconds === undefined ? { repeats } : { repeats: 0, timeLimitSeconds }),
    };
}

// The history

export interface LoggedSet {
    round: number;
    step: number;
    set?: number;
    side?: 'left' | 'right';
    name: string;
    reps?: number;
    weight?: number;
    seconds?: number;
    exerciseId?: string;
}

export interface HistoryEntry {
    id: string;
    workoutId: string;
    title: string;
    startedAt: number;
    endedAt: number;
    updatedAt: number;
    activeSeconds: number;
    roundsCompleted: number;
    totalRounds: number;
    outcome: 'finished' | 'stopped';
    timeLimitSeconds?: number;
    stepsIntoRound?: number;
    note?: string;
    sets?: LoggedSet[];
    headings?: { text: string; step: number }[];
    supersets?: { kind: 'superset' | 'giant set'; step: number; steps: number }[];
}

/**
 * A run in the history: of `workout` (a workout, or its id), started at `startedAt` (as `at()`
 * takes it), finished all its rounds unless said otherwise, and taking 10 minutes.
 */
export function run(
    workoutOrId: Workout | string,
    startedAt: string,
    fields: Partial<Omit<HistoryEntry, 'startedAt'>> = {}
): HistoryEntry {
    const workoutId = typeof workoutOrId === 'string' ? workoutOrId : workoutOrId.id;
    const title = typeof workoutOrId === 'string' ? workoutOrId : workoutOrId.title;
    const start = at(startedAt);
    const activeSeconds = fields.activeSeconds ?? 600;
    const end = start + activeSeconds * 1000;
    const rounds = typeof workoutOrId === 'string' ? 1 : workoutOrId.repeats;
    return {
        id: `${start}-${workoutId}`,
        workoutId,
        title,
        startedAt: start,
        endedAt: end,
        updatedAt: end,
        activeSeconds,
        roundsCompleted: rounds,
        totalRounds: rounds,
        outcome: 'finished',
        ...fields,
    };
}

/** Logged sets of one exercise: `sets('back-squat', 'Back squat', [10, 60], [8, 62.5])`. */
export function sets(
    exercise: string,
    name: string,
    ...done: [reps: number, weight?: number][]
): LoggedSet[] {
    return done.map(([count, weight], round) => ({
        round,
        step: 0,
        name,
        reps: count,
        ...(weight !== undefined && { weight }),
        exerciseId: `builtin:${exercise}`,
    }));
}

// What goes in localStorage

export interface Settings {
    theme: 'dark' | 'light' | 'system';
    sound: boolean;
    vibration: boolean;
    countdownBeeps: boolean;
    keepScreenOn: boolean;
    weightUnit: 'kg' | 'lb';
    bodyFigure: 'male' | 'female';
    trainingGoal: 'muscle' | 'fitness';
    myEquipment: string[];
    onlyMyEquipment: boolean;
    eachSideFirst: 'left' | 'right';
    switchSidesSeconds: number;
    name: string;
}

/** The keys a test's `storage` takes, made from the data above. */
export const seed = {
    /** The library: workouts of your own, in order. */
    workouts: (workouts: Workout[]) => ({ ...DATA_VERSION, workouts: JSON.stringify(workouts) }),

    /** The history, saved to IndexedDB as the app loads. */
    history: (entries: HistoryEntry[]) => ({
        ...DATA_VERSION,
        'history-pending': JSON.stringify(entries),
    }),

    /** Settings and the profile; the rest stay as they come. */
    settings: (settings: Partial<Settings>) => ({ settings: JSON.stringify(settings) }),

    /**
     * The weekly plan: workout ids for each day by its name. With no `plannedAt`, every workout
     * counts this week (PLN-3).
     */
    plan: (
        days: Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string[]>>,
        plannedAt?: Record<string, number>
    ) => ({
        'week-plan': JSON.stringify({
            days: (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(
                (day) => days[day] ?? []
            ),
            updatedAt: 1,
            ...(plannedAt && { plannedAt }),
        }),
    }),

    /** Your notes on exercises, by the exercise's id. */
    notes: (notes: Record<string, string>) => ({
        'exercise-notes': JSON.stringify(
            Object.entries(notes).map(([id, text]) => ({ id, text, updatedAt: 1 }))
        ),
    }),

    /** Exercises hidden from the picker, by id. */
    hidden: (ids: string[]) => ({
        'hidden-exercises': JSON.stringify(ids.map((id) => ({ id, updatedAt: 1 }))),
    }),

    /** Deletions, as `deleted` keeps them. */
    deleted: (markers: { kind: string; id: string; deletedAt: number }[]) => ({
        deleted: JSON.stringify(markers),
    }),
};

/** A workout's steps in order, across its groups (headings left out), to check what's saved. */
export function stepsOf(workout: Workout): Step[] {
    return workout.blocks.flatMap((block) => (block.kind === 'group' ? block.steps : []));
}
