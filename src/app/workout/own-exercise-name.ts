import { isBuiltIn } from '../models/exercise';
import { ExerciseStore } from '../shared/state/exercise-store.service';

/**
 * What a set's exercise is called now, if it's your own (it may have been renamed since).
 * Built-in names never change, so a set keeps the name it ran with, e.g. "Squats".
 */
export function ownExerciseName(exercises: ExerciseStore) {
    return (id: string): string | undefined => {
        const exercise = exercises.byId(id);
        return exercise && !isBuiltIn(exercise) ? exercise.name : undefined;
    };
}
