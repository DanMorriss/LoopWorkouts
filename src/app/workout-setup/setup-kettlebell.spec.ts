import { EquipmentNeed } from '../models/exercise';
import { sharedKettlebell } from './setup-kettlebell';
import { StepModel } from './step-model';

const equipment: Record<string, EquipmentNeed[]> = {
    swing: ['kettlebell'],
    goblet: [['dumbbells', 'kettlebell']],
    bench: ['barbell', 'bench'],
};
const equipmentOf = (id: string) => (equipment[id] ? { equipment: equipment[id] } : undefined);

function step(key: number, exerciseId: string, weight = 0, rows?: number[]): StepModel {
    return {
        key,
        kind: 'reps',
        name: exerciseId,
        minutes: 0,
        seconds: 0,
        reps: 10,
        weight,
        exerciseId,
        savedWeight: null,
        sets: rows?.length ?? 3,
        restMinutes: 1,
        restSeconds: 0,
        eachSide: false,
        vary: rows !== undefined,
        setRows: (rows ?? []).map((w) => ({
            reps: 10,
            weight: w,
            savedWeight: null,
            minutes: 0,
            seconds: 0,
        })),
        group: 0,
    };
}
const weights = (steps: StepModel[] | null) =>
    steps?.map((s) => (s.vary ? s.setRows.map((row) => row.weight) : s.weight));

describe('one kettlebell in Create (PRG-14)', () => {
    it('shares a weight turned to on one step with the others at none or the old one', () => {
        const before = [step(1, 'swing', 16), step(2, 'goblet', 16), step(3, 'swing')];
        const after = [step(1, 'swing', 20), step(2, 'goblet', 16), step(3, 'swing')];
        expect(weights(sharedKettlebell(before, after, equipmentOf, null))).toEqual([20, 20, 20]);
    });

    it('leaves a set at another weight, put there on purpose', () => {
        const before = [step(1, 'swing', 16), step(2, 'goblet', 0, [16, 12])];
        const after = [step(1, 'swing', 20), step(2, 'goblet', 0, [16, 12])];
        expect(weights(sharedKettlebell(before, after, equipmentOf, null))).toEqual([20, [20, 12]]);
    });

    it('does nothing in a workout that is not a kettlebell one, or when a weight is cleared', () => {
        const mixed = [step(1, 'swing', 16), step(2, 'bench')];
        expect(
            sharedKettlebell(mixed, [step(1, 'swing', 20), step(2, 'bench')], equipmentOf, null)
        ).toBeNull();
        const both = [step(1, 'swing', 16), step(2, 'goblet', 16)];
        expect(
            sharedKettlebell(both, [step(1, 'swing', 0), step(2, 'goblet', 16)], equipmentOf, null)
        ).toBeNull();
    });

    it("starts a step added at the workout's one weight, or your kettlebell with none", () => {
        const before = [step(1, 'swing', 16)];
        expect(
            weights(sharedKettlebell(before, [...before, step(2, 'goblet')], equipmentOf, 20))
        ).toEqual([16, 16]);
        expect(weights(sharedKettlebell([], [step(1, 'swing')], equipmentOf, 20))).toEqual([20]);
        // Two weights in it: the new one's left for you to set
        const two = [step(1, 'swing', 16), step(2, 'goblet', 12)];
        expect(sharedKettlebell(two, [...two, step(3, 'swing')], equipmentOf, 20)).toBeNull();
    });

    it('changes nothing it was already given, e.g. as it loads', () => {
        const loaded = [step(1, 'swing'), step(2, 'goblet')];
        expect(sharedKettlebell(loaded, loaded, equipmentOf, 20)).toBeNull();
    });
});
