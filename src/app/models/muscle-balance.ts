import { isStretch } from './built-in-stretches';
import { Exercise, MUSCLE_LABELS, MuscleGroup } from './exercise';
import { HistoryEntry } from './history';
import { allSteps, Workout } from './workout';
import { ALL_MUSCLES } from './workout-muscles';

/**
 * What you train for (PRG-8), chosen on Profile: it sets the sets a week each muscle aims at to
 * start with (`DEFAULT_WEEKLY_SETS`), which can then be changed (`weeklySets` in the settings).
 */
export type TrainingGoal = 'muscle' | 'fitness';
export const TRAINING_GOALS: readonly TrainingGoal[] = ['muscle', 'fitness'];

/** Muscles that are rarely trained on their own and need fewer sets, so they aim lower. */
export const SMALL_MUSCLES: ReadonlySet<MuscleGroup> = new Set<MuscleGroup>([
    'abductors',
    'adductors',
    'forearms',
    'obliques',
]);

/**
 * The sets a week each muscle aims at to start with, by what you train for: at least 10 is the
 * usual advice for building muscle, and training for fitness about two thirds of that. There's
 * no most: going past the aim is fine.
 */
export const DEFAULT_WEEKLY_SETS: Record<TrainingGoal, number> = { muscle: 10, fitness: 6 };

/** The fewest and most sets a week each muscle can be set to aim at, on Profile. */
export const MIN_WEEKLY_SETS = 2;
export const MAX_WEEKLY_SETS = 30;

/** Small muscles aim for about this share of the others' sets, as they need fewer. */
const SMALL_SHARE = 0.4;

/**
 * The sets a week a muscle aims at, when each muscle aims at `weeklySets`: small muscles about
 * two fifths of that (4 of 10, 2 of 6), never under 1. Fewer is under it.
 */
export function weeklyAim(muscle: MuscleGroup, weeklySets: number): number {
    return SMALL_MUSCLES.has(muscle) ? smallAim(weeklySets) : weeklySets;
}

/** What the small muscles aim at, when the others aim at `weeklySets`. */
export function smallAim(weeklySets: number): number {
    return Math.max(1, Math.round(weeklySets * SMALL_SHARE));
}

/**
 * A saved sets a week, if it's a whole number in range, or the goal's default otherwise, as
 * from a version of the app before it could be set.
 */
export function readWeeklySets(value: unknown, goal: TrainingGoal): number {
    return Number.isInteger(value) &&
        (value as number) >= MIN_WEEKLY_SETS &&
        (value as number) <= MAX_WEEKLY_SETS
        ? (value as number)
        : DEFAULT_WEEKLY_SETS[goal];
}

export type MuscleStatus = 'under' | 'reached';

export interface MuscleBalance {
    muscle: MuscleGroup;
    /** Sets this week: 1 for each set where it's a main muscle, ½ where it's supporting. */
    sets: number;
    aim: number;
    status: MuscleStatus;
}

/**
 * The sets each muscle has had in the entries (PRG-6): each set counts 1 for its exercise's
 * main muscles and ½ for supporting ones, and a side of an exercise done each side half that.
 * Sets with no exercise, or of one that's gone, don't count, nor do stretches, which ease a
 * muscle rather than train it. Muscles with none are left out.
 */
export function setsByMuscle(
    entries: readonly HistoryEntry[],
    byId: (id: string) => Exercise | undefined
): Map<MuscleGroup, number> {
    const counts = new Map<MuscleGroup, number>();
    for (const entry of entries) {
        for (const set of entry.sets ?? []) {
            const exercise =
                set.exerciseId && !isStretch(set.exerciseId) ? byId(set.exerciseId) : undefined;
            if (!exercise) {
                continue;
            }
            // A left and a right are one set between them
            const share = set.side ? 0.5 : 1;
            for (const muscle of exercise.mainMuscles) {
                counts.set(muscle, (counts.get(muscle) ?? 0) + share);
            }
            for (const muscle of exercise.supportingMuscles) {
                counts.set(muscle, (counts.get(muscle) ?? 0) + share / 2);
            }
        }
    }
    return counts;
}

export function muscleStatus(sets: number, aim: number): MuscleStatus {
    return sets < aim ? 'under' : 'reached';
}

/** Every muscle group with its sets, aim and status, most worked first, A to Z on a tie. */
export function muscleBalance(
    counts: ReadonlyMap<MuscleGroup, number>,
    weeklySets: number
): MuscleBalance[] {
    return ALL_MUSCLES.map((muscle) => {
        const sets = counts.get(muscle) ?? 0;
        const aim = weeklyAim(muscle, weeklySets);
        return { muscle, sets, aim, status: muscleStatus(sets, aim) };
    }).sort(
        (a, b) => b.sets - a.sets || MUSCLE_LABELS[a.muscle].localeCompare(MUSCLE_LABELS[b.muscle])
    );
}

