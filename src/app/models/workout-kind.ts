/**
 * What kind of workout the Workouts page lists (LIB-10): all, training (anything with more than
 * stretches in it) or stretches, a workout of only stretches (`isActiveRest()`). A file of its
 * own, as the settings have it and they're on every page.
 */
export type WorkoutKind = 'all' | 'training' | 'stretches';

export const WORKOUT_KINDS: readonly WorkoutKind[] = ['all', 'training', 'stretches'];
