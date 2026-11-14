import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { HistoryStore } from '../../shared/state/history-store.service';
import { TimePerWeekComponent } from './time-per-week.component';

// Friday 6 November 2026, in the afternoon: this week began on Monday 2 November
const NOW = new Date(2026, 10, 6, 15).getTime();
const day = (month: number, date: number) => new Date(2026, month - 1, date, 10).getTime();

function entry(startedAt: number, activeSeconds: number): HistoryEntry {
    return {
        id: `${startedAt}-w`,
        workoutId: 'w',
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + activeSeconds * 1000,
        updatedAt: startedAt,
        activeSeconds,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
    };
}

describe('TimePerWeekComponent (PRG-12)', () => {
    let fixture: ComponentFixture<TimePerWeekComponent>;

    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        localStorage.clear();
    });
    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
        localStorage.clear();
    });

    function create(...entries: HistoryEntry[]) {
        const history = TestBed.inject(HistoryStore);
        entries.forEach((item) => history.record(item));
        fixture = TestBed.createComponent(TimePerWeekComponent);
        fixture.detectChanges();
    }

    const el = () => fixture.nativeElement as HTMLElement;
    const text = (selector: string) =>
        el().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
    const chart = () => el().querySelector<HTMLElement>('.weeks__chart')!;
    const press = (key: string) => {
        chart().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        fixture.detectChanges();
    };

    it("shows this week's time and workouts over a bar for each week", () => {
        create(entry(day(11, 3), 1800), entry(day(11, 5), 3390), entry(day(8, 20), 600));

        expect(text('.weeks__time')).toBe('1:26:30');
        expect(text('.weeks__when')).toBe('2–8 Nov · 2 workouts');
        // Only the weeks with time in them have a bar, this week's lit
        expect(el().querySelectorAll('.weeks__bar')).toHaveLength(2);
        expect(el().querySelector('.weeks__bar--shown')).toBe(
            el().querySelectorAll('.weeks__bar')[1]
        );
        // Its Monday, as at the left: "This week" on Progress means the last 7 days
        expect(text('.weeks__axis:last-of-type')).toBe('2 Nov');
    });

    it('steps through the weeks with the arrow keys, saying each one', () => {
        create(
            entry(day(11, 3), 1800),
            entry(day(10, 28), 600),
            entry(day(10, 21), 3600),
            entry(day(8, 20), 60)
        );

        chart().focus();
        press('ArrowLeft');
        expect(text('.weeks__when')).toBe('26 Oct – 1 Nov · 1 workout');
        expect(text(`#time-per-week-spoken`)).toBe('Week of 26 October: 10 minutes, 1 workout');

        press('ArrowLeft');
        expect(text('.weeks__when')).toBe('19–25 Oct · 1 workout');
        expect(text(`#time-per-week-spoken`)).toBe('Week of 19 October: 1 hour, 1 workout');

        press('Home');
        expect(text('.weeks__when')).toBe('17–23 Aug · 1 workout');

        press('ArrowRight');
        expect(text('.weeks__when')).toBe('24–30 Aug · 0 workouts');
        expect(text(`#time-per-week-spoken`)).toBe('Week of 24 August: no time, 0 workouts');

        // Leaving the chart goes back to this week
        chart().dispatchEvent(new FocusEvent('blur'));
        fixture.detectChanges();
        expect(text('.weeks__when')).toBe('2–8 Nov · 1 workout');
    });

    it('picks the week under a finger or the pointer', () => {
        create(entry(day(11, 3), 1800), entry(day(8, 18), 600));
        const svg = el().querySelector<SVGSVGElement>('.weeks__svg')!;
        const box = svg.getBoundingClientRect();

        // The first week's bar, just right of the time axis
        svg.dispatchEvent(
            new PointerEvent('pointerdown', {
                clientX: box.left + box.width * 0.12,
                clientY: box.top + box.height / 2,
            })
        );
        fixture.detectChanges();

        expect(text('.weeks__when')).toBe('17–23 Aug · 1 workout');
        expect(text('.weeks__time')).toBe('10:00');
    });

    it('swaps the bars for a table, a row a week, and back, keeping focus on its button', () => {
        create(entry(day(11, 3), 1800), entry(day(10, 21), 600));
        const toggle = el().querySelector<HTMLButtonElement>('.weeks__toggle')!;
        toggle.focus();

        toggle.click();
        fixture.detectChanges();

        expect(el().querySelector('.weeks__chart')).toBeNull();
        const rows = el().querySelectorAll('.weeks__table tbody tr');
        expect(rows).toHaveLength(3);
        expect([...rows[2].querySelectorAll('td')].map((cell) => cell.textContent!.trim())).toEqual(
            ['2 Nov', '1', '30:00']
        );
        expect(toggle.textContent!.trim()).toBe('Show as a chart');
        expect(document.activeElement).toBe(toggle);

        toggle.click();
        fixture.detectChanges();

        expect(el().querySelector('.weeks__table')).toBeNull();
        expect(el().querySelector('.weeks__chart')).not.toBeNull();
        expect(toggle.textContent!.trim()).toBe('Show as a table');
    });

    it('starts at the week of the first workout for someone new', () => {
        create(entry(day(11, 3), 1800), entry(day(10, 28), 600));

        // Two weeks share the width, so the bars are wider than with 12
        const bars = el().querySelectorAll('.weeks__bar');
        expect(bars).toHaveLength(2);
        expect(Number(bars[0].getAttribute('width'))).toBe(32);
        expect(text('#time-per-week-help')).toMatch(/^The last 2 weeks, Monday to Sunday/);
        press('Home');
        expect(text('.weeks__when')).toBe('26 Oct – 1 Nov · 1 workout');
    });

    it("has only this week's bar, with no first date, in someone's first week", () => {
        create(entry(day(11, 3), 1800));

        expect(el().querySelectorAll('.weeks__bar')).toHaveLength(1);
        const dates = [...el().querySelectorAll('text.weeks__axis')].filter(
            (label) => !label.hasAttribute('dy')
        );
        expect(dates.map((label) => label.textContent!.trim())).toEqual(['2 Nov']);
        expect(text('#time-per-week-help')).toMatch(/^The week of 2 November, Monday to Sunday/);
    });

    it('says so when nothing was done in the last 12 weeks', () => {
        create(entry(day(1, 10), 1800));

        expect(text('.weeks__empty')).toBe('No workouts in the last 12 weeks.');
        expect(el().querySelector('.weeks__chart')).toBeNull();
        expect(el().querySelector('.weeks__toggle')).toBeNull();
    });
});
