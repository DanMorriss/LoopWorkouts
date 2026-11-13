import { isActiveRest } from './active-rest';
import { BUILT_IN_WORKOUTS, BuiltInWorkout, builtInWorkoutEquipment } from './built-in-workouts';
import { canDoWith, Equipment, EquipmentNeed } from './exercise';
import { TrainingGoal } from './muscle-balance';
import { WEEKDAYS } from './plan';

/**
 * A ready-made week (PLN-6): which ready-made workouts go on which days, the same every week.
 * Using one replaces your plan with it, its ready-made workouts planned as they are, with Undo.
 * Between the training days are two for mobility (a flow early in the week, longer holds near
 * the end), and the days with nothing on them are rest days.
 */
export interface BuiltInPlan {
    /** Fixed for good: `builtin-plan:<title-in-kebab-case>`. */
    id: `builtin-plan:${string}`;
    title: string;
    /** One line: who it's for, and how the week goes. */
    description: string;
    /** The goals it suits (Training for), so it's offered for them first. */
    goals: readonly TrainingGoal[];
    /** For each day, Monday first, the ready-made workouts' ids, in order. */
    days: readonly (readonly BuiltInWorkout['id'][])[];
}

/** A week from the days that have something on them, e.g. `{ 0: [...], 2: [...] }`. */
function week(days: Partial<Record<number, BuiltInWorkout['id'][]>>): BuiltInWorkout['id'][][] {
    return WEEKDAYS.map((_, day) => days[day] ?? []);
}

/** The mobility days' workouts: a flow early in the week, and longer holds near the end. */
const MOBILITY = 'builtin:mobility-flow';
const STRETCH = 'builtin:full-body-stretch';

/** The ready-made plans, in the order they're listed. Ids never change once released. */
export const BUILT_IN_PLANS: readonly BuiltInPlan[] = [
    {
        id: 'builtin-plan:3-day-beginner-gym',
        title: '3-day beginner gym',
        description: 'Gym full body three times a week, with a rest day between each.',
        goals: ['muscle'],
        days: week({
            0: ['builtin:gym-full-body'],
            1: [MOBILITY],
            2: ['builtin:gym-full-body'],
            4: ['builtin:gym-full-body'],
            5: [STRETCH],
        }),
    },
    {
        id: 'builtin-plan:push-pull-legs',
        title: 'Push, pull, legs',
        description: 'A day each for pushing, pulling and legs, then the smaller muscles.',
        goals: ['muscle'],
        days: week({
            0: ['builtin:gym-push'],
            1: [MOBILITY],
            2: ['builtin:gym-pull'],
            4: ['builtin:gym-legs'],
            5: ['builtin:gym-extras'],
            6: [STRETCH],
        }),
    },
    {
        id: 'builtin-plan:dumbbells-at-home',
        title: 'Dumbbells at home, 4 days',
        description: 'Upper and lower body twice each, with dumbbells and a bench.',
        goals: ['muscle'],
        days: week({
            0: ['builtin:dumbbell-upper'],
            1: ['builtin:dumbbell-lower'],
            2: [MOBILITY],
            3: ['builtin:dumbbell-upper'],
            4: ['builtin:dumbbell-lower'],
            5: [STRETCH],
        }),
    },
    {
        id: 'builtin-plan:kettlebell-3-day',
        title: 'Kettlebell, 3 days',
        description: 'Full body twice, and a swing ladder with core between.',
        goals: ['muscle', 'fitness'],
        days: week({
            0: ['builtin:kettlebell-full-body'],
            1: [MOBILITY],
            2: ['builtin:kettlebell-swing-ladder', 'builtin:core-in-15'],
            4: ['builtin:kettlebell-full-body'],
            5: [STRETCH],
        }),
    },
    {
        id: 'builtin-plan:no-equipment-3-day',
        title: 'No equipment, 3 days',
        description: 'Strength, intervals, then core and a Tabata. Nothing needed.',
        goals: ['muscle', 'fitness'],
        days: week({
            0: ['builtin:bodyweight-basics'],
            1: [MOBILITY],
            2: ['builtin:cardio-intervals'],
            4: ['builtin:core-in-15', 'builtin:tabata'],
            5: [STRETCH],
        }),
    },
    {
        id: 'builtin-plan:fitness-4-day',
        title: 'Fitness, 4 days',
        description: 'Four short, hard sessions a week, with a kettlebell for one of them.',
        goals: ['fitness'],
        days: week({
            0: ['builtin:tabata'],
            1: ['builtin:kettlebell-amrap'],
            2: [MOBILITY],
            3: ['builtin:20-minute-amrap'],
            5: ['builtin:cardio-intervals'],
            6: [STRETCH],
        }),
    },
];

/** The ready-made workouts a plan uses, each once, in the order they first come up. */
export function planWorkouts(plan: Pick<BuiltInPlan, 'days'>): BuiltInWorkout[] {
    const ids = [...new Set(plan.days.flat())];
    return ids.map((id) => {
        const found = BUILT_IN_WORKOUTS.find((workout) => workout.id === id);
        if (!found) {
            throw new Error(`No ready-made workout ${id}`);
        }
        return found;
    });
}

/** Everything a plan's workouts need, as `builtInWorkoutEquipment()` has it for one. */
/**
 * `plan` without its active rest (its mobility days), for those who'd rather rest: those days
 * are left empty, and its training days stay as they are.
 */
export function withoutActiveRest(plan: BuiltInPlan): BuiltInPlan {
    const rest = new Set(
        planWorkouts(plan)
            .filter(isActiveRest)
            .map((workout) => workout.id)
    );
    return { ...plan, days: plan.days.map((day) => day.filter((id) => !rest.has(id))) };
}

export function builtInPlanEquipment(plan: Pick<BuiltInPlan, 'days'>): EquipmentNeed[] {
    return builtInWorkoutEquipment({
        blocks: planWorkouts(plan).flatMap((workout) => workout.blocks),
    });
}

/** Whether all of a plan's workouts can be done with `kit`. */
export function canDoPlanWith(plan: Pick<BuiltInPlan, 'days'>, kit: readonly Equipment[]): boolean {
    return canDoWith({ equipment: builtInPlanEquipment(plan) }, kit);
}

/**
 * The plans to show: those made for `goal` alone first, then those that suit it among others,
 * then the rest, each in their order. With `onlyMine`, only those `kit` allows.
 */
export function plansFor(
    goal: TrainingGoal,
    kit: readonly Equipment[],
    onlyMine: boolean
): BuiltInPlan[] {
    const shown = BUILT_IN_PLANS.filter((plan) => !onlyMine || canDoPlanWith(plan, kit));
    const fit = (plan: BuiltInPlan) =>
        !plan.goals.includes(goal) ? 2 : plan.goals.length === 1 ? 0 : 1;
    // A stable sort, so each keeps its order within its part
    return [...shown].sort((a, b) => fit(a) - fit(b));
}

/**
 * The plan Today offers to start with (NAV-6): the first for your goal that your equipment
 * allows. No-equipment plans suit both goals, so there's always one.
 */
export function firstPlan(goal: TrainingGoal, kit: readonly Equipment[]): BuiltInPlan {
    return plansFor(goal, kit, true)[0] ?? BUILT_IN_PLANS[0];
}
