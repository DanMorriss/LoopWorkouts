import { canDoWith, Equipment, Exercise, MuscleGroup } from '../models/exercise';
import { ExerciseMatch, searchExercises } from '../models/exercise-links';

/** What the Exercises list (EXR-6) and Browse in Create (BLD-16) are cut down by. */
export interface ExerciseFilters {
    /** What's typed in the search box. */
    query: string;
    /** Main muscles to show, any of; empty for all. */
    muscles: readonly MuscleGroup[];
    /** Only what I have: just those doable with `myEquipment`. */
    onlyMine: boolean;
    myEquipment: readonly Equipment[];
}

/**
 * The exercises that pass `filters`: best match first while searching (as the picker finds
 * them, with the other name each was found by), otherwise A to Z.
 */
export function filterExercises(
    exercises: readonly Exercise[],
    { query, muscles, onlyMine, myEquipment }: ExerciseFilters
): ExerciseMatch[] {
    const typed = query.trim();
    const matches: ExerciseMatch[] = typed
        ? searchExercises(typed, exercises, Infinity)
        : [...exercises]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((exercise) => ({ exercise }));
    return matches.filter(
        ({ exercise }) =>
            (muscles.length === 0 || muscles.some((m) => exercise.mainMuscles.includes(m))) &&
            (!onlyMine || canDoWith(exercise, myEquipment))
    );
}
