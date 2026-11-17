import { EquipmentOf, kettlebellSteps, oneKettlebellWeight } from '../models/kettlebell';
import { StepModel } from './step-model';

/**
 * One kettlebell for a kettlebell workout as it's built in Create (PRG-14), as mid-workout: a
 * weight turned to on one of its kettlebell steps goes on the others at the old weight or none,
 * and a kettlebell step added with no weight takes the workout's one weight, or, with none yet,
 * `myKettlebell` (in the unit shown; null for none). `before` is the steps as they were, and
 * `after` as they are now. The steps with the kettlebell shared, or null where nothing changes.
 * Weights are in the unit shown, 0 for none, as the form holds them.
 */
export function sharedKettlebell(
    before: readonly StepModel[],
    after: readonly StepModel[],
    equipmentOf: EquipmentOf,
    myKettlebell: number | null
): StepModel[] | null {
    const indexes = kettlebellSteps(
        after.map((step) => ({
            kind: step.kind === 'reps' ? 'reps' : 'rest',
            exerciseId: step.exerciseId || undefined,
        })),
        equipmentOf
    );
    const kettlebell = after.filter((_, i) => indexes.has(i));
    if (kettlebell.length === 0) {
        return null;
    }
    const was = new Map(before.map((step) => [step.key, step]));
    const turned = kettlebell.flatMap((step) => {
        const old = was.get(step.key);
        return old && old.exerciseId === step.exerciseId ? weightChanges(old, step) : [];
    });
    if (turned.length === 1 && turned[0].to > 0) {
        return withWeight(after, kettlebell, turned[0].from, turned[0].to);
    }
    // A step new to the form, or to its exercise, with no weight yet
    const added = kettlebell.filter(
        (step) =>
            was.get(step.key)?.exerciseId !== step.exerciseId &&
            weightsOf(step).every((weight) => weight === 0)
    );
    const others = kettlebell.filter((step) => !added.includes(step));
    const one = oneKettlebellWeight(others.flatMap(weightsOf));
    const weight = one ?? (one === undefined ? myKettlebell : null);
    return added.length > 0 && weight ? withWeight(after, added, 0, weight) : null;
}

/** A step's weights: each set's where they vary (BLD-11), or its own. */
function weightsOf(step: StepModel): number[] {
    return step.vary ? step.setRows.map((row) => row.weight) : [step.weight];
}

/** The weights changed from `old` to `step`, set by set; none where its sets have changed. */
function weightChanges(old: StepModel, step: StepModel): { from: number; to: number }[] {
    const was = weightsOf(old);
    const now = weightsOf(step);
    return was.length === now.length
        ? now.flatMap((to, i) => (to === was[i] ? [] : [{ from: was[i], to }]))
        : [];
}

/** `steps` with `of` given weight `to` wherever they're at `from` or none; null if none change. */
function withWeight(
    steps: readonly StepModel[],
    of: readonly StepModel[],
    from: number,
    to: number
): StepModel[] | null {
    const takes = (weight: number) => weight !== to && (weight === 0 || weight === from);
    const keys = new Set(of.filter((step) => weightsOf(step).some(takes)).map((step) => step.key));
    if (keys.size === 0) {
        return null;
    }
    return steps.map((step) =>
        keys.has(step.key)
            ? {
                  ...step,
                  weight: takes(step.weight) ? to : step.weight,
                  setRows: step.setRows.map((row) =>
                      takes(row.weight) ? { ...row, weight: to } : row
                  ),
              }
            : step
    );
}
