import { Synced } from './sync';

/**
 * The muscle groups the body map can shade, one per shape on its figure (see
 * docs/features/exercises.md). Front, side and rear shoulders, and the lats, aren't apart
 * on the figure, so they aren't here either.
 */
export type MuscleGroup =
    | 'chest'
    | 'shoulders'
    | 'biceps'
    | 'triceps'
    | 'forearms'
    | 'abs'
    | 'obliques'
    | 'traps'
    | 'upper-back'
    | 'lower-back'
    | 'glutes'
    | 'abductors'
    | 'adductors'
    | 'quads'
    | 'hamstrings'
    | 'calves'
    | 'shins'
    | 'neck';

/** How each muscle group is written in the app, e.g. on the body map's labels. */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
    chest: 'Chest',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    forearms: 'Forearms',
    abs: 'Abs',
    obliques: 'Obliques',
    traps: 'Traps',
    'upper-back': 'Upper back',
    'lower-back': 'Lower back',
    glutes: 'Glutes',
    abductors: 'Abductors',
    adductors: 'Adductors',
    quads: 'Quads',
    hamstrings: 'Hamstrings',
    calves: 'Calves',
    shins: 'Shins',
    neck: 'Neck',
};

export type Equipment =
    | 'barbell'
    | 'dumbbells'
    | 'kettlebell'
    | 'bench'
    /** A bench with an angled pad to rest the backs of your arms on. */
    | 'preacher bench'
    | 'rack'
    /** A bar that runs up and down fixed rails, in a frame of its own. */
    | 'smith machine'
    | 'pull-up bar'
    | 'parallel bars'
    /** Gymnastic rings or suspension straps, hung from something overhead. */
    | 'rings'
    | 'cable'
    | 'machine'
    | 'band'
    /** A box, bench-height step or stair. */
    | 'step'
    | 'ab wheel'
    | 'none';

/**
 * One thing an exercise needs: a piece of equipment, or a choice of them where any one will
 * do (e.g. a dumbbell or a kettlebell for a goblet squat).
 */
export type EquipmentNeed = Equipment | readonly Equipment[];

/** Reps (with a weight where there is one), or a time held, e.g. a plank. */
export type MeasuredBy = 'reps' | 'timed';

/**
 * One of the exercises that comes with the app (EXR-6, EXR-7). Its description, steps and tips
 * are kept apart, in BUILT_IN_EXERCISE_TEXT, so they aren't in the first download.
 */
export interface BuiltInExercise {
    /** Fixed for good, so history keeps pointing to it: `builtin:<name-in-kebab-case>`. */
    id: `builtin:${string}`;
    name: string;
    /** Other names it goes by, matched by the picker and when old steps carry over. */
    otherNames: string[];
    /**
     * Everything it needs, all of it, so it can be filtered by what someone has; `['none']`
     * for nothing at all. Plates and a floor are taken for granted.
     */
    equipment: EquipmentNeed[];
    measuredBy: MeasuredBy;
    /** The muscles doing most of the work: bright on the body map. */
    mainMuscles: MuscleGroup[];
    /** Muscles that help or hold steady: darker on the body map. */
    supportingMuscles: MuscleGroup[];
}

/**
 * The words about an exercise. A built-in one's are in BUILT_IN_EXERCISE_TEXT, loaded when
 * they're shown (see `ExerciseStore.textOf()`); your own exercise has them on it.
 */
export interface ExerciseText {
    /** One line: what it is, and why do it. */
    description: string;
    /** 3–5 short steps, in order. */
    steps: string[];
    /** One or two. */
    tips: string[];
}

/**
 * Whether an exercise can be done with only `available` equipment: every need is met, where
 * a choice is met by any one of it. Needing nothing is always met.
 */
export function canDoWith(
    exercise: { equipment: readonly EquipmentNeed[] },
    available: readonly Equipment[]
): boolean {
    return exercise.equipment.every((need) => {
        const options: readonly Equipment[] = typeof need === 'string' ? [need] : need;
        return options.some((option) => option === 'none' || available.includes(option));
    });
}

/** Which figure the body map draws, chosen in settings (SET-5). */
export type BodyFigure = 'male' | 'female';
export const BODY_FIGURE_CHOICES: readonly BodyFigure[] = ['male', 'female'];

/**
 * An exercise of your own (EXR-9): made by typing a name no exercise has, and saved and
 * synced as your data. It has the same details as a built-in one, though most start empty.
 */
export interface OwnExercise extends Synced {
    name: string;
    otherNames: string[];
    equipment: EquipmentNeed[];
    measuredBy: MeasuredBy;
    mainMuscles: MuscleGroup[];
    supportingMuscles: MuscleGroup[];
    /** Empty until you add one. */
    description: string;
    steps: string[];
    tips: string[];
}

export type Exercise = BuiltInExercise | OwnExercise;

/** What you can change on an exercise of your own (EXR-3, EXR-9). */
export type OwnExerciseDetails = Pick<
    OwnExercise,
    | 'name'
    | 'measuredBy'
    | 'equipment'
    | 'mainMuscles'
    | 'supportingMuscles'
    | 'description'
    | 'steps'
    | 'tips'
