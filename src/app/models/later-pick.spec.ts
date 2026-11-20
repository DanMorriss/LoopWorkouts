import { LaterStep, NO_LATER, RunLater } from './later';
import { moveAside, pickAllAt } from './later-pick';

describe('later-pick', () => {
    const a: LaterStep = { round: 0, stepIndex: 0 };
    const b: LaterStep = { round: 0, stepIndex: 2 };
    const c: LaterStep = { round: 1, stepIndex: 0 };
    const later: RunLater = { ...NO_LATER, aside: [a, b, c] };

    it('picks them all to run at a place, in the list order', () => {
        expect(pickAllAt(later, 30_000, 2)).toEqual({
            ...NO_LATER,
            aside: [],
            queue: { atMs: 30_000, repStepsDone: 2, steps: [a, b, c] },
        });
    });

    it('moves one in the list, either way, leaving it as it is past the ends', () => {
        expect(moveAside(later, 2, 0).aside).toEqual([c, a, b]);
        expect(moveAside(later, 0, 2).aside).toEqual([b, c, a]);
        expect(moveAside(later, 0, 3)).toBe(later);
        expect(moveAside(later, 5, 0)).toBe(later);
    });
});
