import { HistoryEntry, LoggedSet } from './history';
import { RepStep, Step, withEachRepSet, withRepSet } from './workout';
import {
    canStepUpEachSet,
    compareScores,
    estimatedOneRepMax,
    exerciseBests,
    ExerciseSession,
    exerciseWeeks,
    newBests,
    isMostRounds,
    progressionSuggestions,
    progressMeasure,
    sessionsByExercise,
    sessionValue,
    steppedUp,
    suggestedWeight,
} from './progress';

const squat = (reps: number, weight?: number, round = 0): LoggedSet => ({
    round,
    step: 0,
    name: 'Squats',
    reps,
    ...(weight === undefined ? {} : { weight }),
    exerciseId: 'squat',
});
const plank = (seconds: number, round = 0): LoggedSet => ({
    round,
    step: 1,
    name: 'Plank',
    seconds,
    exerciseId: 'plank',
});

function entry(startedAt: number, sets: LoggedSet[], title = 'Legs'): HistoryEntry {
    return {
        id: `${startedAt}-w`,
        workoutId: 'w',
        title,
        startedAt,
        endedAt: startedAt + 1000,
        updatedAt: startedAt + 1000,
        activeSeconds: 60,
        roundsCompleted: 1,
        totalRounds: 1,
        outcome: 'finished',
        sets,
    };
}

function session(startedAt: number, sets: LoggedSet[]): ExerciseSession {
    return { entryId: `${startedAt}-w`, startedAt, title: 'Legs', sets };
}

describe('most rounds in a time limit', () => {
    const run = (startedAt: number, rounds: number, steps: number, overrides = {}) => ({
        ...entry(startedAt, []),
        totalRounds: 0,
        timeLimitSeconds: 1200,
        roundsCompleted: rounds,
        stepsIntoRound: steps,
        ...overrides,
    });

    it('compares by rounds, then by steps into the next', () => {
        expect(compareScores({ rounds: 7, steps: 0 }, { rounds: 6, steps: 5 })).toBeGreaterThan(0);
        expect(compareScores({ rounds: 7, steps: 2 }, { rounds: 7, steps: 3 })).toBeLessThan(0);
    });

    it('is a best only when it beats every other run of the same workout and limit', () => {
        const today = run(3, 7, 3);
        expect(isMostRounds(today, [today, run(2, 7, 1), run(1, 6, 4)])).toBe(true);
        // A tie isn't a best, and nor is the first time
        expect(isMostRounds(today, [today, run(2, 7, 3)])).toBe(false);
        expect(isMostRounds(today, [today])).toBe(false);
        // Other limits, other workouts and runs stopped early don't count
        expect(isMostRounds(today, [today, run(2, 9, 0, { timeLimitSeconds: 600 })])).toBe(false);
        expect(isMostRounds(today, [today, run(2, 9, 0, { workoutId: 'other' })])).toBe(false);
        expect(isMostRounds(today, [today, run(2, 9, 0, { outcome: 'stopped' })])).toBe(false);
        expect(
            isMostRounds(today, [today, run(2, 9, 0, { outcome: 'stopped' }), run(1, 5, 0)])
        ).toBe(true);
    });
});

