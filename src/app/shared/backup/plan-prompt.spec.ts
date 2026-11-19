import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import { allSteps } from '../../models/workout';
import { BACKUP_VERSION, readBackup } from './backup-file';
import { planPrompt } from './plan-prompt';

describe('planPrompt', () => {
    const prompt = planPrompt();

    it('asks for a file of the version this app reads', () => {
        expect(prompt).toContain(`"version": always ${BACKUP_VERSION}`);
    });

    it('lists every built-in exercise by name', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(prompt).toContain(exercise.name);
        }
    });

    it('gives an example that imports cleanly', () => {
        const example = prompt.slice(
            prompt.indexOf('AN EXAMPLE\n') + 'AN EXAMPLE\n'.length,
            prompt.indexOf('\n\nIf anything')
        );

        const result = readBackup(example);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.newWorkouts).toHaveLength(1);
        // Headings over its parts
        expect(result.newWorkouts[0].blocks[0]).toEqual({ kind: 'heading', text: 'Warmup' });
        // Sets as groups: 3 × 8 squats with 90 seconds between
        expect(result.newWorkouts[0].blocks[3]).toEqual(
            expect.objectContaining({ kind: 'group', rounds: 3, restSeconds: 90 })
        );
        // One whose sets vary
        expect(allSteps(result.newWorkouts[0])[2]).toEqual(
            expect.objectContaining({
                sets: [
                    { reps: 12, weight: 40 },
                    { reps: 10, weight: 45 },
                    { reps: 8, weight: 50 },
                ],
            })
        );
        // And one done each side
        expect(result.newWorkouts[0].blocks[5]).toEqual(
            expect.objectContaining({ steps: [expect.objectContaining({ eachSide: true })] })
        );
        expect(result.exercises).toHaveLength(1);
        expect(result.skipped).toBe(0);
    });

    it('keeps "each side" off exercises whose sides take turns, such as a dead bug', () => {
        expect(prompt).toContain('Leave it out for an exercise whose sides take turns');
        expect(prompt).toContain('a dead bug');
        expect(prompt).toContain('"10 each side" is 20 reps');
    });

    it('ends ready for the plan to be pasted after it', () => {
        expect(prompt.endsWith('MY PLAN\n')).toBe(true);
    });
});
