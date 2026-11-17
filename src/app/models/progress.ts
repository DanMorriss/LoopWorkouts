import { HistoryEntry, isTimedSet, LoggedSet, RepSet, TimedSet } from './history';
import { KETTLEBELL_TOP_REPS, topReps } from './kettlebell';
import { MAX_WEIGHT, WEIGHT_INCREASE, WeightUnit, weightIn, weightToKg } from './weight';
import {
    MAX_REPS,
    MAX_STEP_SECONDS,
    RepSetAmount,
    RepStep,
    Step,
    TimedSetAmount,
    TimedStep,
} from './workout';

/** How much longer a timed exercise goes next time, where every set ran its whole time. */
export const TIME_INCREASE = 5;

/** How far a workout got in its time limit: full rounds, then steps done of the next. */
export interface RoundsScore {
    rounds: number;
    steps: number;
}

/** A run's score, if it ran to its time limit; null otherwise, e.g. stopped before it. */
export function roundsScore(entry: HistoryEntry): RoundsScore | null {
    return entry.timeLimitSeconds !== undefined && entry.outcome === 'finished'
        ? { rounds: entry.roundsCompleted, steps: entry.stepsIntoRound ?? 0 }
        : null;
}

/** More than 0 when `a` got further than `b`: more rounds, or as many and more steps. */
export function compareScores(a: RoundsScore, b: RoundsScore): number {
    return a.rounds - b.rounds || a.steps - b.steps;
}

/**
 * Whether `entry` got further than every other run of the same workout to the same time
 * limit (PRG-7). Not the first run of it, when there's nothing to beat, and not a tie.
 */
export function isMostRounds(entry: HistoryEntry, history: readonly HistoryEntry[]): boolean {
    const score = roundsScore(entry);
    if (!score) {
        return false;
    }
    const earlier = history
        .filter(
            (other) =>
                other.id !== entry.id &&
                other.workoutId === entry.workoutId &&
                other.timeLimitSeconds === entry.timeLimitSeconds
        )
        .map(roundsScore)
        .filter((other) => other !== null);
    return earlier.length > 0 && earlier.every((other) => compareScores(score, other) > 0);
}

/** One workout's sets of one exercise (PRG-4's recent sessions, and a point on its chart). */
export interface ExerciseSession {
    /** The history entry it's from. */
    entryId: string;
    startedAt: number;
    /** The workout's title as it ran. */
    title: string;
    /** Its sets of the exercise, in the order they were done. */
    sets: LoggedSet[];
}

/**
 * Every exercise's sessions, newest first, from the history (newest first too). A workout
 * that did an exercise in two steps is one session of it.
 */
export function sessionsByExercise(
    history: readonly HistoryEntry[]
): Map<string, ExerciseSession[]> {
    const sessions = new Map<string, ExerciseSession[]>();
    for (const entry of history) {
        const byExercise = new Map<string, LoggedSet[]>();
        for (const set of entry.sets ?? []) {
            if (set.exerciseId !== undefined) {
                byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
            }
        }
        for (const [exerciseId, sets] of byExercise) {
            const session = {
                entryId: entry.id,
                startedAt: entry.startedAt,
                title: entry.title,
                sets,
            };
            sessions.set(exerciseId, [...(sessions.get(exerciseId) ?? []), session]);
        }
    }
    return sessions;
}

/**
 * What an exercise's progress is measured by: the best estimated one-rep max where any set
 * had a weight, otherwise the most reps in a set, otherwise (only timed sets) the longest.
 */
export type ProgressMeasure = 'weight' | 'reps' | 'time';

export function progressMeasure(sessions: readonly ExerciseSession[]): ProgressMeasure | null {
    const sets = sessions.flatMap((session) => session.sets);
    if (sets.some((set) => !isTimedSet(set) && set.weight !== undefined)) {
        return 'weight';
    }
    if (sets.some((set) => !isTimedSet(set))) {
        return 'reps';
    }
    return sets.length > 0 ? 'time' : null;
}

/**
 * The estimated one-rep max, in kg, by the Epley formula: weight × (1 + reps ÷ 30). One rep
 * is the weight itself.
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
    return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** A best, and when it was set. */
interface Best {
    /** When the workout it was in started. */
    at: number;
    entryId: string;
}

