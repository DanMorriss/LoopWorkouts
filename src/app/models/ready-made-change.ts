import { readMark, Synced } from './sync';
import {
    allSteps,
    isReadyMadeId,
    MAX_REPS,
    MAX_STEP_SECONDS,
    RepSetAmount,
    Step,
    stepRounds,
    TimedSetAmount,
    withSteps,
    Workout,
} from './workout';
import { MAX_WEIGHT_KG } from './weight';

/**
 * Your own reps and weight for one step of a ready-made workout (LIB-6), e.g. after "Yes,
 * use next time" on the summary: a rep step's (`RepStepAmounts`), or a timed exercise's time
 * (`TimedStepAmounts`, since data version 16).
 */
export type StepAmounts = RepStepAmounts | TimedStepAmounts;

/** Your reps and weight for a rep step of a ready-made workout. */
export interface RepStepAmounts {
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

/** Your time for a timed exercise of a ready-made workout, e.g. a shorter plank. */
export interface TimedStepAmounts {
    /** Its place in `allSteps()`. */
    step: number;
    /** The exercise the step is, as for a rep step's. */
    exerciseId: string;
    /** In whole seconds, set 1's where they vary. */
    seconds: number;
    /** Each set's own, where they vary (BLD-11); missing for every set alike. */
    sets?: TimedSetAmount[];
}

/** Whether they're a timed exercise's time, rather than a rep step's reps and weight. */
export function isTimedAmounts(amounts: StepAmounts): amounts is TimedStepAmounts {
    return 'seconds' in amounts;
}

/**
 * The reps and weights you've set on a ready-made workout, by its id, e.g. `builtin:gym-legs`.
 * Its exercises, steps and rounds stay as they came: changing those takes a copy.
 */
export interface ReadyMadeChange extends Synced {
    steps: StepAmounts[];
}

/**
 * The amounts of a rep step or timed exercise changed from `original`, its ready-made self,
 * to `step`, or null if it's more than its reps and weight, or time, that changed, e.g. a
 * swap for another exercise.
 */
export function stepAmounts(index: number, original: Step, step: Step): StepAmounts | null {
    if (
        original.kind === 'rest' ||
        step.kind !== original.kind ||
        original.exerciseId === undefined ||
        step.exerciseId !== original.exerciseId
    ) {
        return null;
    }
    if (step.kind !== 'reps') {
        return {
            step: index,
            exerciseId: original.exerciseId,
            seconds: step.seconds,
            ...(step.sets === undefined ? {} : { sets: step.sets.map(copyTime) }),
        };
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
        if (!own || step.kind === 'rest' || step.exerciseId !== own.exerciseId) {
            return step;
        }
        const fits = own.sets !== undefined && own.sets.length === rounds[index];
        if (isTimedAmounts(own)) {
            if (step.kind !== 'work') {
                return step;
            }
            const { sets: _sets, ...timed } = step;
            return {
                ...timed,
                seconds: own.seconds,
                ...(fits ? { sets: own.sets!.map(copyTime) } : {}),
            };
        }
        if (step.kind !== 'reps') {
            return step;
        }
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
    const read = steps.flatMap((amounts): StepAmounts[] => {
        if (isTimedStepAmounts(amounts)) {
            return [
                {
                    step: amounts.step,
                    exerciseId: amounts.exerciseId,
                    seconds: amounts.seconds,
                    ...(amounts.sets === undefined ? {} : { sets: amounts.sets.map(copyTime) }),
                },
            ];
        }
        return isStepAmounts(amounts)
            ? [
                  {
                      step: amounts.step,
                      exerciseId: amounts.exerciseId,
                      ...copyAmount(amounts),
                      ...(amounts.sets === undefined ? {} : { sets: amounts.sets.map(copyAmount) }),
                  },
              ]
            : [];
    });
    return { ...mark, steps: read };
}

function copyAmount({ reps, weight }: RepSetAmount): RepSetAmount {
    return { reps, ...(weight === undefined ? {} : { weight }) };
}

function copyTime({ seconds }: TimedSetAmount): TimedSetAmount {
    return { seconds };
}

function isTimedStepAmounts(value: unknown): value is TimedStepAmounts {
    if (!isTime(value)) {
        return false;
    }
    const { step, exerciseId, sets } = value as unknown as Record<string, unknown>;
    return (
        Number.isInteger(step) &&
        (step as number) >= 0 &&
        typeof exerciseId === 'string' &&
        exerciseId !== '' &&
        (sets === undefined || (Array.isArray(sets) && sets.length > 1 && sets.every(isTime)))
    );
}

function isTime(value: unknown): value is TimedSetAmount {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const { seconds } = value as Record<string, unknown>;
    return (
        Number.isInteger(seconds) &&
        (seconds as number) >= 1 &&
        (seconds as number) <= MAX_STEP_SECONDS
    );
}

function isStepAmounts(value: unknown): value is RepStepAmounts {
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
