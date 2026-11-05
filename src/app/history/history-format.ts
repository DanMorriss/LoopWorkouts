import { HistoryEntry, isTimedSet, LoggedSet, RepSet, TimedSet } from '../models/history';
import { roundsScore, RoundsScore } from '../models/progress';
import { WeightUnit, weightIn } from '../models/weight';
import { PlacedHeading, PlacedSuperset } from '../models/workout';
import { counted } from '../shared/format-count';

/** e.g. 75 → "1:15", 3725 → "1:02:05" */
export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/**
 * e.g. "3 rounds", "2 of 5 rounds · stopped", "12 rounds · until stopped"; with a time limit,
 * "7 rounds + 3 in 20:00", or "4 rounds · stopped before 20:00"
 */
export function describeRounds(entry: HistoryEntry): string {
    const rounds = (n: number) => counted(n, 'round');
    if (entry.timeLimitSeconds !== undefined) {
        const limit = formatDuration(entry.timeLimitSeconds);
        const score = roundsScore(entry);
        return score
            ? `${describeScore(score)} in ${limit}`
            : `${rounds(entry.roundsCompleted)} · stopped before ${limit}`;
    }
    if (entry.totalRounds === 0) {
        return `${rounds(entry.roundsCompleted)} · until stopped`;
    }
    if (entry.outcome === 'stopped') {
        return `${entry.roundsCompleted} of ${rounds(entry.totalRounds)} · stopped`;
    }
    return rounds(entry.roundsCompleted);
}

/** e.g. "7 rounds + 3": full rounds, and the steps done of the next, if any. */
export function describeScore({ rounds, steps }: RoundsScore): string {
    const full = counted(rounds, 'round');
    return steps > 0 ? `${full} + ${steps}` : full;
}

/** The workout's title as it ran, or "Untitled workout". */
export function entryName(entry: HistoryEntry): string {
    return entry.title.trim() || 'Untitled workout';
}

/** One step's sets, summed up: e.g. "3 × 10 @ 60 kg", with what screen readers say. */
export interface SetsSummary {
    /** The step's name, or "Reps". */
    name: string;
    text: string;
    spoken: string;
    /** The exercise it was, as its last set was linked. Missing for an unnamed step. */
    exerciseId?: string;
    /** Which step of the workout it was, as its sets have it. */
    step: number;
}

/**
 * A workout's sets, one line per step, in the order the steps first came:
 *
 * - "3 × 10 @ 60 kg": the same reps and weight every set
 * - "10, 10, 8 @ 60 kg": the reps changed, the weight didn't
 * - "10 @ 60, 8 @ 62.5 kg": the weight changed
 * - "3 × 20": no weight
 * - "3 × 0:45": a timed step, e.g. a plank
 *
 * Each line is named as its last set was, unless `currentName` gives a name for its
 * exercise, e.g. an exercise of your own renamed since (EXR-3).
 */
export function describeSets(
    sets: readonly LoggedSet[],
    unit: WeightUnit,
    currentName: (exerciseId: string) => string | undefined = () => undefined
): SetsSummary[] {
    const byStep = new Map<number, LoggedSet[]>();
    for (const set of sets) {
        byStep.set(set.step, [...(byStep.get(set.step) ?? []), set]);
    }
    return Array.from(byStep.values(), (stepSets) => {
        const last = stepSets.at(-1)!;
        const name = (last.exerciseId && currentName(last.exerciseId)) || last.name;
        const link = last.exerciseId === undefined ? {} : { exerciseId: last.exerciseId };
        const timed = stepSets.some((set) => isTimedSet(set));
        return {
            name: name || (timed ? 'Work' : 'Reps'),
            step: last.step,
            ...link,
            ...describeSides(stepSets, unit),
        };
    });
}

/** Lines of sets under one of the workout's headings, or none for those before the first. */
export interface SetsSection<Line extends Pick<SetsSummary, 'step'> = SetsSummary> {
    heading: string | null;
    lines: Line[];
    /**
     * Its lines as they show: each on its own, or with the others of its superset or giant set
     * under its name (BLD-12).
     */
    items: SetsItem<Line>[];
}

/** One line on its own (`superset` null), or a superset's lines under its name. */
export interface SetsItem<Line extends Pick<SetsSummary, 'step'> = SetsSummary> {
    superset: 'Superset' | 'Giant set' | null;
    lines: Line[];
}

/**
 * Lines of sets grouped under the headings the workout had when it ran (BLD-13), in order:
 * each under the last heading before its step. Lines before the first heading come first,
 * under none, and a heading with no lines under it isn't there. With no headings, it's one
 * section of every line. Within each, the lines of a superset or giant set (BLD-12) go
 * together under its name, where two or more of its steps have sets.
 */
export function sectionsOf<Line extends Pick<SetsSummary, 'step'>>(
    lines: readonly Line[],
    headings: readonly PlacedHeading[] = [],
    supersets: readonly PlacedSuperset[] = []
): SetsSection<Line>[] {
    const sections: (Omit<SetsSection<Line>, 'items'> & { under: number })[] = [];
    for (const line of lines) {
        // Which heading it's under, by its place, as two headings can say the same thing
        let under = -1;
        headings.forEach((placed, i) => {
            if (placed.step <= line.step) {
                under = i;
            }
        });
        const last = sections.at(-1);
        if (last && last.under === under) {
            last.lines.push(line);
        } else {
            sections.push({ heading: headings[under]?.text ?? null, under, lines: [line] });
        }
    }
    return sections.map(({ heading, lines }) => ({
        heading,
        lines,
        items: itemsOf(lines, supersets),
    }));
}

