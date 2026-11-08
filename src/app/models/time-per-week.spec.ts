import { timePerWeek } from './time-per-week';

/** On the device's calendar, in 2026, at 10am. */
const on = (month: number, date: number, hour = 10) =>
    new Date(2026, month - 1, date, hour).getTime();
const entry = (startedAt: number, activeSeconds: number) => ({ startedAt, activeSeconds });

describe('time per week (PRG-12)', () => {
    // Friday 6 November 2026
    const now = on(11, 6, 18);

    it('adds up each Monday-to-Sunday week, oldest first, ending with this one', () => {
        const weeks = timePerWeek(
            [
                entry(on(11, 6), 1200),
                // Monday just after midnight is this week; Sunday night is last week
                entry(on(11, 2, 0), 600),
                entry(on(11, 1, 23), 900),
                entry(on(10, 27), 300),
                // Before the first week, so there's time before it, and not counted
                entry(on(10, 1), 100),
            ],
            now,
            3
        );

        expect(weeks).toEqual([
            { start: new Date(2026, 9, 19).getTime(), seconds: 0, workouts: 0 },
            { start: new Date(2026, 9, 26).getTime(), seconds: 1200, workouts: 2 },
            { start: new Date(2026, 10, 2).getTime(), seconds: 1800, workouts: 2 },
        ]);
    });

    it('leaves out workouts before its first week', () => {
        const weeks = timePerWeek([entry(on(10, 1), 1000), entry(on(11, 3), 60)], now, 2);

        expect(weeks.map((week) => week.seconds)).toEqual([0, 60]);
    });

    it('starts each week at midnight on Monday, across a change of the clocks', () => {
        // The UK's clocks went back on Sunday 25 October 2026
        const weeks = timePerWeek([entry(on(9, 1), 60)], now, 3);

        expect(weeks.map((week) => new Date(week.start).getHours())).toEqual([0, 0, 0]);
        expect(weeks.map((week) => new Date(week.start).getDate())).toEqual([19, 26, 2]);
    });

    it('starts no earlier than the week of the first workout', () => {
        // Wednesday of last week, then this week
        const weeks = timePerWeek([entry(on(11, 3), 60), entry(on(10, 28), 300)], now, 12);

        expect(weeks.map((week) => new Date(week.start).getDate())).toEqual([26, 2]);
        expect(weeks.map((week) => week.seconds)).toEqual([300, 60]);
    });

    it('has only this week with nothing done, or only workouts still to come', () => {
        expect(timePerWeek([], now, 12)).toEqual([
            { start: new Date(2026, 10, 2).getTime(), seconds: 0, workouts: 0 },
        ]);
        expect(timePerWeek([entry(on(12, 1), 60)], now, 12)).toHaveLength(1);
    });
});
