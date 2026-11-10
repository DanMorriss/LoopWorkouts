import { BuiltInExercise } from '../../models/exercise';

let loaded: readonly BuiltInExercise[] = [];
let loading: Promise<readonly BuiltInExercise[]> | null = null;

/**
 * Loads the built-in exercises (EXR-6), which aren't in the first download, if they aren't
 * here yet. Failing (e.g. offline, before they were ever downloaded), it can be tried again.
 * `ExerciseStore.load()` is the way in for the app; bringing old saved data up to date
 * (`prepareSavedData()`) uses it too.
 */
export function loadBuiltInExercises(): Promise<readonly BuiltInExercise[]> {
    loading ??= import('../../models/built-in-exercises').then(
        ({ BUILT_IN_EXERCISES }) => (loaded = BUILT_IN_EXERCISES),
        (error: unknown) => {
            loading = null;
            throw error;
        }
    );
    return loading;
}

/** The built-in exercises if they've loaded on this page, or none yet. */
export function loadedBuiltInExercises(): readonly BuiltInExercise[] {
    return loaded;
}
