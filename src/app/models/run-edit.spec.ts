import { makeWorkout, rest } from '../shared/testing/make-workout';
import { canTakeEdit, editSwaps } from './run-edit';
import { withSwaps } from './step-swap';
import { allSteps, Step, Workout } from './workout';

const plank: Step = { kind: 'work', seconds: 30, name: 'Plank', exerciseId: 'builtin:plank' };
const sidePlank: Step = {
    kind: 'work',
    seconds: 30,
    name: 'Side plank',
    exerciseId: 'builtin:side-plank',
};
const pushUps: Step = { kind: 'reps', reps: 10, name: 'Push-up', exerciseId: 'builtin:push-up' };
const running = makeWorkout({ steps: [plank, rest(20), pushUps], repeats: 2 });
const edited = (steps: Step[], changes: Partial<Workout> = {}): Workout => ({
    ...makeWorkout({ steps, repeats: 2 }),
    ...changes,
});

describe('canTakeEdit', () => {
    it("takes another exercise, name, reps or weight, which don't move the clock", () => {
        expect(canTakeEdit(running, edited([sidePlank, rest(20), pushUps]))).toBe(true);
        expect(
            canTakeEdit(running, edited([plank, rest(20), { ...pushUps, reps: 12, weight: 10 }]))
        ).toBe(true);
    });

    it('takes a heading, which takes no time', () => {
        const withHeading = {
            ...running,
            blocks: [{ kind: 'heading' as const, text: 'Core' }, ...running.blocks],
        };

        expect(canTakeEdit(running, withHeading)).toBe(true);
    });

    it('takes the same steps grouped another way, as Create saves each exercise as a group', () => {
        const eachAGroup = {
            ...running,
            blocks: allSteps(running).map((step) => ({
                kind: 'group' as const,
                rounds: 1,
                restSeconds: 0,
                steps: [step],
            })),
        };

        expect(canTakeEdit(running, eachAGroup)).toBe(true);
    });

    it("doesn't take a step added, removed or moved, a time, or the rounds changed", () => {
        expect(canTakeEdit(running, edited([plank, rest(20), pushUps, plank]))).toBe(false);
        expect(canTakeEdit(running, edited([plank, pushUps]))).toBe(false);
        expect(canTakeEdit(running, edited([pushUps, rest(20), plank]))).toBe(false);
        expect(canTakeEdit(running, edited([{ ...plank, seconds: 45 }, rest(20), pushUps]))).toBe(
            false
        );
        expect(canTakeEdit(running, edited([plank, rest(20), pushUps], { repeats: 3 }))).toBe(
            false
        );
        // Carrying straight on after rests changes what waits for Start, which holds the clock
        expect(canTakeEdit(running, edited([plank, rest(20), pushUps], { carryOn: true }))).toBe(
            false
        );
    });
});

describe('editSwaps', () => {
    it('swaps each step made another exercise, from where the run is, marked as an edit', () => {
        const edit = edited([sidePlank, rest(20), { ...pushUps, reps: 12 }]);

        expect(editSwaps(running, edit, 3)).toEqual([
            { step: 0, from: 3, original: plank, swapped: sidePlank, edited: true },
        ]);
    });

    it('runs each step as the edited workout has it, over an earlier swap of it', () => {
        const edit = edited([sidePlank, rest(20), pushUps]);
        const earlier = {
            step: 0,
            from: 0,
            original: plank,
            swapped: { ...plank, name: 'Wall sit' },
        };

        const runs = withSwaps(edit, [earlier, ...editSwaps(running, edit, 3)]);

        expect(allSteps(runs)[0]).toEqual(sidePlank);
    });
});
