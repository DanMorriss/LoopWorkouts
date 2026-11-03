import { Exercise, MuscleGroup } from './exercise';
import { asOneGroup, Workout } from './workout';
import { listMuscles, workoutToFillGaps } from './fill-gaps';

/** An exercise working `main`, helped by `supporting`. */
function exercise(id: string, main: MuscleGroup[], supporting: MuscleGroup[] = []): Exercise {
    return { id, name: id, mainMuscles: main, supportingMuscles: supporting } as Exercise;
}

const EXERCISES = new Map(
    [
        exercise('curl', ['biceps'], ['forearms']),
        exercise('plank', ['abs'], ['obliques', 'shoulders']),
        exercise('side-plank', ['obliques'], ['abs']),
        exercise('calf-raise', ['calves']),
        exercise('row', ['upper-back'], ['biceps']),
    ].map((e) => [e.id, e])
);
const byId = (id: string) => EXERCISES.get(id);

/** A workout called `title` of one set of each exercise. */
function workout(
    title: string,
    ...exercises: string[]
): Pick<Workout, 'blocks'> & { title: string } {
    return {
        title,
        blocks: asOneGroup(
            exercises.map((exerciseId) => ({
                kind: 'reps' as const,
                reps: 10,
                name: exerciseId,
                exerciseId,
            }))
        ),
    };
}

describe('workoutToFillGaps (LIB-7)', () => {
    it('picks the workout working the most missed muscles as main ones', () => {
        const best = workoutToFillGaps(
            [workout('Arms', 'curl'), workout('Core', 'plank', 'side-plank')],
            ['biceps', 'abs', 'obliques'],
            [],
            byId
        );

        expect(best?.workout.title).toBe('Core');
        expect(best?.fills).toEqual(['abs', 'obliques']);
    });

    it('counts a missed muscle it only supports, and a light one it works as a main one', () => {
        // Row: upper back (light → main, 2) and biceps (missed, supporting, 1) = 3;
        // Calves: calves (missed → main, 3) = 3; a tie goes to the first
        const best = workoutToFillGaps(
            [workout('Row', 'row'), workout('Calves', 'calf-raise')],
            ['biceps', 'calves'],
            ['upper-back'],
            byId
        );

        expect(best?.workout.title).toBe('Row');
        expect(best?.fills).toEqual(['biceps', 'upper-back']);
    });

    it("doesn't count a light muscle it only supports again", () => {
        const best = workoutToFillGaps([workout('Core', 'plank')], [], ['obliques'], byId);

        expect(best).toBeNull();
    });

    it('suggests nothing with no gaps, or none that helps', () => {
        expect(workoutToFillGaps([workout('Arms', 'curl')], [], [], byId)).toBeNull();
        expect(workoutToFillGaps([workout('Arms', 'curl')], ['calves'], [], byId)).toBeNull();
        expect(workoutToFillGaps([], ['calves'], [], byId)).toBeNull();
    });
});

describe('listMuscles', () => {
    it('joins them as a sentence, and counts the rest past four', () => {
        expect(listMuscles([])).toBe('');
        expect(listMuscles(['Abs'])).toBe('Abs');
        expect(listMuscles(['Abs', 'Obliques'])).toBe('Abs and Obliques');
        expect(listMuscles(['Abs', 'Obliques', 'Calves', 'Neck'])).toBe(
            'Abs, Obliques, Calves and Neck'
        );
        expect(listMuscles(['Abs', 'Obliques', 'Calves', 'Neck', 'Shins'])).toBe(
            'Abs, Obliques, Calves and 2 more'
        );
    });
});
