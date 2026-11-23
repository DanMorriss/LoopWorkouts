import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
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

    it('has no calories without a body weight', () => {
        create(entry(day(11, 3), 1800));

        expect(text('.weeks__when')).toBe('2–8 Nov · 1 workout');
        expect(el().textContent).not.toContain('kcal');
        expect(el().querySelectorAll('.weeks__table th')).toHaveLength(3);
    });

    it("says each week's calories with a body weight given (CAL-3)", () => {
        TestBed.inject(SettingsStore).update({ bodyWeight: 72 });
        // No sets, so at 2.5 METs: 2.5 × 72 × 5190 ÷ 3600 = 259.5, 103.8 of it resting, and an
        // afterburn of 15% of the other 155.7, 23.4: 282.9 in all, about 285
        create(entry(day(11, 3), 1800), entry(day(11, 5), 3390), entry(day(10, 27), 20));

        expect(text('.weeks__when')).toBe('2–8 Nov · 2 workouts · about 285 kcal');
        expect(text('#time-per-week-spoken')).toBe(
            'Week of 2 November: 1 hour 27 minutes, 2 workouts, about 285 calories'
        );
        // Last week's 20 seconds come to under 5
        press('ArrowLeft');
        expect(text('.weeks__when')).toBe('26 Oct – 1 Nov · 1 workout · under 5 kcal');

        const headers = Array.from(el().querySelectorAll('.weeks__table th'));
        expect(headers.map((th) => th.textContent!.trim())).toEqual([
            'Week of',
            'Workouts',
            'Time',
            'Calories',
        ]);
        const rows = Array.from(el().querySelectorAll('.weeks__table tbody tr'));
        expect(rows.map((row) => row.lastElementChild!.textContent!.trim())).toEqual([
            'under 5 kcal',
            'about 285 kcal',
        ]);
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

        // The week chosen stays chosen as focus leaves
        chart().dispatchEvent(new FocusEvent('blur'));
        fixture.detectChanges();
        expect(text('.weeks__when')).toBe('24–30 Aug · 0 workouts');
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

    it('keeps a tapped week chosen as the finger lifts, and a hover shows another till it leaves', () => {
        create(entry(day(11, 3), 1800), entry(day(8, 18), 600));
        const svg = el().querySelector<SVGSVGElement>('.weeks__svg')!;
        const box = svg.getBoundingClientRect();
        const at = (type: string, share: number, init: PointerEventInit = {}) => {
            svg.dispatchEvent(
                new PointerEvent(type, {
                    clientX: box.left + box.width * share,
                    clientY: box.top + box.height / 2,
                    ...init,
                })
            );
            fixture.detectChanges();
        };
        const lit = () =>
            [...el().querySelectorAll('.weeks__bar')].indexOf(
                el().querySelector('.weeks__bar--shown')!
            );

        // A tap on the first week: a finger's pointer leaves as it lifts
        at('pointerdown', 0.12, { pointerType: 'touch', buttons: 1 });
        at('pointerup', 0.12, { pointerType: 'touch' });
        at('pointerleave', 0.12, { pointerType: 'touch' });
        expect(text('.weeks__when')).toBe('17–23 Aug · 1 workout');
        expect(lit()).toBe(0);

        // A mouse hovering over this week shows it, and leaving goes back to the tapped one
        at('pointermove', 0.97, { pointerType: 'mouse' });
        expect(text('.weeks__when')).toBe('2–8 Nov · 1 workout');
        at('pointerleave', 0.97, { pointerType: 'mouse' });
        expect(text('.weeks__when')).toBe('17–23 Aug · 1 workout');
        expect(lit()).toBe(0);
    });

    it('has a table of the same weeks beside the bars, a dot for each to go to it', async () => {
        create(entry(day(11, 3), 1800), entry(day(10, 21), 600));

        const slides = [...el().querySelectorAll('.carousel__slide')];
        expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual([
            'Chart 1 of 2',
            'Table 2 of 2',
        ]);
        expect(slides[0].querySelector('.weeks__chart')).not.toBeNull();
        // As tall as the bars, not the table beside them, which is its own height
        const track = el().querySelector<HTMLElement>('.carousel__track')!;
        await vi.waitFor(() =>
            expect(track.offsetHeight).toBe((slides[0] as HTMLElement).offsetHeight)
        );
        expect(track.offsetHeight).not.toBe((slides[1] as HTMLElement).offsetHeight);
        const rows = slides[1].querySelectorAll('.weeks__table tbody tr');
        expect(rows).toHaveLength(3);
        expect([...rows[2].querySelectorAll('td')].map((cell) => cell.textContent!.trim())).toEqual(
            ['2 Nov', '1', '30:00']
        );

        const dots = [...el().querySelectorAll<HTMLButtonElement>('.carousel__dot')];
        expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
            'Chart 1 of 2',
            'Table 2 of 2',
        ]);
        dots[1].click();
        fixture.detectChanges();
        expect(dots[1].getAttribute('aria-current')).toBe('true');
        // The chosen week stays over the table
        expect(text('.weeks__when')).toBe('2–8 Nov · 1 workout');
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
        expect(el().querySelector('app-carousel')).toBeNull();
    });
});
