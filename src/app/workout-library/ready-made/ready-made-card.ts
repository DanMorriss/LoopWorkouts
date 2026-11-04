import { BuiltInWorkout, builtInWorkoutEquipment } from '../../models/built-in-workouts';
import { capitalise, EquipmentNeed, equipmentPhrases } from '../../models/exercise';
import { allSteps } from '../../models/workout';

/** A ready-made workout as its card and its page show it. */
export interface ReadyMadeCard {
    workout: BuiltInWorkout;
    /** What it needs, to filter by: Only what I have. */
    needs: EquipmentNeed[];
    /** How many different exercises it has. */
    exercises: number;
    /** "5 exercises · Dumbbells, bench". */
    meta: string;
    /** What it needs, as on an exercise's page: "Dumbbells", "Bench". */
    equipment: string[];
    /** A workout of the same title is in the library already, most likely this one. */
    inLibrary: boolean;
}

/**
 * `workout` as its card shows it, given the titles in the library (trimmed, in lower case), to
 * say whether it's in there already.
 */
export function readyMadeCard(workout: BuiltInWorkout, titles: ReadonlySet<string>): ReadyMadeCard {
    const needs = builtInWorkoutEquipment(workout);
    const equipment = equipmentPhrases(needs).map(capitalise);
    const exercises = new Set(
        allSteps(workout)
            .map((step) => step.exerciseId)
            .filter(Boolean)
    ).size;
    return {
        workout,
        needs,
        equipment,
        exercises,
        meta: `${exercises} exercises · ${equipment.join(', ')}`,
        inLibrary: titles.has(workout.title.toLowerCase()),
    };
}

/** The part of a ready-made workout's id its page's address uses: "gym-legs". */
export function readyMadeSlug(workout: BuiltInWorkout): string {
    return workout.id.replace(/^builtin:/, '');
}
