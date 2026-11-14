import { BUILT_IN_MOVEMENTS } from './built-in-exercise-movements';
import { caloriesBurnt, describeCalories, exerciseMet } from './calories';
import { RepSet, TimedSet } from './history';

const plank = (seconds: number): TimedSet => ({
    round: 0,
    step: 0,
    name: 'Plank',
    seconds,
    exerciseId: 'builtin:plank',
});

const squats = (reps: number, exerciseId = 'builtin:back-squat'): RepSet => ({
    round: 0,
    step: 0,
    name: 'Squat',
    reps,
    exerciseId,
});

describe('calories (CAL-1)', () => {
    it('gives each exercise the MET of its movement, or its own', () => {
        expect(exerciseMet('builtin:back-squat')).toBe(5);
        expect(exerciseMet('builtin:dumbbell-curl')).toBe(3.5);
        expect(exerciseMet('builtin:plank')).toBe(3.8);
        expect(exerciseMet('builtin:burpee')).toBe(8);
        expect(exerciseMet('builtin:childs-pose')).toBe(2.3);
        expect(exerciseMet('builtin:kettlebell-swing')).toBe(9.8);
    });

    it('takes an exercise of your own, or none, as general resistance training', () => {
        expect(exerciseMet('own-exercise-1')).toBe(3.5);
        expect(exerciseMet(undefined)).toBe(3.5);
    });

    it('has a MET for every built-in exercise', () => {
        for (const id of Object.keys(BUILT_IN_MOVEMENTS)) {
            expect(exerciseMet(id)).toBeGreaterThan(1);
        }
    });

    it('counts a timed set at its MET: 10 minutes of planks at 75 kg is about 47.5 kcal', () => {
        const run = { activeSeconds: 600, sets: [plank(300), plank(300)] };
        expect(caloriesBurnt(run, 75)).toBeCloseTo(47.5);
    });

    it('shares the time on rep steps between its sets, and counts the rest as resting', () => {
        // 3 × 10 squats over 90 seconds, and 120 seconds of rest, at 80 kg: 10 + 4
        const run = {
            activeSeconds: 210,
            repSeconds: 90,
            sets: [squats(10), squats(10), squats(10)],
        };
        expect(caloriesBurnt(run, 80)).toBeCloseTo(14);
    });

    it('shares rep time by the guess at each set: more reps, more of it', () => {
        // 20 reps (65 s guessed) of squats at 5 and 5 reps (20 s) of curls at 3.5
        const run = {
            activeSeconds: 85,
            repSeconds: 85,
            sets: [squats(20), squats(5, 'builtin:dumbbell-curl')],
        };
        const metSeconds = 65 * 5 + 20 * 3.5;
        expect(caloriesBurnt(run, 3600)).toBeCloseTo(metSeconds);
    });

    it('guesses the rep time of a run from before it was logged, cut to fit', () => {
        // 10 reps guessed at 35 s, in a run of 100
        expect(caloriesBurnt({ activeSeconds: 100, sets: [squats(10)] }, 3600)).toBeCloseTo(
            35 * 5 + 65 * 1.5
        );
        // 10 reps guessed at 35 s, in a run of 20: all of it work
        expect(caloriesBurnt({ activeSeconds: 20, sets: [squats(10)] }, 3600)).toBeCloseTo(20 * 5);
    });

    it('counts a run with no sets as resting, and none as nothing', () => {
        expect(caloriesBurnt({ activeSeconds: 3600 }, 70)).toBeCloseTo(105);
        expect(caloriesBurnt({ activeSeconds: 0 }, 70)).toBe(0);
    });

    it('says it to the nearest 5, as an estimate, and nothing under 5', () => {
        expect(describeCalories(47.5, 'en-GB')).toEqual({
            kcal: '50 kcal',
            spoken: 'about 50 calories',
        });
        expect(describeCalories(1212, 'en-GB')?.kcal).toBe('1,210 kcal');
        expect(describeCalories(2.4, 'en-GB')).toBeNull();
    });
});
