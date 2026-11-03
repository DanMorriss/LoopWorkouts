import { outline, repeatsText } from './workout-outline';
import { UNTIL_STOPPED } from './workout';

describe('outline', () => {
    it('names an unnamed step by its kind, as the history does', () => {
        expect(
            outline({
                blocks: [
                    {
                        kind: 'group',
                        rounds: 1,
                        restSeconds: 0,
                        steps: [{ kind: 'reps', reps: 8, name: ' ' }],
                    },
                    {
                        kind: 'group',
                        rounds: 1,
                        restSeconds: 0,
                        steps: [{ kind: 'work', seconds: 45, name: '' }],
                    },
                ],
            })
        ).toEqual([
            { kind: 'step', name: 'Reps', amount: '8' },
            { kind: 'step', name: 'Work', amount: '0:45' },
        ]);
    });

    it('writes out headings, exercises with their sets, and supersets with their steps', () => {
        expect(
            outline({
                blocks: [
                    { kind: 'heading', text: 'Main' },
                    {
                        kind: 'group',
                        rounds: 3,
                        restSeconds: 90,
                        steps: [{ kind: 'reps', reps: 10, name: 'Goblet squat' }],
                    },
                    {
                        kind: 'group',
                        rounds: 3,
                        restSeconds: 150,
                        steps: [
                            {
                                kind: 'reps',
                                reps: 12,
                                name: 'Back squat',
                                sets: [{ reps: 12 }, { reps: 10 }, { reps: 8 }],
                            },
                        ],
                    },
                    {
                        kind: 'group',
                        rounds: 2,
                        restSeconds: 60,
                        steps: [{ kind: 'work', seconds: 30, name: 'Side plank', eachSide: true }],
                    },
                    {
                        kind: 'group',
                        rounds: 1,
                        restSeconds: 0,
                        steps: [{ kind: 'rest', seconds: 20, name: '' }],
                    },
                    {
                        kind: 'group',
                        rounds: 3,
                        restSeconds: 60,
                        steps: [
                            { kind: 'reps', reps: 12, name: 'Lateral raise' },
                            { kind: 'reps', reps: 8, name: 'Reverse lunge', eachSide: true },
                        ],
                    },
                ],
            })
        ).toEqual([
            { kind: 'heading', text: 'Main' },
            { kind: 'step', name: 'Goblet squat', amount: '3 × 10, rest 1:30' },
            { kind: 'step', name: 'Back squat', amount: '3 sets: 12, 10, 8, rest 2:30' },
            { kind: 'step', name: 'Side plank', amount: '2 × 0:30 each side, rest 1:00' },
            { kind: 'step', name: 'Rest', amount: '0:20' },
            {
                kind: 'superset',
                name: 'Superset',
                amount: '3 rounds, rest 1:00',
                steps: [
                    { name: 'Lateral raise', amount: '12' },
                    { name: 'Reverse lunge', amount: '8 each side' },
                ],
            },
        ]);
    });

    it('writes one set as its reps or time alone', () => {
        expect(
            outline({
                blocks: [
                    {
                        kind: 'group',
                        rounds: 1,
                        restSeconds: 0,
                        steps: [{ kind: 'work', seconds: 40, name: 'Burpee' }],
                    },
                ],
            })
        ).toEqual([{ kind: 'step', name: 'Burpee', amount: '0:40' }]);
    });
});

describe('repeatsText', () => {
    it('says how many times the whole workout goes round', () => {
        expect(repeatsText({ repeats: 1 })).toBe('Once through');
        expect(repeatsText({ repeats: 3 })).toBe('3 rounds of all of it');
        expect(repeatsText({ repeats: UNTIL_STOPPED })).toBe('Round and round, until you stop');
        expect(repeatsText({ repeats: UNTIL_STOPPED, timeLimitSeconds: 1200 })).toBe(
            'As many rounds as you can in 20:00'
        );
    });
});
