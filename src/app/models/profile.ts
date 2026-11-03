import { BODY_FIGURE_CHOICES, BodyFigure, Equipment, EQUIPMENT_CHOICES } from './exercise';
import { TRAINING_GOALS, TrainingGoal } from './muscle-balance';
import { WEIGHT_UNITS, WeightUnit } from './weight';

/** The longest a name can be: enough for a first name and more, short enough for Home's greeting. */
export const MAX_NAME_LENGTH = 40;

/**
 * Your profile (NAV-4, SET-7): who you are and what you train with, asked once when you start
 * and kept on You → Profile. Unlike the rest of the settings it's synced, as one record of
 * its own like the weekly plan, so a device you sign in on has it already.
 */
export interface Profile {
    /** What Home greets you by; '' if you'd rather not say. */
    name: string;
    bodyFigure: BodyFigure;
    trainingGoal: TrainingGoal;
    weightUnit: WeightUnit;
    myEquipment: Equipment[];
    /** When it last changed, in ms since the epoch, or 0 if it never has. */
    updatedAt: number;
}

/** The settings that make up the profile. */
export const PROFILE_FIELDS = [
    'name',
    'bodyFigure',
    'trainingGoal',
    'weightUnit',
    'myEquipment',
] as const satisfies readonly (keyof Profile)[];

/** A name as it's kept: trimmed, and cut to the longest a name can be. */
export function cleanName(name: string): string {
    return name.trim().slice(0, MAX_NAME_LENGTH).trim();
}

/**
 * A saved or fetched profile, checked and copied, or null if it isn't usable. Equipment that
 * isn't known (from a newer version of the app, say) is left out, and kept in the order it's
 * offered.
 */
export function readProfile(value: unknown): Profile | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const profile = value as Record<string, unknown>;
    const { name, bodyFigure, trainingGoal, weightUnit, myEquipment, updatedAt } = profile;
    if (
        typeof name !== 'string' ||
        !BODY_FIGURE_CHOICES.includes(bodyFigure as BodyFigure) ||
        !TRAINING_GOALS.includes(trainingGoal as TrainingGoal) ||
        !WEIGHT_UNITS.includes(weightUnit as WeightUnit) ||
        !Array.isArray(myEquipment) ||
        !Number.isSafeInteger(updatedAt) ||
        (updatedAt as number) < 0
    ) {
        return null;
    }
    return {
        name: cleanName(name),
        bodyFigure: bodyFigure as BodyFigure,
        trainingGoal: trainingGoal as TrainingGoal,
        weightUnit: weightUnit as WeightUnit,
        myEquipment: EQUIPMENT_CHOICES.filter((choice) => myEquipment.includes(choice)),
        updatedAt: updatedAt as number,
    };
}

/**
 * The weight unit most people lift in where the device is set to: pounds in the US, Liberia and
 * Myanmar, kilograms elsewhere.
 */
export function likelyWeightUnit(languages: readonly string[]): WeightUnit {
    const region = languages[0]?.split('-')[1]?.toUpperCase();
    return region === 'US' || region === 'LR' || region === 'MM' ? 'lb' : 'kg';
}
