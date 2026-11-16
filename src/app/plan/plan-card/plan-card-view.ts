import { isActiveRest } from '../../models/active-rest';
import { BuiltInPlan, planWorkouts, withoutActiveRest } from '../../models/built-in-plans';
import { WEEKDAYS } from '../../models/plan';
import { readyMadeSlug } from '../../workout-library/ready-made/ready-made-card';
import { PlanWeekDay } from './plan-week-day';

/** A ready-made plan's workout, as its card lists it. */
export interface CardWorkout {
    id: string;
    title: string;
    /** Its page, going back to where the card was. */
    url: string;
    activeRest: boolean;
    /** Training's number, from 1; '' for active rest. */
    number: string;
    /** Training's colour, 1 to 4 (round again past four); 0 for active rest. */
    colour: number;
    /** The days it's on: "Mon, Wed, Fri". */
    days: string;
}

/**
 * A plan's workouts, each once in the order they first come up, with the days they're on.
 * Training is numbered from 1 and coloured to match; active rest has neither, as it's optional.
 */
export function cardWorkouts(plan: Pick<BuiltInPlan, 'days'>, from: string): CardWorkout[] {
    let number = 0;
    return planWorkouts(plan).map((workout) => {
        const activeRest = isActiveRest(workout);
        if (!activeRest) {
            number++;
        }
        return {
            id: workout.id,
            title: workout.title,
            url: `/ready-made-plans/${readyMadeSlug(workout)}?from=${from}`,
            activeRest,
            number: activeRest ? '' : `${number}`,
            colour: activeRest ? 0 : ((number - 1) % 4) + 1,
            days: WEEKDAYS.filter((_, day) => plan.days[day].includes(workout.id))
                .map((name) => name.slice(0, 3))
                .join(', '),
        };
    });
}

/**
 * Each day, Monday first: its workouts' marks, and how it looks: a training day in its first
 * training workout's colour, a day of active rest quieter, a rest day dashed.
 */
export function cardDays(
    plan: Pick<BuiltInPlan, 'days'>,
    workouts: readonly CardWorkout[]
): PlanWeekDay[] {
    const byId = new Map(workouts.map((workout) => [workout.id, workout]));
    return plan.days.map((ids) => {
        const on = ids.map((id) => byId.get(id)!);
        const lead = on.find((workout) => !workout.activeRest);
        return {
            workouts: on,
            kind: lead ? 'training' : on.length ? 'active-rest' : 'rest',
            colour: lead?.colour ?? 0,
        };
    });
}

/** How many days of active rest a plan comes with, to offer leaving them out; 0 if none. */
export function activeRestDays(plan: BuiltInPlan): number {
    const without = withoutActiveRest(plan).days;
    return plan.days.filter((day, i) => day.length > 0 && !without[i].length).length;
}
