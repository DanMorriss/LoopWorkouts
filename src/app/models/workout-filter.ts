import { isActiveRest } from './active-rest';
import { workoutEquipment } from './built-in-workouts';
import { canDoWith, Equipment, Exercise, MuscleGroup } from './exercise';
import { allSteps, Workout } from './workout';
import { WorkoutKind } from './workout-kind';
import { musclesWorked } from './workout-muscles';

/** A workout of your own or a ready-made one, which has a description: what it's filtered on. */
type Filterable = Pick<Workout, 'id' | 'title' | 'blocks'> & { description?: string };

/** What the Workouts page is cut down by. */
export interface WorkoutFilters {
    kind: WorkoutKind;
    /** What's typed in the search box: found in the title, description or an exercise's name. */
    query: string;
    /** Only favourites (`isFavourite`). */
    favourites: boolean;
    /** Main muscles, any of; empty for all. */
    muscles: readonly MuscleGroup[];
    /** Only what I have: just those doable with `myEquipment`. */
    onlyMine: boolean;
    myEquipment: readonly Equipment[];
}

/**
 * The workouts that pass `filters`, yours or ready-made ones, in the order given. A search finds
 * its words, in any case, in the title, a ready-made one's description, or a step's name or its
 * exercise's, so "squat" finds "Legs day" with Back squat in it, and "HIIT" finds Tabata. A workout with no step linked
 * to an exercise works no known muscle and needs nothing, so muscles hide it and Only what I
 * have doesn't.
 */
export function filterWorkouts<T extends Filterable>(
    workouts: readonly T[],
    filters: WorkoutFilters,
    byId: (id: string) => Exercise | undefined,
    isFavourite: (id: string) => boolean
): T[] {
    const words = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return workouts.filter(
        (workout) =>
            isKind(workout, filters.kind) &&
            (!filters.favourites || isFavourite(workout.id)) &&
            (words.length === 0 || matches(workout, words, byId)) &&
            (filters.muscles.length === 0 || worksAny(workout, filters.muscles, byId)) &&
            (!filters.onlyMine || canDoWorkoutWith(workout, filters.myEquipment, byId))
    );
}

/** Whether every exercise in a workout can be done with only `available` equipment. */
export function canDoWorkoutWith(
    workout: Pick<Workout, 'blocks'>,
    available: readonly Equipment[],
    byId: (id: string) => Exercise | undefined
): boolean {
    return canDoWith({ equipment: workoutEquipment(workout, byId) }, available);
}

function isKind(workout: Filterable, kind: WorkoutKind): boolean {
    return kind === 'all' || isActiveRest(workout) === (kind === 'stretches');
}

function matches(
    workout: Filterable,
    words: readonly string[],
    byId: (id: string) => Exercise | undefined
): boolean {
    const names = allSteps(workout).flatMap((step) => [
        step.name,
        (step.exerciseId && byId(step.exerciseId)?.name) || '',
    ]);
    const text = [workout.title, workout.description ?? '', ...names].join('\n').toLowerCase();
    return words.every((word) => text.includes(word));
}

function worksAny(
    workout: Filterable,
    muscles: readonly MuscleGroup[],
    byId: (id: string) => Exercise | undefined
): boolean {
    const { main } = musclesWorked([workout], byId);
    return muscles.some((muscle) => main.includes(muscle));
}
