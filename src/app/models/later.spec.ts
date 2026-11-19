import { makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import {
    laterAt,
    laterRunOut,
    laterState,
    LaterQueue,
    NO_LATER,
    passFirst,
    putAside,
    readLater,
    RunLater,
    withLaterAlarms,
} from './later';
import { canPutAside, pickNext, unpick } from './later-pick';
import { setsDone, workoutStateAt } from './workout-state';

// Plank 0:20, rest 0:10, 10 push-ups, squats 0:30, once: 60s on the clock
const workout = makeWorkout({
    steps: [work(20, 'Plank'), rest(10), reps(10, 'Push-up'), work(30, 'Squat')],
    repeats: 1,
});
const PLANK = { round: 0, stepIndex: 0 };
const PUSH_UPS = { round: 0, stepIndex: 2 };

/** Steps picked in the rest, to run at its end (30s on the clock). */
const afterRest = (...steps: (typeof PLANK)[]): LaterQueue => ({
    atMs: 30_000,
    repStepsDone: 0,
    steps,
});

describe('laterAt', () => {
    it('is the clock as it is before the queue is reached', () => {
        expect(laterAt(workout, afterRest(PLANK), 25_000, 0)).toEqual({
            clockMs: 25_000,
            on: null,
        });
        expect(laterAt(workout, null, 40_000, 0)).toEqual({ clockMs: 40_000, on: null });
    });

    it('holds the clock while a timed step done later runs, then takes its time out', () => {
        expect(laterAt(workout, afterRest(PLANK), 35_000, 0)).toEqual({
            clockMs: 30_000,
            on: { step: PLANK, ms: 5000, first: true },
        });
        expect(laterAt(workout, afterRest(PLANK), 52_000, 0)).toEqual({
            clockMs: 32_000,
            on: null,
        });
    });

    it('holds at a rep step done later however long it takes, with the next after it', () => {
        const queue = afterRest(PLANK, PUSH_UPS);
        expect(laterAt(workout, queue, 90_000, 0)).toEqual({
            clockMs: 30_000,
            on: { step: PUSH_UPS, ms: 40_000, first: false },
        });
    });

    it('waits for Done on the rep step it was picked in', () => {
        const queue = { atMs: 30_000, repStepsDone: 1, steps: [PLANK] };
        expect(laterAt(workout, queue, 40_000, 0).on).toBeNull();
        expect(laterAt(workout, queue, 30_000, 1).on).toEqual({ step: PLANK, ms: 0, first: true });
    });
});

describe('laterRunOut', () => {
    it('is the timed step at the front once it has run its time', () => {
        expect(laterRunOut(workout, afterRest(PLANK), 49_999, 0)).toBeNull();
        expect(laterRunOut(workout, afterRest(PLANK), 50_000, 0)).toEqual({
            ...PLANK,
            ranMs: 20_000,
        });
        expect(laterRunOut(workout, afterRest(PUSH_UPS), 90_000, 0)).toBeNull();
    });
});

describe('laterState', () => {
    it('is the step as it was, with the rounds left where the clock is', () => {
        const clock = workoutStateAt(workout, 30_000);
        expect(laterState(workout, PLANK, 5500, clock)).toEqual({
            phase: 'work',
            step: work(20, 'Plank'),
            stepIndex: 0,
            remainingSeconds: 15,
            phaseSeconds: 20,
            roundsLeft: clock.roundsLeft,
            round: 0,
            phaseElapsedMs: 5500,
            later: true,
        });
    });
});

describe('picking', () => {
    const plankSkipped: RunLater = putAside(NO_LATER, PLANK);

    it('puts an exercise aside once, and not a rest, nor with a time limit', () => {
        expect(putAside(plankSkipped, PLANK).aside).toEqual([PLANK]);
        expect(canPutAside(workout, workoutStateAt(workout, 5000))).toBe(true);
        expect(canPutAside(workout, workoutStateAt(workout, 25_000))).toBe(false);
        const limited = { ...workout, timeLimitSeconds: 600 };
        expect(canPutAside(limited, workoutStateAt(limited, 5000))).toBe(false);
    });

    it('picks one to run at the end of the step on now, and back with Undo', () => {
        const state = workoutStateAt(workout, 25_000);
        const picked = pickNext(plankSkipped, PLANK, state, {
            elapsedMs: 25_000,
            repStepsDone: 0,
        });
        expect(picked).toEqual({ ...NO_LATER, queue: afterRest(PLANK) });
        expect(unpick(picked, PLANK)).toEqual(plankSkipped);
    });

    it('on a rep step, picks one for after Done', () => {
        const state = workoutStateAt(workout, 45_000);
        expect(
            pickNext(plankSkipped, PLANK, state, { elapsedMs: 45_000, repStepsDone: 0 }).queue
        ).toEqual({ atMs: 30_000, repStepsDone: 1, steps: [PLANK] });
    });

    it('during a step done later, picks one for straight after it', () => {
        const later: RunLater = { ...putAside(NO_LATER, PUSH_UPS), queue: afterRest(PLANK) };
        const on = laterState(workout, PLANK, 1000, workoutStateAt(workout, 30_000))!;
        const picked = pickNext(later, PUSH_UPS, on, { elapsedMs: 30_000, repStepsDone: 0 });
        expect(picked.queue?.steps).toEqual([PLANK, PUSH_UPS]);
        expect(passFirst(picked).queue?.steps).toEqual([PUSH_UPS]);
    });
});

describe('withLaterAlarms', () => {
    it('adds each step done later, and moves what comes after it on by its time', () => {
        const events = [
            { kind: 'rest' as const, at: 20_000 },
            { kind: 'work' as const, at: 30_000 },
        ];
        expect(withLaterAlarms(events, workout, afterRest(PLANK), 0, 0, false)).toEqual([
            { kind: 'rest', at: 20_000 },
            { kind: 'work', at: 30_000 },
            { kind: 'work', at: 50_000 },
        ]);
        // With countdown beeps, and nothing known after a rep step
        expect(withLaterAlarms(events, workout, afterRest(PLANK, PUSH_UPS), 0, 0, true)).toEqual([
            { kind: 'rest', at: 20_000 },
            { kind: 'work', at: 30_000 },
            { kind: 'countdown', at: 47_000 },
            { kind: 'countdown', at: 48_000 },
            { kind: 'countdown', at: 49_000 },
            { kind: 'work', at: 50_000 },
        ]);
    });
});

describe('setsDone with steps done later', () => {
    it('logs a timed exercise done later for the longer of its times', () => {
        // Linked to an exercise, as a timed set is only logged for one
        const linked = makeWorkout({
            steps: [{ ...work(20, 'Plank'), exerciseId: 'builtin:plank' }, rest(10)],
            repeats: 1,
        });
        const state = workoutStateAt(linked, 30_000);
        const skips = [{ round: 0, stepIndex: 0, skippedMs: 15_000 }];
        expect(setsDone(linked, state, [], [], skips)[0]).toMatchObject({ seconds: 5 });
        const later = [{ ...PLANK, ranMs: 20_000 }];
        expect(setsDone(linked, state, [], [], skips, later)[0]).toMatchObject({ seconds: 20 });
    });
});

describe('readLater', () => {
    it('reads back what it saved, and leaves out what is broken', () => {
        const later: RunLater = {
            aside: [PUSH_UPS],
            queue: afterRest(PLANK),
            ms: 1200,
            done: [{ ...PLANK, ranMs: 20_000 }],
        };
        expect(readLater(JSON.stringify(later))).toEqual(later);
        expect(
            readLater('{"aside":[{"round":-1,"stepIndex":0}],"queue":{"atMs":1},"ms":"x"}')
        ).toEqual(NO_LATER);
        expect(readLater('not json')).toEqual(NO_LATER);
        expect(readLater(null)).toEqual(NO_LATER);
    });
});
