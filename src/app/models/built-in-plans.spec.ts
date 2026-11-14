import {
    BUILT_IN_PLANS,
    builtInPlanEquipment,
    canDoPlanWith,
    firstPlan,
    plansFor,
    planWorkouts,
    withoutActiveRest,
} from './built-in-plans';
import { isActiveRest } from './active-rest';
import { BUILT_IN_WORKOUTS } from './built-in-workouts';
import { MAX_WORKOUTS_A_DAY, WEEKDAYS } from './plan';

const titles = (plans: readonly { title: string }[]) => plans.map((p) => p.title);

describe('BUILT_IN_PLANS (PLN-6)', () => {
    it('has unique ids, in kebab case, and unique titles', () => {
        const ids = BUILT_IN_PLANS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach((id) => expect(id).toMatch(/^builtin-plan:[a-z0-9]+(-[a-z0-9]+)*$/));
        expect(new Set(titles(BUILT_IN_PLANS)).size).toBe(BUILT_IN_PLANS.length);
    });

    it.each(BUILT_IN_PLANS.map((p) => [p.title, p] as const))(
        '%s is a week of ready-made workouts, with a rest day',
        (_title, plan) => {
            expect(plan.days).toHaveLength(WEEKDAYS.length);
            for (const day of plan.days) {
                expect(day.length).toBeLessThanOrEqual(MAX_WORKOUTS_A_DAY);
                expect(new Set(day).size).toBe(day.length);
                day.forEach((id) =>
                    expect(
                        BUILT_IN_WORKOUTS.some((w) => w.id === id),
                        id
                    ).toBe(true)
                );
            }
            // Rest days are left empty
            expect(plan.days.some((day) => day.length === 0)).toBe(true);
            // Two days are for mobility, and have nothing else on them
            const mobility = plan.days.filter((day) =>
                day.some((id) => isActiveRest(BUILT_IN_WORKOUTS.find((w) => w.id === id)!))
            );
            expect(mobility).toEqual([['builtin:mobility-flow'], ['builtin:full-body-stretch']]);
            expect(plan.days.some((day) => day.length > 0)).toBe(true);
            expect(plan.goals.length).toBeGreaterThan(0);
            expect(plan.description.length).toBeLessThanOrEqual(90);
        }
    );

    it('has one for each goal that needs nothing', () => {
        for (const goal of ['muscle', 'fitness'] as const) {
            expect(
                BUILT_IN_PLANS.some((p) => p.goals.includes(goal) && canDoPlanWith(p, [])),
                goal
            ).toBe(true);
        }
    });
});

describe('planWorkouts', () => {
    it('lists each workout once, as it first comes up', () => {
        const plan = BUILT_IN_PLANS.find((p) => p.title === 'Dumbbells at home, 4 days')!;
        expect(titles(planWorkouts(plan))).toEqual([
            'Dumbbell upper',
            'Dumbbell lower',
            'Mobility flow',
            'Full-body stretch',
        ]);
    });
});

describe('builtInPlanEquipment', () => {
    it('is everything its workouts need, once', () => {
        const plan = BUILT_IN_PLANS.find((p) => p.title === '3-day beginner gym')!;
        expect(builtInPlanEquipment(plan)).toEqual(['machine', 'dumbbells', 'bench']);
        const none = BUILT_IN_PLANS.find((p) => p.title === 'No equipment, 3 days')!;
        expect(builtInPlanEquipment(none)).toEqual(['none']);
    });
});

describe('plansFor', () => {
    it('puts the plans made for your goal first, then those suiting it too', () => {
        expect(titles(plansFor('fitness', [], false))).toEqual([
            'Fitness, 4 days',
            'Kettlebell, 3 days',
            'No equipment, 3 days',
            '3-day beginner gym',
            'Push, pull, legs',
            'Dumbbells at home, 4 days',
        ]);
    });

    it('with Only what I have, leaves out those needing what you have not got', () => {
        expect(titles(plansFor('muscle', ['kettlebell'], true))).toEqual([
            'Kettlebell, 3 days',
            'No equipment, 3 days',
            'Fitness, 4 days',
        ]);
        // Made for fitness alone, it comes first for fitness
        expect(titles(plansFor('fitness', ['kettlebell'], true))).toEqual([
            'Fitness, 4 days',
            'Kettlebell, 3 days',
            'No equipment, 3 days',
        ]);
    });
});

describe('firstPlan (PLN-7)', () => {
    it('offers the first for your goal your equipment allows', () => {
        expect(firstPlan('muscle', ['machine', 'dumbbells', 'bench', 'cable']).title).toBe(
            '3-day beginner gym'
        );
        expect(firstPlan('muscle', ['dumbbells', 'bench']).title).toBe('Dumbbells at home, 4 days');
        expect(firstPlan('muscle', ['kettlebell']).title).toBe('Kettlebell, 3 days');
        expect(firstPlan('muscle', []).title).toBe('No equipment, 3 days');
        expect(firstPlan('fitness', ['kettlebell']).title).toBe('Fitness, 4 days');
        expect(firstPlan('fitness', []).title).toBe('No equipment, 3 days');
    });
});

describe('withoutActiveRest', () => {
    it('leaves the mobility days empty, and the training days as they are', () => {
        for (const plan of BUILT_IN_PLANS) {
            const without = withoutActiveRest(plan);
            expect(planWorkouts(without).some(isActiveRest), plan.title).toBe(false);
            plan.days.forEach((day, i) =>
                expect(without.days[i]).toEqual(
                    day.filter((id) => !isActiveRest(BUILT_IN_WORKOUTS.find((w) => w.id === id)!))
                )
            );
            expect({ ...without, days: plan.days }).toEqual(plan);
        }
        const gym = BUILT_IN_PLANS.find((p) => p.title === '3-day beginner gym')!;
        expect(withoutActiveRest(gym).days.map((day) => day.length)).toEqual([1, 0, 1, 0, 1, 0, 0]);
    });
});
