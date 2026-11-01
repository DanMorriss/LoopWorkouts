import { BUILT_IN_EXERCISES } from '../../../models/built-in-exercises';
import { canDoWith, Equipment, Exercise } from '../../../models/exercise';
import { swapSuggestions } from './swap-suggestions';

const byId = (id: string) =>
    BUILT_IN_EXERCISES.find((exercise) => exercise.id === `builtin:${id}`)!;
const suggested = (id: string, myEquipment: Equipment[] = [], exercises = BUILT_IN_EXERCISES) => {
    const current = byId(id);
    return swapSuggestions(current, current.measuredBy, exercises, myEquipment);
};
const names = (exercises: Exercise[]) => exercises.map((exercise) => exercise.name);

describe('swapSuggestions', () => {
    it('offers the closest five by main muscles, not itself', () => {
        const forBench = suggested('bench-press');

        expect(forBench).toHaveLength(5);
        expect(names(forBench)).not.toContain('Bench press');
        expect(names(forBench)).toContain('Push-up');
        expect(names(forBench)).toContain('Dumbbell bench press');
        for (const exercise of forBench) {
            expect(exercise.mainMuscles).toContain('chest');
        }
    });

    it('puts an exact match of main muscles above one working extra main muscles', () => {
        // Push-up works the chest, as bench press does; diamond push-up adds the triceps
        const forBench = names(suggested('bench-press'));

        expect(forBench).not.toContain('Diamond push-up');
    });

    it('puts ones needing none of its equipment first, as that may be what is taken', () => {
        // Bodyweight squat and goblet squat need no barbell or rack; front squat needs both
        const forSquat = names(
            suggested('back-squat', [], [byId('front-squat'), byId('goblet-squat')])
        );

        expect(forSquat).toEqual(['Goblet squat', 'Front squat']);
    });

    it('offers only what can be done with my equipment, once picked', () => {
        for (const exercise of suggested('back-squat', ['dumbbells'])) {
            expect(canDoWith(exercise, ['dumbbells'])).toBe(true);
        }
        expect(names(suggested('back-squat', ['dumbbells']))).toContain('Goblet squat');
    });

    it('offers only exercises measured the same way', () => {
        const current = byId('plank');

        expect(
            swapSuggestions(current, 'timed', BUILT_IN_EXERCISES, []).every(
                (exercise) => exercise.measuredBy === 'timed'
            )
        ).toBe(true);
    });

    it('offers nothing when nothing shares a main muscle', () => {
        expect(suggested('bench-press', [], [byId('calf-raise'), byId('leg-curl')])).toEqual([]);
    });
});
