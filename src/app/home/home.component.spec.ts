import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HistoryEntry, LoggedSet } from '../models/history';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { greetingFor, HomeComponent } from './home.component';
import { asOneGroup } from '../models/workout';

const NOW = new Date(2026, 9, 18, 12, 0).getTime();
const HOUR = 60 * 60 * 1000;

const squat: LoggedSet = {
    round: 0,
    step: 0,
    name: 'Back squat',
    reps: 5,
    exerciseId: 'builtin:back-squat',
};

const entry: HistoryEntry = {
    id: 'run-1',
    workoutId: 'workout-1',
    title: 'Legs',
    startedAt: NOW - HOUR,
    endedAt: NOW - HOUR + 600_000,
    updatedAt: NOW - HOUR + 600_000,
    activeSeconds: 600,
    roundsCompleted: 2,
    totalRounds: 2,
    outcome: 'finished',
    sets: [squat, { ...squat, round: 1 }],
};

describe('HomeComponent', () => {
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
        localStorage.clear();
    });

    function create() {
        fixture = TestBed.createComponent(HomeComponent);
        fixture.detectChanges();
    }

    const element = () => fixture.nativeElement as HTMLElement;
    const text = (selector: string) =>
        Array.from(element().querySelectorAll<HTMLElement>(selector)).map((el) =>
            el.textContent!.replace(/\s+/g, ' ').trim()
        );

    it('greets you for the time of day, by name once you have given one (NAV-4)', () => {
        create();
        expect(text('h2')[0]).toBe('Good afternoon');
        fixture.destroy();

        TestBed.inject(SettingsStore).update({ name: 'Sam' });
        create();
        expect(text('h2')[0]).toBe('Good afternoon, Sam');
    });

    it('says good morning from 5am, good afternoon from noon and good evening from 6pm', () => {
        expect([4, 5, 11, 12, 17, 18, 23].map(greetingFor)).toEqual([
            'Good evening',
            'Good morning',
            'Good morning',
            'Good afternoon',
            'Good afternoon',
            'Good evening',
            'Good evening',
        ]);
    });

    it('shows no logo, and before any workout a way to the library', () => {
        create();

        expect(element().querySelector('app-loop-logo')).toBeNull();
        expect(element().querySelector('.home__empty a')!.getAttribute('href')).toBe('/library');
        expect(element().querySelector('app-muscles-this-week')).toBeNull();
    });

    it('shows the suggested next workout, then the muscles worked this week', () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.addWorkout({
            title: 'Push',
            repeats: 3,
            blocks: asOneGroup([
                { kind: 'reps', reps: 5, name: 'Bench press', exerciseId: 'builtin:bench-press' },
            ]),
        });
        TestBed.inject(HistoryStore).record(entry);
        create();

        expect(text('.suggestion__title')).toEqual(['Push']);
        expect(text('.muscles-week__title')).toEqual(['Muscles worked this week']);
        expect(element().querySelector('.home__empty')).toBeNull();
        const order = [...element().querySelectorAll('.suggestion, .muscles-week')].map(
            (el) => el.className || el.tagName.toLowerCase()
        );
        expect(order).toEqual(['suggestion', 'muscles-week']);
    });

    describe('due today (PLN-2)', () => {
        // NOW is a Sunday, the plan's day 6
        function planToday() {
            const workouts = TestBed.inject(WorkoutStore);
            const push = workouts.addWorkout({
                title: 'Push',
                repeats: 1,
                blocks: asOneGroup([
                    {
                        kind: 'reps',
                        reps: 5,
                        name: 'Bench press',
                        exerciseId: 'builtin:bench-press',
                    },
                ]),
            });
            const legs = workouts.addWorkout({
                title: 'Legs',
                repeats: 1,
                blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Back squat' }]),
            });
            const plan = TestBed.inject(PlanStore);
            plan.add(6, push.id);
            plan.add(6, legs.id);
            // And something on Monday, which isn't today
            plan.add(0, legs.id);
            return { push, legs };
        }

        it("shows today's planned workouts first, each with Start, in place of the suggestion", () => {
            planToday();
            create();

            expect(text('.due__title')).toEqual(['Push', 'Legs']);
            const starts = [
                ...element().querySelectorAll<HTMLButtonElement>('.due__workout button'),
            ];
            expect(starts.map((button) => button.getAttribute('aria-label'))).toEqual([
                'Start Push',
                'Start Legs',
            ]);
            // The first is the page's main button
            expect(starts[0].classList).toContain('btn-main');
            expect(element().querySelector('.home__empty')).toBeNull();
        });

        it('leaves out one run today, saying so, and hides the suggestion while any are left', () => {
            const { legs } = planToday();
            TestBed.inject(HistoryStore).record({ ...entry, workoutId: legs.id });
            create();

            expect(text('.due__title')).toEqual(['Push']);
            expect(text('.due__done')).toEqual(['Done today: Legs']);
            expect(element().querySelector('.suggestion')).toBeNull();
        });

        it('says all done once each has been run today, with the suggestion back', () => {
            const { push, legs } = planToday();
            const history = TestBed.inject(HistoryStore);
            history.record({ ...entry, workoutId: legs.id });
            history.record({ ...entry, id: 'run-2', workoutId: push.id });
            create();

            expect(text('.due__all-done')).toEqual(['check All done: Push, Legs']);
            expect(element().querySelector('.suggestion')).not.toBeNull();
        });

        it('shows nothing on a day with nothing planned', () => {
            TestBed.inject(PlanStore).add(0, 'workout-1');
            create();

            expect(element().querySelector('.due')).toBeNull();
        });
    });
});
