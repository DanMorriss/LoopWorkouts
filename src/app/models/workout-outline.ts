import { formatSeconds } from '../shared/format-time';
import { runsUntilStopped, Step, supersetName, Workout } from './workout';

/** One line of a workout written out: a heading, a step, or a superset and its steps. */
export type OutlineLine =
    | { kind: 'heading'; text: string }
    | ({ kind: 'step' } & OutlineStep)
    | { kind: 'superset'; name: string; amount: string; steps: OutlineStep[] };

/** A step as written out, with the exercise it's linked to, if any. */
export interface OutlineStep {
    name: string;
    amount: string;
    exerciseId?: string;
}

/** A step's linked exercise, as a line's field, or nothing for one with none. */
function linkOf(step: Step): Pick<OutlineStep, 'exerciseId'> {
    return step.kind !== 'rest' && step.exerciseId ? { exerciseId: step.exerciseId } : {};
}

/** "1:30", "0:45": a time as it's written in a plan. */
function clock(seconds: number): string {
    return formatSeconds(seconds).replace(/^0(?=\d:)/, '');
}

/** A step's name; an unnamed one by its kind, as the history names it: "Work" or "Reps". */
function nameOf(step: Step): string {
    if (step.kind === 'rest') {
        return 'Rest';
    }
    return step.name.trim() || (step.kind === 'reps' ? 'Reps' : 'Work');
}

/** One set of a step: "10", "10 each side", "0:45", "0:30 each side". */
function amountOf(step: Step): string {
    const amount = step.kind === 'reps' ? String(step.reps) : clock(step.seconds);
    return step.eachSide ? `${amount} each side` : amount;
}

/**
 * How a step's sets read: "3 × 10, rest 1:00"; "3 sets: 12, 10, 8, rest 2:30" where they
 * vary; "15" for one set; and a rest step's time.
 */
function setsOf(step: Step, rounds: number, restSeconds: number): string {
    if (step.kind === 'rest') {
        return clock(step.seconds);
    }
    const restText = rounds > 1 && restSeconds > 0 ? `, rest ${clock(restSeconds)}` : '';
    if (step.sets && rounds > 1) {
        const each = step.sets.map((set) =>
            'reps' in set ? String(set.reps) : clock(set.seconds)
        );
        const side = step.eachSide ? ' each side' : '';
        return `${rounds} sets: ${each.join(', ')}${side}${restText}`;
    }
    return rounds > 1 ? `${rounds} × ${amountOf(step)}${restText}` : amountOf(step);
}

/**
 * A workout written out as a plan is, to read before starting it: its headings, each exercise
 * and its sets, and each superset with its rounds and steps.
 */
export function outline(workout: Pick<Workout, 'blocks'>): OutlineLine[] {
    return workout.blocks.map((block): OutlineLine => {
        if (block.kind === 'heading') {
            return { kind: 'heading', text: block.text };
        }
        const exercises = block.steps.filter((step) => step.kind !== 'rest').length;
        if (exercises <= 1) {
            const step = block.steps.find((s) => s.kind !== 'rest') ?? block.steps[0];
            return {
                kind: 'step',
                name: nameOf(step),
                amount: setsOf(step, block.rounds, block.restSeconds),
                ...linkOf(step),
            };
        }
        const restText = block.restSeconds > 0 ? `, rest ${clock(block.restSeconds)}` : '';
        return {
            kind: 'superset',
            name: supersetName(block.steps),
            amount: block.rounds > 1 ? `${block.rounds} rounds${restText}` : 'Once',
            steps: block.steps.map((step) => ({
                name: nameOf(step),
                amount: step.kind === 'rest' ? clock(step.seconds) : amountOf(step),
                ...linkOf(step),
            })),
        };
    });
}

/** How many times the whole workout goes round: "Once", "3 rounds", or a time limit. */
export function repeatsText(workout: Pick<Workout, 'repeats' | 'timeLimitSeconds'>): string {
    if (workout.timeLimitSeconds !== undefined) {
        return `As many rounds as you can in ${clock(workout.timeLimitSeconds)}`;
    }
    if (runsUntilStopped(workout)) {
        return 'Round and round, until you stop';
    }
    return workout.repeats === 1 ? 'Once through' : `${workout.repeats} rounds of all of it`;
}
