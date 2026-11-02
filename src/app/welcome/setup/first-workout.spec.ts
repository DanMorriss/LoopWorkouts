import { firstWorkout } from './first-workout';

describe('firstWorkout (NAV-4)', () => {
    it('to build muscle, offers the one using the most of what you have', () => {
        expect(
            firstWorkout('muscle', ['barbell', 'bench', 'rack', 'cable', 'dumbbells']).title
        ).toBe('Gym push');
        expect(firstWorkout('muscle', ['dumbbells', 'bench']).title).toBe('Dumbbell full body');
        expect(firstWorkout('muscle', ['kettlebell']).title).toBe('Kettlebell full body');
        expect(firstWorkout('muscle', []).title).toBe('Bodyweight basics');
    });

    it('for fitness, offers a kettlebell circuit, or a quick one that needs nothing', () => {
        expect(firstWorkout('fitness', ['kettlebell']).title).toBe('Kettlebell full body');
        expect(firstWorkout('fitness', ['dumbbells']).title).toBe('20-minute AMRAP');
    });
});