describe('progress', () => {
    describe('sessionsByExercise', () => {
        it("gathers each exercise's sets per workout, newest first", () => {
            const history = [
                entry(2000, [squat(8, 60), plank(45), squat(8, 60, 1)]),
                entry(1000, [squat(10, 50)]),
            ];

            const sessions = sessionsByExercise(history);

            expect(sessions.get('squat')).toEqual([
                session(2000, [squat(8, 60), squat(8, 60, 1)]),
                session(1000, [squat(10, 50)]),
            ]);
            expect(sessions.get('plank')).toEqual([session(2000, [plank(45)])]);
        });

        it('leaves out sets with no exercise', () => {
            const { exerciseId: _id, ...unnamed } = squat(10) as LoggedSet & { exerciseId: string };

            expect(sessionsByExercise([entry(1000, [unnamed])]).size).toBe(0);
        });
    });

    it('measures by weight where any set had one, then reps, then time', () => {
        expect(progressMeasure([session(1, [squat(10), squat(5, 20)])])).toBe('weight');
        expect(progressMeasure([session(1, [squat(10)])])).toBe('reps');
        expect(progressMeasure([session(1, [plank(30)])])).toBe('time');
        expect(progressMeasure([])).toBeNull();
    });

    it('estimates a one-rep max by the Epley formula, with one rep as the weight itself', () => {
        expect(estimatedOneRepMax(60, 10)).toBe(80);
        expect(estimatedOneRepMax(100, 1)).toBe(100);
    });

    describe('exerciseBests', () => {
        it('finds the heaviest, the best estimate and the most reps', () => {
            const bests = exerciseBests([
                session(3000, [squat(3, 100)]),
                session(2000, [squat(12, 60), squat(12, 40)]),
                session(1000, [squat(8, 90)]),
            ]);

            expect(bests.heaviest).toEqual({ at: 3000, entryId: '3000-w', weight: 100, reps: 3 });
            // 90 × (1 + 8/30) = 114, more than 100 × 1.1 = 110
            expect(bests.oneRepMax).toMatchObject({ at: 1000, weight: 90, reps: 8 });
            expect(bests.oneRepMax!.estimate).toBeCloseTo(114);
            expect(bests.mostReps).toEqual({ at: 2000, entryId: '2000-w', reps: 12, weight: 60 });
            expect(bests.longest).toBeUndefined();
        });

        it('keeps the first time a best was set, when it was matched later', () => {
            const bests = exerciseBests([
                session(2000, [squat(5, 80)]),
                session(1000, [squat(5, 80)]),
            ]);

            expect(bests.heaviest?.at).toBe(1000);
            expect(bests.mostReps?.at).toBe(1000);
        });

        it('counts more reps at the heaviest weight as heavier', () => {
            const bests = exerciseBests([session(1000, [squat(3, 80), squat(5, 80)])]);

            expect(bests.heaviest).toMatchObject({ weight: 80, reps: 5 });
        });

        it('has only most reps for a bodyweight exercise, and the longest for a timed one', () => {
            expect(exerciseBests([session(1000, [squat(20)])])).toEqual({
                mostReps: { at: 1000, entryId: '1000-w', reps: 20 },
            });
            expect(exerciseBests([session(1000, [plank(45), plank(60, 1)])])).toEqual({
                longest: { at: 1000, entryId: '1000-w', seconds: 60 },
            });
        });
    });

    it("gives a session's point by the measure: best estimate, most reps or longest", () => {
        const sets = session(1000, [squat(10, 60), squat(3, 70), squat(15)]);

        expect(sessionValue(sets, 'weight')).toBe(80);
        expect(sessionValue(sets, 'reps')).toBe(15);
        expect(sessionValue(sets, 'time')).toBeNull();
        expect(sessionValue(session(1000, [squat(15)]), 'weight')).toBeNull();
        expect(sessionValue(session(1000, [plank(30), plank(40)]), 'time')).toBe(40);
    });
});

describe('suggested weight (PRG-5)', () => {
    it('goes up a step when every set hit the reps, and stays put when one fell short', () => {
        expect(suggestedWeight([squat(10, 60), squat(10, 60), squat(10, 60)], 10, 'kg')).toEqual({
            last: 60,
            next: 62.5,
        });
        expect(suggestedWeight([squat(10, 60), squat(10, 60), squat(8, 60)], 10, 'kg')).toEqual({
            last: 60,
            next: 60,
        });
    });

    it('counts more reps than asked for as hitting them', () => {
        expect(suggestedWeight([squat(12, 60)], 10, 'kg')?.next).toBe(62.5);
    });

    it('goes by the heaviest sets only, so lighter warm-ups short of the reps do not count', () => {
        expect(suggestedWeight([squat(5, 40), squat(10, 60), squat(10, 60)], 10, 'kg')).toEqual({
            last: 60,
            next: 62.5,
        });
    });

    it('goes up 5 lb in lb', () => {
        expect(suggestedWeight([squat(10, 100)], 10, 'lb')).toEqual({ last: 220.5, next: 225.5 });
    });

    it('stops at the top of the wheel', () => {
        expect(suggestedWeight([squat(10, 300)], 10, 'kg')).toEqual({ last: 300, next: 300 });
    });

    it('has nothing to suggest without a weight last time', () => {
        expect(suggestedWeight([squat(10)], 10, 'kg')).toBeNull();
        expect(suggestedWeight([plank(60)], 10, 'kg')).toBeNull();
        expect(suggestedWeight([], 10, 'kg')).toBeNull();
    });
});

