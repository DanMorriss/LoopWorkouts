import type { BuiltInWorkout } from './built-in-workouts';
import { Synced } from './sync';

export type TimedKind = 'work' | 'rest';
export type StepKind = TimedKind | 'reps';

/** A step that counts down, e.g. 30 seconds of squats, or a 10 second rest. */
export interface TimedStep {
    kind: TimedKind;
    /** Length in whole seconds, at least 1 (setup leaves out steps set to 0:00). */
    seconds: number;
    /** Optional, e.g. "Squats". Empty when not named. */
    name: string;
    /**
     * The exercise a named work step is, linked by its name when the workout is saved (see
     * `linkSteps()`). Missing for a rest or an unnamed step, which isn't tracked.
     */
    exerciseId?: string;
    /**
     * A work step done one side at a time, e.g. a side plank: each set runs both sides, its
     * time for each (BLD-10). Missing for not; never on a rest step.
     */
    eachSide?: true;
    /**
     * Vary each set (BLD-11), on a work step: each set's own time, one for each of its group's
     * rounds, `seconds` being set 1's. Missing for every set alike; never on a rest step.
     */
    sets?: TimedSetAmount[];
}

/** One set's time on a timed step whose sets vary (BLD-11). */
export interface TimedSetAmount {
    seconds: number;
}

/** One set's reps and weight (in kg, missing for none) on a rep step whose sets vary (BLD-11). */
export interface RepSetAmount {
    reps: number;
    weight?: number;
}

/**
 * A number of reps rather than a time, e.g. 20 push-ups. There's no countdown: the workout
 * waits on it until Done is pressed.
 */
export interface RepStep {
    kind: 'reps';
    /** At least 1 (setup leaves out steps set to 0). */
    reps: number;
    /** Optional, e.g. "Push-ups". Empty when not named. */
    name: string;
    /**
     * The weight lifted, in kg whatever unit it's shown in (see `models/weight.ts`), up to
     * MAX_WEIGHT_KG. Missing for none, e.g. bodyweight moves.
     */
    weight?: number;
    /** The exercise it is, as for a timed step. Missing for an unnamed step. */
    exerciseId?: string;
    /** Done one side at a time, its reps and weight for each, e.g. 10 each leg (BLD-10). */
    eachSide?: true;
    /**
     * Vary each set (BLD-11): each set's own reps and weight, one for each of its group's
     * rounds, e.g. 12 @ 40, 10 @ 45, 8 @ 50 kg. `reps` and `weight` are set 1's, so the step
     * reads as a whole one. Missing for every set alike.
     */
    sets?: RepSetAmount[];
}

/** One step of a round. */
export type Step = TimedStep | RepStep;

/** Which side of an exercise done each side (BLD-10). */
export type Side = 'left' | 'right';

/**
 * How exercises done each side run, from the settings, as they were when the run started:
 * which side goes first, and the countdown between a timed step's two sides (0 for none).
 */
export interface RunSides {
    first: Side;
    switchSeconds: number;
}

export const DEFAULT_RUN_SIDES: RunSides = { first: 'left', switchSeconds: 5 };

/** The longest Switch sides can be, the most its wheel goes up to. */
export const MAX_SWITCH_SECONDS = 30;

/** What the countdown between a timed step's two sides is called on the face. */
export const SWITCH_SIDES = 'Switch sides';

/** "Left side" or "Right side", as the face says it. */
export function sideName(side: Side): string {
    return side === 'left' ? 'Left side' : 'Right side';
}

/**
 * A workout as it runs: the settings for exercises done each side go with it, so its plan
 * (see `runPlan()`) has them. Without them, the defaults.
 */
export type RunningWorkout = Workout & { sides?: RunSides };

/**
 * Steps that run in order a number of times: an exercise and its sets, with one step, or a
 * superset's rounds, with two or more (see docs/features/sets-and-supersets.md).
 */
