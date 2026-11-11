import { TestBed } from '@angular/core/testing';
import { BUILT_IN_PLANS } from '../../models/built-in-plans';
import { asOneGroup } from '../../models/workout';
import { PlanStore } from './plan-store.service';
import { ReadyMadePlans } from './ready-made-plans.service';
import { WorkoutStore } from './workout-store.service';

describe('ReadyMadePlans (PLN-6)', () => {
    const plan = BUILT_IN_PLANS.find((p) => p.title === 'Dumbbells at home, 4 days')!;
    let workouts: WorkoutStore;
    let planStore: PlanStore;

    beforeEach(() => {
        localStorage.clear();
        workouts = TestBed.inject(WorkoutStore);
        planStore = TestBed.inject(PlanStore);
    });
    afterEach(() => localStorage.clear());

    const titlesOn = (day: number) =>
        planStore.plan().days[day].map((id) => workouts.findAnyWorkout(id)?.title);

    it('replaces the plan with its week of ready-made workouts, as they are', async () => {
        await workouts.loadReadyMade();
        const legs = workouts.addWorkout({
            title: 'Legs',
            repeats: 1,
            blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Squat' }]),
        });
        planStore.add(5, legs.id);

        TestBed.inject(ReadyMadePlans).use(plan);

        // None is copied into your workouts
        expect(workouts.workouts().map((w) => w.title)).toEqual(['Legs']);
        expect(planStore.plan().days[0]).toEqual(['builtin:dumbbell-upper']);
        expect([0, 1, 2, 3, 4, 5, 6].map(titlesOn)).toEqual([
            ['Dumbbell upper'],
            ['Dumbbell lower'],
            [],
            ['Dumbbell upper'],
            ['Dumbbell lower'],
            [],
            [],
        ]);
    });

    it('puts back the plan it replaced with Undo', () => {
        const legs = workouts.addWorkout({
            title: 'Legs',
            repeats: 1,
            blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Squat' }]),
        });
        planStore.add(5, legs.id);

        const undo = TestBed.inject(ReadyMadePlans).use(plan);
        undo();

        expect(workouts.workouts().map((w) => w.title)).toEqual(['Legs']);
        expect(planStore.plan().days).toEqual([[], [], [], [], [], [legs.id], []]);
    });
});
