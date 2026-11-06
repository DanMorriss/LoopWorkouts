import { makeWorkout } from '../shared/testing/make-workout';
import { aToZ, isReadyMade } from './workout';

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
