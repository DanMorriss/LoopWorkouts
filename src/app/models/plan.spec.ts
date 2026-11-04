import {
    copyPlan,
    dueToday,
    EMPTY_PLAN,
    isWeekPlan,
    plannedKey,
    startOfWeek,
    thisWeek,
    WeekPlan,
    weekdayOf,
} from './plan';

/** On the device's calendar: Wednesday 28 October 2026, at `hour`. */
const wednesday = (hour = 10) => new Date(2026, 9, 28, hour).getTime();
const day = (date: number, hour = 10) => new Date(2026, 9, date, hour).getTime();

const plan = (days: string[][]): WeekPlan => ({ days, updatedAt: 1 });

describe('the weekly plan (PLN-1)', () => {
    it('counts days from Monday, on the device calendar', () => {
        expect(weekdayOf(day(26))).toBe(0);
        expect(weekdayOf(wednesday())).toBe(2);
        // Sunday 1 November, just after midnight
        expect(weekdayOf(new Date(2026, 10, 1, 0, 5).getTime())).toBe(6);
        expect(startOfWeek(wednesday(23))).toBe(new Date(2026, 9, 26).getTime());
        expect(startOfWeek(day(26, 0))).toBe(new Date(2026, 9, 26).getTime());
    });

    it('takes seven days of workout ids and when it changed', () => {
        expect(isWeekPlan(EMPTY_PLAN)).toBe(true);
        expect(isWeekPlan(plan([['a'], [], [], [], [], [], ['a', 'b']]))).toBe(true);
        expect(isWeekPlan(plan([[], [], []]))).toBe(false);
        expect(isWeekPlan(plan([[''], [], [], [], [], [], []]))).toBe(false);
        expect(isWeekPlan({ days: EMPTY_PLAN.days })).toBe(false);
        expect(isWeekPlan(null)).toBe(false);
        // When each was planned is optional, so plans from before it still read
        expect(
            isWeekPlan({ ...plan([['a'], [], [], [], [], [], []]), plannedAt: { '0:a': 5 } })
        ).toBe(true);
        expect(isWeekPlan({ ...plan([['a'], [], [], [], [], [], []]), plannedAt: 'soon' })).toBe(
            false
        );
    });

    it('copies when each was planned, only for workouts still planned, and only real times', () => {
        expect(
            copyPlan({
                days: [['a'], [], [], [], [], [], []],
                updatedAt: 1,
                plannedAt: { '0:a': 5, '0:gone': 6, '1:a': 7 },
            })
        ).toEqual({ days: [['a'], [], [], [], [], [], []], updatedAt: 1, plannedAt: { '0:a': 5 } });
        expect(
            copyPlan({
                days: [['a'], [], [], [], [], [], []],
                updatedAt: 1,
                plannedAt: { '0:a': -1 },
            })
        ).toEqual({ days: [['a'], [], [], [], [], [], []], updatedAt: 1 });
    });
});

describe('this week (PLN-3)', () => {
    const week = plan([['legs'], ['push'], ['pull', 'legs'], [], ['push'], [], []]);
    const all = () => true;

    it('says which planned workouts were done, missed, are due today or to come', () => {
        const entries = [
            // Run on Monday as planned, and Tuesday's push day run on Wednesday instead
            { workoutId: 'legs', startedAt: day(26, 18) },
            { workoutId: 'push', startedAt: wednesday(8) },
            // Last week's doesn't count
            { workoutId: 'push', startedAt: day(20) },
            { workoutId: 'pull', startedAt: wednesday(9) },
        ];

        const statuses = thisWeek(week, entries, wednesday(), all).map((planned) =>
            planned.map((item) => `${item.workoutId} ${item.status}`)
        );

        expect(statuses).toEqual([
            ['legs done'],
            ['push missed'],
            ['pull done', 'legs today'],
            [],
            ['push to come'],
            [],
            [],
        ]);
    });

    it("doesn't count a workout planned once its day had gone by: it starts next week", () => {
        const late: WeekPlan = {
            ...week,
            plannedAt: {
                // Monday's legs planned on Tuesday, too late for this week
                [plannedKey(0, 'legs')]: day(27, 9),
                // Tuesday's push planned on Monday, in time: it was missed
                [plannedKey(1, 'push')]: day(26, 20),
                // Today's pull planned this morning, in time for today
                [plannedKey(2, 'pull')]: wednesday(7),
            },
        };

        const statuses = thisWeek(late, [], wednesday(), all).map((planned) =>
            planned.map((item) => `${item.workoutId} ${item.status}`)
        );

        expect(statuses[0]).toEqual(['legs next week']);
        expect(statuses[1]).toEqual(['push missed']);
        expect(statuses[2]).toEqual(['pull today', 'legs today']);
    });

    it('still counts one done that day, however late it was planned', () => {
        const late: WeekPlan = { ...week, plannedAt: { [plannedKey(0, 'legs')]: day(27, 9) } };
        expect(
            thisWeek(late, [{ workoutId: 'legs', startedAt: day(26, 18) }], wednesday(), all)[0]
        ).toEqual([{ workoutId: 'legs', status: 'done' }]);
    });

    it('leaves out workouts no longer in the library', () => {
        expect(thisWeek(week, [], wednesday(), (id) => id !== 'legs')[2]).toEqual([
            { workoutId: 'pull', status: 'today' },
        ]);
    });
});

describe('due today (PLN-2)', () => {
    it("is today's planned workouts not run yet today, in the plan's order", () => {
        const week = plan([[], [], ['pull', 'legs', 'core'], [], [], [], []]);
        const entries = [{ workoutId: 'legs', startedAt: wednesday(7) }];

        expect(dueToday(week, entries, wednesday(), () => true)).toEqual(['pull', 'core']);
        expect(dueToday(week, [], day(29), () => true)).toEqual([]);
    });
});
