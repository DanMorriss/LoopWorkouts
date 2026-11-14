import { eachAGroup, makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import { LoggedSet } from './history';
import { UNTIL_STOPPED } from './workout';
import { estimateText, estimateWorkout, PacedRun, repPace } from './workout-estimate';

// About 3 seconds a rep, and 5 to get ready for each set
const SECONDS_PER_REP = 3;
const SECONDS_PER_REP_SET = 5;

/** A set of 10 reps, which the guess has at 35 seconds. */
const tenReps: LoggedSet = { round: 0, step: 0, name: 'Push-up', reps: 10 };

/** A run that spent `repSeconds` on two sets of 10 reps, guessed at 70 seconds. */
const run = (repSeconds: number): PacedRun => ({ repSeconds, sets: [tenReps, tenReps] });

describe('estimateWorkout', () => {
    it("is the workout's clock when it's all timed, whatever was done before", () => {
        // 3 rounds of 30s work and 10s rest, the last rest skipped
        expect(estimateWorkout(makeWorkout(), [run(9999)])).toEqual({
            seconds: 110,
            basis: 'clock',
        });
    });

    it('counts Switch sides between the sides of a timed step, as the run has it', () => {
        const blocks = eachAGroup([{ ...work(30, 'Side plank'), eachSide: true }]);
        const workout = { ...makeWorkout(), blocks, repeats: 1 };
        expect(
            estimateWorkout({ ...workout, sides: { first: 'left', switchSeconds: 10 } }, [])
        ).toEqual({ seconds: 70, basis: 'clock' });
    });

    it('guesses at each set of reps, every round, until some have been done', () => {
        const workout = makeWorkout({ steps: [reps(10), rest(20)], repeats: 2 });
        expect(estimateWorkout(workout, [])).toEqual({
            seconds: 20 + 2 * (10 * SECONDS_PER_REP + SECONDS_PER_REP_SET),
            basis: 'guess',
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
        expect(estimateWorkout(workout, [])).toEqual({
            seconds:
                60 + 2 * (10 * SECONDS_PER_REP + 6 * SECONDS_PER_REP) + 4 * SECONDS_PER_REP_SET,
            basis: 'guess',
        });
    });

    it('uses your pace on rep steps once some have been done', () => {
        const workout = makeWorkout({ steps: [reps(10), rest(20)], repeats: 2 });
        // Twice the guess
        expect(estimateWorkout(workout, [run(140)])).toEqual({
            seconds: 20 + 2 * 70,
            basis: 'yours',
        });
    });

    it('follows a change to the workout, keeping your pace', () => {
        const more = makeWorkout({ steps: [reps(10), rest(20), reps(20)], repeats: 2 });
        const repSeconds = 2 * (30 * SECONDS_PER_REP + 2 * SECONDS_PER_REP_SET);
        // Two rests, as the last step is reps
        expect(estimateWorkout(more, [run(140)])).toEqual({
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

describe('repPace', () => {
    it('has none without a run that logged its time on sets of reps', () => {
        expect(repPace([])).toBeNull();
        expect(repPace([{ sets: [tenReps] }])).toBeNull();
        expect(repPace([{ repSeconds: 30 }])).toBeNull();
        expect(
            repPace([{ repSeconds: 30, sets: [{ round: 0, step: 0, name: 'Plank', seconds: 30 }] }])
        ).toBeNull();
    });

    it('is the time on rep steps against the guess for the sets of reps it logged', () => {
        expect(repPace([run(105)])).toBe(1.5);
    });

    it("counts only what was done, so a skip or a stop doesn't make it quick", () => {
        // One set done of a workout of many: 35 seconds on it, as guessed
        expect(repPace([{ repSeconds: 35, sets: [tenReps] }])).toBe(1);
    });

    it('takes the middle of the latest few, so one odd run counts for little', () => {
        expect(repPace([run(70), run(140), run(1000)])).toBe(2);
        expect(repPace([run(70), run(140)])).toBe(1.5);
        const older = Array.from({ length: 5 }, () => run(1000));
        expect(repPace([run(70), run(70), run(70), ...older])).toBe(1);
    });

    it('keeps to a sane range, for a run left waiting on Done or rushed through', () => {
        expect(repPace([run(70 * 50)])).toBe(4);
        expect(repPace([run(1)])).toBe(0.25);
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
