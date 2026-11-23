import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { Effort } from './exercise';
import { BUILT_IN_MOVEMENTS, Movement } from './built-in-exercise-movements';
import { HistoryEntry, isTimedSet, RepSet } from './history';
import { repSetSeconds } from './workout-estimate';

/**
 * How hard each movement is, in METs (1 is sitting still, about 1 kcal per kg an hour), from
 * the Compendium of Physical Activities, at the vigorous end, as workouts here are sets with
 * short rests rather than a lift now and then, and in line with other fitness apps (CAL-1,
 * since 2026-11-23): compound lifts as vigorous resistance training (6), small ones between
 * moderate and vigorous (4), whole-body work and carries as vigorous circuit training (8).
 */
const MOVEMENT_METS: Record<Movement, number> = {
    squat: 6,
    lunge: 6,
    hinge: 6,
    bridge: 6,
    'horizontal push': 6,
    'vertical push': 6,
    dip: 6,
    'horizontal pull': 6,
    'vertical pull': 6,
    'chest fly': 4,
    'lateral raise': 4,
    'rear delt': 4,
    curl: 4,
    'triceps extension': 4,
    shrug: 4,
    'leg extension': 4,
    'leg curl': 4,
    'calf raise': 4,
    'hip abduction': 4,
    'hip adduction': 4,
    circle: 4,
    'core brace': 4,
    'side brace': 4,
    'core curl': 4,
    'core twist': 4,
    hang: 3,
    carry: 8,
    'whole body': 8,
    jump: 8,
    cardio: 8,
    stretch: 2.3,
};

/** Exercises harder or easier than their movement. */
const MET_EXCEPTIONS: Readonly<Record<string, number>> = {
    'builtin:kettlebell-swing': 9.8,
    'builtin:kettlebell-snatch': 9.8,
    'builtin:jumping-jack': 7.7,
    'builtin:wall-sit': 4,
};

/**
 * Exercises done only with a kettlebell: the Compendium's circuit training with kettlebells,
 * vigorous, 8 METs, unless their movement or their own is more.
 */
const KETTLEBELL_MET = 8;
const KETTLEBELL_ONLY: ReadonlySet<string> = new Set(
    BUILT_IN_EXERCISES.filter(
        (exercise) =>
            exercise.equipment.length > 0 &&
            exercise.equipment.every((need) => need === 'kettlebell')
    ).map((exercise) => exercise.id)
);

/** A set with no exercise found: resistance training, between moderate and vigorous. */
const DEFAULT_MET = 5;

/**
 * An exercise of your own, by how hard you say it is (CAL-4), from the Compendium: light or
 * moderate resistance training (3.5); between that and vigorous, as unsaid (5); and vigorous
 * circuit training, as a jump or a burpee is here (8).
 */
const EFFORT_METS: Record<Effort, number> = { light: 3.5, moderate: DEFAULT_MET, hard: 8 };

/** How hard each exercise of your own is, by id. */
export type OwnEfforts = ReadonlyMap<string, Effort>;
const NO_EFFORTS: OwnEfforts = new Map();

/**
 * Rests, Switch sides and unnamed steps: well above sitting still, as breathing and heart rate
 * are still up between sets.
 */
const REST_MET = 2.5;

/**
 * The afterburn (EPOC): after a workout the body uses more than it would at rest for a while,
 * as it recovers. After strength and circuit work that's about 6 to 15% of the workout's
 * calories above resting, mostly in the first few hours, tailing off over about a day
 * (Børsheim and Bahr, 2003). Taken at the top of that, in line with other fitness apps, as
 * shown "over the next day".
 */
const AFTERBURN_SHARE = 0.15;
/** How hard an exercise is, in METs: a built-in one's, or one of your own from `efforts`. */
export function exerciseMet(exerciseId: string | undefined, efforts = NO_EFFORTS): number {
    if (exerciseId === undefined) {
        return DEFAULT_MET;
    }
    const effort = efforts.get(exerciseId);
    if (effort) {
        return EFFORT_METS[effort];
    }
    const movement = BUILT_IN_MOVEMENTS[exerciseId];
    const met = MET_EXCEPTIONS[exerciseId] ?? (movement ? MOVEMENT_METS[movement] : DEFAULT_MET);
    return KETTLEBELL_ONLY.has(exerciseId) ? Math.max(met, KETTLEBELL_MET) : met;
}

/** What a run's calories are worked out from. */
export type BurningRun = Pick<HistoryEntry, 'activeSeconds' | 'repSeconds' | 'sets'>;

/**
 * About how many kcal a run burnt (CAL-1): MET × kg × hours, over its timed sets, its time on
 * rep steps (shared between its rep sets as the duration estimate guesses them), and the rest
 * of its active time at REST_MET. Not rounded.
 */
export function caloriesBurnt(run: BurningRun, bodyWeightKg: number, efforts = NO_EFFORTS): number {
    const sets = run.sets ?? [];
    const active = Math.max(0, run.activeSeconds);
    let metSeconds = 0;
    let timedSeconds = 0;
    const repSets: RepSet[] = [];
    for (const set of sets) {
        if (isTimedSet(set)) {
            metSeconds += set.seconds * exerciseMet(set.exerciseId, efforts);
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
            metSeconds +=
                ((repSeconds * guesses[i]) / guessed) * exerciseMet(set.exerciseId, efforts);
        });
    }
    const restSeconds = Math.max(0, active - timedSeconds - (guessed > 0 ? repSeconds : 0));
    metSeconds += restSeconds * REST_MET;
    return (metSeconds * bodyWeightKg) / 3600;
}

/**
 * About how many more kcal a run burns over the next day as the body recovers (the afterburn,
 * EPOC): a share of what it burnt above resting (1 MET). Not rounded.
 */
export function afterburn(run: BurningRun, bodyWeightKg: number, efforts = NO_EFFORTS): number {
    const resting = (Math.max(0, run.activeSeconds) * bodyWeightKg) / 3600;
    return AFTERBURN_SHARE * Math.max(0, caloriesBurnt(run, bodyWeightKg, efforts) - resting);
}

/** What's said under a body weight's box: what it's for, and where it's kept (CAL-2, CAL-6). */
export function bodyWeightHint(keptWithAccount: boolean): string {
    return keptWithAccount
        ? 'For calories burnt. Kept with your account'
        : 'For calories burnt. Kept on this device only';
}

/** Calories as they're shown, to the nearest 5, or null for under 5. */
export interface CaloriesText {
    /** e.g. "210", for after a total: "+ 25 afterburn" */
    number: string;
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
    return { number, kcal: `${number} kcal`, spoken: `about ${number} calories` };
}