export interface StepGroup {
    kind: 'group';
    /** How many times its steps run, 1 to MAX_REPEATS: an exercise's sets, a superset's rounds. */
    rounds: number;
    /**
     * Rest after each of its rounds, in whole seconds; 0 for none. With one round, none. It
     * comes after the last round too, before the next exercise, unless a rest comes next (see
     * `runPlan()`); at the end of the workout it's skipped, as the workout is over.
     */
    restSeconds: number;
    /** At least one. */
    steps: Step[];
}

/** A label in a workout, e.g. "Warmup". It doesn't loop and takes no time. */
export interface Heading {
    kind: 'heading';
    /** Trimmed, 1 to MAX_HEADING_LENGTH characters. */
    text: string;
}

/** One part of a workout, in order. */
export type Block = StepGroup | Heading;

/**
 * A saved workout: its `blocks` run in order to make one round, and the round repeats
 * `repeats` times (or until stopped). Rest steps at the end of the last round are skipped,
 * since the workout is over by then.
 *
 * With a time limit, rounds repeat as many times as fit in it (`repeats` is UNTIL_STOPPED,
 * so an app from before time limits runs it until stopped), and it's over when time's up,
 * part-way through a step or not.
 */
export interface Workout extends Synced {
    title: string;
    blocks: Block[];
    repeats: number;
    /** The time limit, in whole seconds, rep steps and rests included. Missing for none. */
    timeLimitSeconds?: number;
    /** Marked as a favourite on Workouts, to filter by. Missing for not. */
    favourite?: true;
}

/**
 * What's set up to make a workout: everything but what the store keeps (its id and dates) and
 * what's set on Workouts rather than in Create (whether it's a favourite).
 */
export type WorkoutFields = Omit<Workout, 'id' | 'updatedAt' | 'favourite'>;

/**
 * A ready-made workout (LIB-6) as the list has it, alongside yours: used as it is, never
 * saved, so it's dated 0, and a favourite when it's been made one.
 */
export type ReadyMadeWorkout = BuiltInWorkout & Pick<Workout, 'updatedAt' | 'favourite'>;

/** Whether a workout's id is a ready-made one's (LIB-6), which are `builtin:<its name>`. */
export function isReadyMadeId(id: string): boolean {
    return id.startsWith('builtin:');
}

/** Whether a workout is a ready-made one, which can't be changed or deleted. */
export function isReadyMade(workout: Workout): workout is ReadyMadeWorkout {
    return isReadyMadeId(workout.id);
}

/**
 * The workouts A to Z by title, ignoring case, with "Untitled workout" for one with none, as
 * the list shows it (LIB-3); on a tie, yours before a ready-made one.
 */
export function aToZ<T extends Workout>(workouts: readonly T[]): T[] {
    const title = (workout: Workout) => workout.title.trim() || 'Untitled workout';
    return [...workouts].sort(
        (a, b) =>
            title(a).localeCompare(title(b), undefined, { sensitivity: 'base' }) ||
            Number(isReadyMade(a)) - Number(isReadyMade(b))
    );
}

/**
 * A workout's fields as a new one of your own: its own copy, to change as you like, e.g. Make a
 * copy (of yours or a ready-made one), leaving out what isn't set in Create (its id, dates and
 * whether it's a favourite).
 */
export function copyOf(
    workout: Pick<Workout, 'title' | 'blocks' | 'repeats' | 'timeLimitSeconds'>
): WorkoutFields {
    const { title, blocks, repeats, timeLimitSeconds } = workout;
    return {
        title,
        blocks: structuredClone(blocks),
        repeats,
        ...(timeLimitSeconds === undefined ? {} : { timeLimitSeconds }),
    };
}

/** The `repeats` value for a workout that keeps going until it's stopped. */
export const UNTIL_STOPPED = 0;

/** The longest a step can be: 99:59, the most the setup wheels go up to. */
export const MAX_STEP_SECONDS = 99 * 60 + 59;

/** The longest time limit, the most the same wheels go up to. */
export const MAX_TIME_LIMIT_SECONDS = MAX_STEP_SECONDS;

