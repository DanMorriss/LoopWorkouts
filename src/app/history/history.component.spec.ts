import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry, LoggedSet } from '../models/history';
import { HistoryStore } from '../shared/state/history-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { UndoService } from '../shared/undo/undo.service';
import {
    describeRounds,
    describeSets,
    formatDuration,
    sectionsOf,
    SetsSection,
} from './history-format';
import { SettingsStore } from '../shared/state/settings-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { HistoryComponent } from './history.component';
import { TourService } from '../tour/tour.service';
import { PageSlide } from '../shared/navigation/page-slide';
import { asOneGroup } from '../models/workout';

// Midday on Sunday 18 October 2026, so "today" and "yesterday" can't flip mid-test
const NOW = new Date(2026, 9, 18, 12, 0).getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    const startedAt = overrides.startedAt ?? NOW - HOUR;
    return {
        id: `${startedAt}-1`,
        workoutId: 'workout-1',
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + 600_000,
        updatedAt: startedAt + 600_000,
        activeSeconds: 600,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
        ...overrides,
    };
}

describe('HistoryComponent', () => {
    let fixture: ComponentFixture<HistoryComponent>;
    let history: HistoryStore;

    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideRouter([{ path: 'history', component: HistoryComponent }])],
        });
        history = TestBed.inject(HistoryStore);
    });
    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
        localStorage.clear();
    });

    function create(...entries: HistoryEntry[]) {
        entries.forEach((entry) => history.record(entry));
        fixture = TestBed.createComponent(HistoryComponent);
        fixture.detectChanges();
    }

    const text = (selector: string) =>
        Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map(
            (el) => el.textContent!.replace(/\s+/g, ' ').trim()
        );
    /** A button by its accessible name, e.g. "Undo" or "Options for Sprints at 11:00 AM". */
    const button = (name: string) =>
        Array.from(document.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
            (b) => {
                // Icon fonts put the icon's name in the text ("delete"), so leave <mat-icon> out
                const label =
                    b.getAttribute('aria-label') ??
                    Array.from(b.childNodes)
                        .filter((node) => node.nodeName !== 'MAT-ICON')
                        .map((node) => node.textContent)
                        .join('');
                // Times use a narrow no-break space ("11:00\u202FAM"), so compare with spaces collapsed
                return label.replace(/\s+/g, ' ').trim() === name;
            }
        )!;

    it('is titled Progress, and says there is nothing yet, linking to Workouts', () => {
        create();

        expect(fixture.nativeElement.querySelector('h2').textContent.trim()).toBe('Progress');
        expect(fixture.nativeElement.textContent).toContain(
            "Nothing here yet. Do a workout, and how your week is going and what you've done show up here."
        );
        const link = fixture.nativeElement.querySelector('a');
        expect(link.textContent.trim()).toBe('Go to workouts');
        expect(link.getAttribute('href')).toBe('/library');
    });

    it('groups workouts by day, newest first: Today, Yesterday, then the date', () => {
        create(
            makeEntry({ startedAt: NOW - 3 * DAY, title: 'Older' }),
            makeEntry({ startedAt: NOW - HOUR, title: 'This morning' }),
            makeEntry({ startedAt: NOW - DAY, title: 'Yesterday lunch' }),
            makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Earlier today' })
        );

        expect(text('.history__day-label')).toEqual(['Today', 'Yesterday', 'Thursday 15 October']);
        expect(text('.entry__title')).toEqual([
            'This morning',
            'Earlier today',
            'Yesterday lunch',
            'Older',
        ]);
    });

    it('shows example workouts while the tour shows it with nothing done, never saved (NAV-8)', () => {
        TestBed.inject(TourService).sampleHistory.set(true);
        create();

        expect(text('.history__sample')).toEqual([
            "Examples, to show what's here. Yours will replace them.",
        ]);
        expect(text('.entry__title')[0]).toBe('Push day');
        expect(fixture.nativeElement.querySelector('[data-tour="progress-sample"]')).not.toBeNull();
        expect(history.entries()).toEqual([]);

        // Once the tour moves on, the page is empty again
        TestBed.inject(TourService).sampleHistory.set(false);
        fixture.detectChanges();
        expect(text('.history__sample')).toEqual([]);
        expect(fixture.nativeElement.querySelector('.history__empty')).not.toBeNull();
    });

    it('never shows the examples beside workouts of your own', () => {
        TestBed.inject(TourService).sampleHistory.set(true);
        create(makeEntry({ title: 'Mine' }));

        expect(text('.history__sample')).toEqual([]);
        expect(text('.entry__title')).toEqual(['Mine']);
    });

    it('shows when each one started, how long it ran, and the rounds', () => {
        create(
            makeEntry({
                activeSeconds: 754,
                roundsCompleted: 2,
                totalRounds: 5,
                outcome: 'stopped',
            })
        );

        expect(text('.entry__detail')).toEqual([
            '11:00 AM · 2 of 5 rounds · stopped · 12:34 spent',
        ]);
        // The time is the card's big number, said in the line above for screen readers
        expect(text('.entry__time')).toEqual(['12:34 time']);
    });

    it('adds about how many calories it burnt, with a body weight given (CAL-1)', () => {
        TestBed.inject(SettingsStore).update({ bodyWeight: 80 });
        // 754 seconds with no sets, at 1.5 METs: 1.5 × 80 × 754 ÷ 3600 = 25.1, about 25
        create(makeEntry({ activeSeconds: 754, roundsCompleted: 3, totalRounds: 3 }));

        expect(text('.entry__detail [aria-hidden="true"]')).toEqual(['· about 25 kcal']);
        expect(text('.entry__detail .sr-only')).toEqual(['· 12:34 spent', '· about 25 calories']);
    });

    it('names the main muscles its sets worked, as a workout card does', () => {
        create(
            makeEntry({
                sets: [
                    {
                        round: 0,
                        step: 0,
                        name: 'Squats',
                        reps: 10,
                        exerciseId: 'builtin:back-squat',
                    },
                    { round: 0, step: 1, name: 'Reps', reps: 10 },
                ],
            }),
            makeEntry({ startedAt: NOW - 2 * HOUR })
        );

        expect(text('.entry__works .showcase-muscle')).toEqual(['Glutes', 'Quads']);
        // The workout with no sets of an exercise names none
        expect(fixture.nativeElement.querySelectorAll('.entry__works')).toHaveLength(1);
    });

    it('lists the sets of its rep steps under it, read out in words, in the unit chosen', () => {
        TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
        create(
            makeEntry({
                sets: [
                    { round: 0, step: 0, name: 'Bench', reps: 5, weight: 61.235 },
                    { round: 1, step: 0, name: 'Bench', reps: 5, weight: 61.235 },
                ],
            }),
            makeEntry({ startedAt: NOW - 2 * HOUR })
        );

        expect(text('.entry__sets li [aria-hidden="true"]')).toEqual(['Bench: 2 × 5 @ 135 lb']);
        expect(text('.entry__sets li .sr-only')).toEqual(['Bench, 2 sets of 5 reps at 135 lb']);
        // The workout without rep steps has no list
        expect(fixture.nativeElement.querySelectorAll('.entry__sets')).toHaveLength(1);
    });

    it("groups the sets under the workout's headings as they were when it ran (BLD-13)", () => {
        create(
            makeEntry({
                sets: [
                    { round: 0, step: 0, name: 'Bike', seconds: 300 },
                    { round: 0, step: 1, name: 'Leg press', reps: 10 },
                    { round: 0, step: 2, name: 'Step-down', reps: 10 },
                ],
                headings: [
                    { text: 'Warmup', step: 0 },
                    { text: 'Knee rehabilitation', step: 1 },
                    // Nothing was done under it, so it isn't shown
                    { text: 'Upper body', step: 3 },
                ],
            })
        );

        const items = Array.from(
            fixture.nativeElement.querySelectorAll(
                '.set-lines__heading, .entry__sets li [aria-hidden]'
            ),
            (el: Element) => el.textContent!.replace(/\s+/g, ' ').trim()
        );
        expect(items).toEqual([
            'Warmup',
            'Bike: 5:00',
            'Knee rehabilitation',
            'Leg press: 10 reps',
            'Step-down: 10 reps',
        ]);
        // Headings within the entry, for screen readers
        expect(fixture.nativeElement.querySelectorAll('h4.set-lines__heading')).toHaveLength(2);
    });

    it('puts the lines of a superset together under its name, as it was when it ran (BLD-12)', () => {
        create(
            makeEntry({
                sets: [
                    { round: 0, step: 0, name: 'Squats', reps: 10 },
                    { round: 0, step: 1, name: 'Bench', reps: 8 },
                    { round: 0, step: 2, name: 'Row', reps: 8 },
                    { round: 1, step: 1, name: 'Bench', reps: 8 },
                    { round: 1, step: 2, name: 'Row', reps: 8 },
                ],
                supersets: [{ kind: 'superset', step: 1, steps: 3 }],
            })
        );

        // Squats on its own, then the superset's name with its lines in a list under it
        const items = Array.from(
            fixture.nativeElement.querySelectorAll('.set-lines__list > li'),
            (el: Element) =>
                el.querySelector('.set-lines__superset-name')?.textContent ??
                el.querySelector('[aria-hidden]')!.textContent
        );
        expect(items).toEqual(['Squats: 10 reps', 'Superset']);
        expect(
            Array.from(
                fixture.nativeElement.querySelectorAll('.set-lines__superset-lines li'),
                (el: Element) => el.querySelector('[aria-hidden]')!.textContent
            )
        ).toEqual(['Bench: 2 × 8', 'Row: 2 × 8']);
    });

    it('names sets of your own exercise as it is now called, and built-in ones as they ran', () => {
        const exercises = TestBed.inject(ExerciseStore);
        const mine = exercises.addOwn('Sled push', 'reps');
        exercises.updateOwn(mine.id, { ...mine, name: 'Sled drag' });
        create(
            makeEntry({
                sets: [
                    { round: 0, step: 0, name: 'Sled push', reps: 5, exerciseId: mine.id },
                    {
                        round: 0,
                        step: 1,
                        name: 'Squats',
                        reps: 8,
                        exerciseId: 'builtin:back-squat',
                    },
                ],
            })
        );

        expect(text('.entry__exercise')).toEqual(['Sled drag', 'Squats']);
        expect(text('.entry__sets li [aria-hidden="true"]')).toEqual([': 5 reps', ': 8 reps']);
    });

    it("links each exercise's sets to its page, which comes back to the run", () => {
        create(
            makeEntry({
                sets: [
                    {
                        round: 0,
                        step: 0,
                        name: 'Squats',
                        reps: 8,
                        exerciseId: 'builtin:back-squat',
                    },
                    { round: 0, step: 1, name: '', reps: 5 },
                ],
            })
        );

        const links = fixture.nativeElement.querySelectorAll('.entry__exercise');
        expect(links).toHaveLength(1);
        expect(links[0].getAttribute('href')).toMatch(/^\/exercises\/back-squat\?run=\d+-/);
        expect(text('.entry__sets li .sr-only')).toEqual([', 8 reps', 'Reps, 5 reps']);
    });

    it("opens its workout's details from the card, to favourite or copy it, coming back here", () => {
        const sprints = TestBed.inject(WorkoutStore).addWorkout({
            title: 'Sprints',
            repeats: 1,
            blocks: [],
        });
        const slide = TestBed.inject(PageSlide);
        const navigate = vi.spyOn(slide, 'navigate').mockImplementation(() => undefined);
        const entry = makeEntry({ workoutId: sprints.id });
        create(entry, makeEntry({ startedAt: NOW - 2 * HOUR, workoutId: 'deleted-since' }));

        // One link, covering its card; a workout deleted since has none
        const links = fixture.nativeElement.querySelectorAll('.entry__open[href]');
        expect(links).toHaveLength(1);
        const url = `/library/${sprints.id}?run=${encodeURIComponent(entry.id)}`;
        expect(links[0].getAttribute('href')).toBe(url);
        expect(links[0].getAttribute('aria-label')).toBe('Details of Sprints');

        links[0].click();
        expect(navigate).toHaveBeenCalledWith(url, 'in');
    });

    it('names an untitled workout', () => {
        create(makeEntry({ title: '  ' }));

        expect(text('.entry__title')).toEqual(['Untitled workout']);
    });

    it('sums up the last seven days', () => {
        create(
            makeEntry({ startedAt: NOW - HOUR, activeSeconds: 1800 }),
            makeEntry({ startedAt: NOW - 6 * DAY, activeSeconds: 2000 }),
            makeEntry({ startedAt: NOW - 8 * DAY, activeSeconds: 9999 })
        );

        expect(text('.history__summary')).toEqual(['Last 7 days: 2 workouts · 1:03:20']);
    });

    it('shows which muscles were worked in the last seven days', async () => {
        create(
            makeEntry({
                startedAt: NOW - HOUR,
                sets: [
                    {
                        round: 0,
                        step: 0,
                        name: 'Back squat',
                        reps: 5,
                        exerciseId: 'builtin:back-squat',
                    },
                    {
                        round: 0,
                        step: 1,
                        name: 'Back squat',
                        reps: 5,
                        exerciseId: 'builtin:back-squat',
                    },
                    {
                        round: 0,
                        step: 2,
                        name: 'Bench press',
                        reps: 8,
                        exerciseId: 'builtin:barbell-bench-press',
                    },
                ],
            }),
            makeEntry({
                startedAt: NOW - 9 * DAY,
                sets: [{ round: 0, step: 0, name: 'Plank', reps: 30, exerciseId: 'builtin:plank' }],
            })
        );

        expect(text('.muscles-week__title')).toEqual(['Muscles worked this week']);
        // The map's drawings come once the page has settled
        await vi.waitFor(() => {
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('app-body-map')).not.toBeNull();
        });
        // A bar per muscle group, most worked first; the plank is too long ago to count
        const labels = text('.bars__label');
        const rows = text('.bars__row .sr-only');
        expect(labels).toHaveLength(18);
        expect(labels.slice(0, 3).map((label, i) => `${label}: ${rows[i]}`)).toEqual([
            'Glutes: 2 sets, under 10',
            'Quads: 2 sets, under 10',
            // A small muscle aims lower
            'Adductors: 1 set, under 4',
        ]);
        expect(labels.at(-1)).toBe('Upper back');
    });

    it('shows the muscles worked this week, then the log, and leaves the suggestion to Today', () => {
        TestBed.inject(WorkoutStore).addWorkout({
            title: 'Push',
            repeats: 3,
            blocks: asOneGroup([
                { kind: 'reps', reps: 5, name: 'Bench press', exerciseId: 'builtin:bench-press' },
            ]),
        });
        const squat: LoggedSet = {
            round: 0,
            step: 0,
            name: 'Back squat',
            reps: 5,
            exerciseId: 'builtin:back-squat',
        };
        create(makeEntry({ sets: [squat, { ...squat, round: 1 }] }));

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('.suggestion')).toBeNull();
        const order = [
            ...element.querySelectorAll(
                'app-muscles-this-week, .history__log-title, .history__day'
            ),
        ].map((el) =>
            el.tagName.toLowerCase() === 'app-muscles-this-week'
                ? 'muscles'
                : el.className.split(' ')[0]
        );
        expect(order).toEqual(['muscles', 'history__log-title', 'history__day']);
        expect(element.querySelector('.history__log-title')!.textContent!.trim()).toBe('Log');
    });

    /** Opens an entry's ⋮ menu and picks an item, e.g. "Delete". */
    function choose(entry: string, item: string) {
        button(`Options for ${entry}`).click();
        fixture.detectChanges();
        button(item).click();
        fixture.detectChanges();
    }

    it('deletes a workout from its menu straight away, then offers to undo', () => {
        create(
            makeEntry({ title: 'Sprints' }),
            makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Plank' })
        );

        choose('Sprints at 11:00 AM', 'Delete');

        expect(text('.entry__title')).toEqual(['Plank']);
        expect(history.entries()).toHaveLength(1);
        expect(TestBed.inject(UndoService).offer()?.message).toBe('Deleted Sprints');
    });

    it('puts a deleted workout back on Undo, note and all, and focus back on its menu', () => {
        create(makeEntry({ title: 'Sprints', note: 'Felt strong' }));
        choose('Sprints at 11:00 AM', 'Delete');

        TestBed.inject(UndoService).undo();
        fixture.detectChanges();
        TestBed.tick();

        expect(text('.entry__title')).toEqual(['Sprints']);
        expect(text('.entry__note')).toEqual(['Note: Felt strong']);
        expect(document.activeElement).toBe(button('Options for Sprints at 11:00 AM'));
    });

    describe('the options menu', () => {
        const menuButton = () => button('Options for Sprints at 11:00 AM');
        const items = () => text('.menu__item');

        it('opens from the ⋮ button, which says whether it is open', () => {
            create(makeEntry());
            expect(menuButton().getAttribute('aria-expanded')).toBe('false');
            expect(items()).toEqual([]);

            menuButton().click();
            fixture.detectChanges();

            expect(menuButton().getAttribute('aria-expanded')).toBe('true');
            expect(items()).toEqual(['edit_note Add note', 'delete Delete']);
        });

        it('offers to edit or remove a note once there is one', () => {
            create(makeEntry({ note: 'Felt strong' }));

            menuButton().click();
            fixture.detectChanges();

            expect(items()).toEqual([
                'edit_note Edit note',
                'backspace Remove note',
                'delete Delete',
            ]);
        });

        it('keeps one menu open at a time, and closes on a click elsewhere', () => {
            create(makeEntry(), makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Plank' }));
            menuButton().click();
            fixture.detectChanges();

            button('Options for Plank at 10:00 AM').click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.menu')).toHaveLength(1);
            expect(menuButton().getAttribute('aria-expanded')).toBe('false');

            document.body.click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.menu')).toHaveLength(0);
        });

        it('closes on Escape, with focus back on its button', async () => {
            create(makeEntry());
            menuButton().click();
            fixture.detectChanges();

            button('Delete').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
            );
            fixture.detectChanges();
            await fixture.whenStable();

            expect(items()).toEqual([]);
            expect(document.activeElement).toBe(menuButton());
        });
    });

    describe('notes', () => {
        const noteBox = () =>
            fixture.nativeElement.querySelector('.entry input') as HTMLInputElement;

        function type(value: string) {
            noteBox().value = value;
            noteBox().dispatchEvent(new Event('input'));
            fixture.detectChanges();
        }

        async function save() {
            button('Save').click();
            fixture.detectChanges();
            await fixture.whenStable();
        }

        it('adds a note from the menu: the box opens with focus, and saves under the entry', async () => {
            create(makeEntry());
            choose('Sprints at 11:00 AM', 'Add note');
            await fixture.whenStable();

            expect(document.activeElement).toBe(noteBox());
            expect(noteBox().getAttribute('aria-describedby')).toMatch(/^entry-title-/);
            type('  Felt strong  ');
            await save();

            expect(history.entries()[0].note).toBe('Felt strong');
            expect(text('.entry__note')).toEqual(['Note: Felt strong']);
            expect(noteBox()).toBeNull();
            expect(document.activeElement).toBe(button('Options for Sprints at 11:00 AM'));
        });

        it('edits a note, starting from what it says', async () => {
            create(makeEntry({ note: 'Felt strong' }));
            choose('Sprints at 11:00 AM', 'Edit note');

            expect(noteBox().value).toBe('Felt strong');
            type('Knee sore');
            await save();

            expect(history.entries()[0].note).toBe('Knee sore');
        });

        it('keeps the note as it was on Cancel or Escape', async () => {
            create(makeEntry({ note: 'Felt strong' }));
            choose('Sprints at 11:00 AM', 'Edit note');
            type('Changed my mind');

            button('Cancel').click();
            fixture.detectChanges();
            expect(history.entries()[0].note).toBe('Felt strong');
            expect(noteBox()).toBeNull();

            choose('Sprints at 11:00 AM', 'Edit note');
            expect(noteBox().value).toBe('Felt strong');
            noteBox().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            fixture.detectChanges();
            expect(noteBox()).toBeNull();
        });

        it('removes a note from the menu, as does saving an empty one', async () => {
            create(makeEntry({ note: 'Felt strong' }));
            choose('Sprints at 11:00 AM', 'Remove note');

            expect(history.entries()[0].note).toBeUndefined();
            expect(text('.entry__note')).toEqual([]);

            choose('Sprints at 11:00 AM', 'Add note');
            type('Short-lived');
            await save();
            choose('Sprints at 11:00 AM', 'Edit note');
            type('   ');
            await save();
            expect(history.entries()[0].note).toBeUndefined();
        });

        it('keeps notes short', async () => {
            create(makeEntry());
            choose('Sprints at 11:00 AM', 'Add note');

            expect(noteBox().getAttribute('maxlength')).toBe('120');
        });
    });

    describe('arriving from the workout summary', () => {
        const run = makeEntry({ title: 'Sprints' });

        async function arrive(url: string) {
            [run, makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Plank' })].forEach((entry) =>
                history.record(entry)
            );
            const harness = await RouterTestingHarness.create();
            await harness.navigateByUrl(url, HistoryComponent);
            await new Promise((resolve) => setTimeout(resolve));
            harness.detectChanges();
            return harness.routeNativeElement!;
        }

        it('highlights the run, and focuses it', async () => {
            const page = await arrive(`/history?run=${run.id}`);

            const highlighted = page.querySelectorAll('.entry--highlighted');
            expect(highlighted).toHaveLength(1);
            expect(highlighted[0].textContent).toContain('Sprints');
            expect(document.activeElement).toBe(highlighted[0]);
            expect(page.querySelector('.entry input')).toBeNull();
        });

        it("opens the run's note box, ready to type", async () => {
            const page = await arrive(`/history?note=${run.id}`);

            expect(page.querySelector('.entry--highlighted input')).not.toBeNull();
            expect(document.activeElement).toBe(page.querySelector('.entry--highlighted input'));
        });

        it('ignores a run that is not in the history', async () => {
            const page = await arrive('/history?note=nope');

            expect(page.querySelectorAll('.entry--highlighted')).toHaveLength(0);
            expect(page.querySelector('.entry input')).toBeNull();
        });
    });

    describe('formatDuration', () => {
        it('shows minutes and seconds, and hours when there are any', () => {
            expect(formatDuration(5)).toBe('0:05');
            expect(formatDuration(754)).toBe('12:34');
            expect(formatDuration(3725)).toBe('1:02:05');
        });
    });

    describe('describeRounds', () => {
        it('says how many rounds, and whether it was stopped or ran until stopped', () => {
            expect(describeRounds(makeEntry({ roundsCompleted: 1, totalRounds: 1 }))).toBe(
                '1 round'
            );
            expect(describeRounds(makeEntry({ roundsCompleted: 3, totalRounds: 3 }))).toBe(
                '3 rounds'
            );
            expect(
                describeRounds(
                    makeEntry({ roundsCompleted: 2, totalRounds: 5, outcome: 'stopped' })
                )
            ).toBe('2 of 5 rounds · stopped');
            expect(
                describeRounds(
                    makeEntry({ roundsCompleted: 12, totalRounds: 0, outcome: 'stopped' })
                )
            ).toBe('12 rounds · until stopped');
        });

        it('gives the score of a time limit, or the rounds when stopped before it', () => {
            const limit = { totalRounds: 0, timeLimitSeconds: 1200 };
            expect(
                describeRounds(makeEntry({ ...limit, roundsCompleted: 7, stepsIntoRound: 3 }))
            ).toBe('7 rounds + 3 in 20:00');
            expect(
                describeRounds(makeEntry({ ...limit, roundsCompleted: 1, stepsIntoRound: 0 }))
            ).toBe('1 round in 20:00');
            expect(
                describeRounds(makeEntry({ ...limit, roundsCompleted: 4, outcome: 'stopped' }))
            ).toBe('4 rounds · stopped before 20:00');
        });
    });

    describe('describeSets', () => {
        const set = (
            round: number,
            reps: number,
            weight?: number,
            step = 1,
            name = 'Squats'
        ): LoggedSet => ({
            round,
            step,
            name,
            reps,
            ...(weight === undefined ? {} : { weight }),
        });

        it('sums up sets that were all the same', () => {
            expect(describeSets([set(0, 10, 60), set(1, 10, 60), set(2, 10, 60)], 'kg')).toEqual([
                {
                    name: 'Squats',
                    step: 1,
                    text: '3 × 10 @ 60 kg',
                    spoken: '3 sets of 10 reps at 60 kg',
                },
            ]);
        });

        it('lists the reps when they changed, and each set when the weight did', () => {
            expect(describeSets([set(0, 10, 60), set(1, 10, 60), set(2, 8, 60)], 'kg')[0]).toEqual({
                name: 'Squats',
                step: 1,
                text: '10, 10, 8 @ 60 kg',
                spoken: 'sets of 10, 10, 8 reps at 60 kg',
            });
            expect(describeSets([set(0, 10, 60), set(1, 8, 62.5)], 'kg')[0]).toEqual({
                name: 'Squats',
                step: 1,
                text: '10 @ 60, 8 @ 62.5 kg',
                spoken: '10 reps at 60 kg, 8 reps at 62.5 kg',
            });
        });

        it('leaves out the weight when there was none, and names an unnamed step "Reps"', () => {
            expect(
                describeSets([set(0, 20, undefined, 0, ''), set(1, 20, undefined, 0, '')], 'kg')
            ).toEqual([{ name: 'Reps', step: 0, text: '2 × 20', spoken: '2 sets of 20 reps' }]);
            expect(describeSets([set(0, 12)], 'kg')[0].text).toBe('12 reps');
        });

        it('gives a line per rep step, in the order they came, in the unit chosen', () => {
            const sets = [
                set(0, 5, 20.412, 0, 'Bench'),
                set(0, 20, undefined, 2, 'Push-ups'),
                set(1, 5, 20.412, 0, 'Bench'),
            ];

            expect(describeSets(sets, 'lb').map((line) => `${line.name}: ${line.text}`)).toEqual([
                'Bench: 2 × 5 @ 45 lb',
                'Push-ups: 20 reps',
            ]);
        });

        it('sums up timed sets by how long they ran', () => {
            const plank = (round: number, seconds: number): LoggedSet => ({
                round,
                step: 0,
                name: 'Plank',
                seconds,
                exerciseId: 'builtin:plank',
            });

            expect(describeSets([plank(0, 45), plank(1, 45), plank(2, 45)], 'kg')).toEqual([
                {
                    name: 'Plank',
                    step: 0,
                    text: '3 × 0:45',
                    spoken: '3 sets of 45 seconds',
                    exerciseId: 'builtin:plank',
                },
            ]);
            expect(describeSets([plank(0, 90)], 'kg')[0]).toEqual({
                exerciseId: 'builtin:plank',
                name: 'Plank',
                step: 0,
                text: '1:30',
                spoken: '1 minute 30 seconds',
            });
            expect(describeSets([plank(0, 60), plank(1, 45)], 'kg')[0]).toEqual({
                exerciseId: 'builtin:plank',
                name: 'Plank',
                step: 0,
                text: '1:00, 0:45',
                spoken: 'sets of 1 minute, 45 seconds',
            });
        });

        it('names a line by its exercise where a current name is given', () => {
            const linked = { ...set(0, 5), exerciseId: 'mine' };
            const names = (id: string) => (id === 'mine' ? 'Sled drag' : undefined);

            expect(describeSets([linked], 'kg', names)[0].name).toBe('Sled drag');
            expect(describeSets([{ ...linked, exerciseId: 'other' }], 'kg', names)[0].name).toBe(
                'Squats'
            );
        });

        describe('under headings (BLD-13)', () => {
            const lines = describeSets(
                [set(0, 10, 60, 0, 'Bench'), set(0, 8, 60, 1, 'Row'), set(0, 5, 20, 2, 'Curl')],
                'kg'
            );
            const names = (sections: SetsSection[]) =>
                sections.map(({ heading, lines }) => [heading, ...lines.map((line) => line.name)]);

            it('is one section of every line, with no headings', () => {
                expect(names(sectionsOf(lines))).toEqual([[null, 'Bench', 'Row', 'Curl']]);
            });

            it('puts lines before the first heading first, under none', () => {
                expect(names(sectionsOf(lines, [{ text: 'Arms', step: 2 }]))).toEqual([
                    [null, 'Bench', 'Row'],
                    ['Arms', 'Curl'],
                ]);
            });

            it('leaves out a heading with nothing under it, and keeps two that say the same', () => {
                const headings = [
                    { text: 'Push', step: 0 },
                    { text: 'Pull', step: 1 },
                    { text: 'Push', step: 1 },
                    { text: 'Push', step: 2 },
                ];

                expect(names(sectionsOf(lines, headings))).toEqual([
                    ['Push', 'Bench'],
                    ['Push', 'Row'],
                    ['Push', 'Curl'],
                ]);
            });
        });

        describe('with supersets (BLD-12)', () => {
            const lines = describeSets(
                [
                    set(0, 10, 60, 0, 'Bench'),
                    set(0, 8, 60, 1, 'Row'),
                    set(0, 5, 20, 2, 'Curl'),
                    set(0, 5, 20, 3, 'Dip'),
                ],
                'kg'
            );
            const items = (sections: SetsSection[]) =>
                sections.flatMap(({ items }) =>
                    items.map(({ superset, lines }) => [superset, ...lines.map((l) => l.name)])
                );

            it('puts the lines of each superset or giant set together under its name', () => {
                expect(
                    items(
                        sectionsOf(
                            lines,
                            [],
                            [
                                { kind: 'superset', step: 0, steps: 2 },
                                { kind: 'giant set', step: 2, steps: 3 },
                            ]
                        )
                    )
                ).toEqual([
                    ['Superset', 'Bench', 'Row'],
                    ['Giant set', 'Curl', 'Dip'],
                ]);
            });

            it('leaves each line on its own with no supersets, or one with sets on one step', () => {
                expect(items(sectionsOf(lines))).toEqual([
                    [null, 'Bench'],
                    [null, 'Row'],
                    [null, 'Curl'],
                    [null, 'Dip'],
                ]);
                // Stopped after its first step's set
                expect(
                    items(
                        sectionsOf(lines.slice(0, 1), [], [{ kind: 'superset', step: 0, steps: 2 }])
                    )
                ).toEqual([[null, 'Bench']]);
            });

            it('keeps a superset under its heading', () => {
                expect(
                    sectionsOf(
                        lines,
                        [{ text: 'Arms', step: 2 }],
                        [{ kind: 'superset', step: 2, steps: 2 }]
                    ).map(({ heading, items }) => [heading, items.length])
                ).toEqual([
                    [null, 2],
                    ['Arms', 1],
                ]);
            });
        });

        describe('done each side (BLD-10)', () => {
            const side = (s: LoggedSet, which: 'left' | 'right'): LoggedSet => ({
                ...s,
                side: which,
            });

            it('says "each side" when both sides went alike, counting a pair as one set', () => {
                const sets = [0, 1].flatMap((round) => [
                    side(set(round, 10), 'left'),
                    side(set(round, 10), 'right'),
                ]);

                expect(describeSets(sets, 'kg')).toEqual([
                    {
                        name: 'Squats',
                        step: 1,
                        text: '2 × 10 each side',
                        spoken: '2 sets of 10 reps each side',
                    },
                ]);
            });

            it("says each side's sets, left first, when they differ", () => {
                const sets = [
                    side(set(0, 10), 'right'),
                    side(set(0, 10), 'left'),
                    side(set(1, 10), 'right'),
                    side(set(1, 8), 'left'),
                ];

                expect(describeSets(sets, 'kg')[0].text).toBe('left 10, 8 · right 2 × 10');
            });

            it('says the one side done, for a workout ended between them', () => {
                expect(describeSets([side(set(0, 10, 20), 'left')], 'kg')[0].text).toBe(
                    'left 10 reps @ 20 kg'
                );
            });
        });
    });
});
