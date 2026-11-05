import { moveItemInArray } from '@angular/cdk/drag-drop';
import { WheelPickerOption } from '../shared/components/wheel-picker/wheel-picker.component';
import { WeightUnit, weightIn, weightToKg } from '../models/weight';
import { Block, RepStep, Step, StepGroup, StepKind, TimedStep } from '../models/workout';

/**
 * What a row in Create is: a kind of step, a heading (BLD-13), or a superset's own row, with
 * its rounds and rest, which its steps follow (BLD-12).
 */
export type ItemKind = StepKind | 'heading' | 'superset';

/**
 * One step as the form holds it: minutes and seconds for a timed step's two wheels, or
 * reps and weight for a rep step's. A step keeps them all, and only uses those for its kind.
 * A heading is a row of its own kind, with its text as its name and nothing else used; so is
 * a superset, with its rounds as its `sets` and its rest between rounds as its rest.
 */
export interface StepModel {
    /** Stays with the step as it moves, for tracking and element ids. */
    key: number;
    kind: ItemKind;
    name: string;
    minutes: number;
    seconds: number;
    reps: number;
    /** In the unit chosen in settings, to the nearest half; 0 for none. */
    weight: number;
    /**
     * The exercise picked for a work or rep step, or '' if none has been: it then goes by
     * its name when saved (see `linkSteps()`).
     */
    exerciseId: string;
    /**
     * The weight as saved, in kg, kept as it was unless the wheel moves, so rounding it
     * for the wheel doesn't change it. Null for a new step.
     */
    savedWeight: number | null;
    /** How many times a work or rep step runs, 1 to MAX_REPEATS. A rest step runs once. */
    sets: number;
    /**
     * The rest between sets, for its two wheels: used once there's more than one set, and
     * 1:00 until it's set, so it starts there the first time Sets goes above 1.
     */
    restMinutes: number;
    restSeconds: number;
    /** Done one side at a time, each set running both sides (BLD-10). Not for a rest step. */
    eachSide: boolean;
    /**
     * Vary each set (BLD-11): each set has its own row of reps and weight, or time, in
     * `setRows`, set 1's being the step's. Only with more than one set, and not for rest.
     */
    vary: boolean;
    /** A row for each set while `vary` is on, as many as `sets`; empty while it's off. */
    setRows: SetRowModel[];
    /**
     * The key of the superset it's in, whose row it follows with the superset's other steps,
     * or 0 for none. Its `sets` are the superset's rounds, kept the same as they change.
     */
    group: number;
}

/** One set's own amount, as a step holds its own: reps and weight, or minutes and seconds. */
export interface SetRowModel {
    reps: number;
    /** In the unit chosen in settings, to the nearest half; 0 for none. */
    weight: number;
    /** As a step's `savedWeight`: the weight as saved, in kg, or null for a new row. */
    savedWeight: number | null;
    minutes: number;
    seconds: number;
}

/** How a workout goes on: a number of rounds (or until stopped), or a time limit. */
export type RepeatMode = 'rounds' | 'time';

/** The form's values. */
export interface WorkoutSetupModel {
    title: string;
    steps: StepModel[];
    repeats: number;
    repeatMode: RepeatMode;
    /** The time limit, kept while Rounds is picked, so going back to Time limit finds it. */
    limitMinutes: number;
    limitSeconds: number;
}

/** A new time limit, until one's picked: a common length for as many rounds as possible. */
export const DEFAULT_TIME_LIMIT_MINUTES = 20;

export function pickerOptions(
    from: number,
    to: number,
    label: (n: number) => string
): WheelPickerOption[] {
    return Array.from({ length: to - from + 1 }, (_, i) => ({
        value: from + i,
        label: label(from + i),
    }));
}

export const padded = (n: number) => n.toString().padStart(2, '0');

/**
 * A page Create can go back to, with a workout's id captured for its details: /library/<id>, or
 * an exercise's page, /library/<id>/<name>, /ready-made-plans/<workout>/<name> or
 * /exercises/<name> (with the list's filter or where it goes back to).
 */
