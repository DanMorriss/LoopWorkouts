import { Exercise, MUSCLE_LABELS, MuscleGroup } from './exercise';
import { HistoryEntry } from './history';
import { allSteps, Workout } from './workout';
import { ALL_MUSCLES } from './workout-muscles';

/** What you train for (PRG-8), chosen on Profile: it sets the sets a week each muscle aims at. */
export type TrainingGoal = 'muscle' | 'fitness';
export const TRAINING_GOALS: readonly TrainingGoal[] = ['muscle', 'fitness'];

/** The sets a week a muscle aims at: fewer is under, more is over. */
export interface WeeklyAim {
    low: number;
    high: number;
}

/** Muscles that are rarely trained on their own and need fewer sets, so they aim lower. */
export const SMALL_MUSCLES: ReadonlySet<MuscleGroup> = new Set<MuscleGroup>([
    'abductors',
    'adductors',
    'forearms',
    'neck',
    'obliques',
    'shins',
]);

/**
 * 10 to 20 sets a week is the usual advice for building muscle; small muscles get about half
 * that, and training for fitness about two thirds of either.
 */
export const WEEKLY_AIMS: Record<TrainingGoal, { large: WeeklyAim; small: WeeklyAim }> = {
    muscle: { large: { low: 10, high: 20 }, small: { low: 4, high: 10 } },
    fitness: { large: { low: 6, high: 12 }, small: { low: 2, high: 6 } },
};

export function weeklyAim(muscle: MuscleGroup, goal: TrainingGoal): WeeklyAim {
    return WEEKLY_AIMS[goal][SMALL_MUSCLES.has(muscle) ? 'small' : 'large'];
}

export type MuscleStatus = 'under' | 'in-range' | 'over';

export interface MuscleBalance {
    muscle: MuscleGroup;
    /** Sets this week: 1 for each set where it's a main muscle, ½ where it's supporting. */
    sets: number;
    aim: WeeklyAim;
    status: MuscleStatus;
}

/**
 * The sets each muscle has had in the entries (PRG-6): each set counts 1 for its exercise's
 * main muscles and ½ for supporting ones, and a side of an exercise done each side half that.
 * Sets with no exercise, or of one that's gone, don't count. Muscles with none are left out.
 */
export function setsByMuscle(
    entries: readonly HistoryEntry[],
    byId: (id: string) => Exercise | undefined
): Map<MuscleGroup, number> {
    const counts = new Map<MuscleGroup, number>();
    for (const entry of entries) {
        for (const set of entry.sets ?? []) {
            const exercise = set.exerciseId ? byId(set.exerciseId) : undefined;
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

export function muscleStatus(sets: number, { low, high }: WeeklyAim): MuscleStatus {
    if (sets < low) {
        return 'under';
    }
    return sets > high ? 'over' : 'in-range';
}

/** Every muscle group with its sets, aim and status, most worked first, A to Z on a tie. */
export function muscleBalance(
    counts: ReadonlyMap<MuscleGroup, number>,
    goal: TrainingGoal
): MuscleBalance[] {
    return ALL_MUSCLES.map((muscle) => {
        const sets = counts.get(muscle) ?? 0;
        const aim = weeklyAim(muscle, goal);
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
 * How far a muscle has got towards its aim this week: its sets over the low end of its aim,
 * so 1 is just in range. Small muscles and training for fitness aim lower, so they get there
 * sooner.
 */
export function shareOfAim(sets: number, muscle: MuscleGroup, goal: TrainingGoal): number {
    return sets / weeklyAim(muscle, goal).low;
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
    goal: TrainingGoal,
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
            suggestNextWorkout(apart, counts, byId, lastDone, goal) ??
            suggestNextWorkout(allowed, counts, byId, lastDone, goal)
        );
    }
    let best: { suggestion: SuggestedWorkout; load: number; lastDone: number } | null = null;
    const share = (muscle: MuscleGroup) => shareOfAim(counts.get(muscle) ?? 0, muscle, goal);

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

/** The muscles a workout works: 1 where any of its exercises has it as main, else ½. */
function muscleWeights(
    workout: Workout,
    byId: (id: string) => Exercise | undefined
): Map<MuscleGroup, number> {
    const weights = new Map<MuscleGroup, number>();
    for (const step of allSteps(workout)) {
        const exercise =
            step.kind === 'rest' || !step.exerciseId ? undefined : byId(step.exerciseId);
        for (const muscle of exercise?.supportingMuscles ?? []) {
            weights.set(muscle, Math.max(weights.get(muscle) ?? 0, 0.5));
        }
        for (const muscle of exercise?.mainMuscles ?? []) {
            weights.set(muscle, 1);
        }
    }
    return weights;
}