describe('next time on the workout summary', () => {
    const squats: Step = { kind: 'reps', reps: 10, name: 'Squats', exerciseId: 'squat' };
    const plankStep: Step = { kind: 'work', seconds: 60, name: 'Plank', exerciseId: 'plank' };
    const pushUps = (reps: number, round = 0): LoggedSet => ({
        round,
        step: 2,
        name: 'Push-ups',
        reps,
        exerciseId: 'push-up',
    });
    const pushUpStep: Step = { kind: 'reps', reps: 12, name: 'Push-ups', exerciseId: 'push-up' };
    const steps = [squats, plankStep, pushUpStep];

    it('steps the weight up where every set got its reps, and the reps where there is no weight', () => {
        const sets = [squat(10, 60), plank(60), pushUps(12), squat(10, 60, 1), pushUps(13, 1)];

        expect(progressionSuggestions(sets, steps, 'kg')).toEqual([
            { step: 0, kind: 'weight', from: 60, to: 62.5 },
            { step: 2, kind: 'reps', from: 12, to: 13 },
        ]);
    });

    it('suggests nothing for a step that missed its reps, or is at the top', () => {
        const sets = [squat(10, 60), squat(8, 60), pushUps(12), pushUps(11, 1)];
        expect(progressionSuggestions(sets, steps, 'kg')).toEqual([]);

        expect(progressionSuggestions([squat(10, 300)], steps, 'kg')).toEqual([]);
        const hundred: Step = { ...pushUpStep, reps: 100 };
        expect(progressionSuggestions([pushUps(100)], [squats, plankStep, hundred], 'kg')).toEqual(
            []
        );
    });

    it('never adds reps to a weighted step, even where its last set had none', () => {
        expect(progressionSuggestions([squat(10, 60), squat(10)], steps, 'lb')).toEqual([
            { step: 0, kind: 'weight', from: 132.5, to: 137.5 },
        ]);
    });
});

describe('a step whose sets vary (BLD-11)', () => {
    const pyramid: RepStep = {
        kind: 'reps',
        reps: 12,
        weight: 40,
        name: 'Leg press',
        exerciseId: 'leg-press',
        sets: [
            { reps: 12, weight: 40 },
            { reps: 10, weight: 45 },
            { reps: 8, weight: 50 },
        ],
    };
    const pressed = (set: number, reps: number, weight?: number, side?: 'left' | 'right') =>
        ({
            round: 0,
            step: 0,
            ...(set === 0 ? {} : { set }),
            ...(side ? { side } : {}),
            name: 'Leg press',
            reps,
            ...(weight === undefined ? {} : { weight }),
            exerciseId: 'leg-press',
        }) satisfies LoggedSet;
    const asPlanned = [pressed(0, 12, 40), pressed(1, 10, 45), pressed(2, 8, 50)];

    describe('mid-workout (PRG-5)', () => {
        it('steps up every set where each got its own reps last time', () => {
            expect(canStepUpEachSet(asPlanned, pyramid, 'kg')).toBe(true);
        });

        it("doesn't where any set fell short, both sides counting", () => {
            expect(
                canStepUpEachSet([...asPlanned.slice(0, 2), pressed(2, 7, 50)], pyramid, 'kg')
            ).toBe(false);
            const sides = [
                ...asPlanned.slice(0, 2),
                pressed(2, 8, 50, 'left'),
                pressed(2, 6, 50, 'right'),
            ];
            expect(canStepUpEachSet(sides, pyramid, 'kg')).toBe(false);
        });

        it("doesn't once a weight's been changed since, or a set wasn't done", () => {
            const changed = withRepSet(pyramid, 1, { reps: 10, weight: 47.5 });
            expect(canStepUpEachSet(asPlanned, changed, 'kg')).toBe(false);
            expect(canStepUpEachSet(asPlanned.slice(0, 2), pyramid, 'kg')).toBe(false);
        });

        it("doesn't for sets with no weight, or a step whose sets are alike", () => {
            const bodyweight = withEachRepSet(pyramid, ({ reps }) => ({ reps }));
            expect(canStepUpEachSet(asPlanned, bodyweight, 'kg')).toBe(false);
            const { sets: _sets, ...alike } = pyramid;
            expect(canStepUpEachSet(asPlanned, alike, 'kg')).toBe(false);
        });

        it('goes up one step on each set with a weight, as shown', () => {
            expect(steppedUp({ reps: 10, weight: 45 }, 'kg')).toEqual({ reps: 10, weight: 47.5 });
            expect(steppedUp({ reps: 10 }, 'kg')).toEqual({ reps: 10 });
            expect(steppedUp({ reps: 10, weight: 300 }, 'kg')).toEqual({ reps: 10, weight: 300 });
        });
    });

    describe('next time on the summary (PRG-10)', () => {
        it('steps up each set alike where every set got its own reps', () => {
            expect(progressionSuggestions(asPlanned, [pyramid], 'kg')).toEqual([
                { step: 0, kind: 'weight', from: 40, to: 42.5, eachSet: true },
            ]);
        });

        it('suggests nothing where a set fell short', () => {
            const short = [...asPlanned.slice(0, 2), pressed(2, 7, 50)];
            expect(progressionSuggestions(short, [pyramid], 'kg')).toEqual([]);
        });

        it('adds a rep to each set with no weight', () => {
            const bodyweight = withEachRepSet(pyramid, ({ reps }) => ({ reps }));
            const done = [pressed(0, 12), pressed(1, 10), pressed(2, 8)];
            expect(progressionSuggestions(done, [bodyweight], 'kg')).toEqual([
                { step: 0, kind: 'reps', from: 12, to: 13, eachSet: true },
            ]);
        });
    });
});