export interface SuggestedWorkout {
    workout: Workout;
    /** Its main muscles, furthest short of their aims first: the ones it's suggested for. */
    muscles: MuscleGroup[];
}

/**
 * How far a muscle has got towards its aim this week: its sets over its aim, so 1 is just
 * reached it. Small muscles aim lower, so they get there sooner.
 */
export function shareOfAim(sets: number, muscle: MuscleGroup, weeklySets: number): number {
    return sets / weeklyAim(muscle, weeklySets);
}

/**
 * What a suggestion should steer clear of: on a rest day in a planned week, the workout planned
 * next, which isn't suggested, and its main muscles, rested for it.
 */
export interface SuggestionAvoid {
    workoutIds: ReadonlySet<string>;
    muscles: ReadonlySet<MuscleGroup>;
}

/**
 * The most of a workout's main muscles that can be among those to avoid, for it to be offered
 * ahead of those with more: a third, so a full-body workout with the legs in it is fine before
 * a legs day, and a legs workout isn't.
 */
const MOST_OVERLAP = 1 / 3;

/**
 * The saved workout that works the muscles furthest short of their aims: the lowest average
 * of each muscle's share of its aim this week (`shareOfAim`) over the muscles it works, its
 * main muscles counting twice what its supporting ones do. On a tie, the one done longest ago
 * (never done first), then the library's order. Null when no workout has a step linked to an
 * exercise.
 *
 * With `avoid`, its workouts are left out, and one whose main muscles are mostly those to avoid
 * (more than MOST_OVERLAP of them) is only suggested when every other one is too.
 */
export function suggestNextWorkout(
    workouts: readonly Workout[],
    counts: ReadonlyMap<MuscleGroup, number>,
    byId: (id: string) => Exercise | undefined,
    /** When each workout was last started, by its id; missing for never. */
    lastDone: ReadonlyMap<string, number>,
    /** The sets a week each muscle aims at (`weeklyAim`). */
    weeklySets: number,
    avoid?: SuggestionAvoid
): SuggestedWorkout | null {
    if (avoid) {
        const allowed = workouts.filter((workout) => !avoid.workoutIds.has(workout.id));
        const apart = allowed.filter((workout) => {
            const main = [...muscleWeights(workout, byId)].filter(([, weight]) => weight === 1);
            const shared = main.filter(([muscle]) => avoid.muscles.has(muscle)).length;
            return main.length > 0 && shared / main.length <= MOST_OVERLAP;
        });
        return (
            suggestNextWorkout(apart, counts, byId, lastDone, weeklySets) ??
            suggestNextWorkout(allowed, counts, byId, lastDone, weeklySets)
        );
    }
    let best: { suggestion: SuggestedWorkout; load: number; lastDone: number } | null = null;
    const share = (muscle: MuscleGroup) => shareOfAim(counts.get(muscle) ?? 0, muscle, weeklySets);

    for (const workout of workouts) {
        const weights = muscleWeights(workout, byId);
        if (weights.size === 0) {
            continue;
        }

        let weighted = 0;
        let total = 0;
        for (const [muscle, weight] of weights) {
            weighted += weight * share(muscle);
            total += weight;
        }
        const load = weighted / total;
        const done = lastDone.get(workout.id) ?? -Infinity;
        if (best && (load > best.load || (load === best.load && done >= best.lastDone))) {
            continue;
        }

        const muscles = [...weights]
            .filter(([, weight]) => weight === 1)
            .map(([muscle]) => muscle)
            .sort(
                (a, b) => share(a) - share(b) || MUSCLE_LABELS[a].localeCompare(MUSCLE_LABELS[b])
            );
        best = { suggestion: { workout, muscles }, load, lastDone: done };
    }

    return best?.suggestion ?? null;
}

/**
 * The muscles a workout trains: 1 where any of its exercises has it as main, else ½. Stretches
 * don't train them, so a workout of only stretches has none, and isn't suggested.
 */
function muscleWeights(
    workout: Workout,
    byId: (id: string) => Exercise | undefined
): Map<MuscleGroup, number> {
    const weights = new Map<MuscleGroup, number>();
    for (const step of allSteps(workout)) {
        const exercise =
            step.kind === 'rest' || !step.exerciseId || isStretch(step.exerciseId)
                ? undefined
                : byId(step.exerciseId);
        for (const muscle of exercise?.supportingMuscles ?? []) {
            weights.set(muscle, Math.max(weights.get(muscle) ?? 0, 0.5));
        }
        for (const muscle of exercise?.mainMuscles ?? []) {
            weights.set(muscle, 1);
        }
    }
    return weights;
}