/** The most reps a step can have, the most the setup wheel goes up to. */
export const MAX_REPS = 100;

/** The most rounds the setup wheel goes up to, before ∞. */
export const MAX_REPEATS = 30;

/** Enough for a long circuit, while keeping the setup page manageable. */
export const MAX_STEPS = 20;

/** The longest a heading can be, as for a step's name. */
export const MAX_HEADING_LENGTH = 40;

/** The most headings a workout can have, on top of its steps. */
export const MAX_HEADINGS = 10;

/**
 * A workout's heading and where it is: `step` is the number of the first step after it, in
 * `allSteps()`, so it's counted as a logged set's `step` is.
 */
export interface PlacedHeading {
    text: string;
    step: number;
}

/** A workout's headings, in order, each with the number of the step after it. */
export function placedHeadings(workout: Pick<Workout, 'blocks'>): PlacedHeading[] {
    const headings: PlacedHeading[] = [];
    let step = 0;
    for (const block of workout.blocks) {
        if (block.kind === 'heading') {
            headings.push({ text: block.text, step });
        } else {
            step += block.steps.length;
        }
    }
    return headings;
}

/**
 * A superset or giant set of a workout (BLD-12): what it's called, the number of its first
 * step, and how many steps it has, rests included.
 */
export interface PlacedSuperset {
    kind: Exclude<GroupKind, 'exercise'>;
    step: number;
    steps: number;
}

/** A workout's supersets and giant sets, in order, each with the steps it covers. */
export function placedSupersets(workout: Pick<Workout, 'blocks'>): PlacedSuperset[] {
    const supersets: PlacedSuperset[] = [];
    let step = 0;
    for (const block of workout.blocks) {
        if (block.kind === 'group') {
            const kind = groupKind(block.steps);
            if (kind !== 'exercise') {
                supersets.push({ kind, step, steps: block.steps.length });
            }
            step += block.steps.length;
        }
    }
    return supersets;
}

/** A step's countdown in seconds: 0 for a rep step, which has none. */
export function stepSeconds(step: Step): number {
    return step.kind === 'reps' ? 0 : step.seconds;
}

/**
 * A step as it runs in one set of its group, from 0: with that set's own reps and weight, or
 * time, where its sets vary, and without the list of them. As it is where they don't.
 */
export function stepForSet(step: Step, set: number): Step {
    if (step.kind === 'rest' || step.sets === undefined) {
        return step;
    }
    if (step.kind === 'reps') {
        const { sets, weight: _weight, ...rest } = step;
        const amount = sets[set] ?? sets[0];
        return {
            ...rest,
            reps: amount.reps,
            ...(amount.weight === undefined ? {} : { weight: amount.weight }),
        };
    }
    const { sets, ...rest } = step;
    return { ...rest, seconds: (sets[set] ?? sets[0]).seconds };
}

/**
 * A rep step with one set's reps and weight changed: just that set's where its sets vary
 * (and the step's own too, for set 1, which they are), or else the step's, which every set
 * has. Its other fields stay as they are.
 */
export function withRepSet(step: RepStep, set: number, amount: RepSetAmount): RepStep {
    const { weight: _weight, ...rest } = step;
    const own = (to: RepStep): RepStep => ({
        ...to,
        reps: amount.reps,
        ...(amount.weight === undefined ? {} : { weight: amount.weight }),
    });
    if (step.sets === undefined) {
        return own(rest);
    }
    const sets = step.sets.map((existing, i) => (i === set ? amount : existing));
    return set === 0 ? { ...own(rest), sets } : { ...step, sets };
}

/**
 * A rep step with every set changed by `change`: each of its own where its sets vary, or the
 * step's one, which every set has. E.g. a step up of the same weight on each set.
 */
