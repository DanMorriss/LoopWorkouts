import { describeSets, formatDuration, markText, spokenDuration } from '../history/history-format';
import {
    exerciseBests,
    ExerciseBests,
    ExerciseSession,
    ExerciseWeek,
    progressMeasure,
    ProgressMeasure,
} from '../models/progress';
import { volumeIn, WeightUnit, weightIn } from '../models/weight';
import { counted } from '../shared/format-count';

/**
 * One personal best as the exercise page lists it, written as a top set is across the app:
 * e.g. "Heaviest: 80 kg × 3", "Most reps: 60 kg × 12".
 */
export interface BestLine {
    /** Which best it is: the heaviest (and the most reps, where they're one set) or the rest. */
    kind: keyof ExerciseBests;
    label: string;
    text: string;
    /** What screen readers hear in place of `text`, where it differs. */
    spoken: string;
    /** When it was set, and the history entry it's from. */
    at: number;
    entryId: string;
}

type Shown = { text: string; spoken: string };

/** One best's figures, e.g. "80 kg × 3", heard as "80 kg for 3 reps". */
function bestFigures(
    kind: keyof ExerciseBests,
    bests: ExerciseBests,
    unit: WeightUnit
): Shown | null {
    if (kind === 'longest') {
        const { longest } = bests;
        return longest
            ? { text: formatDuration(longest.seconds), spoken: spokenDuration(longest.seconds) }
            : null;
    }
    const best = bests[kind];
    if (!best) {
        return null;
    }
    const weight = best.weight === undefined ? '' : `${weightIn(best.weight, unit)} ${unit}`;
    return {
        text: markText(best, unit),
        spoken: !weight
            ? reps(best.reps)
            : kind === 'heaviest'
              ? `${weight} for ${reps(best.reps)}`
              : `${reps(best.reps)} at ${weight}`,
    };
}

/** The bests there are, in the order the page lists them. */
export function bestLines(bests: ExerciseBests, unit: WeightUnit): BestLine[] {
    const { heaviest, mostReps } = bests;
    // One tile where they're the same set, as with one kettlebell, always the same
    const same = heaviest?.weight === mostReps?.weight && heaviest?.reps === mostReps?.reps;
    const labels: [keyof ExerciseBests, string][] = [
        ['heaviest', same ? 'Heaviest and most reps' : 'Heaviest'],
        ...(same ? [] : [['mostReps', 'Most reps'] as [keyof ExerciseBests, string]]),
        ['longest', 'Longest'],
    ];
    return labels.flatMap(([kind, label]) => {
        const best = bests[kind];
        const figures = bestFigures(kind, bests, unit);
        return best && figures
            ? [{ kind, label, ...figures, at: best.at, entryId: best.entryId }]
            : [];
    });
}

/**
 * An exercise's week as Progress lists it (PRG-13), its sets drawn beside it rather than
 * written: "120 reps", the time held for a timed one ("1:45"), and its volume where any set had
 * a weight: "28 reps · 1,680 kg".
 */
export interface WeekLine {
    text: string;
    /** With its sets, which are only drawn: "28 reps in 3 sets, 1,680 kg lifted". */
    spoken: string;
    /** Its new bests, e.g. "Heaviest" and "100 kg × 5", with what's heard. */
    bests: WeekBest[];
}

/**
 * A new best, e.g. "Heaviest" and "100 kg × 5", with what it beat, "up from 95 kg × 5", heard
 * as "New best, heaviest: 100 kg for 5 reps, up from 95 kg for 5 reps".
 */
export interface WeekBest {
    label: string;
    text: string;
    /** "up from 95 kg × 5", or empty where there was nothing to beat. */
    was: string;
    spoken: string;
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
    const volume =
        week.volume > 0 ? `${volumeIn(week.volume, unit).toLocaleString(locale)} ${unit}` : '';
    const sets = counted(week.sets, 'set');
    return {
        text: [...shown, ...(volume ? [volume] : [])].join(' · '),
        spoken: `${heard.join(' and ')} in ${sets}${volume ? `, ${volume} lifted` : ''}`,
        bests: bestLines(week.bests, unit).map((line) => {
            const was = bestFigures(line.kind, week.beaten, unit);
            return {
                label: line.label,
                text: line.text,
                was: was ? `up from ${was.text}` : '',
                spoken: `New best, ${line.label.toLowerCase()}: ${line.spoken}${was ? `, up from ${was.spoken}` : ''}`,
            };
        }),
    };
}

/**
 * The one best a card shows (PRG-3), by what the exercise is measured by: the heaviest
 * weight, the most reps (at its weight, if any), or the longest. Empty with none.
 */
function headlineBest(bests: ExerciseBests, measure: ProgressMeasure, unit: WeightUnit): string {
    if (measure === 'weight' && bests.heaviest) {
        return `${weightIn(bests.heaviest.weight, unit)} ${unit}`;
    }
    // At the weight it was done at, where it had one: one kettlebell's "16 kg × 15"
    if (measure === 'reps' && bests.mostReps) {
        return markText(bests.mostReps, unit);
    }
    if (measure === 'time' && bests.longest) {
        return formatDuration(bests.longest.seconds);
    }
    return '';
}

/** e.g. latest "3 × 10 @ 60 kg" on 18 October, best "80 kg". */
export interface LatestAndBest {
    latest: string;
    latestSpoken: string;
    latestAt: number;
    /** The date with its year, unless it was this year. */
    dateFormat: string;
    best: string;
}

/**
 * An exercise's latest session's sets, as in the history, and its headline best, as its card
 * on the list (PRG-3) and the top of its page show them. `sessions` are newest first, at least
 * one.
 */
export function latestAndBest(
    sessions: readonly ExerciseSession[],
    unit: WeightUnit
): LatestAndBest {
    const latest = sessions[0];
    const lines = describeSets(latest.sets, unit);
    return {
        latest: lines.map((line) => line.text).join(' + '),
        latestSpoken: lines.map((line) => line.spoken).join(', then '),
        latestAt: latest.startedAt,
        dateFormat: dateFormatFor(latest.startedAt),
        best: headlineBest(exerciseBests(sessions), progressMeasure(sessions)!, unit),
    };
}

/** What the chart is of, as its title says it. */
export const MEASURE_TITLES: Record<ProgressMeasure, string> = {
    weight: 'Heaviest weight',
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
    const text = measure === 'weight' ? `${weightIn(value, unit)} ${unit}` : reps(value);
    return { text, spoken: text };
}

/** A chart value on its axis, in the unit shown: e.g. 92.5 (kg), 20, or 90 (seconds). */
export function axisValue(value: number, measure: ProgressMeasure, unit: WeightUnit): number {
    return measure === 'weight' ? weightIn(value, unit) : value;
}

function reps(count: number): string {
    return counted(count, 'rep');
}

/** How a workout's date reads: "18 Oct", with the year too unless it was this year. */
export function dateFormatFor(at: number, now = Date.now()): string {
    return new Date(at).getFullYear() === new Date(now).getFullYear() ? 'd MMM' : 'd MMM y';
}
