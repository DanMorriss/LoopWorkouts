import { makeWorkout, reps, work } from '../shared/testing/make-workout';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { Step } from './workout';
import { filterWorkouts, WorkoutFilters } from './workout-filter';

const byId = (id: string) => BUILT_IN_EXERCISES.find((exercise) => exercise.id === id);
const linked = (step: Step, exerciseId: string): Step => ({ ...step, exerciseId });

const legs = makeWorkout({
    id: 'legs',
    title: 'Legs day',
    steps: [linked(reps(10, 'Back squat'), 'builtin:back-squat')],
});
const push = makeWorkout({
    id: 'push',
    title: 'Push',
    steps: [linked(reps(10, 'Push-up'), 'builtin:push-up')],
});
const goblet = makeWorkout({
    id: 'goblet',
    title: 'At home',
    // Named differently from its exercise, which is still found
    steps: [linked(reps(10, 'Squats'), 'builtin:goblet-squat')],
});
const sprints = makeWorkout({ id: 'sprints', title: 'Sprints', steps: [work(30)] });
const stretch = makeWorkout({
    id: 'stretch',
    title: 'Wind down',
    steps: [linked(work(30, "Child's pose"), 'builtin:childs-pose')],
});
const all = [legs, push, goblet, sprints, stretch];

const none: WorkoutFilters = {
    kind: 'all',
    query: '',
    favourites: false,
    muscles: [],
    onlyMine: false,
    myEquipment: [],
};
const ids = (filters: Partial<WorkoutFilters>) =>
    filterWorkouts(all, { ...none, ...filters }, byId, (id) => id === 'push').map(
        (workout) => workout.id
    );

describe('filterWorkouts', () => {
    it('keeps them all, in order, with nothing chosen', () => {
        expect(ids({})).toEqual(['legs', 'push', 'goblet', 'sprints', 'stretch']);
    });

    it('keeps only workouts of stretches, or only those with more in them', () => {
        expect(ids({ kind: 'stretches' })).toEqual(['stretch']);
        // Sprints is linked to no exercise, so it isn't stretches
        expect(ids({ kind: 'training' })).toEqual(['legs', 'push', 'goblet', 'sprints']);
    });

    it("finds a search in the title, a step's name or its exercise's, in any case", () => {
        expect(ids({ query: 'LEGS' })).toEqual(['legs']);
        expect(ids({ query: '  squat ' })).toEqual(['legs', 'goblet']);
        expect(ids({ query: 'goblet' })).toEqual(['goblet']);
    });

    it('finds every word of a search, anywhere in the workout', () => {
        expect(ids({ query: 'day squat' })).toEqual(['legs']);
        expect(ids({ query: 'day push' })).toEqual([]);
    });

    it('keeps only favourites', () => {
        expect(ids({ favourites: true })).toEqual(['push']);
    });

    it('keeps those working any of the muscles as a main muscle', () => {
        expect(ids({ muscles: ['chest'] })).toEqual(['push']);
        expect(ids({ muscles: ['chest', 'quads'] })).toEqual(['legs', 'push', 'goblet']);
        // The back squat only supports the hamstrings
        expect(ids({ muscles: ['hamstrings'] })).toEqual([]);
    });

    it('keeps those doable with your equipment, with Only what I have on', () => {
        expect(ids({ onlyMine: true })).toEqual(['push', 'sprints', 'stretch']);
        expect(ids({ onlyMine: true, myEquipment: ['kettlebell'] })).toEqual([
            'push',
            'goblet',
            'sprints',
            'stretch',
        ]);
    });

    it('keeps only those passing every filter at once', () => {
        expect(ids({ query: 'squat', onlyMine: true, myEquipment: ['dumbbells'] })).toEqual([
            'goblet',
        ]);
    });
});