/** An exercise's personal bests (PRG-4). Each is missing where no set counts towards it. */
export interface ExerciseBests {
    /** The heaviest weight lifted for at least 1 rep, and the most reps done at it. */
    heaviest?: Best & { weight: number; reps: number };
    /** The best estimated one-rep max, in kg, and the set it came from. */
    oneRepMax?: Best & { estimate: number; weight: number; reps: number };
    /** The most reps in a set; of equals, the heaviest. Its weight is missing for none. */
    mostReps?: Best & { reps: number; weight?: number };
    /** The longest timed set, in seconds. */
    longest?: Best & { seconds: number };
}

/** The bests across every session. On a tie, the first time it was done stands. */
export function exerciseBests(sessions: readonly ExerciseSession[]): ExerciseBests {
    const bests: ExerciseBests = {};
    // Oldest first, so a later equal doesn't take the best's place
    for (const session of [...sessions].reverse()) {
        const when = { at: session.startedAt, entryId: session.entryId };
        for (const set of session.sets) {
            if (isTimedSet(set)) {
                if (set.seconds > (bests.longest?.seconds ?? 0)) {
                    bests.longest = { ...when, seconds: set.seconds };
                }
                continue;
            }
            const { reps, weight } = set;
            const most = bests.mostReps;
            if (
                !most ||
                reps > most.reps ||
                (reps === most.reps && (weight ?? 0) > (most.weight ?? 0))
            ) {
                bests.mostReps = { ...when, reps, ...(weight === undefined ? {} : { weight }) };
            }
            if (weight === undefined) {
                continue;
            }
            const heaviest = bests.heaviest;
            if (
                !heaviest ||
                weight > heaviest.weight ||
                (weight === heaviest.weight && reps > heaviest.reps)
            ) {
                bests.heaviest = { ...when, weight, reps };
            }
            const estimate = estimatedOneRepMax(weight, reps);
            if (estimate > (bests.oneRepMax?.estimate ?? 0)) {
                bests.oneRepMax = { ...when, estimate, weight, reps };
            }
        }
    }
    return bests;
}

/**
 * The bests that beat an earlier session, as the workout summary counts them (PRG-2): not one
 * from an exercise's first session, when everything would be a best, nor an equal, as the
 * first time stands. `sessions` are newest first.
 */
export function newBests(sessions: readonly ExerciseSession[]): ExerciseBests {
    const first = sessions.at(-1)?.entryId;
    return Object.fromEntries(
        Object.entries(exerciseBests(sessions)).filter(([, best]) => best.entryId !== first)
    );
}

/** An exercise's week (PRG-13): what was done of it in the last 7 days, and its new bests. */
export interface ExerciseWeek {
    exerciseId: string;
    /** Sets done; a left and a right make one. */
    sets: number;
    /** Reps done, on one side of an exercise done each side. 0 with only timed sets. */
    reps: number;
    /** Time held in timed sets, in seconds, on one side of one done each side. */
    seconds: number;
    /**
     * Volume: weight × reps over the sets with a weight, in kg, both sides together, as it's
     * the total lifted. 0 with none.
     */
    volume: number;
    /** Whether every set was one side of it, so the totals are each side's. */
    eachSide: boolean;
    /** The heaviest, most reps and longest it set this week that beat an earlier session. */
    bests: Omit<ExerciseBests, 'oneRepMax'>;
}

/**
 * Each exercise done in the 7 days from `from`, with its totals and new bests, from the
 * history (newest first). Each side's sets count apart, then the side that did more stands
 * for both, so "3 × 10 each side" is 3 sets of 30 reps, as is one ended before its last right.
 * Volume is both sides' together.
 */
export function exerciseWeeks(history: readonly HistoryEntry[], from: number): ExerciseWeek[] {
    const weeks: ExerciseWeek[] = [];
    for (const [exerciseId, sessions] of sessionsByExercise(history)) {
        const sets = sessions
            .filter((session) => session.startedAt >= from)
            .flatMap((session) => session.sets);
        if (sets.length === 0) {
            continue;
        }
        const tally = { none: totals(), left: totals(), right: totals() };
        let volume = 0;
        for (const set of sets) {
            const side = tally[set.side ?? 'none'];
            side.sets++;
            if (isTimedSet(set)) {
                side.seconds += set.seconds;
            } else {
                side.reps += set.reps;
                volume += (set.weight ?? 0) * set.reps;
            }
        }
        const sided = (key: keyof Totals) =>
            tally.none[key] + Math.max(tally.left[key], tally.right[key]);
        // Not the one-rep max: it's a guess, not something done
        const bests = newBests(sessions);
        delete bests.oneRepMax;
        weeks.push({
            exerciseId,
            sets: sided('sets'),
            reps: sided('reps'),
            seconds: sided('seconds'),
            volume,
            eachSide: tally.none.sets === 0,
            bests: Object.fromEntries(Object.entries(bests).filter(([, best]) => best.at >= from)),
        });
    }
    return weeks;
}

