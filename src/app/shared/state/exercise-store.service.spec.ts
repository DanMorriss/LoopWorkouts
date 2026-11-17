import { TestBed } from '@angular/core/testing';
import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import {
    MAX_EXERCISE_LINE_LENGTH,
    MAX_EXERCISE_NOTE_LENGTH,
    MAX_EXERCISE_STEPS,
} from '../../models/exercise';
import {
    EXERCISE_NOTES_KEY,
    EXERCISES_KEY,
    ExerciseStore,
    HIDDEN_EXERCISES_KEY,
    readExerciseNote,
    readHiddenExercise,
    readOwnExercise,
} from './exercise-store.service';

const NOW = 5_000_000;
const saved = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('ExerciseStore', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
    });
    afterEach(() => localStorage.clear());

    const createStore = () => TestBed.inject(ExerciseStore);

    it('has every built-in exercise, and none of your own to begin with', () => {
        const store = createStore();

        expect(store.exercises()).toEqual(BUILT_IN_EXERCISES);
        expect(store.own()).toEqual([]);
    });

    it('makes an exercise of your own, tidied, dated and saved, listed after the built-in ones', () => {
        const store = createStore();

        const made = store.addOwn('  Zercher   squat ', 'reps');

        expect(made).toEqual({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            updatedAt: NOW,
            name: 'Zercher squat',
            otherNames: [],
            equipment: [],
            measuredBy: 'reps',
            mainMuscles: [],
            supportingMuscles: [],
            description: '',
            steps: [],
            tips: [],
        });
        expect(store.exercises().at(-1)).toEqual(made);
        expect(store.byId(made.id)).toEqual(made);
        expect(saved(EXERCISES_KEY)).toEqual([made]);
    });

    it('finds by name for linking, and makes your own when nothing matches', () => {
        const store = createStore();

        expect(store.finder.find('deadlifts')?.id).toBe('builtin:deadlift');
        const made = store.finder.create('Sled push', 'reps');
        expect(store.finder.find('sled pushes')).toBeUndefined();
        expect(store.finder.find('Sled push')?.id).toBe(made.id);
    });

    it('loads your saved exercises, dropping broken ones', () => {
        const good = createStore().addOwn('Sled push', 'reps');
        localStorage.setItem(
            EXERCISES_KEY,
            JSON.stringify([
                good,
                { id: 'builtin:fake', name: 'X', measuredBy: 'reps', updatedAt: 1 },
                'x',
            ])
        );
        TestBed.resetTestingModule();

        expect(createStore().own()).toEqual([good]);
    });

    describe('changing your own exercise', () => {
        const details = {
            name: 'Sled push',
            measuredBy: 'reps' as const,
            equipment: [],
            mainMuscles: [],
            supportingMuscles: [],
            description: '',
            steps: [],
            tips: [],
        };

        it('renames it and saves its details, tidied and dated', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');
            vi.spyOn(Date, 'now').mockReturnValue(NOW + 1);

            const updated = store.updateOwn(mine.id, {
                name: '  Sled   drag ',
                measuredBy: 'timed',
                equipment: ['machine'],
                mainMuscles: ['quads', 'glutes'],
                // A muscle in both counts as main
                supportingMuscles: ['glutes', 'calves'],
                description: '  Pulled backwards.  ',
                steps: [' Lean in. ', '', 'Drive with your legs.'],
                tips: ['  Short steps.'],
            });

            expect(updated).toEqual({
                ...mine,
                name: 'Sled drag',
                measuredBy: 'timed',
                equipment: ['machine'],
                mainMuscles: ['quads', 'glutes'],
                supportingMuscles: ['calves'],
                description: 'Pulled backwards.',
                steps: ['Lean in.', 'Drive with your legs.'],
                tips: ['Short steps.'],
                updatedAt: NOW + 1,
            });
            expect(store.byId(mine.id)).toEqual(updated);
            expect(saved(EXERCISES_KEY)).toEqual([updated]);
        });

        it('keeps its own name, in any case or spacing', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');

            expect(store.updateOwn(mine.id, { ...details, name: 'sled  PUSH' })?.name).toBe(
                'sled PUSH'
            );
        });

        it("won't take a name another exercise has, built-in names and other names included", () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');
            store.addOwn('Farmer walk', 'timed');

            for (const name of ['Farmer walks', 'Bench press', 'press-ups', '  ']) {
                expect(store.updateOwn(mine.id, { ...details, name })).toBeNull();
            }
            expect(store.byId(mine.id)?.name).toBe('Sled push');
        });

        it("can't change a built-in exercise, or one that isn't there", () => {
            const store = createStore();

            expect(store.updateOwn('builtin:plank', { ...details, name: 'Plonk' })).toBeNull();
            expect(store.updateOwn('gone', details)).toBeNull();
        });

        it('caps how many steps and tips there are, and how long each is', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');

            const updated = store.updateOwn(mine.id, {
                ...details,
                steps: Array.from({ length: MAX_EXERCISE_STEPS + 2 }, (_, i) => `Step ${i}`),
                tips: ['x'.repeat(MAX_EXERCISE_LINE_LENGTH + 5)],
            });

            expect(updated?.steps).toHaveLength(MAX_EXERCISE_STEPS);
            expect(updated?.tips[0]).toHaveLength(MAX_EXERCISE_LINE_LENGTH);
        });

        it('says whether a name is taken by another exercise', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');

            expect(store.nameTaken('SLED  push ')).toBe(true);
            expect(store.nameTaken('SLED  push ', mine.id)).toBe(false);
            expect(store.nameTaken('Squat', mine.id)).toBe(true);
            expect(store.nameTaken('Zercher squat')).toBe(false);
        });
    });

    describe('making one with its details', () => {
        it('makes and saves it, tidied', () => {
            const store = createStore();

            const made = store.createOwn({
                name: ' Sled  drag ',
                measuredBy: 'timed',
                equipment: ['machine'],
                mainMuscles: ['quads'],
                supportingMuscles: ['quads', 'glutes'],
                description: ' Pulled backwards. ',
                steps: ['Lean in.'],
                tips: [],
            });

            expect(made).toEqual(
                expect.objectContaining({
                    id: expect.stringMatching(/^[0-9a-f-]{36}$/),
                    updatedAt: NOW,
                    name: 'Sled drag',
                    otherNames: [],
                    supportingMuscles: ['glutes'],
                    description: 'Pulled backwards.',
                    steps: ['Lean in.'],
                })
            );
            expect(saved(EXERCISES_KEY)).toEqual([made]);
        });

        it("won't make one with no name, or a name that's taken", () => {
            const store = createStore();
            const blank = {
                measuredBy: 'reps' as const,
                equipment: [],
                mainMuscles: [],
                supportingMuscles: [],
                description: '',
                steps: [],
                tips: [],
            };

            expect(store.createOwn({ ...blank, name: '  ' })).toBeNull();
            expect(store.createOwn({ ...blank, name: 'squats' })).toBeNull();
            expect(store.own()).toEqual([]);
        });
    });

    describe('deleting your own exercise', () => {
        it('deletes it, its note and its place in the hidden list, leaving deletions', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');
            store.setNote(mine.id, 'Heavy');
            store.setHidden(mine.id, true);

            store.deleteOwn(mine.id);

            expect(store.byId(mine.id)).toBeUndefined();
            expect(store.noteFor(mine.id)).toBeUndefined();
            expect(store.isHidden(mine.id)).toBe(false);
            expect(saved(EXERCISES_KEY)).toEqual([]);
            // Each just after what it deletes, as the clock hasn't moved
            expect(saved('deleted')).toEqual(
                expect.arrayContaining([
                    { kind: 'exercise', id: mine.id, deletedAt: NOW + 1 },
                    { kind: 'exercise-note', id: mine.id, deletedAt: NOW + 1 },
                    { kind: 'hidden-exercise', id: mine.id, deletedAt: NOW + 1 },
                ])
            );
        });

        it("can't delete a built-in exercise", () => {
            const store = createStore();

            store.deleteOwn('builtin:plank');

            expect(store.byId('builtin:plank')).toBeDefined();
            expect(saved('deleted')).toBeNull();
        });

        it('puts one back as it was on restore, e.g. on Undo: note, hidden and all', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');
            store.setNote(mine.id, 'Heavy');
            store.setHidden(mine.id, true);
            store.deleteOwn(mine.id);

            store.restoreOwn(mine, 'Heavy', true);

            // Dated after its deletion
            expect(store.byId(mine.id)).toEqual({ ...mine, updatedAt: NOW + 2 });
            expect(store.noteFor(mine.id)).toBe('Heavy');
            expect(store.isHidden(mine.id)).toBe(true);
            expect(saved(EXERCISES_KEY)).toEqual([{ ...mine, updatedAt: NOW + 2 }]);
            // None of it is deleted any more, so a backup won't take it away again
            expect(saved('deleted')).toEqual([]);
        });
    });

    describe('hiding from the picker', () => {
        it('hides any exercise, saved, and shows it again leaving a deletion', () => {
            const store = createStore();

            store.setHidden('builtin:plank', true);
            expect(store.isHidden('builtin:plank')).toBe(true);
            expect(saved(HIDDEN_EXERCISES_KEY)).toEqual([{ id: 'builtin:plank', updatedAt: NOW }]);

            store.setHidden('builtin:plank', false);
            expect(store.isHidden('builtin:plank')).toBe(false);
            expect(saved(HIDDEN_EXERCISES_KEY)).toEqual([]);
            expect(saved('deleted')).toEqual([
                { kind: 'hidden-exercise', id: 'builtin:plank', deletedAt: NOW + 1 },
            ]);
        });

        it('keeps what is hidden across a reload', () => {
            createStore().setHidden('builtin:plank', true);
            TestBed.resetTestingModule();

            expect(createStore().isHidden('builtin:plank')).toBe(true);
        });

        it('merges hidden exercises from another copy, and ones shown again there', () => {
            const store = createStore();
            store.setHidden('builtin:plank', true);

            store.mergeHidden(
                [{ id: 'builtin:crunch', updatedAt: NOW }],
                [{ kind: 'hidden-exercise', id: 'builtin:plank', deletedAt: NOW + 1 }]
            );

            expect(store.isHidden('builtin:crunch')).toBe(true);
            expect(store.isHidden('builtin:plank')).toBe(false);
        });
    });

    describe('notes', () => {
        it('saves a note on any exercise, trimmed, cut short and dated', () => {
            const store = createStore();

            store.setNote('builtin:back-squat', '  Pause at the bottom  ');
            store.setNote('builtin:plank', 'x'.repeat(MAX_EXERCISE_NOTE_LENGTH + 10));

            expect(store.noteFor('builtin:back-squat')).toBe('Pause at the bottom');
            expect(store.noteFor('builtin:plank')).toHaveLength(MAX_EXERCISE_NOTE_LENGTH);
            expect(saved(EXERCISE_NOTES_KEY)[0]).toEqual({
                id: 'builtin:back-squat',
                text: 'Pause at the bottom',
                updatedAt: NOW,
            });
        });

        it('removes a note set to nothing, leaving a deletion behind', () => {
            const store = createStore();
            store.setNote('builtin:back-squat', 'Pause at the bottom');

            store.setNote('builtin:back-squat', '   ');

            expect(store.noteFor('builtin:back-squat')).toBeUndefined();
            expect(saved('deleted')).toEqual([
                { kind: 'exercise-note', id: 'builtin:back-squat', deletedAt: NOW + 1 },
            ]);
        });
    });

    describe('merging', () => {
        it('takes new and more recently changed exercises of your own', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');

            const result = store.mergeOwn(
                [
                    { ...mine, name: 'Sled push (heavy)', updatedAt: NOW + 1 },
                    { ...mine, id: 'other', name: 'Farmer walk', updatedAt: 1 },
                ],
                []
            );

            expect(result).toEqual({ added: 1, updated: 1, removed: 0 });
            expect(store.own().map((e) => e.name)).toEqual(['Sled push (heavy)', 'Farmer walk']);
        });

        it('takes the most recent note on each exercise, and notes removed there', () => {
            const store = createStore();
            store.setNote('builtin:back-squat', 'Old');
            store.setNote('builtin:plank', 'Kept');

            store.mergeNotes(
                [{ id: 'builtin:back-squat', text: 'New', updatedAt: NOW + 1 }],
                [{ kind: 'exercise-note', id: 'builtin:plank', deletedAt: NOW + 1 }]
            );

            expect(store.noteFor('builtin:back-squat')).toBe('New');
            expect(store.noteFor('builtin:plank')).toBeUndefined();
        });
    });
});

