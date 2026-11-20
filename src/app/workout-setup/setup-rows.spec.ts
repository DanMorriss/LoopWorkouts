import { BUILT_IN_WORKOUTS } from '../models/built-in-workouts';
import { UNTIL_STOPPED, Workout } from '../models/workout';
import { SetupRows } from './setup-rows';

describe('SetupRows', () => {
    const saved = (fields: Omit<Workout, 'id' | 'updatedAt'>): Workout => ({
        id: 'w',
        updatedAt: 1,
        ...fields,
    });

    it('starts a new workout with one empty rep step, each row with a key of its own', () => {
        const rows = new SetupRows('kg');
        const setup = rows.empty();
        expect(setup.steps.map((step) => [step.kind, step.reps, step.name])).toEqual([
            ['reps', 0, ''],
        ]);
        expect(rows.newStep().key).not.toBe(setup.steps[0].key);
    });

    it('turns every ready-made workout into rows and back, as it was', () => {
        for (const { id: _id, title, description: _d, group: _g, ...fields } of BUILT_IN_WORKOUTS) {
            const rows = new SetupRows('kg');
            const workout = saved({ title, ...fields });
            const { id: _wid, updatedAt: _u, ...expected } = workout;
            expect(rows.toFields(rows.fromWorkout(workout)), title).toEqual(expected);
        }
    });

    it('keeps a superset, sets that vary, weights in another unit, and a time limit', () => {
        const workout = saved({
            title: 'Mixed',
            repeats: UNTIL_STOPPED,
            timeLimitSeconds: 600,
            blocks: [
                { kind: 'heading', text: 'Main' },
                {
                    kind: 'group',
                    rounds: 3,
                    restSeconds: 90,
                    steps: [
                        {
                            kind: 'reps',
                            reps: 12,
                            weight: 40,
                            name: 'Leg press',
                            sets: [
                                { reps: 12, weight: 40 },
                                { reps: 10, weight: 45 },
                                { reps: 8, weight: 50 },
                            ],
                        },
                        { kind: 'work', seconds: 30, name: 'Plank', eachSide: true },
                    ],
                },
            ],
        });
        const rows = new SetupRows('lb');
        const setup = rows.fromWorkout(workout);

        expect(setup.repeatMode).toBe('time');
        expect([setup.limitMinutes, setup.limitSeconds]).toEqual([10, 0]);
        // A heading, the superset's own row, then its two steps in it
        expect(setup.steps.map((step) => step.kind)).toEqual([
            'heading',
            'superset',
            'reps',
            'work',
        ]);
        expect(setup.steps[2].group).toBe(setup.steps[1].key);
        // 40 kg shown in lb, to the wheel's step, and saved as 40 kg still
        expect(setup.steps[2].weight).toBe(88);
        const { id: _id, updatedAt: _u, ...expected } = workout;
        expect(rows.toFields(setup)).toEqual(expected);
    });
});
