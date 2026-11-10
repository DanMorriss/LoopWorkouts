import { makeWorkout } from '../shared/testing/make-workout';
import { aToZ, isReadyMade, RepStep, setAmountsOf, withSetAmounts } from './workout';

describe('aToZ (LIB-3)', () => {
    it('sorts by title, ignoring case, untitled as "Untitled workout", yours first on a tie', () => {
        const ids = aToZ([
            makeWorkout({ id: 'zone', title: 'zone 2' }),
            makeWorkout({ id: 'builtin:arms', title: 'Arms' }),
            makeWorkout({ id: 'blank', title: '  ' }),
            makeWorkout({ id: 'arms', title: 'arms' }),
            makeWorkout({ id: 'bench', title: 'Bench' }),
        ]).map((workout) => workout.id);

        expect(ids).toEqual(['arms', 'builtin:arms', 'bench', 'blank', 'zone']);
    });

    it('tells a ready-made workout by its id', () => {
        expect(isReadyMade(makeWorkout({ id: 'builtin:gym-legs' }))).toBe(true);
        expect(isReadyMade(makeWorkout({ id: '5f0c2a9e' }))).toBe(false);
    });
});

describe("a rep step's sets' amounts (BLD-11)", () => {
    const squat: RepStep = { kind: 'reps', reps: 10, weight: 60, name: 'Back squat' };

    it("gives each set's reps and weight, its own where they vary", () => {
        expect(setAmountsOf(squat, 2)).toEqual([
            { reps: 10, weight: 60 },
            { reps: 10, weight: 60 },
        ]);
        const pyramid: RepStep = {
            kind: 'reps',
            reps: 12,
            name: 'Back squat',
            sets: [{ reps: 12 }, { reps: 10, weight: 20 }],
        };
        expect(setAmountsOf(pyramid, 2)).toEqual([{ reps: 12 }, { reps: 10, weight: 20 }]);
    });

    it('keeps sets alike as the step, and lists them where they vary', () => {
        expect(
            withSetAmounts({ ...squat, sets: [{ reps: 1 }, { reps: 2 }] }, [
                { reps: 8, weight: 70 },
                { reps: 8, weight: 70 },
            ])
        ).toEqual({ kind: 'reps', reps: 8, weight: 70, name: 'Back squat' });
        expect(withSetAmounts(squat, [{ reps: 8 }, { reps: 6, weight: 70 }])).toEqual({
            kind: 'reps',
            reps: 8,
            name: 'Back squat',
            sets: [{ reps: 8 }, { reps: 6, weight: 70 }],
        });
    });
});