export function withEachRepSet(
    step: RepStep,
    change: (amount: RepSetAmount) => RepSetAmount
): RepStep {
    const amounts = step.sets ?? [
        { reps: step.reps, ...(step.weight === undefined ? {} : { weight: step.weight }) },
    ];
    return amounts.reduce<RepStep>((to, amount, set) => withRepSet(to, set, change(amount)), step);
}

/** A rep step's reps and weight for each of its `rounds` sets, from 1: its own, or the step's. */
export function setAmountsOf(step: RepStep, rounds: number): RepSetAmount[] {
    return Array.from({ length: rounds }, (_, set) => {
        const { reps, weight } = stepForSet(step, set) as RepStep;
        return { reps, ...(weight === undefined ? {} : { weight }) };
    });
}

/**
 * A rep step with each set's reps and weight, one for each set: the step's own, which every
 * set has, where they're alike, or a list of them where they vary (BLD-11). Its other
 * fields stay as they are.
 */
export function withSetAmounts(step: RepStep, amounts: readonly RepSetAmount[]): RepStep {
    const { weight: _weight, sets: _sets, ...rest } = step;
    const [first] = amounts;
    const own: RepStep = {
        ...rest,
        reps: first.reps,
        ...(first.weight === undefined ? {} : { weight: first.weight }),
    };
    const alike = amounts.every(
        (amount) => amount.reps === first.reps && amount.weight === first.weight
    );
    return alike
        ? own
        : {
              ...own,
              sets: amounts.map(({ reps, weight }) => ({
                  reps,
                  ...(weight === undefined ? {} : { weight }),
              })),
          };
}

/** A timed step's time for each of its `rounds` sets, from 1: its own, or the step's. */
export function timedSetAmountsOf(step: TimedStep, rounds: number): TimedSetAmount[] {
    return Array.from({ length: rounds }, (_, set) => ({
        seconds: (stepForSet(step, set) as TimedStep).seconds,
    }));
}

/**
 * A timed step with each set's time: the step's own where they're alike, or a list of them
 * where they vary (BLD-11). Its other fields stay as they are.
 */
export function withTimedSetAmounts(
    step: TimedStep,
    amounts: readonly TimedSetAmount[]
): TimedStep {
    const { sets: _sets, ...rest } = step;
    const [first] = amounts;
    const alike = amounts.every((amount) => amount.seconds === first.seconds);
    return alike
        ? { ...rest, seconds: first.seconds }
        : { ...rest, seconds: first.seconds, sets: amounts.map(({ seconds }) => ({ seconds })) };
}

/** Steps as a workout's blocks: one group, run once a round, as workouts were before groups. */
export function asOneGroup(steps: Step[]): Block[] {
    return [{ kind: 'group', rounds: 1, restSeconds: 0, steps }];
}

/**
 * Every step of a workout, each once however many rounds its group has, in order. A step's
 * place in this list is its number in the history (`LoggedSet.step`).
 */
export function allSteps(workout: Pick<Workout, 'blocks'>): Step[] {
    return workout.blocks.flatMap((block) => (block.kind === 'group' ? block.steps : []));
}

/** How many rounds each step's group has (an exercise's sets), in the order of `allSteps()`. */
export function stepRounds(workout: Pick<Workout, 'blocks'>): number[] {
    return workout.blocks.flatMap((block) =>
        block.kind === 'group' ? block.steps.map(() => block.rounds) : []
    );
}

/**
 * The blocks with their steps replaced, in order, by `steps` (one for each of `allSteps()`),
 * e.g. linked to exercises or with one changed.
 */
export function withSteps(blocks: readonly Block[], steps: readonly Step[]): Block[] {
    let next = 0;
    return blocks.map((block) =>
        block.kind === 'group' ? { ...block, steps: block.steps.map(() => steps[next++]) } : block
    );
}

/** Where a step of the run comes from: its number in `allSteps()`, and its group's round. */
export interface StepPlace {
    step: number;
    /** Which round of its group (set of its exercise) it is, from 0. */
    set: number;
    /** Which side it is, for a step done each side; missing for one that isn't. */
    side?: Side;
}

