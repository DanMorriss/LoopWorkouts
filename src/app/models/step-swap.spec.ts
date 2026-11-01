import { makeWorkout, rest, work } from '../shared/testing/make-workout';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { RepSet } from './history';
import { runPosition, stepAsRunAt, StepSwap, swappedStep, withSwaps } from './step-swap';
import { allSteps, RepStep, Step } from './workout';

const byId = (id: string) =>
    BUILT_IN_EXERCISES.find((exercise) => exercise.id === `builtin:${id}`)!;
const squat: RepStep = {
    kind: 'reps',
    reps: 10,
    name: 'Smith squat',
    weight: 60,
    exerciseId: 'builtin:back-squat',
};
const lastTime = (weight: number | undefined, set?: number): RepSet => ({
    round: 0,
    step: 0,
    name: 'Goblet squat',
    reps: 10,
    exerciseId: 'builtin:goblet-squat',
    ...(set === undefined ? {} : { set }),
    ...(weight === undefined ? {} : { weight }),
});

describe('swappedStep', () => {
    it("is the other exercise, at its weight last time, keeping the step's reps", () => {
        expect(swappedStep(squat, byId('goblet-squat'), [lastTime(24)])).toEqual({
            kind: 'reps',
            reps: 10,
            name: 'Goblet squat',
            weight: 24,
            exerciseId: 'builtin:goblet-squat',
        });
    });

    it('has no weight when the exercise was never done, or done with none', () => {
        expect(swappedStep(squat, byId('goblet-squat'), [])).not.toHaveProperty('weight');
        expect(swappedStep(squat, byId('goblet-squat'), [lastTime(undefined)])).not.toHaveProperty(
            'weight'
        );
    });

    it("gives each set of a step whose sets vary its own set's weight last time", () => {
        const pyramid: RepStep = {
            ...squat,
            sets: [
                { reps: 12, weight: 50 },
                { reps: 10, weight: 60 },
                { reps: 8, weight: 70 },
            ],
        };
        const swapped = swappedStep(pyramid, byId('goblet-squat'), [
            lastTime(20, 0),
            lastTime(24, 1),
        ]) as RepStep;

        // Set 3 wasn't done last time, so it's set 1's
        expect(swapped.sets).toEqual([
            { reps: 12, weight: 20 },
            { reps: 10, weight: 24 },
            { reps: 8, weight: 20 },
        ]);
    });

    it('keeps a timed step its time and sides', () => {
        const plank: Step = { kind: 'work', seconds: 45, name: 'Side plank', eachSide: true };

        expect(swappedStep(plank, byId('plank'), [])).toEqual({
            kind: 'work',
            seconds: 45,
            name: 'Plank',
            eachSide: true,
            exerciseId: 'builtin:plank',
        });
    });
});

describe('withSwaps and stepAsRunAt', () => {
    const workout = makeWorkout({ steps: [squat, rest(60)] });
    const toGoblet: StepSwap = {
        step: 0,
        from: 2,
        original: squat,
        swapped: swappedStep(squat, byId('goblet-squat'), []),
    };
    const toLunge: StepSwap = {
        step: 0,
        from: 4,
        original: toGoblet.swapped,
        swapped: swappedStep(squat, byId('dumbbell-lunge'), []),
    };

    it('runs each swapped step as it was last swapped, and the others as they are', () => {
        expect(allSteps(withSwaps(workout, [toGoblet, toLunge])).map((s) => s.name)).toEqual([
            'Dumbbell lunge',
            '',
        ]);
        expect(withSwaps(workout, [])).toBe(workout);
    });

    it('says how a swapped step ran at each point: as it was before, then each swap', () => {
        const names = [0, 2, 3, 4, 6].map((at) => stepAsRunAt([toGoblet, toLunge], 0, at)?.name);

        expect(names).toEqual([
            'Smith squat',
            'Goblet squat',
            'Goblet squat',
            'Dumbbell lunge',
            'Dumbbell lunge',
        ]);
        expect(stepAsRunAt([toGoblet], 1, 3)).toBeUndefined();
    });

    it('counts places in the run round by round', () => {
        expect(runPosition(0, 1, 2)).toBe(1);
        expect(runPosition(2, 1, 2)).toBe(5);
    });

    it('leaves out a swap of a step the workout no longer has', () => {
        expect(withSwaps(makeWorkout({ steps: [work(30)] }), [{ ...toGoblet, step: 3 }])).toEqual(
            makeWorkout({ steps: [work(30)] })
        );
    });
});
