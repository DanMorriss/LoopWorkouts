import { firstWorkout } from './first-workout';

describe('firstWorkout (NAV-4)', () => {
    it('to build muscle, offers the one using the most of what you have', () => {
        // In a gym, the whole-body one for beginners, not the start of a split
        expect(firstWorkout('muscle', ['machine', 'dumbbells', 'bench', 'cable']).title).toBe(
            'Gym full body'
        );
        expect(
            firstWorkout('muscle', ['barbell', 'bench', 'rack', 'cable', 'dumbbells']).title
        ).toBe('Dumbbell full body');
        expect(firstWorkout('muscle', ['dumbbells', 'bench']).title).toBe('Dumbbell full body');
        expect(firstWorkout('muscle', ['kettlebell']).title).toBe('Kettlebell full body');
        expect(firstWorkout('muscle', []).title).toBe('Bodyweight basics');
    });

    it('for fitness, offers a kettlebell circuit, or a quick one that needs nothing', () => {
        expect(firstWorkout('fitness', ['kettlebell']).title).toBe('Kettlebell full body');
        expect(firstWorkout('fitness', ['dumbbells']).title).toBe('20-minute AMRAP');
    });
});
