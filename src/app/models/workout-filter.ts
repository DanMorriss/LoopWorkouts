import { workoutEquipment } from './built-in-workouts';
import { canDoWith, Equipment, Exercise, MuscleGroup } from './exercise';
import { allSteps, Workout } from './workout';
import { musclesWorked } from './workout-muscles';

/** A workout of your own or a ready-made one: what it's filtered on. */
type Filterable = Pick<Workout, 'title' | 'blocks' | 'favourite'>;

/** What the Workouts page is cut down by. */
export interface WorkoutFilters {
    /** What's typed in the search box: found in the title or an exercise's name. */
    query: string;
    /** Only favourites. */
    favourites: boolean;
    /** Main muscles, any of; empty for all. */
    muscles: readonly MuscleGroup[];
    /** Only what I have: just those doable with `myEquipment`. */
    onlyMine: boolean;
    myEquipment: readonly Equipment[];
}

/**
 * The workouts that pass `filters`, yours or ready-made ones (never a favourite), in the
 * order given. A search finds its words, in any case, in the title or in a step's name or its
 * exercise's, so "squat" finds "Legs day" with Back squat in it. A workout with no step linked
 * to an exercise works no known muscle and needs nothing, so muscles hide it and Only what I
 * have doesn't.
 */
export function filterWorkouts<T extends Filterable>(
    workouts: readonly T[],
    filters: WorkoutFilters,
    byId: (id: string) => Exercise | undefined
): T[] {
    const words = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return workouts.filter(
        (workout) =>
            (!filters.favourites || workout.favourite === true) &&
            (words.length === 0 || matches(workout, words, byId)) &&
            (filters.muscles.length === 0 || worksAny(workout, filters.muscles, byId)) &&
            (!filters.onlyMine ||
                canDoWith({ equipment: workoutEquipment(workout, byId) }, filters.myEquipment))
    );
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
    const text = [workout.title, ...names].join('\n').toLowerCase();
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
