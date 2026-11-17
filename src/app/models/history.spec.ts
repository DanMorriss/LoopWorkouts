import { LoggedSet, repSetsOfStep, setChanges, withSetChanges } from './history';

describe('correcting sets', () => {
    const lunge = (side: 'left' | 'right', reps: number, weight?: number): LoggedSet => ({
        round: 0,
        step: 1,
        side,
        name: 'Lunge',
        reps,
        ...(weight === undefined ? {} : { weight }),
    });
    const sets: LoggedSet[] = [
        { round: 0, step: 0, name: 'Plank', seconds: 30 },
        lunge('left', 10, 20),
        lunge('right', 10, 20),
        lunge('left', 8),
        lunge('right', 9),
        { round: 0, step: 2, name: 'Row', reps: 12 },
    ];

    it("finds a step's rep sets, named by set and side in the order done", () => {
        expect(repSetsOfStep(sets, 1)).toEqual({
            indexes: [1, 2, 3, 4],
            amounts: [{ reps: 10, weight: 20 }, { reps: 10, weight: 20 }, { reps: 8 }, { reps: 9 }],
            names: ['Set 1, left', 'Set 1, right', 'Set 2, left', 'Set 2, right'],
        });
        expect(repSetsOfStep(sets, 2).names).toEqual(['Set 1']);
        // Timed sets ran as set
        expect(repSetsOfStep(sets, 0).indexes).toEqual([]);
    });

    it('makes only the changes that change something, taking a weight off too', () => {
        const changes = setChanges(
            sets,
            [1, 2, 3, 4],
            [{ reps: 10, weight: 20 }, { reps: 10 }, { reps: 8 }, { reps: 10 }]
        );

        expect(changes).toEqual([
            { index: 2, reps: 10 },
            { index: 4, reps: 10 },
        ]);
        expect(withSetChanges(sets, changes)).toEqual([
            sets[0],
            sets[1],
            lunge('right', 10),
            sets[3],
            lunge('right', 10),
            sets[5],
        ]);
    });
});