describe("the week's exercises (PRG-13)", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = 100 * DAY;
    const from = now - 7 * DAY;
    const lunge = (reps: number, side: 'left' | 'right'): LoggedSet => ({
        round: 0,
        step: 2,
        side,
        name: 'Lunge',
        reps,
        exerciseId: 'lunge',
    });
    const week = (history: HistoryEntry[], id: string) =>
        exerciseWeeks(history, from).find((one) => one.exerciseId === id);

    it('totals the sets and reps of the last 7 days, not before', () => {
        const history = [
            entry(now - DAY, [squat(10, 60), squat(8, 60)]),
            entry(from, [squat(12)]),
            entry(from - 1, [squat(50)]),
        ];
        expect(week(history, 'squat')).toEqual(
            expect.objectContaining({ sets: 3, reps: 30, seconds: 0, eachSide: false })
        );
        // Volume from the sets with a weight: 10 × 60 + 8 × 60
        expect(week(history, 'squat')!.volume).toBe(1080);
    });

    it('leaves out exercises not done this week, and sets with no exercise', () => {
        const unnamed: LoggedSet = { round: 0, step: 3, name: '', reps: 10 };
        const history = [entry(now - DAY, [unnamed]), entry(from - DAY, [squat(10)])];
        expect(exerciseWeeks(history, from)).toEqual([]);
    });

    it('totals the time of timed sets', () => {
        const history = [entry(now - DAY, [plank(45), plank(60)])];
        expect(week(history, 'plank')).toEqual(
            expect.objectContaining({ sets: 2, reps: 0, seconds: 105 })
        );
    });

    it("counts each side's, the side that did more standing for both", () => {
        const history = [
            entry(now - DAY, [lunge(10, 'left'), lunge(10, 'right'), lunge(10, 'left')]),
        ];
        expect(week(history, 'lunge')).toEqual(
            expect.objectContaining({ sets: 2, reps: 20, eachSide: true })
        );
    });

    it("adds up both sides' volume, the total lifted, and none with no weight", () => {
        const weighted = (side: 'left' | 'right'): LoggedSet => ({
            ...lunge(10, side),
            weight: 20,
        });
        const history = [entry(now - DAY, [weighted('left'), weighted('right')])];
        expect(week(history, 'lunge')!.volume).toBe(400);
        expect(week([entry(now - DAY, [lunge(10, 'left')])], 'lunge')!.volume).toBe(0);
        expect(week([entry(now - DAY, [plank(60)])], 'plank')!.volume).toBe(0);
    });

    it('lists the heaviest, most reps and longest that beat an earlier session', () => {
        const history = [
            entry(now - DAY, [squat(10, 62.5), plank(90)]),
            entry(from - DAY, [squat(10, 60), plank(60)]),
        ];
        const squats = week(history, 'squat')!;
        expect(squats.bests.heaviest).toEqual(expect.objectContaining({ weight: 62.5, reps: 10 }));
        // As many reps, but heavier
        expect(squats.bests.mostReps).toEqual(expect.objectContaining({ reps: 10, weight: 62.5 }));
        expect('oneRepMax' in squats.bests).toBe(false);
        expect(week(history, 'plank')!.bests.longest).toEqual(
            expect.objectContaining({ seconds: 90 })
        );
    });

    it('has no bests from a first session, or one set before the week', () => {
        expect(week([entry(now - DAY, [squat(10, 60)])], 'squat')!.bests).toEqual({});
        // An equal isn't one, as the first time stands
        const equal = [entry(now - DAY, [squat(10, 60)]), entry(from - DAY, [squat(10, 60)])];
        expect(week(equal, 'squat')!.bests).toEqual({});
        const history = [
            entry(now - DAY, [squat(5, 40)]),
            entry(from - DAY, [squat(10, 60)]),
            entry(from - 2 * DAY, [squat(8, 50)]),
        ];
        expect(week(history, 'squat')!.bests).toEqual({});
    });

    it('counts a best beating a session earlier in the same week', () => {
        const history = [entry(now - DAY, [squat(12)]), entry(now - 2 * DAY, [squat(10)])];
        expect(week(history, 'squat')!.bests.mostReps).toEqual(
            expect.objectContaining({ reps: 12 })
        );
    });
});

describe('newBests', () => {
    it("leaves out the first session's bests", () => {
        const first = { entryId: 'a', startedAt: 1, title: 'Legs', sets: [squat(10, 60)] };
        const second = { entryId: 'b', startedAt: 2, title: 'Legs', sets: [squat(8, 70)] };
        expect(newBests([first])).toEqual({});
        const bests = newBests([second, first]);
        expect(bests.heaviest?.entryId).toBe('b');
        expect(bests.mostReps).toBeUndefined();
    });
});