interface Totals {
    sets: number;
    reps: number;
    seconds: number;
}

function totals(): Totals {
    return { sets: 0, reps: 0, seconds: 0 };
}

/**
 * A session's point on the chart, as `measure` measures it: its best estimated one-rep max
 * in kg, its most reps in a set, or its longest set in seconds. Null if it has no set that
 * counts, e.g. a bodyweight session on a chart of weights.
 */
export function sessionValue(session: ExerciseSession, measure: ProgressMeasure): number | null {
    const values =
        measure === 'time'
            ? session.sets
                  .filter((set): set is TimedSet => isTimedSet(set))
                  .map((set) => set.seconds)
            : session.sets
                  .filter((set): set is RepSet => !isTimedSet(set))
                  .filter((set) => measure === 'reps' || set.weight !== undefined)
                  .map((set) =>
                      measure === 'reps' ? set.reps : estimatedOneRepMax(set.weight!, set.reps)
                  );
    return values.length > 0 ? Math.max(...values) : null;
}

/** The weight to try next (PRG-5), and the one it's from, in the unit shown. */
export interface WeightSuggestion {
    /** The heaviest weight of the last session. */
    last: number;
    /** One step up from it, or the same again. */
    next: number;
}

/**
 * The weight to try next on a rep step of `targetReps`, by double progression: where every
 * set at the last session's heaviest weight hit the reps, one step up (WEIGHT_INCREASE),
 * otherwise the same weight. Lighter sets, e.g. warm-ups, don't count. Null where the last
 * session had no weight.
 */
export function suggestedWeight(
    lastSets: readonly LoggedSet[],
    targetReps: number,
    unit: WeightUnit
): WeightSuggestion | null {
    const weighted = lastSets.filter(
        (set): set is RepSet & { weight: number } => !isTimedSet(set) && set.weight !== undefined
    );
    if (weighted.length === 0) {
        return null;
    }
    const heaviest = Math.max(...weighted.map((set) => set.weight));
    const last = weightIn(heaviest, unit);
    const hitEvery = weighted
        .filter((set) => set.weight === heaviest)
        .every((set) => set.reps >= targetReps);
    return {
        last,
        next: hitEvery ? Math.min(MAX_WEIGHT[unit], last + WEIGHT_INCREASE[unit]) : last,
    };
}

/**
 * Whether a rep step whose sets vary (BLD-11) can go up one weight step on each set (PRG-5),
 * from `lastSets`, its exercise's sets last time: each set of the step judged against its
 * own reps, by the same set last time (both sides). Every set with a weight has to have been
 * done at it last time and got its reps, and so has every other set done; so it's false where
 * any set fell short, none has a weight, or a weight's been changed since. There's no step up
 * of some sets and not others, which would change the shape the user built.
 */
export function canStepUpEachSet(
    lastSets: readonly LoggedSet[],
    step: RepStep,
    unit: WeightUnit
): boolean {
    const sets = step.sets;
    if (!sets || !sets.some((set) => set.weight !== undefined && !atMostWeight(set, unit))) {
        return false;
    }
    const repSets = lastSets.filter((set): set is RepSet => !isTimedSet(set));
    return sets.every((target, i) => {
        const last = repSets.filter((set) => (set.set ?? 0) === i);
        if (target.weight === undefined) {
            return last.every((set) => set.reps >= target.reps);
        }
        const weight = weightIn(target.weight, unit);
        return (
            last.length > 0 &&
            last.every(
                (set) =>
                    set.weight !== undefined &&
                    weightIn(set.weight, unit) === weight &&
                    set.reps >= target.reps
            )
        );
    });
}

/**
 * A set one weight step up (WEIGHT_INCREASE) as `unit` shows it, up to the most there is;
 * one with no weight stays as it is.
 */
