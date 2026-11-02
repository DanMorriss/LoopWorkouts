import { cleanName, likelyWeightUnit, readProfile } from './profile';

describe('profile (NAV-4)', () => {
    const profile = {
        name: 'Sam',
        bodyFigure: 'female',
        trainingGoal: 'muscle',
        weightUnit: 'kg',
        myEquipment: ['kettlebell', 'barbell'],
        updatedAt: 5,
    };

    it('reads a usable profile, with its equipment known and in the order offered', () => {
        expect(
            readProfile({ ...profile, myEquipment: ['kettlebell', 'jetpack', 'barbell'] })
        ).toEqual({ ...profile, myEquipment: ['barbell', 'kettlebell'] });
    });

    it("doesn't read a broken one", () => {
        expect(readProfile(null)).toBeNull();
        expect(readProfile({ ...profile, name: 3 })).toBeNull();
        expect(readProfile({ ...profile, bodyFigure: 'robot' })).toBeNull();
        expect(readProfile({ ...profile, trainingGoal: 'speed' })).toBeNull();
        expect(readProfile({ ...profile, weightUnit: 'stone' })).toBeNull();
        expect(readProfile({ ...profile, myEquipment: 'barbell' })).toBeNull();
        expect(readProfile({ ...profile, updatedAt: -1 })).toBeNull();
    });

    it('trims a name and cuts it to 40 characters', () => {
        expect(cleanName('  Sam ')).toBe('Sam');
        expect(cleanName('a'.repeat(39) + ' b')).toBe('a'.repeat(39));
    });

    it('guesses pounds in the US, Liberia and Myanmar, and kilograms elsewhere', () => {
        expect(likelyWeightUnit(['en-US', 'en-GB'])).toBe('lb');
        expect(likelyWeightUnit(['my-mm'])).toBe('lb');
        expect(likelyWeightUnit(['en-GB'])).toBe('kg');
        expect(likelyWeightUnit(['fr'])).toBe('kg');
        expect(likelyWeightUnit([])).toBe('kg');
    });
});
