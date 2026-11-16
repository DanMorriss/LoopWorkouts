import { isActiveRest } from './active-rest';
import { BuiltInPlan, planWorkouts } from './built-in-plans';
import { WEEKDAYS } from './plan';

/**
 * A plan's days as they come, Monday first: which of its days is on each day of the week, as
 * a plan card keeps it (`order[day]` is the plan's day shown there).
 */
export function inOrder(): number[] {
    return WEEKDAYS.map((_, day) => day);
}

/** The plan's days, Monday first, in `order` (see `inOrder`). */
export function inDayOrder<T>(days: readonly T[], order: readonly number[]): T[] {
    return order.map((day) => days[day]);
}

/** The days of a plan with training on them, from 0 for Monday: not rest, nor only active rest. */
export function trainingDays(plan: Pick<BuiltInPlan, 'days'>): number[] {
    const rest = new Set(
        planWorkouts(plan)
            .filter(isActiveRest)
            .map((workout) => workout.id)
    );
    return plan.days.flatMap((ids, day) => (ids.some((id) => !rest.has(id)) ? [day] : []));
}

/**
 * A plan fitted to the days you can train (PLN-6, since 2026-11-16), as an order of its days
 * (see `inOrder`), or null when there are fewer of those than it has training days. Its
 * training days go, in their order, onto as many of yours as it needs, spread round the week
 * as evenly as they can be (the fewest days in a row, counting Sunday to Monday), and on a tie
 * as near to where they were as can be. Each day of active rest goes on the nearest day left to
 * where it was, and the rest days on what's left, in their order.
 */
export function fitToDays(
    plan: Pick<BuiltInPlan, 'days'>,
    days: readonly number[]
): number[] | null {
    const training = trainingDays(plan);
    const free = [...new Set(days)].filter((day) => day >= 0 && day < 7).sort((a, b) => a - b);
    if (free.length < training.length) {
        return null;
    }
    const chosen = spreadPick(free, training);
    const order: (number | null)[] = WEEKDAYS.map(() => null);
    chosen.forEach((day, i) => (order[day] = training[i]));
    // Active rest, each nearest to where it was; then the rest days
    const left = () => order.flatMap((day, i) => (day === null ? [i] : []));
    const others = plan.days.flatMap((_, day) => (training.includes(day) ? [] : [day]));
    const activeRest = others.filter((day) => plan.days[day].length > 0);
    for (const day of activeRest) {
        const nearest = left().reduce((best, i) =>
            Math.abs(i - day) < Math.abs(best - day) ? i : best
        );
        order[nearest] = day;
    }
    const rest = others.filter((day) => plan.days[day].length === 0);
    left().forEach((i, n) => (order[i] = rest[n]));
    return order as number[];
}

/**
 * `count` of the sorted `free` days, spread round the week as evenly as they can be, and on a
 * tie nearest to `near`'s days, in order. There are at most 35 ways to pick them, so each is
 * tried.
 */
function spreadPick(free: readonly number[], near: readonly number[]): number[] {
    let best: number[] = [];
    let bestGap = -1;
    let bestDistance = Infinity;
    const tryPick = (picked: number[], from: number) => {
        if (picked.length === near.length) {
            const gap = smallestGap(picked);
            const distance = picked.reduce((sum, day, i) => sum + Math.abs(day - near[i]), 0);
            if (gap > bestGap || (gap === bestGap && distance < bestDistance)) {
                [best, bestGap, bestDistance] = [[...picked], gap, distance];
            }
            return;
        }
        for (let i = from; i < free.length; i++) {
            tryPick([...picked, free[i]], i + 1);
        }
    };
    tryPick([], 0);
    return best;
}

/** The fewest days from one of `days` to the next, round the week. */
function smallestGap(days: readonly number[]): number {
    if (days.length < 2) {
        return 7;
    }
    return Math.min(...days.map((day, i) => (days[(i + 1) % days.length] - day + 7) % 7 || 7));
}
