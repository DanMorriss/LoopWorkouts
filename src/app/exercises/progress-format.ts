import { formatDuration, spokenDuration } from '../history/history-format';
import { ExerciseBests, ExerciseWeek, ProgressMeasure } from '../models/progress';
import { estimateIn, volumeIn, WeightUnit, weightIn } from '../models/weight';
import { counted } from '../shared/format-count';

/** One personal best as the exercise page lists it, e.g. "Heaviest: 80 kg × 3". */
export interface BestLine {
    label: string;
    text: string;
    /** What screen readers hear in place of `text`, where it differs. */
    spoken: string;
    /** How it was worked out, e.g. "from 80 kg × 4". Empty when there's nothing to add. */
    detail: string;
    /** When it was set, and the history entry it's from. */
    at: number;
    entryId: string;
}

/** The bests there are, in the order the page lists them. */
export function bestLines(bests: ExerciseBests, unit: WeightUnit): BestLine[] {
    const lines: BestLine[] = [];
    const { heaviest, oneRepMax, mostReps, longest } = bests;
    if (heaviest) {
        const weight = `${weightIn(heaviest.weight, unit)} ${unit}`;
        lines.push({
            label: 'Heaviest',
            text: `${weight} × ${heaviest.reps}`,
            spoken: `${weight} for ${reps(heaviest.reps)}`,
            detail: '',
            ...heaviest,
        });
    }
    if (oneRepMax) {
        const estimate = `${estimateIn(oneRepMax.estimate, unit)} ${unit}`;
        lines.push({
            label: 'Estimated one-rep max',
            text: estimate,
            spoken: estimate,
            detail:
                oneRepMax.reps === 1
                    ? ''
                    : `from ${weightIn(oneRepMax.weight, unit)} ${unit} × ${oneRepMax.reps}`,
            ...oneRepMax,
        });
    }
    if (mostReps) {
        const weight =
            mostReps.weight === undefined ? '' : `${weightIn(mostReps.weight, unit)} ${unit}`;
        lines.push({
            label: 'Most reps',
            text: weight ? `${mostReps.reps} @ ${weight}` : String(mostReps.reps),
            spoken: weight ? `${reps(mostReps.reps)} at ${weight}` : reps(mostReps.reps),
            detail: '',
            ...mostReps,
        });
    }
    if (longest) {
        lines.push({
            label: 'Longest',
            text: formatDuration(longest.seconds),
            spoken: spokenDuration(longest.seconds),
            detail: '',
            ...longest,
        });
    }
    return lines;
}

/**
 * An exercise's week as Progress lists it (PRG-13), e.g. "120 reps · 12 sets", with its volume
 * where any set had a weight: "28 reps · 3 sets · 1,680 kg lifted".
 */
export interface WeekLine {
    text: string;
    /** e.g. "120 reps in 12 sets", or "28 reps in 3 sets, 1,680 kg lifted". */
    spoken: string;
    /** Its new bests, e.g. "Heaviest 100 kg × 5", with what's heard. */
    bests: { text: string; spoken: string }[];
}

export function describeWeek(week: ExerciseWeek, unit: WeightUnit, locale: string): WeekLine {
    const side = week.eachSide ? ' each side' : '';
    const shown: string[] = [];
    const heard: string[] = [];
    if (week.reps > 0) {
        shown.push(reps(week.reps) + side);
        heard.push(reps(week.reps) + side);
    }
    if (week.seconds > 0) {
        shown.push(formatDuration(week.seconds) + side);
        heard.push(spokenDuration(week.seconds) + side);
    }
    const sets = counted(week.sets, 'set');
    const lifted =
        week.volume > 0
            ? `${volumeIn(week.volume, unit).toLocaleString(locale)} ${unit} lifted`
            : '';
    return {
        text: [...shown, sets, ...(lifted ? [lifted] : [])].join(' · '),
        spoken: `${heard.join(' and ')} in ${sets}${lifted ? `, ${lifted}` : ''}`,
        bests: bestLines(week.bests, unit).map((line) => ({
            text: `${line.label} ${line.text}`,
            spoken: `New best, ${line.label.toLowerCase()}: ${line.spoken}`,
        })),
    };
}

/**
 * The one best a card shows (PRG-3), by what the exercise is measured by: the heaviest
 * weight, the most reps, or the longest. Empty with none.
 */
export function headlineBest(
    bests: ExerciseBests,
    measure: ProgressMeasure,
    unit: WeightUnit
): string {
    if (measure === 'weight' && bests.heaviest) {
        return `${weightIn(bests.heaviest.weight, unit)} ${unit}`;
    }
    if (measure === 'reps' && bests.mostReps) {
        return reps(bests.mostReps.reps);
    }
    if (measure === 'time' && bests.longest) {
        return formatDuration(bests.longest.seconds);
    }
    return '';
}

/** What the chart is of, as its title says it. */
export const MEASURE_TITLES: Record<ProgressMeasure, string> = {
    weight: 'Estimated one-rep max',
    reps: 'Most reps in a set',
    time: 'Longest set',
};

/** A chart value as shown, e.g. "92.5 kg", "20 reps" or "1:30", with what's heard. */
export function formatMeasure(
    value: number,
    measure: ProgressMeasure,
    unit: WeightUnit
): { text: string; spoken: string } {
    if (measure === 'time') {
        return { text: formatDuration(value), spoken: spokenDuration(value) };
    }
    const text = measure === 'weight' ? `${estimateIn(value, unit)} ${unit}` : reps(value);
    return { text, spoken: text };
}

/** A chart value on its axis, in the unit shown: e.g. 92.5 (kg), 20, or 90 (seconds). */
export function axisValue(value: number, measure: ProgressMeasure, unit: WeightUnit): number {
    return measure === 'weight' ? estimateIn(value, unit) : value;
}

function reps(count: number): string {
    return counted(count, 'rep');
}

/** How a workout's date reads: "18 Oct", with the year too unless it was this year. */
export function dateFormatFor(at: number, now = Date.now()): string {
    return new Date(at).getFullYear() === new Date(now).getFullYear() ? 'd MMM' : 'd MMM y';
}
