import { makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import { nextWait, WAIT_AFTER_REST_SECONDS } from './wait-to-start';
import { asOneGroup, RunningWorkout, Workout } from './workout';

describe('nextWait', () => {
    it('is a timed exercise straight after a rest of 30 seconds or more', () => {
        const workout = makeWorkout({ steps: [work(20), rest(30), work(20)], repeats: 1 });

        expect(WAIT_AFTER_REST_SECONDS).toBe(30);
        expect(nextWait(workout, -1)).toEqual({
            position: 2,
            round: 0,
            stepIndex: 2,
            atMs: 50_000,
        });
        // Once it's behind the run, there's no other
        expect(nextWait(workout, 2)).toBeNull();
    });

    it("isn't after a shorter rest, as in an interval circuit, or before a rest or rep step", () => {
        expect(nextWait(makeWorkout({ steps: [work(20), rest(29), work(20)] }), -1)).toBeNull();
        expect(nextWait(makeWorkout({ steps: [work(20), rest(60), reps(10)] }), -1)).toBeNull();
        expect(
            nextWait(makeWorkout({ steps: [work(20), rest(30), rest(30)], repeats: 1 }), -1)
        ).toBeNull();
    });

    it("is the first step of each round after the first, after the last round's rest", () => {
        // A rep step takes no time on the clock
        const workout = makeWorkout({ steps: [work(20), reps(10), rest(40)], repeats: 3 });

        expect(nextWait(workout, -1)).toEqual({
            position: 3,
            round: 1,
            stepIndex: 0,
            atMs: 60_000,
        });
        expect(nextWait(workout, 3)?.position).toBe(6);
        // The last round's rest is skipped, so nothing waits after it
        expect(nextWait(workout, 6)).toBeNull();
    });

    it("is a group's set after the rest between its sets", () => {
        const workout: Workout = {
            ...makeWorkout(),
            repeats: 1,
            blocks: [{ kind: 'group', rounds: 2, restSeconds: 45, steps: [work(30)] }],
        };

        expect(nextWait(workout, -1)).toEqual({
            position: 2,
            round: 0,
            stepIndex: 2,
            atMs: 75_000,
        });
    });

    it("isn't the second side after Switch sides, however long that is", () => {
        const sidePlank: RunningWorkout = {
            ...makeWorkout(),
            repeats: 1,
            blocks: asOneGroup([{ kind: 'work', seconds: 30, name: 'Side plank', eachSide: true }]),
            sides: { first: 'left', switchSeconds: 30 },
        };

        expect(nextWait(sidePlank, -1)).toBeNull();
    });

    it('is never in a workout with a time limit, which is against the clock', () => {
        const workout = makeWorkout({ steps: [work(20), rest(60)], timeLimitSeconds: 600 });

        expect(nextWait(workout, -1)).toBeNull();
    });
});