export function steppedUp(amount: RepSetAmount, unit: WeightUnit): RepSetAmount {
    if (amount.weight === undefined) {
        return amount;
    }
    const next = Math.min(MAX_WEIGHT[unit], weightIn(amount.weight, unit) + WEIGHT_INCREASE[unit]);
    return { ...amount, weight: weightToKg(next, unit) };
}

/**
 * A timed exercise TIME_INCREASE seconds longer, on each set where its sets vary (BLD-11), so
 * the shape stays: a Next time step-up of time, applied.
 */
export function withLongerTime(step: TimedStep): TimedStep {
    const seconds = step.seconds + TIME_INCREASE;
    return step.sets
        ? {
              ...step,
              seconds,
              sets: step.sets.map((set) => ({ seconds: set.seconds + TIME_INCREASE })),
          }
        : { ...step, seconds };
}

function atMostWeight(amount: RepSetAmount, unit: WeightUnit): boolean {
    return amount.weight !== undefined && weightIn(amount.weight, unit) >= MAX_WEIGHT[unit];
}

/**
 * A step up to try next time, from how a rep step or timed exercise went this time (on the
 * workout summary).
 */
export interface ProgressionSuggestion {
    /** Which step of the round it's for, from 0. */
    step: number;
    /** A heavier weight, one more rep (with no weight), or longer (a timed exercise). */
    kind: 'weight' | 'reps' | 'time';
    /**
     * The weight (in the unit shown), reps or seconds it's from, and the one to try. For a
     * step whose sets vary, set 1's, and every set goes up by as much.
     */
    from: number;
    to: number;
    /** A step whose sets vary (BLD-11): the step up is for each set, so the shape stays. */
    eachSet?: true;
}

/**
 * What to step up next time, a step at a time, from this run's `sets` of `steps`: where every
 * set got the step's reps, one weight step up (as `suggestedWeight()` does), or one more rep
 * for a step with no weight; where every set of a timed exercise ran its whole time,
 * TIME_INCREASE seconds more. Nothing for a step that missed its reps, had a set skipped
 * part-way, or is at the top. A step of `kettlebell` (PRG-14, by `kettlebellSteps()`) goes up
 * a rep, with a weight or not, up to KETTLEBELL_TOP_REPS, where `readyForHeavierKettlebell()`
 * takes over.
 */
export function progressionSuggestions(
    sets: readonly LoggedSet[],
    steps: readonly Step[],
    unit: WeightUnit,
    kettlebell: ReadonlySet<number> = new Set()
): ProgressionSuggestion[] {
    const { byStep, timedByStep } = setsByStep(sets);
    const suggestions: ProgressionSuggestion[] = [];
    for (const [index, stepSets] of timedByStep) {
        const step = steps[index];
        const suggestion = step?.kind === 'work' && timeSuggestion(index, step, stepSets);
        if (suggestion) {
            suggestions.push(suggestion);
        }
    }
    for (const [index, stepSets] of byStep) {
        const step = steps[index];
        if (step?.kind !== 'reps') {
            continue;
        }
        if (kettlebell.has(index)) {
            const suggestion = kettlebellSuggestion(index, step, stepSets);
            if (suggestion) {
                suggestions.push(suggestion);
            }
            continue;
        }
        if (step.sets) {
            const suggestion = eachSetSuggestion(index, step, step.sets, stepSets, unit);
            if (suggestion) {
                suggestions.push(suggestion);
            }
            continue;
        }
        const weight = suggestedWeight(stepSets, step.reps, unit);
        if (weight) {
            if (weight.next > weight.last) {
                suggestions.push({
                    step: index,
                    kind: 'weight',
                    from: weight.last,
                    to: weight.next,
                });
            }
        } else if (step.reps < MAX_REPS && gotEveryRep(step, stepSets)) {
            suggestions.push({ step: index, kind: 'reps', from: step.reps, to: step.reps + 1 });
        }
    }
    return suggestions.sort((a, b) => a.step - b.step);
}

/**
 * The kettlebell steps (PRG-14) where every set got its reps, and at KETTLEBELL_TOP_REPS or
 * more (in any set, where they vary): time for a heavier kettlebell, said on the summary
 * rather than a step up. By their place in `steps`, in order.
 */