function itemsOf<Line extends Pick<SetsSummary, 'step'>>(
    lines: readonly Line[],
    supersets: readonly PlacedSuperset[]
): SetsItem<Line>[] {
    const runs: { of: PlacedSuperset | undefined; lines: Line[] }[] = [];
    for (const line of lines) {
        const of = supersets.find(
            ({ step, steps }) => step <= line.step && line.step < step + steps
        );
        const last = runs.at(-1);
        if (of && last?.of === of) {
            last.lines.push(line);
        } else {
            runs.push({ of, lines: [line] });
        }
    }
    // A superset with sets on only one of its steps reads as that step alone
    return runs.map(
        ({ of, lines }): SetsItem<Line> =>
            of && lines.length > 1
                ? { superset: of.kind === 'giant set' ? 'Giant set' : 'Superset', lines }
                : { superset: null, lines }
    );
}

/**
 * A step's sets, with its sides (BLD-10): "2 × 10 each side" when they match, or
 * "left 10, 8 · right 10, 10" when they don't. A step not done each side is as it always was.
 */
function describeSides(
    sets: readonly LoggedSet[],
    unit: WeightUnit
): Pick<SetsSummary, 'text' | 'spoken'> {
    if (!sets.some((set) => set.side)) {
        return describeAmounts(sets, unit);
    }
    const [left, right] = (['left', 'right'] as const).map((side) => {
        const sideSets = sets.filter((set) => set.side === side);
        return sideSets.length > 0 ? describeAmounts(sideSets, unit) : null;
    });
    if (left && right && left.text === right.text) {
        return { text: `${left.text} each side`, spoken: `${left.spoken} each side` };
    }
    const parts: { side: string; amounts: Pick<SetsSummary, 'text' | 'spoken'> }[] = [];
    if (left) {
        parts.push({ side: 'left', amounts: left });
    }
    if (right) {
        parts.push({ side: 'right', amounts: right });
    }
    return {
        text: parts.map(({ side, amounts }) => `${side} ${amounts.text}`).join(' · '),
        spoken: parts.map(({ side, amounts }) => `${side}, ${amounts.spoken}`).join('; '),
    };
}

/** Sets of one step (or one side of it) summed up, as described for `describeSets()`. */
function describeAmounts(
    sets: readonly LoggedSet[],
    unit: WeightUnit
): Pick<SetsSummary, 'text' | 'spoken'> {
    const repSets = sets.filter((set): set is RepSet => !isTimedSet(set));
    if (repSets.length < sets.length) {
        return describeTimes(sets.filter((set) => isTimedSet(set)));
    }
    const weights = repSets.map((set) => (set.weight ? weightIn(set.weight, unit) : 0));
    const reps = repSets.map((set) => set.reps);
    const sameWeight = weights.every((w) => w === weights[0]);
    const sameReps = reps.every((r) => r === reps[0]);
    return {
        text: sameWeight
            ? `${repsText(reps, sameReps)}${weights[0] ? ` @ ${weights[0]} ${unit}` : ''}`
            : `${repSets.map((_, i) => setText(reps[i], weights[i])).join(', ')} ${unit}`,
        spoken: sameWeight
            ? `${spokenReps(reps, sameReps)}${weights[0] ? ` at ${weights[0]} ${unit}` : ''}`
            : repSets
                  .map((_, i) => `${reps[i]} reps${weights[i] ? ` at ${weights[i]} ${unit}` : ''}`)
                  .join(', '),
    };
}

// A timed step's sets: e.g. "3 × 0:45", "0:45, 0:30", or "0:45" for one
function describeTimes(sets: readonly TimedSet[]): Pick<SetsSummary, 'text' | 'spoken'> {
    const seconds = sets.map((set) => set.seconds);
    if (seconds.length === 1) {
        return { text: formatDuration(seconds[0]), spoken: spokenDuration(seconds[0]) };
    }
    if (seconds.every((s) => s === seconds[0])) {
        return {
            text: `${seconds.length} × ${formatDuration(seconds[0])}`,
            spoken: `${seconds.length} sets of ${spokenDuration(seconds[0])}`,
        };
    }
    return {
        text: seconds.map(formatDuration).join(', '),
        spoken: `sets of ${seconds.map(spokenDuration).join(', ')}`,
    };
}

/** e.g. 45 → "45 seconds", 90 → "1 minute 30 seconds", 120 → "2 minutes" */
export function spokenDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) {
        return counted(s, 'second');
    }
    return s === 0 ? counted(m, 'minute') : `${counted(m, 'minute')} ${counted(s, 'second')}`;
}

// e.g. "3 × 10", "10, 10, 8" or just "10 reps" for one set
function repsText(reps: number[], same: boolean): string {
    if (reps.length === 1) {
        return `${reps[0]} reps`;
    }
    return same ? `${reps.length} × ${reps[0]}` : reps.join(', ');
}

function spokenReps(reps: number[], same: boolean): string {
    if (reps.length === 1) {
        return `${reps[0]} reps`;
    }
    return same ? `${reps.length} sets of ${reps[0]} reps` : `sets of ${reps.join(', ')} reps`;
}

// One set where the weight changed, e.g. "10 @ 60", or "10" with none
function setText(reps: number, weight: number): string {
    return weight ? `${reps} @ ${weight}` : String(reps);
}
