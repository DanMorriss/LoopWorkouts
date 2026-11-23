import { BUILT_IN_MOVEMENTS } from './built-in-exercise-movements';
import {
    afterburn,
    bodyWeightHint,
    caloriesBurnt,
    describeCalories,
    exerciseMet,
} from './calories';
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
        expect(exerciseMet('builtin:back-squat')).toBe(6);
        expect(exerciseMet('builtin:dumbbell-curl')).toBe(4);
        expect(exerciseMet('builtin:plank')).toBe(4);
        expect(exerciseMet('builtin:burpee')).toBe(8);
        expect(exerciseMet('builtin:childs-pose')).toBe(2.3);
        expect(exerciseMet('builtin:kettlebell-swing')).toBe(9.8);
    });

    it('takes an exercise done only with a kettlebell as kettlebell circuit training', () => {
        expect(exerciseMet('builtin:kettlebell-floor-press')).toBe(8);
        expect(exerciseMet('builtin:kettlebell-halo')).toBe(8);
        // Done with a dumbbell or a kettlebell: as its movement
        expect(exerciseMet('builtin:goblet-squat')).toBe(6);
    });

    it('takes an exercise of your own, or none, as general resistance training', () => {
        expect(exerciseMet('own-exercise-1')).toBe(5);
        expect(exerciseMet(undefined)).toBe(5);
    });

    it('takes an exercise of your own as hard as you say it is (CAL-4)', () => {
        const efforts = new Map([
            ['mobility', 'light'],
            ['sled-push', 'moderate'],
            ['sprint', 'hard'],
        ] as const);
        expect(exerciseMet('mobility', efforts)).toBe(3.5);
        expect(exerciseMet('sled-push', efforts)).toBe(5);
        expect(exerciseMet('sprint', efforts)).toBe(8);
        // A built-in one keeps its own
        expect(exerciseMet('builtin:back-squat', efforts)).toBe(6);

        // 10 minutes of sprints at 75 kg: 100 kcal, and 87.5 above resting
        const run = {
            activeSeconds: 600,
            sets: [{ round: 0, step: 0, name: 'Sprint', seconds: 600, exerciseId: 'sprint' }],
        };
        expect(caloriesBurnt(run, 75, efforts)).toBeCloseTo(100);
        expect(afterburn(run, 75, efforts)).toBeCloseTo(0.15 * 87.5);
    });

    it('has a MET for every built-in exercise', () => {
        for (const id of Object.keys(BUILT_IN_MOVEMENTS)) {
            expect(exerciseMet(id)).toBeGreaterThan(1);
        }
    });

    it('counts a timed set at its MET: 10 minutes of planks at 75 kg is 50 kcal', () => {
        const run = { activeSeconds: 600, sets: [plank(300), plank(300)] };
        expect(caloriesBurnt(run, 75)).toBeCloseTo(50);
    });

    it('shares the time on rep steps between its sets, and counts the rest as resting', () => {
        // 3 × 10 squats over 90 seconds, and 120 seconds of rest, at 80 kg: 12 + 6.67
        const run = {
            activeSeconds: 210,
            repSeconds: 90,
            sets: [squats(10), squats(10), squats(10)],
        };
        expect(caloriesBurnt(run, 80)).toBeCloseTo(12 + 20 / 3);
    });

    it('shares rep time by the guess at each set: more reps, more of it', () => {
        // 20 reps (65 s guessed) of squats at 6 and 5 reps (20 s) of curls at 4
        const run = {
            activeSeconds: 85,
            repSeconds: 85,
            sets: [squats(20), squats(5, 'builtin:dumbbell-curl')],
        };
        const metSeconds = 65 * 6 + 20 * 4;
        expect(caloriesBurnt(run, 3600)).toBeCloseTo(metSeconds);
    });

    it('guesses the rep time of a run from before it was logged, cut to fit', () => {
        // 10 reps guessed at 35 s, in a run of 100
        expect(caloriesBurnt({ activeSeconds: 100, sets: [squats(10)] }, 3600)).toBeCloseTo(
            35 * 6 + 65 * 2.5
        );
        // 10 reps guessed at 35 s, in a run of 20: all of it work
        expect(caloriesBurnt({ activeSeconds: 20, sets: [squats(10)] }, 3600)).toBeCloseTo(20 * 6);
    });

    it('counts a run with no sets as resting, and none as nothing', () => {
        expect(caloriesBurnt({ activeSeconds: 3600 }, 70)).toBeCloseTo(175);
        expect(caloriesBurnt({ activeSeconds: 0 }, 70)).toBe(0);
    });

    it('says it to the nearest 5, as an estimate, and nothing under 5', () => {
        expect(describeCalories(47.5, 'en-GB')).toEqual({
            number: '50',
            kcal: '50 kcal',
            spoken: 'about 50 calories',
        });
        expect(describeCalories(1212, 'en-GB')?.kcal).toBe('1,210 kcal');
        expect(describeCalories(2.4, 'en-GB')).toBeNull();
    });

    it('gives the afterburn as 15% of what was burnt above resting', () => {
        // 10 minutes of planks at 75 kg: 50 kcal, 12.5 of it resting
        const planks = { activeSeconds: 600, sets: [plank(600)] };
        expect(afterburn(planks, 75)).toBeCloseTo(5.625);
        // Only rests, at 2.5 METs: 1.5 METs above resting
        expect(afterburn({ activeSeconds: 600, sets: [] }, 75)).toBeCloseTo(
            (0.15 * 1.5 * 75 * 600) / 3600
        );
        expect(afterburn({ activeSeconds: 0 }, 75)).toBe(0);
    });

    it('says where a body weight is kept', () => {
        expect(bodyWeightHint(false)).toBe('For calories burnt. Kept on this device only');
        expect(bodyWeightHint(true)).toBe('For calories burnt. Kept with your account');
    });
});