/**
 * One round of a workout as it runs: each group's steps, round after round, with its rest
 * between them. What the clock, the alarms and the sets are worked out from.
 */
export interface RunPlan {
    steps: Step[];
    /**
     * Where each of `steps` comes from; null for the rest after a group's round, and for
     * Switch sides between a timed step's two sides.
     */
    places: (StepPlace | null)[];
    /**
     * For each of `steps`, which set of its group it's part of, from 0, and how many its
     * group has: the rest after a round is part of that round.
     */
    sets: GroupSet[];
    /** For each of `steps`, the part of the workout it's in (RUN-10). */
    sections: PlanSection[];
    /** How many exercises the workout has: groups with a step that isn't rest. */
    exercises: number;
}

/** Which round of its group a step of the run is in, e.g. set 1 (from 0) of 3. */
export interface GroupSet {
    set: number;
    of: number;
    /** What its group is, so its rounds are called sets or rounds. */
    group: GroupKind;
}

/**
 * What a group is, by how many exercises it has (rest steps don't count): an exercise and its
 * sets, a superset of 2, or a giant set of 3 or more (BLD-12).
 */
export type GroupKind = 'exercise' | 'superset' | 'giant set';

export function groupKind(steps: readonly Pick<Step, 'kind'>[]): GroupKind {
    const exercises = steps.filter((step) => step.kind !== 'rest').length;
    return exercises >= 3 ? 'giant set' : exercises === 2 ? 'superset' : 'exercise';
}

/** "Superset" or "Giant set", as a group of several steps is called wherever it shows. */
export function supersetName(steps: readonly Pick<Step, 'kind'>[]): string {
    return groupKind(steps) === 'giant set' ? 'Giant set' : 'Superset';
}

/** Where a step of the run is in the workout, for the section line, e.g. "Upper body · 5 of 7". */
export interface PlanSection {
    /** The last heading before its group, or null if there's none. */
    heading: string | null;
    /**
     * Which exercise it's part of, from 1, a superset counting as one: for a rest step, the
     * one before it (or 1 before any), as it's still that one's part of the workout.
     */
    exercise: number;
    /** The first step of its exercise, where screen readers are told which one it is. */
    starts: boolean;
}

// Workouts don't change once made (a change makes a new one), so each one's plan is made once
const plans = new WeakMap<Pick<Workout, 'blocks'>, RunPlan>();

/**
 * A workout's round as it runs (see `RunPlan`). A step done each side runs both sides in
 * each set, with Switch sides between a timed one's, as `sides` has them (the run's, or the
 * defaults). A group of more than one round rests after each, the last included, unless the
 * next group is a rest of its own.
 */
export function runPlan(workout: Pick<RunningWorkout, 'blocks' | 'sides'>): RunPlan {
    const saved = plans.get(workout);
    if (saved) {
        return saved;
    }
    const { first: firstSide, switchSeconds } = workout.sides ?? DEFAULT_RUN_SIDES;
    const sides: Side[] = firstSide === 'left' ? ['left', 'right'] : ['right', 'left'];
    const plan: RunPlan = { steps: [], places: [], sets: [], sections: [], exercises: 0 };
    let first = 0;
    let heading: string | null = null;
    for (const [b, block] of workout.blocks.entries()) {
        if (block.kind !== 'group') {
            heading = block.text;
            continue;
        }
        const isExercise = block.steps.some((step) => step.kind !== 'rest');
        if (isExercise) {
            plan.exercises++;
        }
        const exercise = Math.max(1, plan.exercises);
        let starting = isExercise;
        const group = groupKind(block.steps);
        const push = (step: Step, place: StepPlace | null, of: GroupSet) => {
            const starts = starting && place !== null && step.kind !== 'rest';
            if (starts) {
                starting = false;
            }
            plan.steps.push(step);
            plan.places.push(place);
            plan.sets.push(of);
            plan.sections.push({ heading, exercise, starts });
        };
        const restsAfterLast = !restComesNext(workout.blocks, b);
        for (let set = 0; set < block.rounds; set++) {
            const of = { set, of: block.rounds, group };
            block.steps.forEach((step, i) => {
                const forSet = stepForSet(step, set);
                if (!step.eachSide || step.kind === 'rest') {
                    push(forSet, { step: first + i, set }, of);
                    return;
                }
                sides.forEach((side, s) => {
                    // A rep step's second side waits for Done, so only a timed one needs this
                    if (s > 0 && step.kind === 'work' && switchSeconds > 0) {
                        push(
                            { kind: 'rest', seconds: switchSeconds, name: SWITCH_SIDES },
                            null,
                            of
                        );
                    }
                    push(forSet, { step: first + i, set, side }, of);
                });
            });
            const rests = block.rounds > 1 && (set < block.rounds - 1 || restsAfterLast);
            if (rests && block.restSeconds > 0) {
                push({ kind: 'rest', seconds: block.restSeconds, name: '' }, null, of);
            }
        }
        first += block.steps.length;
    }
    plans.set(workout, plan);
    return plan;
}

