import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { Exercise, exerciseKey, MeasuredBy, OwnExercise } from './exercise';
import {
    ExerciseFinder,
    exerciseUsage,
    findByName,
    linkSets,
    linkSteps,
    searchExercises,
} from './exercise-links';
import { HistoryEntry } from './history';
import { makeWorkout } from '../shared/testing/make-workout';
import { Step } from './workout';

function own(id: string, name: string, otherNames: string[] = []): OwnExercise {
    return {
        id,
        updatedAt: 1,
        name,
        otherNames,
        equipment: [],
        measuredBy: 'reps',
        effort: 'moderate',
        mainMuscles: [],
        supportingMuscles: [],
        description: '',
        steps: [],
        tips: [],
    };
}

/** Finds among the built-in exercises and `mine`, making new ones into `mine`. */
function finder(mine: OwnExercise[] = []): ExerciseFinder & { made: [string, MeasuredBy][] } {
    const made: [string, MeasuredBy][] = [];
    const all = () => [...BUILT_IN_EXERCISES, ...mine] as Exercise[];
    return {
        made,
        find: (name) => findByName(name, all()),
        byId: (id) => all().find((exercise) => exercise.id === id),
        create: (name, measuredBy) => {
            made.push([name, measuredBy]);
            const exercise = own(`own-${made.length}`, name);
            mine.push(exercise);
            return exercise;
        },
    };
}

describe('exerciseKey', () => {
    it('ignores case, spaces and a plural "s"', () => {
        expect(exerciseKey('  Squats ')).toBe(exerciseKey('squat'));
        expect(exerciseKey('Push-ups')).toBe(exerciseKey('push-up'));
        expect(exerciseKey('Bench   press')).toBe(exerciseKey('bench press'));
        expect(exerciseKey('Deadlift')).not.toBe(exerciseKey('Deadlifts plus'));
    });
});

describe('findByName', () => {
    const exercises = [
        ...BUILT_IN_EXERCISES,
        own('mine', 'Zercher squat', ['Zerchers']),
    ] as Exercise[];

    it('finds a built-in exercise by its name or other names', () => {
        expect(findByName('Push-ups', exercises)?.id).toBe('builtin:push-up');
        expect(findByName('press-ups', exercises)?.id).toBe('builtin:push-up');
        expect(findByName('Squats', exercises)?.id).toBe('builtin:back-squat');
    });

    it('finds your own exercise the same way', () => {
        expect(findByName('zercher squats', exercises)?.id).toBe('mine');
        expect(findByName('Zerchers', exercises)?.id).toBe('mine');
    });

    it('finds nothing for a name no exercise has, or no name', () => {
        expect(findByName('Wall walks', exercises)).toBeUndefined();
        expect(findByName('  ', exercises)).toBeUndefined();
    });
});

describe('searchExercises', () => {
    const exercises = [
        ...BUILT_IN_EXERCISES,
        own('mine', 'Zercher squat', ['Zerchers']),
    ] as Exercise[];
    const names = (query: string, limit?: number) =>
        searchExercises(query, exercises, limit).map(({ exercise }) => exercise.name);

    it('puts the same name first, then names starting with it, then words starting with it', () => {
        const found = names('squat', 20);

        // "Squat" is one of Back squat's other names
        expect(found[0]).toBe('Back squat');
        expect(found).toContain('Zercher squat');
        expect(found).toContain('Goblet squat');
        expect(found.indexOf('Goblet squat')).toBeLessThan(found.indexOf('Zercher squat'));
    });

    it('finds by other names, and says which matched', () => {
        const [first] = searchExercises('press-up', exercises);

        expect(first).toEqual({
            exercise: expect.objectContaining({ id: 'builtin:push-up' }),
            otherName: 'Press-up',
        });
    });

    it('gives just the exercise when its own name matches', () => {
        expect(searchExercises('Zercher sq', exercises)).toEqual([{ exercise: exercises.at(-1) }]);
    });

    it('ignores case, spaces and a plural "s"', () => {
        expect(names('  PUSH-UPS ')[0]).toBe('Push-up');
    });

    it('finds nothing for an empty search, and keeps to the limit', () => {
        expect(searchExercises('  ', exercises)).toEqual([]);
        expect(names('e', 5)).toHaveLength(5);
    });
});

