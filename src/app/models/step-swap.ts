import { Exercise } from './exercise';
import { RepSet } from './history';
import { allSteps, RepSetAmount, Step, withSteps, Workout } from './workout';

/**
 * A step's exercise swapped for another mid-workout (RUN-11), e.g. the Smith machine is taken,
 * for the rest of this run. The saved workout keeps its own unless the summary is told to use
 * it next time.
 */
export interface StepSwap {
    /** The step's place in `allSteps()`. */
    step: number;
    /** Where in the run it was swapped, as `runPosition()` counts: from here on it's `swapped`. */
    from: number;
    /** The step as it was before. */
    original: Step;
    /** The step as it runs now: the other exercise, its name, and its weight from last time. */
    swapped: Step;
}

/** How far into the run a step is: rounds before it, each of `stepsPerRound`, then its place. */
export function runPosition(round: number, stepIndex: number, stepsPerRound: number): number {
    return round * stepsPerRound + stepIndex;
}

/** The workout as it runs with its swaps: each swapped step as it was last swapped. */
export function withSwaps<T extends Workout>(workout: T, swaps: readonly StepSwap[]): T {
    if (swaps.length === 0) {
        return workout;
    }
    const steps = allSteps(workout);
    for (const swap of swaps) {
        if (steps[swap.step]) {
            steps[swap.step] = swap.swapped;
        }
    }
    return { ...workout, blocks: withSteps(workout.blocks, steps) };
}

/**
 * Step `step` as it ran at `position`, for a step that's been swapped: as last swapped by then,
 * or as it was before the first swap. Undefined for a step never swapped, which ran as it is.
 */
export function stepAsRunAt(
    swaps: readonly StepSwap[],
    step: number,
    position: number
): Step | undefined {
    const ofStep = swaps.filter((swap) => swap.step === step);
    if (ofStep.length === 0) {
        return undefined;
    }
    const inForce = ofStep.filter((swap) => swap.from <= position).at(-1);
    return inForce?.swapped ?? ofStep[0].original;
}

/**
 * `step` done as `exercise` instead: its name and link, the same reps or time, sets and sides,
 * and the weight from `lastSets`, the exercise's sets last time (each set's own where the
 * step's sets vary), or none, as the old exercise's weight means nothing for it.
 */
export function swappedStep(step: Step, exercise: Exercise, lastSets: readonly RepSet[]): Step {
    const named = { ...step, name: exercise.name, exerciseId: exercise.id };
    if (named.kind !== 'reps') {
        return named;
    }
    const weightOf = (set: number) =>
        (lastSets.find((last) => (last.set ?? 0) === set) ?? lastSets[0])?.weight;
    const withWeight = <A extends RepSetAmount>(amount: A, weight: number | undefined): A => {
        const { weight: _old, ...rest } = amount;
        return (weight === undefined ? rest : { ...rest, weight }) as A;
    };
    const swapped = withWeight(named, weightOf(0));
    return swapped.sets
        ? { ...swapped, sets: swapped.sets.map((amount, set) => withWeight(amount, weightOf(set))) }
        : swapped;
}
