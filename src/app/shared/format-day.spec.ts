import { dayDone } from './format-day';

describe('dayDone', () => {
    // Wednesday 11 November 2026, 09:00 on the device's calendar
    const now = new Date(2026, 10, 11, 9).getTime();
    const at = (date: number, hour = 18) => new Date(2026, 10, date, hour).getTime();

    it('says today, yesterday, the day within the week, then the date', () => {
        expect(dayDone(at(11, 7), now)).toBe('today');
        expect(dayDone(at(10, 23), now)).toBe('yesterday');
        expect(dayDone(at(9), now)).toBe('Monday');
        expect(dayDone(at(5), now)).toBe('Thursday');
        expect(dayDone(at(4), now)).toBe('4 Nov');
    });
});
