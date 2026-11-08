import { readMark, Synced } from './sync';
import {
    allSteps,
    isReadyMadeId,
    MAX_REPS,
    RepSetAmount,
    Step,
    stepRounds,
    withSteps,
    Workout,
} from './workout';
import { MAX_WEIGHT_KG } from './weight';

/**
 * Your own reps and weight for one rep step of a ready-made workout (LIB-6), e.g. after "Yes,
 * use next time" on the summary.
 */
export interface StepAmounts {
    /** Its place in `allSteps()`. */
    step: number;
    /**
     * The exercise the step is: they're only used while it still is, as a ready-made workout
     * can be improved in any release.
     */
    exerciseId: string;
    reps: number;
    /** In kg; missing for none. */
    weight?: number;
    /** Each set's own, where they vary (BLD-11); missing for every set alike. */
    sets?: RepSetAmount[];
}

/**
 * The reps and weights you've set on a ready-made workout, by its id, e.g. `builtin:gym-legs`.
 * Its exercises, steps and rounds stay as they came: changing those takes a copy.
 */
export interface ReadyMadeChange extends Synced {
    steps: StepAmounts[];
}

/**
 * The amounts of a rep step changed from `original`, its ready-made self, to `step`, or null
 * if it's more than its reps and weight that changed, e.g. a swap for another exercise.
 */
export function stepAmounts(index: number, original: Step, step: Step): StepAmounts | null {
    if (
        original.kind !== 'reps' ||
        step.kind !== 'reps' ||
        original.exerciseId === undefined ||
        step.exerciseId !== original.exerciseId
    ) {
        return null;
    }
    return {
        step: index,
        exerciseId: original.exerciseId,
        reps: step.reps,
        ...(step.weight === undefined ? {} : { weight: step.weight }),
        ...(step.sets === undefined ? {} : { sets: step.sets.map(copyAmount) }),
    };
}

/** Whether the amounts are the ready-made step's own, so there's nothing to keep. */
export function sameAmounts(original: Step, amounts: StepAmounts): boolean {
    const own = stepAmounts(amounts.step, original, original);
    return own !== null && JSON.stringify(own) === JSON.stringify(amounts);
}

/**
 * A ready-made workout with your reps and weights on it. Any for a step that's no longer
 * that exercise, or whose sets no longer fit its rounds, is left out.
 */
export function withAmounts<T extends Pick<Workout, 'blocks'>>(
    workout: T,
    amounts: readonly StepAmounts[]
): T {
    if (amounts.length === 0) {
        return workout;
    }
    const steps = allSteps(workout);
    const rounds = stepRounds(workout);
    const changed = steps.map((step, index): Step => {
        const own = amounts.find((amount) => amount.step === index);
        if (!own || step.kind !== 'reps' || step.exerciseId !== own.exerciseId) {
            return step;
        }
        const fits = own.sets !== undefined && own.sets.length === rounds[index];
        const { weight: _weight, sets: _sets, ...rest } = step;
        return {
            ...rest,
            reps: own.reps,
            ...(own.weight === undefined ? {} : { weight: own.weight }),
            ...(fits ? { sets: own.sets!.map(copyAmount) } : {}),
        };
    });
    return { ...workout, blocks: withSteps(workout.blocks, changed) };
}

/** A saved one, or null if it isn't usable; steps that aren't are dropped. */
export function readReadyMadeChange(value: unknown): ReadyMadeChange | null {
    const mark = readMark(value);
    const steps = (value as Record<string, unknown> | null)?.['steps'];
    if (!mark || !isReadyMadeId(mark.id) || !Array.isArray(steps)) {
        return null;
    }
    const read = steps.filter(isStepAmounts).map(
        (amounts): StepAmounts => ({
            step: amounts.step,
            exerciseId: amounts.exerciseId,
            ...copyAmount(amounts),
            ...(amounts.sets === undefined ? {} : { sets: amounts.sets.map(copyAmount) }),
        })
    );
    return { ...mark, steps: read };
}

function copyAmount({ reps, weight }: RepSetAmount): RepSetAmount {
    return { reps, ...(weight === undefined ? {} : { weight }) };
}

function isStepAmounts(value: unknown): value is StepAmounts {
    if (!isAmount(value)) {
        return false;
    }
    const { step, exerciseId, sets } = value as unknown as Record<string, unknown>;
    return (
        Number.isInteger(step) &&
        (step as number) >= 0 &&
        typeof exerciseId === 'string' &&
        exerciseId !== '' &&
        (sets === undefined || (Array.isArray(sets) && sets.length > 1 && sets.every(isAmount)))
    );
}

function isAmount(value: unknown): value is RepSetAmount {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const { reps, weight } = value as Record<string, unknown>;
    return (
        Number.isInteger(reps) &&
        (reps as number) >= 1 &&
        (reps as number) <= MAX_REPS &&
        (weight === undefined ||
            (typeof weight === 'number' && weight > 0 && weight <= MAX_WEIGHT_KG))
    );
}
