import { canDoWith, EquipmentNeed } from './exercise';
import { RepStep, Step, withEachRepSet } from './workout';

/**
 * The reps a kettlebell step goes up to, a rep at a time, before it's time for a heavier
 * kettlebell (PRG-14), rather than going up in weight.
 */
export const KETTLEBELL_TOP_REPS = 20;

/** An exercise's equipment, by its id; undefined for one that isn't known. */
export type EquipmentOf = (
    exerciseId: string
) => { equipment: readonly EquipmentNeed[] } | undefined;

/**
 * The rep steps of a kettlebell workout (PRG-14), by their place in `steps`: one where an
 * exercise needs a kettlebell outright (a swing, say) and every other can be done with only
 * a kettlebell (a goblet squat, which takes a dumbbell or a kettlebell). It's taken to be done
 * with one kettlebell, so its rep steps that use one share a weight and go up in reps, not
 * weight. Empty for any other workout, e.g. one with a barbell, or dumbbells and a swing.
 */
export function kettlebellSteps(
    steps: readonly Step[],
    equipmentOf: EquipmentOf
): ReadonlySet<number> {
    const exercises = steps.map((step) =>
        step.exerciseId === undefined ? undefined : equipmentOf(step.exerciseId)
    );
    const known = exercises.filter((exercise) => exercise !== undefined);
    const isKettlebellWorkout =
        known.some(({ equipment }) => equipment.includes('kettlebell')) &&
        known.every((exercise) => canDoWith(exercise, ['kettlebell']));
    if (!isKettlebellWorkout) {
        return new Set();
    }
    return new Set(
        steps.flatMap((step, i) => {
            const exercise = exercises[i];
            return step.kind === 'reps' &&
                exercise?.equipment.some((need) => optionsOf(need).includes('kettlebell'))
                ? [i]
                : [];
        })
    );
}

/**
 * A kettlebell step with the kettlebell changed from `from` kg to `to` (PRG-14): every set at
 * the old weight, or with none yet, takes the new one, so one kettlebell's weight is said once.
 * A set at another weight, put there on purpose, stays as it is. The same step where none
 * changes.
 */
export function withKettlebellWeight(step: RepStep, from: number | undefined, to: number): RepStep {
    const takesIt = (weight: number | undefined) =>
        weight !== to && (weight === undefined || weight === from);
    const amounts = step.sets ?? [{ weight: step.weight }];
    if (!amounts.some((amount) => takesIt(amount.weight))) {
        return step;
    }
    return withEachRepSet(step, (amount) =>
        takesIt(amount.weight) ? { reps: amount.reps, weight: to } : amount
    );
}

function optionsOf(need: EquipmentNeed): readonly string[] {
    return typeof need === 'string' ? [need] : need;
}
