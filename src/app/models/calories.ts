import { BUILT_IN_MOVEMENTS, Movement } from './built-in-exercise-movements';
import { HistoryEntry, isTimedSet, RepSet } from './history';
import { repSetSeconds } from './workout-estimate';

/**
 * How hard each movement is, in METs (1 is sitting still, about 1 kcal per kg an hour), from
 * the Compendium of Physical Activities: compound lifts as vigorous resistance training, small
 * ones as moderate, and so on (CAL-1).
 */
const MOVEMENT_METS: Record<Movement, number> = {
    squat: 5,
    lunge: 5,
    hinge: 5,
    bridge: 5,
    'horizontal push': 5,
    'vertical push': 5,
    dip: 5,
    'horizontal pull': 5,
    'vertical pull': 5,
    'chest fly': 3.5,
    'lateral raise': 3.5,
    'rear delt': 3.5,
    curl: 3.5,
    'triceps extension': 3.5,
    shrug: 3.5,
    'leg extension': 3.5,
    'leg curl': 3.5,
    'calf raise': 3.5,
    'hip abduction': 3.5,
    'hip adduction': 3.5,
    circle: 3.5,
    'core brace': 3.8,
    'side brace': 3.8,
    'core curl': 3.8,
    'core twist': 3.8,
    hang: 3,
    carry: 6,
    'whole body': 6,
    jump: 8,
    cardio: 8,
    stretch: 2.3,
};

/** Exercises harder or easier than their movement. */
const MET_EXCEPTIONS: Readonly<Record<string, number>> = {
    'builtin:kettlebell-swing': 9.8,
    'builtin:kettlebell-snatch': 9.8,
    'builtin:jumping-jack': 7.7,
    'builtin:wall-sit': 3.5,
};

/** An exercise of your own, or none found: general resistance training. */
const DEFAULT_MET = 3.5;

/** Rests, Switch sides and unnamed steps: a little above sitting still. */
const REST_MET = 1.5;

/** How hard an exercise is, in METs. */
export function exerciseMet(exerciseId: string | undefined): number {
    if (exerciseId === undefined) {
        return DEFAULT_MET;
    }
    const movement = BUILT_IN_MOVEMENTS[exerciseId];
    return MET_EXCEPTIONS[exerciseId] ?? (movement ? MOVEMENT_METS[movement] : DEFAULT_MET);
}

/** What a run's calories are worked out from. */
export type BurningRun = Pick<HistoryEntry, 'activeSeconds' | 'repSeconds' | 'sets'>;

/**
 * About how many kcal a run burnt (CAL-1): MET × kg × hours, over its timed sets, its time on
 * rep steps (shared between its rep sets as the duration estimate guesses them), and the rest
 * of its active time at REST_MET. Not rounded.
 */
export function caloriesBurnt(run: BurningRun, bodyWeightKg: number): number {
    const sets = run.sets ?? [];
    const active = Math.max(0, run.activeSeconds);
    let metSeconds = 0;
    let timedSeconds = 0;
    const repSets: RepSet[] = [];
    for (const set of sets) {
        if (isTimedSet(set)) {
            metSeconds += set.seconds * exerciseMet(set.exerciseId);
            timedSeconds += set.seconds;
        } else {
            repSets.push(set);
        }
    }
    // Work can't be more than the run's active time: a guess too long is cut to fit
    const guesses = repSets.map((set) => repSetSeconds(set.reps));
    const guessed = guesses.reduce((total, seconds) => total + seconds, 0);
    const repSeconds = Math.min(run.repSeconds ?? guessed, Math.max(0, active - timedSeconds));
    if (guessed > 0) {
        repSets.forEach((set, i) => {
            metSeconds += ((repSeconds * guesses[i]) / guessed) * exerciseMet(set.exerciseId);
        });
    }
    const restSeconds = Math.max(0, active - timedSeconds - (guessed > 0 ? repSeconds : 0));
    metSeconds += restSeconds * REST_MET;
    return (metSeconds * bodyWeightKg) / 3600;
}

/** Calories as they're shown, to the nearest 5, or null for under 5. */
export interface CaloriesText {
    /** e.g. "210 kcal", after "About" or "about" */
    kcal: string;
    /** e.g. "about 210 calories" */
    spoken: string;
}

export function describeCalories(kcal: number, locale: string): CaloriesText | null {
    const rounded = Math.round(kcal / 5) * 5;
    if (rounded < 5) {
        return null;
    }
    const number = rounded.toLocaleString(locale);
    return { kcal: `${number} kcal`, spoken: `about ${number} calories` };
}
