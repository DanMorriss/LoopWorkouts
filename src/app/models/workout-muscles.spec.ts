import { makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { Step } from './workout';
import { musclesInSets, musclesMissed, musclesWorked } from './workout-muscles';

const byId = (id: string) => BUILT_IN_EXERCISES.find((exercise) => exercise.id === id);
const linked = (step: Step, exerciseId: string): Step => ({ ...step, exerciseId });

describe('musclesWorked', () => {
    it("takes the main and supporting muscles of the steps' exercises, in the app's order", () => {
        // Back squat: quads and glutes, helped by the hamstrings, adductors and lower back.
        // Deadlift: glutes, hamstrings and lower back, helped by the quads, traps, upper back
        // and forearms, so only those four of its supporting muscles stay supporting.
        const legs = makeWorkout({
            steps: [linked(reps(10), 'builtin:back-squat'), rest(60)],
        });
        const pull = makeWorkout({ steps: [linked(reps(5), 'builtin:deadlift')] });

        expect(musclesWorked([legs, pull], byId)).toEqual({
            main: ['lower-back', 'glutes', 'quads', 'hamstrings'],
            supporting: ['forearms', 'traps', 'upper-back', 'adductors'],
            hasExercises: true,
        });
    });

    it("works nothing that's known from unnamed steps, or an exercise that's gone", () => {
        const workout = makeWorkout({
            steps: [work(30), linked(reps(10), 'own:deleted')],
        });

        expect(musclesWorked([workout], byId)).toEqual({
            main: [],
            supporting: [],
            hasExercises: false,
        });
    });
});

describe('musclesInSets', () => {
    it("takes the muscles of the sets' exercises, leaving out ones with no exercise or one that's gone", () => {
        const set = { round: 0, step: 0, name: 'Bench', reps: 5 };
        const sets = [
            { ...set, exerciseId: 'builtin:bench-press' },
            { ...set, name: '' },
            { ...set, exerciseId: 'own:deleted' },
        ];

        expect(musclesInSets(sets, byId)).toEqual({
            main: ['chest'],
            supporting: ['shoulders', 'triceps'],
            hasExercises: true,
        });
        expect(musclesInSets([{ ...set, name: '' }], byId).hasExercises).toBe(false);
    });
});

describe('musclesMissed', () => {
    it('lists the muscle groups worked neither as main nor as supporting', () => {
        // Bench press: the chest, helped by the shoulders and triceps
        const workout = makeWorkout({ steps: [linked(reps(10), 'builtin:bench-press')] });

        expect(musclesMissed(musclesWorked([workout], byId))).toEqual([
            'biceps',
            'forearms',
            'abs',
            'obliques',
            'traps',
            'upper-back',
            'lower-back',
            'glutes',
            'abductors',
            'adductors',
            'quads',
            'hamstrings',
            'calves',
        ]);
    });
});
