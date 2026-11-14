export type WeightUnit = 'kg' | 'lb';
export const WEIGHT_UNITS: readonly WeightUnit[] = ['kg', 'lb'];

export const KG_PER_LB = 0.45359237;

/** The heaviest a rep step's weight can be, in kg. */
export const MAX_WEIGHT_KG = 300;

/** The wheel's top weight in each unit (about 300 kg either way). */
export const MAX_WEIGHT: Record<WeightUnit, number> = { kg: 300, lb: 660 };

/** How much a suggested next weight goes up by (PRG-5): the smallest usual plates. */
export const WEIGHT_INCREASE: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

/** Weights are picked in steps of this, in either unit: e.g. 22.5 kg or 47.5 lb. */
export const WEIGHT_STEP = 0.5;

/**
 * A weight saved in kg, as shown in `unit`: to the nearest WEIGHT_STEP, and no more than
 * the wheel goes up to.
 */
export function weightIn(kg: number, unit: WeightUnit): number {
    return Math.min(MAX_WEIGHT[unit], estimateIn(kg, unit));
}

/**
 * A weight worked out rather than lifted, e.g. an estimated one-rep max, as shown in
 * `unit`: to the nearest WEIGHT_STEP, with no top, since it can be more than the wheel goes
 * up to.
 */
export function estimateIn(kg: number, unit: WeightUnit): number {
    const value = unit === 'kg' ? kg : kg / KG_PER_LB;
    return Math.round(value / WEIGHT_STEP) * WEIGHT_STEP;
}

/** A total of weight × reps (volume), as shown in `unit`: to the nearest whole kg or lb. */
export function volumeIn(kg: number, unit: WeightUnit): number {
    return Math.round(unit === 'kg' ? kg : kg / KG_PER_LB);
}

/** A weight picked in `unit`, in kg to the gram, as it's saved. */
export function weightToKg(value: number, unit: WeightUnit): number {
    const kg = unit === 'kg' ? value : value * KG_PER_LB;
    return Math.round(kg * 1000) / 1000;
}

/** e.g. "60 kg", "22.5 kg" or "135 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
    return `${weightIn(kg, unit)} ${unit}`;
}

/** The weight wheel's options in `unit`: none, then halves up to the top, e.g. 22.5. */
export function weightOptions(
    unit: WeightUnit
): { value: number; label: string; spokenLabel?: string }[] {
    return [
        { value: 0, label: '–', spokenLabel: 'none' },
        ...Array.from({ length: MAX_WEIGHT[unit] / WEIGHT_STEP }, (_, i) => {
            const weight = (i + 1) * WEIGHT_STEP;
            return { value: weight, label: String(weight) };
        }),
    ];
}
