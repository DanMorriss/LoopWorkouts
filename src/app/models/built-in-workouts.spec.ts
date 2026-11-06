import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { BUILT_IN_WORKOUTS, builtInWorkoutEquipment, copyOfBuiltIn } from './built-in-workouts';
import { canDoWith } from './exercise';
import { allSteps, groupKind, MAX_HEADINGS, MAX_STEPS } from './workout';
import { readWorkout } from '../shared/state/workout-store.service';

const byTitle = (title: string) => BUILT_IN_WORKOUTS.find((w) => w.title === title)!;

describe('BUILT_IN_WORKOUTS', () => {
    it('has unique ids, in kebab case, and unique titles', () => {
        const ids = BUILT_IN_WORKOUTS.map((w) => w.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach((id) => expect(id).toMatch(/^builtin:[a-z0-9]+(-[a-z0-9]+)*$/));
        const titles = BUILT_IN_WORKOUTS.map((w) => w.title.toLowerCase());
        expect(new Set(titles).size).toBe(titles.length);
    });

    it.each(BUILT_IN_WORKOUTS.map((w) => [w.title, w] as const))(
        '%s is a workout the app can save, of built-in exercises',
        (_title, workout) => {
            // Read back as a saved workout is, nothing in it dropped or changed
            const saved = { ...copyOfBuiltIn(workout), id: 'copy', updatedAt: 1 };
            expect(readWorkout(JSON.parse(JSON.stringify(saved)))).toEqual(saved);

            const steps = allSteps(workout);
            expect(steps.length).toBeLessThanOrEqual(MAX_STEPS);
            expect(workout.blocks.filter((b) => b.kind === 'heading').length).toBeLessThanOrEqual(
                MAX_HEADINGS
            );
            for (const step of steps.filter((s) => s.kind !== 'rest')) {
                const exercise = BUILT_IN_EXERCISES.find((e) => e.id === step.exerciseId);
                expect(exercise, step.name).toBeDefined();
                expect(step.name).toBe(exercise!.name);
                // No weights: everyone's are their own
                expect('weight' in step).toBe(false);
            }
            for (const block of workout.blocks) {
                if (block.kind !== 'group') continue;
                // A superset of one round would open in Create as separate steps
                if (groupKind(block.steps) !== 'exercise') {
                    expect(block.rounds).toBeGreaterThan(1);
                }
                for (const step of block.steps) {
                    if (step.kind !== 'rest' && step.sets) {
                        expect(step.sets).toHaveLength(block.rounds);
                    }
                }
            }
            expect(workout.description.length).toBeLessThanOrEqual(90);
        }
    );

    it('fits each group to what it needs', () => {
        const needs = (title: string) => builtInWorkoutEquipment(byTitle(title));
        for (const workout of BUILT_IN_WORKOUTS.filter((w) => w.group === 'bodyweight')) {
            expect(builtInWorkoutEquipment(workout), workout.title).toEqual(['none']);
        }
        expect(canDoWith({ equipment: needs('Kettlebell full body') }, ['kettlebell'])).toBe(true);
        expect(canDoWith({ equipment: needs('Dumbbell full body') }, ['dumbbells', 'bench'])).toBe(
            true
        );
        expect(canDoWith({ equipment: needs('Dumbbell full body') }, ['dumbbells'])).toBe(false);
        expect(canDoWith({ equipment: needs('Gym push') }, ['dumbbells', 'bench'])).toBe(false);
        expect(canDoWith({ equipment: needs('Dumbbell upper') }, ['dumbbells', 'bench'])).toBe(
            true
        );
        expect(canDoWith({ equipment: needs('Dumbbell lower') }, ['dumbbells', 'bench'])).toBe(
            true
        );
        expect(canDoWith({ equipment: needs('Kettlebell AMRAP') }, ['kettlebell'])).toBe(true);
        // Other kit: each needs only its own piece
        expect(needs('Pull-up bar and dips')).toEqual(['pull-up bar', 'parallel bars']);
        expect(needs('Step circuit')).toEqual(['step']);
    });

    it('fills the gaps the first batch left (the second batch, 2026-11-03)', () => {
        // Every piece of equipment someone can pick for themselves, but the most specialised,
        // has a ready-made workout using it
        const used = new Set(BUILT_IN_WORKOUTS.flatMap((w) => builtInWorkoutEquipment(w)).flat());
        for (const piece of ['pull-up bar', 'parallel bars', 'step', 'machine', 'cable'] as const) {
            expect(used.has(piece), piece).toBe(true);
        }
        // The small muscles the big lifts leave out are some workout's main muscles
        const main = new Set(
            BUILT_IN_WORKOUTS.flatMap((w) => allSteps(w))
                .map((step) => BUILT_IN_EXERCISES.find((e) => e.id === step.exerciseId))
                .flatMap((exercise) => exercise?.mainMuscles ?? [])
        );
        for (const muscle of ['abductors', 'adductors', 'forearms', 'traps', 'calves'] as const) {
            expect(main.has(muscle), muscle).toBe(true);
        }
    });
});

describe('builtInWorkoutEquipment', () => {
    it('lists each need once, leaving out choices met by a piece it needs anyway', () => {
        expect(builtInWorkoutEquipment(byTitle('Kettlebell full body'))).toEqual(['kettlebell']);
        expect(builtInWorkoutEquipment(byTitle('Dumbbell full body'))).toEqual([
            'dumbbells',
            'bench',
        ]);
    });

    it('keeps a choice nothing else meets', () => {
        const goblet = {
            kind: 'reps' as const,
            reps: 10,
            name: 'Goblet squat',
            exerciseId: 'builtin:goblet-squat',
        };
        expect(
            builtInWorkoutEquipment({
                blocks: [{ kind: 'group', rounds: 1, restSeconds: 0, steps: [goblet] }],
            })
        ).toEqual([['dumbbells', 'kettlebell']]);
    });
});

describe('copyOfBuiltIn', () => {
    it('copies its steps, so changing the copy leaves the built-in one alone', () => {
        const workout = byTitle('Gym legs');
        const copy = copyOfBuiltIn(workout);
        expect(copy).toEqual({ title: 'Gym legs', blocks: workout.blocks, repeats: 1 });
        expect(copy.blocks).not.toBe(workout.blocks);
        expect(copy).not.toHaveProperty('id');
    });

    it('keeps a time limit', () => {
        expect(copyOfBuiltIn(byTitle('20-minute AMRAP')).timeLimitSeconds).toBe(1200);
    });
});