describe('reading saved exercises', () => {
    it('needs an id that is not built-in, a name, how it is measured and a date', () => {
        const ok = { id: 'a', name: 'Sled push', measuredBy: 'timed', updatedAt: 1 };
        expect(readOwnExercise(ok)?.name).toBe('Sled push');
        for (const broken of [
            { ...ok, id: '' },
            { ...ok, id: 'builtin:x' },
            { ...ok, name: ' ' },
            { ...ok, measuredBy: 'distance' },
            { ...ok, updatedAt: 'soon' },
        ]) {
            expect(readOwnExercise(broken)).toBeNull();
        }
    });

    it('reads missing or broken lists as empty, and drops unknown muscles', () => {
        const read = readOwnExercise({
            id: 'a',
            name: 'Sled push',
            measuredBy: 'reps',
            updatedAt: 1,
            mainMuscles: ['quads', 'wings'],
            otherNames: 'nope',
        });

        expect(read?.mainMuscles).toEqual(['quads']);
        expect(read?.otherNames).toEqual([]);
        expect(read?.steps).toEqual([]);
    });

    it('reads the neck, since merged, as the traps, and drops the shins', () => {
        const read = readOwnExercise({
            id: 'a',
            name: 'Neck curl',
            measuredBy: 'reps',
            updatedAt: 1,
            mainMuscles: ['neck', 'traps', 'shins'],
            supportingMuscles: ['constructor', 'neck'],
        });

        expect(read?.mainMuscles).toEqual(['traps']);
        expect(read?.supportingMuscles).toEqual(['traps']);
    });

    it('reads a note only with an id and some text', () => {
        expect(readExerciseNote({ id: 'a', text: 'Hi', updatedAt: 1 })).toEqual({
            id: 'a',
            text: 'Hi',
            updatedAt: 1,
        });
        expect(readExerciseNote({ id: 'a', text: '', updatedAt: 1 })).toBeNull();
        expect(readExerciseNote({ id: '', text: 'Hi', updatedAt: 1 })).toBeNull();
    });

    it('reads a hidden exercise only with an id and a date', () => {
        expect(readHiddenExercise({ id: 'a', updatedAt: 1, extra: true })).toEqual({
            id: 'a',
            updatedAt: 1,
        });
        expect(readHiddenExercise({ id: '', updatedAt: 1 })).toBeNull();
        expect(readHiddenExercise({ id: 'a' })).toBeNull();
    });
});
