import { BUILT_IN_MOVEMENTS } from '../../../models/built-in-exercise-movements';
import { canDoWith, Equipment, Exercise, MeasuredBy, MuscleGroup } from '../../../models/exercise';

/** How many suggestions to offer: enough to find one free, few enough to read between sets. */
const SUGGESTIONS = 5;
/**
 * What moving the same way counts for: more than a main muscle in common, so a squat comes
 * before a burpee for a front squat, though both work the quads.
 */
const SAME_MOVEMENT = 4;

/**
 * Exercises to do instead of `current` (RUN-11), closest first: measured the same way, sharing
 * a main muscle or moving the same way (see BUILT_IN_MOVEMENTS), and doable with `myEquipment`
 * (any, if none is picked yet). Ranked by moving the same way, then by how closely their main
 * muscles match `current`'s, each extra or missing one counting against it (so a whole-body
 * move doesn't come top for a chest one), with a little for supporting muscles in common; and
 * a little more for needing none of `current`'s equipment, as that's likely what's taken.
 * Then by name. An exercise of your own has no movement, so it's by muscles alone.
 */
export function swapSuggestions(
    current: Exercise,
    measuredBy: MeasuredBy,
    exercises: readonly Exercise[],
    myEquipment: readonly Equipment[]
): Exercise[] {
    const main = new Set(current.mainMuscles);
    const supporting = new Set(current.supportingMuscles);
    const movement = BUILT_IN_MOVEMENTS[current.id];
    const sameMovement = (exercise: Exercise) =>
        movement !== undefined && BUILT_IN_MOVEMENTS[exercise.id] === movement;
    const kit = new Set<Equipment>(current.equipment.flat().filter((piece) => piece !== 'none'));
    const count = (muscles: readonly MuscleGroup[], of: Set<MuscleGroup>) =>
        muscles.filter((muscle) => of.has(muscle)).length;
    const freeOfKit = (exercise: Exercise) =>
        exercise.equipment.flat().every((piece) => !kit.has(piece));
    const score = (exercise: Exercise) => {
        const shared = count(exercise.mainMuscles, main);
        return (
            3 * shared -
            1.5 * (exercise.mainMuscles.length - shared) -
            (main.size - shared) +
            0.5 * count(exercise.supportingMuscles, supporting) +
            (freeOfKit(exercise) ? 1 : 0) +
            (sameMovement(exercise) ? SAME_MOVEMENT : 0)
        );
    };
    return exercises
        .filter(
            (exercise) =>
                exercise.id !== current.id &&
                exercise.measuredBy === measuredBy &&
                (count(exercise.mainMuscles, main) > 0 || sameMovement(exercise)) &&
                (myEquipment.length === 0 || canDoWith(exercise, myEquipment))
        )
        .map((exercise) => ({ exercise, score: score(exercise) }))
        .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
        .slice(0, SUGGESTIONS)
        .map(({ exercise }) => exercise);
}
