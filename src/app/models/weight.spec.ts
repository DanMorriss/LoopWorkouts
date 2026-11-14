import {
    bodyWeightIn,
    bodyWeightToKg,
    formatWeight,
    volumeIn,
    weightIn,
    weightToKg,
} from './weight';

describe('weights', () => {
    it('shows a weight in kg or lb, to the nearest half', () => {
        expect(weightIn(60, 'kg')).toBe(60);
        expect(weightIn(22.4, 'kg')).toBe(22.5);
        expect(weightIn(20, 'lb')).toBe(44);
        expect(weightIn(100, 'lb')).toBe(220.5);
    });

    it('stops at the top of the wheel, e.g. 300 kg in lb', () => {
        expect(weightIn(300, 'lb')).toBe(660);
    });

    it('saves a weight in kg, to the gram', () => {
        expect(weightToKg(60, 'kg')).toBe(60);
        expect(weightToKg(45, 'lb')).toBe(20.412);
    });

    // Saved in kg, a weight picked in lb still shows as picked, so switching units loses nothing
    it('shows a weight picked in lb as it was picked', () => {
        for (const lb of [1, 2.5, 45, 47.5, 135, 315, 659.5]) {
            expect(weightIn(weightToKg(lb, 'lb'), 'lb')).toBe(lb);
        }
    });

    it('formats a weight with its unit', () => {
        expect(formatWeight(60, 'kg')).toBe('60 kg');
        expect(formatWeight(22.5, 'kg')).toBe('22.5 kg');
        expect(formatWeight(20.412, 'lb')).toBe('45 lb');
    });

    it('shows a volume to the whole kg or lb, with no top', () => {
        expect(volumeIn(1680, 'kg')).toBe(1680);
        expect(volumeIn(1250.4, 'kg')).toBe(1250);
        // 10 reps at 135 lb, saved in kg, comes back as picked
        expect(volumeIn(weightToKg(135, 'lb') * 10, 'lb')).toBe(1350);
    });

    describe('body weight (CAL-2)', () => {
        it('saves it in kg, to one decimal place as typed', () => {
            expect(bodyWeightToKg(72.5, 'kg')).toBe(72.5);
            expect(bodyWeightToKg(72.54, 'kg')).toBe(72.5);
            expect(bodyWeightToKg(160, 'lb')).toBe(72.575);
        });

        it('shows it as typed, in either unit', () => {
            expect(bodyWeightIn(72.575, 'lb')).toBe(160);
            expect(bodyWeightIn(72.575, 'kg')).toBe(72.6);
            for (const lb of [100, 160.5, 245.3]) {
                expect(bodyWeightIn(bodyWeightToKg(lb, 'lb')!, 'lb')).toBe(lb);
            }
        });

        it('takes anything out of range, or not a number, as none', () => {
            expect(bodyWeightToKg(19.9, 'kg')).toBeNull();
            expect(bodyWeightToKg(301, 'kg')).toBeNull();
            expect(bodyWeightToKg(40, 'lb')).toBeNull();
            expect(bodyWeightToKg(Number.NaN, 'kg')).toBeNull();
            expect(bodyWeightToKg(20, 'kg')).toBe(20);
        });
    });
});
