import { eachAGroup, makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import { HistoryEntry } from './history';
import { UNTIL_STOPPED } from './workout';
import { estimateText, estimateWorkout, expectedTime, repPace } from './workout-estimate';

// About 3 seconds a rep, and 5 to get ready for each set
const SECONDS_PER_REP = 3;
const SECONDS_PER_REP_SET = 5;

type Run = Pick<HistoryEntry, 'outcome' | 'activeSeconds' | 'expected'>;

/** A finished run that took `activeSeconds`, expected to take 60s on the clock and 100s of reps. */
const finished = (activeSeconds: number): Run => ({
    outcome: 'finished',
    activeSeconds,
    expected: { timedSeconds: 60, repSeconds: 100 },
});

describe('expectedTime', () => {
    it("is the workout's clock, with nothing for reps, when it's all timed", () => {
        // 3 rounds of 30s work and 10s rest, the last rest skipped
        expect(expectedTime(makeWorkout())).toEqual({ timedSeconds: 110, repSeconds: 0 });
    });

    it('guesses at each set of reps, every round', () => {
        const workout = makeWorkout({ steps: [reps(10), rest(20)], repeats: 2 });
        expect(expectedTime(workout)).toEqual({
            timedSeconds: 20,
            repSeconds: 2 * (10 * SECONDS_PER_REP + SECONDS_PER_REP_SET),
        });
    });

    it("counts every set of an exercise, each side of one done each side, and each set's own reps", () => {
        const workout = {
            ...makeWorkout(),
            repeats: 1,
            blocks: [
                {
                    kind: 'group' as const,
                    rounds: 2,
                    restSeconds: 60,
                    steps: [
                        {
                            kind: 'reps' as const,
                            reps: 10,
                            name: 'Lunge',
                            eachSide: true as const,
                            sets: [{ reps: 10 }, { reps: 6 }],
                        },
                    ],
                },
            ],
        };
        // Both sides of 10, then both of 6; one rest between the sets, none after the last
        expect(expectedTime(workout)).toEqual({
            timedSeconds: 60,
            repSeconds: 2 * (10 * SECONDS_PER_REP + 6 * SECONDS_PER_REP) + 4 * SECONDS_PER_REP_SET,
        });
    });

    it('counts Switch sides between the sides of a timed step, as the run has it', () => {
        const blocks = eachAGroup([{ ...work(30, 'Side plank'), eachSide: true }]);
        const workout = { ...makeWorkout(), blocks, repeats: 1 };
        expect(expectedTime({ ...workout, sides: { first: 'left', switchSeconds: 10 } })).toEqual({
            timedSeconds: 70,
            repSeconds: 0,
        });
    });

    it('has none for a workout that goes on until stopped or to a time limit', () => {
        expect(expectedTime(makeWorkout({ repeats: UNTIL_STOPPED }))).toBeNull();
        expect(expectedTime(makeWorkout({ timeLimitSeconds: 600 }))).toBeNull();
    });
});

describe('repPace', () => {
    it('has none without a finished run that had rep steps', () => {
        expect(repPace([])).toBeNull();
        expect(repPace([{ ...finished(300), outcome: 'stopped' }])).toBeNull();
        expect(repPace([{ outcome: 'finished', activeSeconds: 300 }])).toBeNull();
        expect(
            repPace([
                {
                    outcome: 'finished',
                    activeSeconds: 60,
                    expected: { timedSeconds: 60, repSeconds: 0 },
                },
            ])
        ).toBeNull();
    });

    it("is the time on rep steps against the guess: the run's time less its clock", () => {
        // 60s of clock and 150s on reps, against 100s guessed
        expect(repPace([finished(210)])).toBe(1.5);
    });

    it('takes the middle of the latest few, so one odd run counts for little', () => {
        expect(repPace([finished(160), finished(260), finished(1000)])).toBe(2);
        expect(repPace([finished(160), finished(260)])).toBe(1.5);
        const older = Array.from({ length: 5 }, () => finished(1000));
        expect(repPace([finished(160), finished(160), finished(160), ...older])).toBe(1);
    });

    it('keeps to a sane range, for a run left waiting on Done or rushed through', () => {
        expect(repPace([finished(60 + 100 * 50)])).toBe(4);
        expect(repPace([finished(30)])).toBe(0.25);
    });
});

describe('estimateWorkout', () => {
    const repWorkout = makeWorkout({ steps: [reps(10), rest(20)], repeats: 2 });
    const guess = 20 + 2 * (10 * SECONDS_PER_REP + SECONDS_PER_REP_SET);

    it("is the clock for a workout that's all timed, whatever was done before", () => {
        expect(estimateWorkout(makeWorkout(), [finished(9999)])).toEqual({
            seconds: 110,
            basis: 'clock',
        });
    });

    it('guesses at rep steps until the workout has been finished', () => {
        expect(estimateWorkout(repWorkout, [])).toEqual({ seconds: guess, basis: 'guess' });
    });

    it('uses your pace on rep steps once it has', () => {
        expect(estimateWorkout(repWorkout, [finished(260)])).toEqual({
            seconds: 20 + 2 * 70,
            basis: 'yours',
        });
    });

    it('follows a change to the workout, keeping your pace', () => {
        const more = makeWorkout({ steps: [reps(10), rest(20), reps(20)], repeats: 2 });
        const repSeconds = 2 * (30 * SECONDS_PER_REP + 2 * SECONDS_PER_REP_SET);
        expect(estimateWorkout(more, [finished(260)])).toEqual({
            seconds: 2 * 20 + repSeconds * 2,
            basis: 'yours',
        });
    });

    it('is the time limit for a workout with one, and none for one until stopped', () => {
        expect(estimateWorkout(makeWorkout({ timeLimitSeconds: 1200 }), [])).toEqual({
            seconds: 1200,
            basis: 'limit',
        });
        expect(estimateWorkout(makeWorkout({ repeats: UNTIL_STOPPED }), [])).toBeNull();
    });
});

describe('estimateText', () => {
    it('says it to the minute', () => {
        expect(estimateText({ seconds: 25 * 60 + 20, basis: 'guess' })).toEqual({
            text: 'About 25 min',
            spoken: 'about 25 minutes',
        });
        expect(estimateText({ seconds: 65 * 60, basis: 'yours' })).toEqual({
            text: 'About 1 hr 5 min',
            spoken: 'about 1 hour 5 minutes',
        });
        expect(estimateText({ seconds: 60 * 60, basis: 'clock' })).toEqual({
            text: 'About 1 hr',
            spoken: 'about 1 hour',
        });
        expect(estimateText({ seconds: 20, basis: 'clock' })).toEqual({
            text: 'Under a minute',
            spoken: 'under a minute',
        });
    });

    it("says a time limit as it is, as it's exact", () => {
        expect(estimateText({ seconds: 1200, basis: 'limit' })).toEqual({
            text: '20 min',
            spoken: '20 minutes',
        });
    });
});
