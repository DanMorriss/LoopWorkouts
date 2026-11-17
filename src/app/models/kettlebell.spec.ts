import { EquipmentNeed } from './exercise';
import { LoggedSet } from './history';
import { kettlebellSteps, withKettlebellWeight, withMyKettlebell } from './kettlebell';
import { progressionSuggestions, readyForHeavierKettlebell } from './progress';
import { RepStep, Step } from './workout';

const equipment: Record<string, EquipmentNeed[]> = {
    swing: ['kettlebell'],
    goblet: [['dumbbells', 'kettlebell']],
    bridge: ['none'],
    bench: ['barbell', 'bench'],
    curl: ['dumbbells'],
};
const equipmentOf = (id: string) => (equipment[id] ? { equipment: equipment[id] } : undefined);

const rep = (exerciseId: string, reps: number, weight?: number): RepStep => ({
    kind: 'reps',
    reps,
    name: exerciseId,
    exerciseId,
    ...(weight === undefined ? {} : { weight }),
});
const done = (step: number, reps: number, weight?: number, round = 0): LoggedSet => ({
    round,
    step,
    name: 'Swing',
    reps,
    ...(weight === undefined ? {} : { weight }),
    exerciseId: 'swing',
});

describe('kettlebell workouts (PRG-14)', () => {
    describe('kettlebellSteps', () => {
        it('is the kettlebell steps of a workout needing only a kettlebell', () => {
            const steps: Step[] = [
                rep('goblet', 10),
                rep('swing', 15),
                rep('bridge', 15),
                { kind: 'work', seconds: 30, name: 'Plank' },
            ];
            expect([...kettlebellSteps(steps, equipmentOf)]).toEqual([0, 1]);
        });

        it('is none where something needs other equipment, or nothing needs a kettlebell', () => {
            expect(kettlebellSteps([rep('swing', 15), rep('bench', 5)], equipmentOf).size).toBe(0);
            expect(kettlebellSteps([rep('swing', 15), rep('curl', 10)], equipmentOf).size).toBe(0);
            // A goblet squat alone could be with a dumbbell
            expect(kettlebellSteps([rep('goblet', 10)], equipmentOf).size).toBe(0);
        });
    });

    describe('withMyKettlebell', () => {
        const kettlebell = new Set([0, 1]);

        it('moves a workout at one weight, or none, to your kettlebell', () => {
            const moved = withMyKettlebell(
                [rep('swing', 15, 16), rep('goblet', 10)],
                kettlebell,
                20
            );
            expect([...moved.keys()]).toEqual([0, 1]);
            expect(moved.get(0)!.weight).toBe(20);
            expect(moved.get(1)!.weight).toBe(20);
        });

        it('leaves one already there, or with two weights in it, as it is', () => {
            expect(
                withMyKettlebell([rep('swing', 15, 20), rep('goblet', 10, 20)], kettlebell, 20).size
            ).toBe(0);
            expect(
                withMyKettlebell([rep('swing', 15, 16), rep('goblet', 10, 12)], kettlebell, 20).size
            ).toBe(0);
        });
    });

    describe('withKettlebellWeight', () => {
        it('puts the weight on sets at the old one or none, not on others', () => {
            expect(withKettlebellWeight(rep('swing', 15), undefined, 16).weight).toBe(16);
            expect(withKettlebellWeight(rep('swing', 15, 12), 12, 16).weight).toBe(16);
            const other = rep('swing', 15, 8);
            expect(withKettlebellWeight(other, 12, 16)).toBe(other);
            const varied: RepStep = {
                ...rep('swing', 10, 12),
                sets: [{ reps: 10, weight: 12 }, { reps: 15 }, { reps: 20, weight: 8 }],
            };
            expect(withKettlebellWeight(varied, 12, 16).sets).toEqual([
                { reps: 10, weight: 16 },
                { reps: 15, weight: 16 },
                { reps: 20, weight: 8 },
            ]);
        });
    });

    describe('next time', () => {
        const kettlebell = new Set([0]);

        it('goes up a rep, not a weight, where every set got its reps', () => {
            const steps = [rep('swing', 15, 16)];
            expect(
                progressionSuggestions(
                    [done(0, 15, 16), done(0, 15, 16, 1)],
                    steps,
                    'kg',
                    kettlebell
                )
            ).toEqual([{ step: 0, kind: 'reps', from: 15, to: 16 }]);
            // Not a kettlebell workout's: the weight, as ever
            expect(progressionSuggestions([done(0, 15, 16)], steps, 'kg')).toEqual([
                { step: 0, kind: 'weight', from: 16, to: 18.5 },
            ]);
        });

        it('stops at 20 reps, where a heavier kettlebell is ready', () => {
            const steps = [rep('swing', 20, 16)];
            const sets = [done(0, 20, 16), done(0, 20, 16, 1)];
            expect(progressionSuggestions(sets, steps, 'kg', kettlebell)).toEqual([]);
            expect(readyForHeavierKettlebell(sets, steps, kettlebell)).toEqual([0]);
            expect(readyForHeavierKettlebell(sets, steps, new Set())).toEqual([]);
        });

        it('is not ready short of 20, or with a set that fell short', () => {
            expect(
                readyForHeavierKettlebell([done(0, 19)], [rep('swing', 19)], kettlebell)
            ).toEqual([]);
            expect(
                readyForHeavierKettlebell(
                    [done(0, 20), done(0, 18, undefined, 1)],
                    [rep('swing', 20)],
                    kettlebell
                )
            ).toEqual([]);
        });

        it('leaves a step whose sets vary as it is, e.g. the swing ladder', () => {
            const counts = [10, 15, 20, 25, 20, 15, 10];
            const ladder: RepStep = {
                ...rep('swing', 10, 16),
                sets: counts.map((reps) => ({ reps, weight: 16 })),
            };
            const sets = counts.map((reps, set) => ({ ...done(0, reps, 16, set), set }));
            expect(progressionSuggestions(sets, [ladder], 'kg', kettlebell)).toEqual([]);
            expect(readyForHeavierKettlebell(sets, [ladder], kettlebell)).toEqual([]);
            // A pyramid all short of 20 has no rep step-up either
            const short = { ...ladder, sets: ladder.sets!.slice(0, 2) };
            expect(progressionSuggestions(sets.slice(0, 2), [short], 'kg', kettlebell)).toEqual([]);
        });
    });
});
