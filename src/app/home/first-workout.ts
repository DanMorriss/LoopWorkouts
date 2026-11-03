import {
    BUILT_IN_WORKOUTS,
    BuiltInWorkout,
    builtInWorkoutEquipment,
} from '../models/built-in-workouts';
import { canDoWith, Equipment } from '../models/exercise';
import { TrainingGoal } from '../models/muscle-balance';

/**
 * The ready-made workouts to start with, best first, for each goal: building muscle, the one
 * using the most of what you have (in a gym, the whole-body one for beginners); for fitness, a
 * full body circuit or a quick, hard one. The last of each needs nothing, so there's always one
 * you can do.
 */
const FIRST_CHOICES: Record<TrainingGoal, readonly string[]> = {
    muscle: [
        'builtin:gym-full-body',
        'builtin:dumbbell-full-body',
        'builtin:kettlebell-full-body',
        'builtin:bodyweight-basics',
    ],
    fitness: ['builtin:kettlebell-full-body', 'builtin:20-minute-amrap'],
};

/** The ready-made workout Today offers to start with (NAV-4), for your goal and equipment. */
export function firstWorkout(goal: TrainingGoal, kit: readonly Equipment[]): BuiltInWorkout {
    const fits = FIRST_CHOICES[goal]
        .map((id) => BUILT_IN_WORKOUTS.find((workout) => workout.id === id))
        .filter((workout) => workout !== undefined)
        .filter((workout) => canDoWith({ equipment: builtInWorkoutEquipment(workout) }, kit));
    return fits[0] ?? BUILT_IN_WORKOUTS[0];
}
