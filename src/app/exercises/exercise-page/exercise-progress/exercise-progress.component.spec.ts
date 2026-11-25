import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoggedSet } from '../../../models/history';
import { HistoryStore } from '../../../shared/state/history-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { ExerciseProgressComponent } from './exercise-progress.component';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('ExerciseProgressComponent', () => {
    let fixture: ComponentFixture<ExerciseProgressComponent>;
    // Read in each test: a spy left by another spec file can still mock Date.now as this one loads
    let now: number;

    beforeEach(() => {
        now = Date.now();
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    const squat = (reps: number, weight?: number): LoggedSet => ({
        round: 0,
        step: 0,
        name: 'Back squat',
        reps,
        ...(weight === undefined ? {} : { weight }),
        exerciseId: 'builtin:back-squat',
    });

    /** Logs a workout `daysAgo` days back with these sets. */
    function logged(daysAgo: number, sets: LoggedSet[], title = 'Legs') {
        const startedAt = now - daysAgo * DAY_MS;
        TestBed.inject(HistoryStore).record({
            id: `${startedAt}-legs`,
            workoutId: 'legs',
            title,
            startedAt,
            endedAt: startedAt + 60_000,
            activeSeconds: 60,
            roundsCompleted: 1,
            totalRounds: 1,
            outcome: 'finished',
            sets,
        });
    }

    async function create(exerciseId = 'builtin:back-squat') {
        fixture = TestBed.createComponent(ExerciseProgressComponent);
        fixture.componentRef.setInput('exerciseId', exerciseId);
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const all = (selector: string) =>
        Array.from(el().querySelectorAll(selector)).map((e) =>
            e.textContent!.replace(/\s+/g, ' ').trim()
        );
    const chart = () => el().querySelector('.progress__chart') as HTMLElement;
    const key = async (name: string) => {
        chart().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
        await render();
    };
    const readout = () => el().querySelector('#exercise-progress-readout')!.textContent!.trim();
    const button = (label: string) =>
        (Array.from(el().querySelectorAll('button')) as HTMLButtonElement[]).find(
            (b) => b.textContent!.trim() === label
        )!;

    it('says nothing has been logged yet, before it has', async () => {
        await create();

        expect(all('.progress__empty')).toEqual([
            'Nothing logged yet. Do it in a workout and its bests and progress show up here.',
        ]);
        expect(chart()).toBeNull();
    });

    it('lists its bests, in the unit chosen', async () => {
        logged(10, [squat(5, 100)]);
        logged(2, [squat(10, 80), squat(12, 60)]);
        await create();

        expect(all('.best dt')).toEqual(['Heaviest', 'Most reps']);
        expect(all('.best__value')).toEqual(['100 kg × 5', '60 kg × 12']);

        TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
        await render();
        expect(all('.best__value')[0]).toBe('220.5 lb × 5');
    });

    it('charts one point per workout, and steps through them with the arrow keys', async () => {
        logged(40, [squat(5, 60)], 'Old legs');
        logged(10, [squat(5, 80)]);
        logged(2, [squat(5, 90)]);
        await create();

        expect(el().querySelector('.progress__subheading')!.textContent).toContain(
            'Heaviest weight'
        );
        expect(el().querySelectorAll('.progress__dot').length).toBe(3);

        chart().dispatchEvent(new FocusEvent('focus'));
        await render();
        expect(readout()).toContain('90 kg');
        expect(readout()).toContain('Legs');

        // The latest, at the right: its tooltip beside it, to its left, so it stays on the chart
        const tooltip = () => el().querySelector('app-progress-tooltip');
        expect(tooltip()!.textContent).toContain('90 kg');
        expect(tooltip()!.classList).toContain('progress-tooltip--left');

        await key('Home');
        expect(readout()).toContain('60 kg');
        expect(readout()).toContain('Old legs');
        expect(tooltip()!.textContent).toContain('Old legs');
        expect(tooltip()!.classList).not.toContain('progress-tooltip--left');
        expect(tooltip()!.getAttribute('aria-hidden')).toBe('true');
        await key('ArrowRight');
        expect(readout()).toContain('80 kg');
    });

    it('narrows the chart to a range, and says when nothing falls in it', async () => {
        logged(40, [squat(5, 60)]);
        logged(10, [squat(5, 80)]);
        await create();

        button('4 weeks').click();
        await render();
        expect(el().querySelectorAll('.progress__dot').length).toBe(1);
        expect(button('4 weeks').getAttribute('aria-pressed')).toBe('true');

        logged(400, [squat(5, 60)]);
        TestBed.inject(HistoryStore).delete(`${now - 10 * DAY_MS}-legs`);
        await render();
        expect(all('.progress__empty')).toEqual(['Not done in the last 4 weeks.']);
    });

    it('has a table of the same workouts beside the chart, a dot for each to go to it', async () => {
        logged(20, [squat(5, 70)]);
        logged(10, [squat(5, 80)]);
        await create();

        const slides = [...el().querySelectorAll('.carousel__slide')];
        expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual([
            'Chart 1 of 2',
            'Table 2 of 2',
        ]);
        expect(slides[0].querySelector('.progress__chart')).not.toBeNull();
        expect(
            [...slides[1].querySelectorAll('.progress__table tbody td')]
                .slice(1, 3)
                .map((cell) => cell.textContent!.trim())
        ).toEqual(['Legs', '70 kg']);

        const dot = el().querySelector<HTMLButtonElement>(
            '.carousel__dot[aria-label="Table 2 of 2"]'
        )!;
        dot.click();
        await render();
        expect(dot.getAttribute('aria-current')).toBe('true');
    });

    it('charts the reps of one weight, always the same, as a kettlebell is', async () => {
        logged(10, [squat(15, 16), squat(15, 16)]);
        logged(2, [squat(18, 16)]);
        await create();

        expect(el().querySelector('.progress__subheading')!.textContent).toContain(
            'Most reps in a set'
        );
        chart().dispatchEvent(new FocusEvent('focus'));
        await render();
        expect(readout()).toContain('18 reps');
        // The heaviest set is the one with the most reps, so they share a tile
        expect(all('.best dt')).toEqual(['Heaviest and most reps']);
        expect(all('.best__value')).toEqual(['16 kg × 18']);
    });

    it('charts most reps for a bodyweight exercise, and the longest for a timed one', async () => {
        logged(2, [squat(20), squat(15)]);
        logged(1, [{ round: 0, step: 1, name: 'Plank', seconds: 45, exerciseId: 'builtin:plank' }]);
        await create();
        expect(el().querySelector('.progress__subheading')!.textContent).toContain(
            'Most reps in a set'
        );
        fixture.destroy();

        await create('builtin:plank');
        expect(all('.best__value')).toEqual(['0:45']);
        expect(el().querySelector('.progress__subheading')!.textContent).toContain('Longest set');
    });

    it('lists recent sessions, newest first, each linked to its workout in the history', async () => {
        for (let day = 1; day <= 7; day++) {
            logged(day, [squat(5, 60 + day)], `Day ${day}`);
        }
        await create();

        expect(all('.session__title')).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5']);
        const link = el().querySelector('.session__link') as HTMLAnchorElement;
        expect(link.getAttribute('href')).toBe(
            `/history?run=${encodeURIComponent(`${now - DAY_MS}-legs`)}`
        );
        expect(all('.session__sets')[0]).toContain('5 reps @ 61 kg');

        button('Show all 7').click();
        await render();
        expect(all('.session__title').length).toBe(7);
    });
});