export const BACK_PAGE =
    /^(?:\/library\/([^/?#]+)|\/library\/[^/?#]+\/[^/?#]+|(?:\/exercises|\/ready-made-plans\/[^/?#]+)\/[^/?#]+(?:\?[^#]*)?)$/;

/** What the name box suggests for each kind of step. */
export const NAME_EXAMPLES: Record<StepKind, string> = {
    work: 'e.g. Squats',
    rest: 'e.g. Catch your breath',
    reps: 'e.g. Push-ups',
};

/** A row that's a step, rather than a heading or a superset's own row. */
export function isStep(row: StepModel): row is StepModel & { kind: StepKind } {
    return row.kind !== 'heading' && row.kind !== 'superset';
}

/** A row that's an exercise: a rep or timed step, which can be linked to one and joined. */
export function isExercise(row: StepModel): boolean {
    return row.kind === 'reps' || row.kind === 'work';
}

/** Just after the end of the row at `index`: after its steps, for a superset's row. */
export function partEnd(rows: readonly StepModel[], index: number): number {
    const row = rows[index];
    let end = index + 1;
    while (row?.kind === 'superset' && rows[end]?.group === row.key) {
        end++;
    }
    return end;
}

/**
 * The rows with the one at `index` moved up or down one place, or null if it can't go: a
 * superset goes with its steps, past the row or the whole superset beside it, and a step in a
 * superset moves within it.
 */
export function moved(rows: readonly StepModel[], index: number, by: -1 | 1): StepModel[] | null {
    const row = rows[index];
    if (row.group) {
        const target = index + by;
        if (rows[target]?.group !== row.group) {
            return null;
        }
        const next = [...rows];
        moveItemInArray(next, index, target);
        return next;
    }
    const end = partEnd(rows, index);
    if (by === 1) {
        if (end >= rows.length) {
            return null;
        }
        const nextEnd = partEnd(rows, end);
        return [
            ...rows.slice(0, index),
            ...rows.slice(end, nextEnd),
            ...rows.slice(index, end),
            ...rows.slice(nextEnd),
        ];
    }
    if (index === 0) {
        return null;
    }
    // The row before, or the superset whose last step it is
    const above = rows[index - 1].group;
    const start = above ? rows.findIndex((other) => other.key === above) : index - 1;
    return [
        ...rows.slice(0, start),
        ...rows.slice(index, end),
        ...rows.slice(start, index),
        ...rows.slice(end),
    ];
}

/**
 * The rows with the one at `from` dragged to `to`, as the drag list counts places; a
 * superset's row takes its steps with it, straight after it.
 */
export function movedRow(rows: readonly StepModel[], from: number, to: number): StepModel[] {
    const next = [...rows];
    moveItemInArray(next, from, to);
    const row = rows[from];
    if (row.kind !== 'superset') {
        return next;
    }
    const steps = next.filter((other) => other.group === row.key);
    const others = next.filter((other) => other.group !== row.key);
    const at = others.indexOf(row) + 1;
    return [...others.slice(0, at), ...steps, ...others.slice(at)];
}

/** Whether each superset's steps follow its row, together. */
export function wellFormed(rows: readonly StepModel[]): boolean {
    return rows.every((row, i) => {
        const before = rows[i - 1];
        return !row.group || before?.key === row.group || before?.group === row.group;
    });
}

/** A superset's step taken out of it: an exercise of its own, with its rounds and rest. */
export function ownExercise(step: StepModel, superset: StepModel): StepModel {
    return {
        ...step,
        group: 0,
        sets: superset.sets,
        restMinutes: superset.restMinutes,
        restSeconds: superset.restSeconds,
    };
}

/**
 * The rows with superset `key` gone if it's been left with one step (which becomes an
 * exercise of its own, in its place) or none. As they are if it hasn't, or for no superset.
 */
export function lonelyStepsOut(rows: StepModel[], key: number): StepModel[] {
    const superset = rows.find((row) => row.key === key);
    if (!key || !superset || rows.filter((row) => row.group === key).length > 1) {
        return rows;
    }
    return rows.flatMap((row) =>
        row.key === key ? [] : row.group === key ? [ownExercise(row, superset)] : [row]
    );
}

/**
 * A step with a number of sets, e.g. its superset's rounds. With Vary each set on, a set
 * added copies the last one's row, and one taken away goes from the end; down to 1 set,
 * there's nothing to vary, so it goes off.
 */
export function withSets(step: StepModel, sets: number): StepModel {
    if (step.sets === sets) {
        return step;
    }
    if (!step.vary) {
        return { ...step, sets };
    }
    if (sets < 2) {
        return { ...varyOff(step), sets };
    }
    return {
        ...step,
        sets,
        setRows: Array.from(
            { length: sets },
            // A copy of its fields, not a spread: the form tracks a row by the object
            (_, i) => step.setRows[i] ?? rowOf(step.setRows.at(-1)!)
        ),
    };
}

/** Whether a step has a time, reps or a weight, as its kind uses. Other rows have none. */
export function hasAmount(step: StepModel): boolean {
    if (!isStep(step)) {
        return false;
    }
    // Where its sets vary, its rows have them, and its own are left as they were
    return (varies(step) ? step.setRows : [step]).some((row) =>
        step.kind === 'reps' ? row.reps > 0 || row.weight > 0 : row.minutes > 0 || row.seconds > 0
    );
}

/** Whether a step's sets each have their own row (BLD-11): only with more than one set. */
export function varies(step: StepModel): boolean {
    return step.vary && step.sets > 1 && (step.kind === 'reps' || step.kind === 'work');
}

/**
 * A row for a set as the step (or another row) has it. Its fields only: a spread would copy
 * the hidden key the form tracks an array's rows by, and two rows can't share one.
 */
export function rowOf({ reps, weight, savedWeight, minutes, seconds }: SetRowModel): SetRowModel {
    return { reps, weight, savedWeight, minutes, seconds };
}

/** Vary each set off: every set back to set 1's, which is the step's own again. */
export function varyOff(step: StepModel): StepModel {
    const [first] = step.setRows;
    return { ...step, ...(first ? rowOf(first) : {}), vary: false, setRows: [] };
}

/** Whether a set's row has reps, or a time, as its step's kind uses. */
export function rowHasAmount(step: StepModel, row: SetRowModel): boolean {
    return step.kind === 'reps' ? row.reps > 0 : row.minutes > 0 || row.seconds > 0;
}

export function rowTime(row: SetRowModel): string {
    return `${padded(row.minutes)}:${padded(row.seconds)}`;
}

export function timeLimitSeconds(setup: WorkoutSetupModel): number {
    return setup.limitMinutes * 60 + setup.limitSeconds;
}

/**
 * The workout to save, a group for each step with its sets and the rest between them, one for
 * each superset with its rounds and rest, and its headings, trimmed, in their places. Steps left
 * at 0:00 or 0 reps are left out, and so are headings left empty and supersets left with no
 * steps. A run of steps of one set runs as a circuit's round always has, each straight after
 * the last.
 */
export function toBlocks(rows: readonly StepModel[], unit: WeightUnit): Block[] {
    const blocks: Block[] = [];
    // The superset whose steps are being added to it, if the rows are in one
    let superset: StepGroup | null = null;
    for (const model of rows) {
        if (model.kind === 'heading') {
            const text = model.name.trim();
            if (text) {
                blocks.push({ kind: 'heading', text });
            }
            continue;
        }
        if (model.kind === 'superset') {
            superset = { kind: 'group', ...setsAndRest(model), steps: [] };
            blocks.push(superset);
            continue;
        }
        const step = toStep({ ...model, kind: model.kind }, unit);
        if (step.kind === 'reps' ? step.reps === 0 : step.seconds === 0) {
            continue;
        }
        if (model.group && superset) {
            superset.steps.push(step);
            continue;
        }
        // A set row left at 0 reps or 00:00 is stopped by the form's check before saving
        blocks.push({
            kind: 'group',
            ...setsAndRest(step.kind === 'rest' ? { ...model, sets: 1 } : model),
            steps: [step],
        });
    }
    return blocks.filter((block) => block.kind === 'heading' || block.steps.length > 0);
}

/** A group's rounds, and the rest between them: none for one round. */
export function setsAndRest(model: StepModel): Pick<StepGroup, 'rounds' | 'restSeconds'> {
    return {
        rounds: model.sets,
        restSeconds: model.sets > 1 ? model.restMinutes * 60 + model.restSeconds : 0,
    };
}

/**
 * A step to save: whole seconds, a trimmed name, a weight in kg, any exercise picked, and
 * each side if it's done each side.
 */
export function toStep(model: StepModel & { kind: StepKind }, unit: WeightUnit): Step {
    if (varies(model)) {
        // Set 1's is the step's own, so it reads as a whole step
        const rows = model.setRows.map((row) => toStep({ ...model, ...row, vary: false }, unit));
        const first = rows[0];
        return first.kind === 'reps'
            ? {
                  ...first,
                  sets: rows.map((row) => {
                      const { reps, weight } = row as RepStep;
                      return { reps, ...(weight === undefined ? {} : { weight }) };
                  }),
              }
            : { ...first, sets: rows.map((row) => ({ seconds: (row as TimedStep).seconds })) };
    }
    const step = model;
    const eachSide = step.kind !== 'rest' && step.eachSide ? { eachSide: true as const } : {};
    return step.kind === 'reps'
        ? {
              kind: 'reps',
              reps: step.reps,
              name: step.name.trim(),
              ...(step.weight > 0 ? { weight: savedWeight(step, unit) } : {}),
              ...(step.exerciseId ? { exerciseId: step.exerciseId } : {}),
              ...eachSide,
          }
        : {
              kind: step.kind,
              seconds: step.minutes * 60 + step.seconds,
              name: step.name.trim(),
              ...(step.kind === 'work' && step.exerciseId ? { exerciseId: step.exerciseId } : {}),
              ...eachSide,
          };
}

/** A rep step's weight in kg: as it was saved, if the wheel hasn't moved, so it isn't rounded. */
export function savedWeight(step: StepModel, unit: WeightUnit): number {
    return step.savedWeight !== null && weightIn(step.savedWeight, unit) === step.weight
        ? step.savedWeight
        : weightToKg(step.weight, unit);
}
