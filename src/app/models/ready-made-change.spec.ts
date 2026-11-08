import { readReadyMadeChange, stepAmounts, withAmounts } from './ready-made-change';
import { allSteps, asOneGroup, RepStep, Step } from './workout';

const squat: RepStep = { kind: 'reps', reps: 10, name: 'Squats', exerciseId: 'builtin:squat' };
const rest: Step = { kind: 'rest', seconds: 30, name: '' };
const workout = {
    blocks: [{ kind: 'group' as const, rounds: 3, restSeconds: 0, steps: [squat, rest] }],
};

describe('ready-made changes (LIB-6)', () => {
    it('keeps only a rep step’s reps and weight', () => {
        expect(stepAmounts(0, squat, { ...squat, reps: 8, weight: 40 })).toEqual({
            step: 0,
            exerciseId: 'builtin:squat',
            reps: 8,
            weight: 40,
        });
        // Another exercise takes a copy, as does a timed step
        expect(stepAmounts(0, squat, { ...squat, exerciseId: 'builtin:lunge' })).toBeNull();
        expect(stepAmounts(1, rest, { ...rest, seconds: 60 })).toBeNull();
    });

    it('puts them on the workout, its other fields as they came', () => {
        const sets = [{ reps: 12 }, { reps: 10, weight: 20 }, { reps: 8, weight: 25 }];
        const changed = withAmounts(workout, [
            { step: 0, exerciseId: 'builtin:squat', reps: 12, sets },
        ]);

        expect(allSteps(changed)).toEqual([{ ...squat, reps: 12, sets }, rest]);
    });

    it('leaves out any for a step that’s no longer that exercise, or sets that don’t fit', () => {
        expect(
            withAmounts(workout, [{ step: 0, exerciseId: 'builtin:lunge', reps: 5 }]).blocks
        ).toEqual(workout.blocks);
        const twoSets = [{ reps: 5 }, { reps: 6 }];
        expect(
            allSteps(
                withAmounts({ blocks: asOneGroup([squat]) }, [
                    { step: 0, exerciseId: 'builtin:squat', reps: 5, sets: twoSets },
                ])
            )
        ).toEqual([{ ...squat, reps: 5 }]);
    });

    it('reads a saved one, dropping steps that aren’t usable', () => {
        expect(
            readReadyMadeChange({
                id: 'builtin:gym-legs',
                updatedAt: 5,
                steps: [
                    { step: 0, exerciseId: 'builtin:squat', reps: 8, weight: 40, extra: 1 },
                    { step: 1, exerciseId: 'builtin:squat', reps: 0 },
                    { step: 2, exerciseId: '', reps: 8 },
                ],
            })
        ).toEqual({
            id: 'builtin:gym-legs',
            updatedAt: 5,
            steps: [{ step: 0, exerciseId: 'builtin:squat', reps: 8, weight: 40 }],
        });
        expect(readReadyMadeChange({ id: 'mine', updatedAt: 5, steps: [] })).toBeNull();
        expect(readReadyMadeChange({ id: 'builtin:gym-legs', updatedAt: 5 })).toBeNull();
    });
});
