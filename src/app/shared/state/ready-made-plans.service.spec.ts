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
        planStore.plan().days[day].map((id) => workouts.findWorkoutById(id)?.title);

    it('adds its workouts and replaces the plan with its week', () => {
        const legs = workouts.addWorkout({
            title: 'Legs',
            repeats: 1,
            blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Squat' }]),
        });
        planStore.add(5, legs.id);

        TestBed.inject(ReadyMadePlans).use(plan);

        expect(workouts.workouts().map((w) => w.title)).toEqual([
            'Legs',
            'Dumbbell upper',
            'Dumbbell lower',
        ]);
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

    it('uses a workout of the same title you have already, rather than a second copy', () => {
        const mine = workouts.addWorkout({
            title: ' dumbbell upper ',
            repeats: 1,
            blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Press' }]),
        });

        TestBed.inject(ReadyMadePlans).use(plan);

        expect(workouts.workouts()).toHaveLength(2);
        expect(planStore.plan().days[0]).toEqual([mine.id]);
    });

    it('puts everything back with Undo: the plan it replaced, and none of what it added', () => {
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
