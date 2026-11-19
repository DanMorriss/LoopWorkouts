import { ringFor, weekDays } from './week-view';

describe("This week's days (PLN-4)", () => {
    it('makes a ring of one colour whole, and splits it with gaps between more', () => {
        expect(ringFor([])).toBe('');
        expect(ringFor([2])).toBe(
            'conic-gradient(from 0deg, var(--plan-2) 0deg 360deg, transparent 360deg 360deg)'
        );
        expect(ringFor([1, 0])).toBe(
            'conic-gradient(from -7deg, var(--plan-1) 7deg 173deg, transparent 173deg 187deg, ' +
                'var(--text-muted) 187deg 353deg, transparent 353deg 367deg)'
        );
    });

    it('gives each day its date, its kind, and its workouts, training first', () => {
        // Thursday 19 November 2026
        const now = new Date(2026, 10, 19, 9).getTime();
        const days = weekDays(
            [
                [{ workoutId: 'legs', status: 'done' }],
                [{ workoutId: 'stretch', status: 'rested', activeRest: true }],
                [],
                [
                    { workoutId: 'stretch', status: 'today', activeRest: true },
                    { workoutId: 'push', status: 'today', movedFrom: 1 },
                ],
                [{ workoutId: 'legs', status: 'next week' }],
                [],
                [],
            ],
            now,
            (id) => id[0].toUpperCase() + id.slice(1)
        );

        expect(days.map((day) => [day.short, day.date, day.kind, day.today])).toEqual([
            ['Mon', 16, 'training', false],
            ['Tue', 17, 'active-rest', false],
            ['Wed', 18, 'rest', false],
            ['Thu', 19, 'training', true],
            // Only from next week, so nothing this week
            ['Fri', 20, 'rest', false],
            ['Sat', 21, 'rest', false],
            ['Sun', 22, 'rest', false],
        ]);
        expect(days[3].colour).toBe(2);
        expect(days[3].workouts).toEqual([
            {
                workoutId: 'push',
                name: 'Push',
                status: 'today',
                activeRest: false,
                colour: 2,
                label: '',
                movedFrom: 'Moved from Tuesday',
            },
            {
                workoutId: 'stretch',
                name: 'Stretch',
                status: 'today',
                activeRest: true,
                colour: 0,
                label: '',
                movedFrom: '',
            },
        ]);
        expect(days[0].workouts[0].label).toBe('Done');
        expect(days[4].workouts[0].label).toBe('From next week');
        expect(days[4].ring).toBe('');
        expect(days[3].spoken).toBe(
            'Thursday, today: Push, due today; Stretch, active rest, due today'
        );
    });
});