/** Whether the next group after block `b` is only rest, e.g. a rest between exercises. */
function restComesNext(blocks: readonly Block[], b: number): boolean {
    const next = blocks.slice(b + 1).find((block) => block.kind === 'group');
    return next?.kind === 'group' && next.steps.every((step) => step.kind === 'rest');
}

/** Whether any of a workout's groups runs more than once a round, e.g. an exercise's sets. */
export function hasSets(workout: Pick<Workout, 'blocks'>): boolean {
    return workout.blocks.some((block) => block.kind === 'group' && block.rounds > 1);
}

/** How many rep steps there are in one round. */
export function repStepsPerRound(workout: Pick<Workout, 'blocks'>): number {
    return runPlan(workout).steps.filter((step) => step.kind === 'reps').length;
}

/** Rounds go on until it's stopped by hand: no number of rounds, and no time limit. */
export function runsUntilStopped(workout: Pick<Workout, 'repeats' | 'timeLimitSeconds'>): boolean {
    return endlessRounds(workout) && workout.timeLimitSeconds === undefined;
}

/**
 * Rounds don't end by being counted: it runs until stopped, or until its time limit. What
 * the clock goes by, where `runsUntilStopped()` is what the workout is shown as.
 */
export function endlessRounds(workout: Pick<Workout, 'repeats'>): boolean {
    return workout.repeats === UNTIL_STOPPED;
}

/** Seconds of countdown in one full round (rep steps take as long as they take, so add nothing). */
export function roundSeconds(workout: Pick<Workout, 'blocks'>): number {
    return runPlan(workout).steps.reduce((total, step) => total + stepSeconds(step), 0);
}

/** Seconds of rest at the end of a round, which the last round skips. */
export function trailingRestSeconds(workout: Pick<Workout, 'blocks'>): number {
    const { steps } = runPlan(workout);
    let total = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
        const step = steps[i];
        if (step.kind !== 'rest') {
            break;
        }
        total += step.seconds;
    }
    return total;
}

/**
 * Seconds of countdown in the whole workout, or Infinity for one whose rounds don't end by
 * being counted (until stopped, or a time limit). Time spent on rep steps comes on top.
 */
export function workoutSeconds(workout: Workout): number {
    if (endlessRounds(workout)) {
        return Infinity;
    }
    return workout.repeats * roundSeconds(workout) - trailingRestSeconds(workout);
}

/** A workout needs some work in it, timed or reps, or there'd be nothing to do. */
export function hasWork(steps: readonly Step[]): boolean {
    return steps.some(
        (step) =>
            (step.kind === 'work' && step.seconds > 0) || (step.kind === 'reps' && step.reps > 0)
    );
}

/** What a kind of step is called, e.g. on its pill in Create. */
export function stepKindName(kind: StepKind): string {
    return { work: 'Timed', rest: 'Rest', reps: 'Reps' }[kind];
}