describe('linkSteps', () => {
    const steps: Step[] = [
        { kind: 'reps', reps: 10, name: 'Squats' },
        { kind: 'rest', seconds: 60, name: 'Breathe', exerciseId: 'stale' },
        { kind: 'work', seconds: 30, name: 'Wall sit hold' },
        { kind: 'reps', reps: 5, name: '' },
        { kind: 'work', seconds: 20, name: 'wall sit holds' },
    ];

    it('links named work steps by name, built-in first, making your own where none matches', () => {
        const exercises = finder();

        const linked = linkSteps(steps, exercises);

        expect(linked.map((s) => s.exerciseId)).toEqual([
            'builtin:back-squat',
            undefined,
            'own-1',
            undefined,
            // The same name, so the same exercise: one is made, not two
            'own-1',
        ]);
        expect(exercises.made).toEqual([['Wall sit hold', 'timed']]);
    });

    it("makes a rep step's exercise measured by reps", () => {
        const exercises = finder();

        linkSteps([{ kind: 'reps', reps: 8, name: 'Ring row' }], exercises);

        expect(exercises.made).toEqual([['Ring row', 'reps']]);
    });

    it('takes away any link from a rest or an unnamed step, keeping the rest of the step', () => {
        const linked = linkSteps(
            [
                { kind: 'rest', seconds: 60, name: 'Breathe', exerciseId: 'stale' },
                { kind: 'reps', reps: 5, name: ' ', exerciseId: 'stale', weight: 20 },
            ],
            finder()
        );

        expect(linked).toEqual([
            { kind: 'rest', seconds: 60, name: 'Breathe' },
            { kind: 'reps', reps: 5, name: ' ', weight: 20 },
        ]);
    });

    it('keeps the exercise picked for a step, whatever its name', () => {
        const [linked] = linkSteps(
            [{ kind: 'reps', reps: 10, name: 'Squats', exerciseId: 'builtin:front-squat' }],
            finder()
        );

        expect(linked.exerciseId).toBe('builtin:front-squat');
    });

    it("links by name a step whose exercise isn't there any more", () => {
        const exercises = finder();

        const [linked] = linkSteps(
            [{ kind: 'reps', reps: 10, name: 'Push-ups', exerciseId: 'gone' }],
            exercises
        );

        expect(linked.exerciseId).toBe('builtin:push-up');
        expect(exercises.made).toEqual([]);
    });
});

describe('linkSets', () => {
    it('links named sets with no exercise yet, and leaves linked and unnamed ones be', () => {
        const exercises = finder();

        const linked = linkSets(
            [
                { round: 0, step: 0, name: 'Squats', reps: 10 },
                { round: 0, step: 1, name: 'Squats', reps: 8, exerciseId: 'kept' },
                { round: 0, step: 2, name: '', reps: 5 },
                { round: 0, step: 3, name: 'Sled push', reps: 3 },
            ],
            exercises
        );

        expect(linked.map((s) => s.exerciseId)).toEqual([
            'builtin:back-squat',
            'kept',
            undefined,
            'own-1',
        ]);
        expect(exercises.made).toEqual([['Sled push', 'reps']]);
    });
});

describe('exerciseUsage', () => {
    const legs = makeWorkout({
        id: 'legs',
        title: 'Legs',
        steps: [{ kind: 'reps', reps: 5, name: 'Sled push', exerciseId: 'sled' }],
    });
    const arms = makeWorkout({ id: 'arms', title: 'Arms' });
    const entry = (exerciseId?: string) =>
        ({
            id: 'run',
            sets: [{ round: 0, step: 0, name: 'Sled push', reps: 5, exerciseId }],
        }) as HistoryEntry;

    it('finds the workouts with a step that is the exercise', () => {
        expect(exerciseUsage('sled', [legs, arms], []).workouts).toEqual([legs]);
        expect(exerciseUsage('other', [legs, arms], []).workouts).toEqual([]);
    });

    it('counts the workout running, once', () => {
        const running = { ...legs, id: 'unsaved' };

        expect(exerciseUsage('sled', [arms], [], running).workouts).toEqual([running]);
        expect(exerciseUsage('sled', [legs], [], legs).workouts).toEqual([legs]);
    });

    it('says whether the history has a set of it', () => {
        expect(exerciseUsage('sled', [], [entry('sled')]).inHistory).toBe(true);
        expect(exerciseUsage('sled', [], [entry(undefined)]).inHistory).toBe(false);
    });
});