>;

/** The longest an exercise's name can be: the same as a step's, as it's shown on the workout. */
export const MAX_EXERCISE_NAME_LENGTH = 40;

/** A couple of sentences, like a built-in one's. */
export const MAX_EXERCISE_DESCRIPTION_LENGTH = 300;

/** How-to steps on an exercise of your own: a few more than a built-in one has. */
export const MAX_EXERCISE_STEPS = 8;
export const MAX_EXERCISE_TIPS = 4;
/** The longest a how-to step or a tip can be: a sentence or two, readable between sets. */
export const MAX_EXERCISE_LINE_LENGTH = 200;

/** The equipment that can be picked for an exercise of your own, in the order it's offered. */
export const EQUIPMENT_CHOICES: readonly Exclude<Equipment, 'none'>[] = [
    'barbell',
    'dumbbells',
    'kettlebell',
    'bench',
    'preacher bench',
    'rack',
    'smith machine',
    'pull-up bar',
    'parallel bars',
    'rings',
    'cable',
    'machine',
    'band',
    'step',
    'ab wheel',
];

/** How each piece of equipment is written in the app, e.g. "Pull-up bar". */
export function equipmentLabel(equipment: Equipment): string {
    return equipment.charAt(0).toUpperCase() + equipment.slice(1);
}

/**
 * What an exercise needs, as phrases to show as chips or run together in a line, e.g.
 * "barbell", "dumbbells or kettlebell", "no equipment". A pair of choices that differ by one
 * piece each reads as one, so an inverted row's (a barbell, Smith machine or rings, and a
 * rack, Smith machine or rings) is "barbell and rack, Smith machine, or rings". Lower case
 * apart from names, to go mid-sentence: `capitalise()` one to start a chip or a line.
 */
export function equipmentPhrases(needs: readonly EquipmentNeed[]): string[] {
    const choices = needs.map((need): readonly Equipment[] =>
        typeof need === 'string' ? [need] : need
    );
    const used = new Set<number>();
    const phrases: string[] = [];
    choices.forEach((options, i) => {
        if (used.has(i)) {
            return;
        }
        used.add(i);
        const j = choices.findIndex(
            (other, k) => k > i && !used.has(k) && pairedChoice(options, other) !== null
        );
        if (j === -1) {
            phrases.push(
                options.includes('none') ? 'no equipment' : listOf(options.map(equipmentName))
            );
            return;
        }
        used.add(j);
        phrases.push(listOf(pairedChoice(options, choices[j])!));
    });
    return phrases;
}

/**
 * Two choices with some pieces in common and one each besides, read as one: the two that
 * differ go together ("barbell and rack"), then the pieces that do for both. Null if they
 * aren't like that.
 */
function pairedChoice(a: readonly Equipment[], b: readonly Equipment[]): string[] | null {
    const shared = a.filter((piece) => b.includes(piece));
    const onlyA = a.filter((piece) => !b.includes(piece));
    const onlyB = b.filter((piece) => !a.includes(piece));
    if (shared.length === 0 || onlyA.length !== 1 || onlyB.length !== 1) {
        return null;
    }
    return [
        `${equipmentName(onlyA[0])} and ${equipmentName(onlyB[0])}`,
        ...shared.map(equipmentName),
    ];
}

/** "a", "a or b", "a, b, or c". */
function listOf(items: readonly string[]): string {
    return items.length <= 2
        ? items.join(' or ')
        : `${items.slice(0, -1).join(', ')}, or ${items.at(-1)}`;
}

/** A piece of equipment mid-sentence: lower case, apart from the Smith machine's name. */
function equipmentName(equipment: Equipment): string {
    return equipment === 'smith machine' ? 'Smith machine' : equipment;
}

export function capitalise(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Where an exercise's page is: /exercises/back-squat for a built-in one, by id for your own. */
export function exercisePath(exercise: Exercise): string {
    return `/exercises/${exerciseSlug(exercise)}`;
}

/** The last part of an exercise page's address: "back-squat", or your own one's id. */
export function exerciseSlug(exercise: Exercise): string {
    return isBuiltIn(exercise) ? exercise.id.slice('builtin:'.length) : exercise.id;
}

/**
 * An exercise hidden from the picker in Create, built-in or your own. Its id is the
 * exercise's; showing it again deletes it, leaving a deletion so that reaches other copies.
 */
export type HiddenExercise = Synced;

export function isBuiltIn(exercise: Exercise): exercise is BuiltInExercise {
    return exercise.id.startsWith('builtin:');
}

/** Your own note on an exercise, built-in or your own (EXR-10). Its id is the exercise's. */
export interface ExerciseNote extends Synced {
    text: string;
}

/** Long enough for a cue or a machine setting, short enough to show beside a rep step. */
export const MAX_EXERCISE_NOTE_LENGTH = 200;

/**
 * What two names must share to be the same exercise: case, spaces and a plural "s" don't
 * count, so "Squats " and "squat" match, as do "Push-ups" and "Push-up".
 */
export function exerciseKey(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase().replace(/s$/, '');
}