export function readyForHeavierKettlebell(
    sets: readonly LoggedSet[],
    steps: readonly Step[],
    kettlebell: ReadonlySet<number>
): number[] {
    return [...setsByStep(sets).byStep]
        .filter(([index, stepSets]) => {
            const step = steps[index];
            return (
                kettlebell.has(index) &&
                step?.kind === 'reps' &&
                topReps(step) >= KETTLEBELL_TOP_REPS &&
                gotEveryRep(step, stepSets)
            );
        })
        .map(([index]) => index)
        .sort((a, b) => a - b);
}

/** A run's rep sets and timed sets, by the step they're of. */
function setsByStep(sets: readonly LoggedSet[]) {
    const byStep = new Map<number, RepSet[]>();
    const timedByStep = new Map<number, TimedSet[]>();
    for (const set of sets) {
        if (isTimedSet(set)) {
            timedByStep.set(set.step, [...(timedByStep.get(set.step) ?? []), set]);
        } else {
            byStep.set(set.step, [...(byStep.get(set.step) ?? []), set]);
        }
    }
    return { byStep, timedByStep };
}

/** Whether every set (both sides) got its reps: the step's, or its own where they vary. */
function gotEveryRep(step: RepStep, stepSets: readonly RepSet[]): boolean {
    const amounts = step.sets ?? [{ reps: step.reps }];
    return stepSets.every((set) => set.reps >= (amounts[set.set ?? 0] ?? amounts[0]).reps);
}

/**
 * Next time's step up for a kettlebell step (PRG-14), where every set got its reps: one more
 * rep, on each set where they vary, whatever the weight, while it stays within
 * KETTLEBELL_TOP_REPS. Null where any fell short, or it's there.
 */
function kettlebellSuggestion(
    index: number,
    step: RepStep,
    stepSets: readonly RepSet[]
): ProgressionSuggestion | null {
    if (topReps(step) >= KETTLEBELL_TOP_REPS || !gotEveryRep(step, stepSets)) {
        return null;
    }
    return {
        step: index,
        kind: 'reps',
        from: step.reps,
        to: step.reps + 1,
        ...(step.sets ? { eachSet: true as const } : {}),
    };
}

/**
 * Next time's step up for a timed exercise, where every set (both sides) ran its whole time:
 * TIME_INCREASE seconds more, on each set where its sets vary (BLD-11), so the shape stays.
 * Null where any was skipped part-way (RUN-12), or it would go past the longest a step can be.
 */
function timeSuggestion(
    index: number,
    step: TimedStep,
    stepSets: readonly TimedSet[]
): ProgressionSuggestion | null {
    const amounts: readonly TimedSetAmount[] = step.sets ?? [{ seconds: step.seconds }];
    const ranAll = stepSets.every(
        (set) => set.seconds >= (amounts[set.set ?? 0] ?? amounts[0]).seconds
    );
    if (!ranAll || amounts.some((amount) => amount.seconds + TIME_INCREASE > MAX_STEP_SECONDS)) {
        return null;
    }
    return {
        step: index,
        kind: 'time',
        from: step.seconds,
        to: step.seconds + TIME_INCREASE,
        ...(step.sets ? { eachSet: true as const } : {}),
    };
}

/**
 * Next time's step up for a step whose sets vary (BLD-11), where every set (both sides) got
 * its own reps: a weight step on each set with a weight, or, with none, a rep on each. Null
 * where any fell short, or it's at the top.
 */
function eachSetSuggestion(
    index: number,
    step: RepStep,
    sets: readonly RepSetAmount[],
    stepSets: readonly RepSet[],
    unit: WeightUnit
): ProgressionSuggestion | null {
    if (!gotEveryRep(step, stepSets)) {
        return null;
    }
    const [first] = sets;
    if (sets.some((set) => set.weight !== undefined)) {
        if (sets.every((set) => set.weight === undefined || atMostWeight(set, unit))) {
            return null;
        }
        // Said by how much each set goes up, so set 1's numbers are only a way to say it
        const from = first.weight === undefined ? 0 : weightIn(first.weight, unit);
        return {
            step: index,
            kind: 'weight',
            from,
            to: from + WEIGHT_INCREASE[unit],
            eachSet: true,
        };
    }
    return sets.every((set) => set.reps < MAX_REPS)
        ? { step: index, kind: 'reps', from: first.reps, to: first.reps + 1, eachSet: true }
        : null;
}
