import { WeightUnit } from '../models/weight';
import { StepKind, stepKindName, supersetName } from '../models/workout';
import { counted } from '../shared/format-count';
import { isStep, padded, rowTime, StepModel, varies } from './step-model';

// What Create's rows say, as plain functions of the rows: their names to screen readers, and
// what a collapsed row and a set's row show.

/** Each row's step number, a heading or a superset's own row having the number before it. */
export function stepNumbers(rows: readonly StepModel[]): number[] {
    let count = 0;
    return rows.map((row) => (isStep(row) ? ++count : count));
}

/** The steps of the superset whose own row is at `index`, in order. */
export function supersetSteps(rows: readonly StepModel[], index: number): StepModel[] {
    const key = rows[index].key;
    return rows.filter((row) => row.group === key);
}

/** "Superset" or "Giant set", by how many exercises the one at `index` has (BLD-12). */
export function supersetNameAt(rows: readonly StepModel[], index: number): string {
    return supersetName(supersetSteps(rows, index).filter(isStep));
}

/**
 * How a row is named to screen readers, e.g. "Step 2, rest" or "Step 1, Squats"; a heading
 * is "Heading, Warmup", and a superset "Superset, steps 2 to 3". `numbers` is
 * `stepNumbers(rows)`.
 */
export function stepTitle(
    rows: readonly StepModel[],
    index: number,
    numbers: readonly number[]
): string {
    const step = rows[index];
    if (step.kind === 'heading') {
        return step.name.trim() ? `Heading, ${step.name.trim()}` : 'Heading';
    }
    if (step.kind === 'superset') {
        const first = numbers[index] + 1;
        const last = first + supersetSteps(rows, index).length - 1;
        return `${supersetNameAt(rows, index)}, steps ${first} to ${last}`;
    }
    return `Step ${numbers[index]}, ${step.name.trim() || stepKindName(step.kind).toLowerCase()}`;
}

/** What a row's open button says: its title and amount, and the superset it's in. */
export function toggleLabel(
    rows: readonly StepModel[],
    index: number,
    numbers: readonly number[],
    unit: WeightUnit
): string {
    const step = rows[index];
    const time = amountText(step, unit);
    const head = rows.findIndex((row) => row.key === step.group);
    const inSuperset = head === -1 ? '' : `, in the ${supersetNameAt(rows, head).toLowerCase()}`;
    return `${stepTitle(rows, index, numbers)}${inSuperset}${time ? `, ${time}` : ''}`;
}

/** What a collapsed row shows as its name: a superset's is its steps', e.g. "Bench, Row". */
export function summaryName(rows: readonly StepModel[], index: number): string {
    const step = rows[index];
    if (step.kind !== 'superset') {
        return step.name.trim();
    }
    return supersetSteps(rows, index)
        .map((member) => member.name.trim() || stepKindName(member.kind as StepKind))
        .join(', ');
}

/**
 * How much of a step there is, as its wheels show it: e.g. "02:15", "20 reps", or
 * "10 reps @ 60 kg", and "each side" for one done each side. A superset's is its rounds and
 * rest, e.g. "3 rounds · rest 01:00"; a step in one has its own amount, its rounds being the
 * superset's.
 */
export function amountText(step: StepModel, unit: WeightUnit): string {
    if (step.kind === 'heading') {
        return '';
    }
    const rest = step.restMinutes * 60 + step.restSeconds;
    const restText =
        rest > 0 ? ` · rest ${padded(step.restMinutes)}:${padded(step.restSeconds)}` : '';
    if (step.kind === 'superset') {
        return step.sets === 1 ? '1 round' : `${step.sets} rounds${restText}`;
    }
    const sets = step.kind !== 'rest' && step.sets > 1 && !step.group;
    const eachSide = step.kind !== 'rest' && step.eachSide ? ' each side' : '';
    const weight = step.weight > 0 ? ` @ ${step.weight} ${unit}` : '';
    const time = `${padded(step.minutes)}:${padded(step.seconds)}`;
    if (!sets && varies(step)) {
        return `${variedText(step, unit)}${eachSide}`;
    }
    if (!sets) {
        if (step.kind === 'reps') {
            return `${counted(step.reps, 'rep')}${weight}${eachSide}`;
        }
        return `${time}${eachSide}`;
    }
    // As the history says sets, e.g. "3 × 10 @ 60 kg", or each set's where they vary, e.g.
    // "12, 10, 8 @ 40–50 kg", with the rest between them
    const amount = varies(step)
        ? variedText(step, unit)
        : `${step.sets} × ${step.kind === 'reps' ? `${step.reps}${weight}` : time}`;
    return `${amount}${eachSide}${restText}`;
}

/** Sets that vary, e.g. "12, 10, 8 @ 40–50 kg", or "00:30, 00:45, 01:00". */
function variedText(step: StepModel, unit: WeightUnit): string {
    const rows = step.setRows;
    if (step.kind !== 'reps') {
        return rows.map(rowTime).join(', ');
    }
    const weights = rows.map((row) => row.weight).filter((weight) => weight > 0);
    const low = Math.min(...weights);
    const high = Math.max(...weights);
    const weight =
        weights.length === 0 ? '' : ` @ ${low === high ? low : `${low}–${high}`} ${unit}`;
    return `${rows.map((row) => row.reps).join(', ')}${weight}`;
}

/**
 * A set's row, e.g. "Set 2 · 10 × 45 kg", "Set 2 · 10 reps" or "Set 2 · 00:45"; in a
 * superset, a round's, e.g. "Round 2 · 10 reps".
 */
export function setRowText(step: StepModel, set: number, unit: WeightUnit): string {
    const row = step.setRows[set];
    const name = `${step.group ? 'Round' : 'Set'} ${set + 1}`;
    if (step.kind !== 'reps') {
        return `${name} · ${rowTime(row)}`;
    }
    if (row.weight > 0) {
        return `${name} · ${row.reps} × ${row.weight} ${unit}`;
    }
    return `${name} · ${counted(row.reps, 'rep')}`;
}
