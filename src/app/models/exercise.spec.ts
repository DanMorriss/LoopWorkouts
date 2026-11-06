import { BUILT_IN_EXERCISES } from './built-in-exercises';
import {
    canDoWith,
    capitalise,
    equipmentPhrases,
    exercisePath,
    hasNoEquipment,
    readMyEquipment,
} from './exercise';

describe('canDoWith', () => {
    it('needs every piece of equipment an exercise lists', () => {
        const backSquat = { equipment: ['barbell', 'rack'] } as const;

        expect(canDoWith(backSquat, ['barbell', 'rack', 'bench'])).toBe(true);
        expect(canDoWith(backSquat, ['barbell'])).toBe(false);
    });

    it('takes any one of a choice', () => {
        const gobletSquat = { equipment: [['dumbbells', 'kettlebell']] } as const;

        expect(canDoWith(gobletSquat, ['kettlebell'])).toBe(true);
        expect(canDoWith(gobletSquat, ['dumbbells'])).toBe(true);
        expect(canDoWith(gobletSquat, ['barbell'])).toBe(false);
    });

    it('takes one pair of things, or one thing that does both, as choices across two needs', () => {
        const invertedRow = {
            equipment: [
                ['barbell', 'smith machine', 'rings'],
                ['rack', 'smith machine', 'rings'],
            ],
        } as const;

        expect(canDoWith(invertedRow, ['barbell', 'rack'])).toBe(true);
        expect(canDoWith(invertedRow, ['smith machine'])).toBe(true);
        expect(canDoWith(invertedRow, ['rings'])).toBe(true);
        expect(canDoWith(invertedRow, ['barbell'])).toBe(false);
    });

    it('can always do an exercise that needs nothing', () => {
        expect(canDoWith({ equipment: ['none'] }, [])).toBe(true);
    });
});

describe('equipmentPhrases', () => {
    it('names each piece, and a choice as "a or b"', () => {
        expect(equipmentPhrases(['barbell', 'bench', 'rack'])).toEqual([
            'barbell',
            'bench',
            'rack',
        ]);
        expect(equipmentPhrases([['dumbbells', 'kettlebell']])).toEqual([
            'dumbbells or kettlebell',
        ]);
        expect(equipmentPhrases([['barbell', 'dumbbells', 'kettlebell']])).toEqual([
            'barbell, dumbbells, or kettlebell',
        ]);
    });

    it("reads an inverted row's two choices as one", () => {
        const phrases = equipmentPhrases([
            ['barbell', 'smith machine', 'rings'],
            ['rack', 'smith machine', 'rings'],
        ]);

        expect(phrases.map(capitalise)).toEqual(['Barbell and rack, Smith machine, or rings']);
    });

    it('keeps two choices apart when they have nothing in common', () => {
        expect(
            equipmentPhrases([
                ['barbell', 'dumbbells'],
                ['bench', 'step'],
            ])
        ).toEqual(['barbell or dumbbells', 'bench or step']);
    });

    it('says when nothing is needed, and nothing when nothing is listed', () => {
        expect(equipmentPhrases(['none'])).toEqual(['no equipment']);
        expect(equipmentPhrases([])).toEqual([]);
    });
});

describe('exercisePath', () => {
    it("is a built-in exercise's name, or your own one's id", () => {
        const backSquat = BUILT_IN_EXERCISES.find((e) => e.id === 'builtin:back-squat')!;

        expect(exercisePath(backSquat)).toBe('/exercises/back-squat');
        expect(exercisePath({ ...backSquat, id: 'abc' } as never)).toBe('/exercises/abc');
    });
});

describe('readMyEquipment', () => {
    it('keeps the pieces in the order they are offered, leaving out any not known', () => {
        expect(readMyEquipment(['rack', 'jetpack', 'barbell'])).toEqual(['barbell', 'rack']);
    });

    it('keeps No equipment on its own, and drops it beside a piece', () => {
        expect(readMyEquipment(['none'])).toEqual(['none']);
        expect(readMyEquipment(['none', 'band'])).toEqual(['band']);
        expect(readMyEquipment([])).toEqual([]);
        expect(readMyEquipment('none')).toBeNull();
    });

    it('tells No equipment apart from none picked', () => {
        expect(hasNoEquipment(['none'])).toBe(true);
        expect(hasNoEquipment([])).toBe(false);
        expect(hasNoEquipment(['band'])).toBe(false);
    });

    it('with No equipment, allows only what needs nothing', () => {
        expect(canDoWith({ equipment: ['none'] }, ['none'])).toBe(true);
        expect(canDoWith({ equipment: ['band'] }, ['none'])).toBe(false);
    });
});
