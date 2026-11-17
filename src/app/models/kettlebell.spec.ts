import { EquipmentNeed } from './exercise';
import { LoggedSet } from './history';
import { kettlebellSteps, topReps, withKettlebellWeight } from './kettlebell';
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

    it("tops a step's reps at its most in any set", () => {
        expect(topReps({ ...rep('swing', 10), sets: [{ reps: 10 }, { reps: 25 }] })).toBe(25);
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

        it('goes up a rep on each set where they vary, until any set is at 20', () => {
            const ladder = (counts: number[]): RepStep => ({
                ...rep('swing', counts[0], 16),
                sets: counts.map((reps) => ({ reps, weight: 16 })),
            });
            const sets = (counts: number[]) =>
                counts.map((reps, set) => ({ ...done(0, reps, 16, set), set }));
            expect(
                progressionSuggestions(sets([10, 15]), [ladder([10, 15])], 'kg', kettlebell)
            ).toEqual([{ step: 0, kind: 'reps', from: 10, to: 11, eachSet: true }]);
            expect(
                progressionSuggestions(sets([10, 20]), [ladder([10, 20])], 'kg', kettlebell)
            ).toEqual([]);
            expect(
                readyForHeavierKettlebell(sets([10, 20]), [ladder([10, 20])], kettlebell)
            ).toEqual([0]);
        });
    });
});
