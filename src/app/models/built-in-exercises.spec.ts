import { BUILT_IN_MOVEMENTS } from './built-in-exercise-movements';
import { BUILT_IN_EXERCISE_TEXT } from './built-in-exercise-text';
import { BUILT_IN_EXERCISES } from './built-in-exercises';

// The content rules from docs/features/exercises.md, so each new batch is held to them
describe('built-in exercises', () => {
    // As old step names are matched when they carry over: ignoring case and a plural "s"
    const normalise = (name: string) => name.trim().toLowerCase().replace(/s$/, '');

    it('each have an id made from the name, that no other uses', () => {
        const ids = BUILT_IN_EXERCISES.map((exercise) => exercise.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(exercise.id).toMatch(/^builtin:[a-z0-9]+(-[a-z0-9]+)*$/);
        }
    });

    it('each have names, other names included, that no other exercise uses, plurals too', () => {
        const names = BUILT_IN_EXERCISES.flatMap((exercise) =>
            [exercise.name, ...exercise.otherNames].map(normalise)
        );
        expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
    });

    it('each work some main muscles, and no muscle is both main and supporting', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(exercise.mainMuscles.length, exercise.name).toBeGreaterThan(0);
            const both = exercise.mainMuscles.filter((m) => exercise.supportingMuscles.includes(m));
            expect(both, exercise.name).toEqual([]);
        }
    });

    it('each list the equipment they need, or none, but not both', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(exercise.equipment.length, exercise.name).toBeGreaterThan(0);
            const items = exercise.equipment.flat();
            if (items.includes('none')) {
                expect(exercise.equipment, exercise.name).toEqual(['none']);
            }
            // A choice can show up in two needs ("a barbell in a rack, or a Smith machine"),
            // but nothing is listed twice in one, or both on its own and in a choice.
            for (const need of exercise.equipment) {
                if (typeof need !== 'string') {
                    expect(new Set(need).size, exercise.name).toBe(need.length);
                }
            }
            const single = exercise.equipment.filter((need) => typeof need === 'string');
            expect(new Set(single).size, exercise.name).toBe(single.length);
            for (const item of single) {
                expect(
                    exercise.equipment.some(
                        (need) => typeof need !== 'string' && need.includes(item)
                    ),
                    `${exercise.name}: ${item}`
                ).toBe(false);
            }
        }
    });

    it('offer a choice of equipment only between two or more things', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            for (const need of exercise.equipment) {
                if (typeof need !== 'string') {
                    expect(need.length, exercise.name).toBeGreaterThanOrEqual(2);
                }
            }
        }
    });

    it('each have their words, in the same order, and there are none for anything else', () => {
        expect(Object.keys(BUILT_IN_EXERCISE_TEXT)).toEqual(
            BUILT_IN_EXERCISES.map((exercise) => exercise.id)
        );
    });

    it('each have their movement, in the same order, and there are none for anything else', () => {
        expect(Object.keys(BUILT_IN_MOVEMENTS)).toEqual(
            BUILT_IN_EXERCISES.map((exercise) => exercise.id)
        );
    });

    it('are short enough to read between sets', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            const text = BUILT_IN_EXERCISE_TEXT[exercise.id];
            expect(text.description.length, exercise.name).toBeLessThanOrEqual(140);
            expect(text.steps.length, exercise.name).toBeGreaterThanOrEqual(3);
            expect(text.steps.length, exercise.name).toBeLessThanOrEqual(5);
            expect(text.tips.length, exercise.name).toBeGreaterThanOrEqual(1);
            expect(text.tips.length, exercise.name).toBeLessThanOrEqual(2);
            for (const line of [...text.steps, ...text.tips]) {
                expect(line.length, line).toBeLessThanOrEqual(140);
            }
        }
    });
});
