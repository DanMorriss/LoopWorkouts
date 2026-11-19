import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HistoryEntry, LoggedSet } from '../models/history';
import { ActiveRunService } from '../shared/run/active-run.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { greetingFor, HomeComponent } from './home.component';
import { asOneGroup } from '../models/workout';
import { markFor } from './week-strip/week-strip.component';
import { PlannedStatus } from '../models/plan';
import { STRETCH_ROUTINE_ID } from '../models/built-in-stretches';

const NOW = new Date(2026, 9, 18, 12, 0).getTime();
const HOUR = 60 * 60 * 1000;
/** The ready-made plans for Fitness with a kettlebell, best first. */
const PLANS_FOR_KETTLEBELL = ['Fitness, 4 days', 'Kettlebell, 3 days', 'No equipment, 3 days'];

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

/** The same, done yesterday: nothing today to offer stretches for. */
const yesterday: HistoryEntry = {
    ...entry,
    startedAt: entry.startedAt - 24 * HOUR,
    endedAt: entry.endedAt - 24 * HOUR,
    updatedAt: entry.updatedAt - 24 * HOUR,
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

    /**
     * Presses Use this plan, and waits for the card to change into the week: it's made inside
     * a view transition, so the card can grow or shrink into it (morphHome).
     */
    async function useThePlan() {
        // Its workouts are ready-made ones, which load on demand
        await TestBed.inject(WorkoutStore).loadReadyMade();
        const start = vi.spyOn(document, 'startViewTransition');
        (element().querySelector('.plan-card__use') as HTMLButtonElement).click();
        expect(document.documentElement.classList).toContain('home-morphing');
        await start.mock.results[0].value.updateCallbackDone;
        fixture.detectChanges();
        await fixture.whenStable();
        start.mockRestore();
    }

    describe('getting started, with no workouts (NAV-6, PLN-7)', () => {
        it('shows no logo, and offers a ready-made week for your goal and equipment', () => {
            TestBed.inject(SettingsStore).update({
                trainingGoal: 'fitness',
                myEquipment: ['kettlebell'],
            });
            create();

            expect(element().querySelector('app-loop-logo')).toBeNull();
            expect(text('.start__label')).toEqual(['Get started']);
            expect(text('.start__lead')).toEqual([
                'Start with a week of workouts, planned for you. Here are some for your goal and equipment, best first:',
            ]);
            // Each your kit allows, to swipe between, the one for your goal first
            expect(text('.plan-card__title')).toEqual(PLANS_FOR_KETTLEBELL);
            const first = element().querySelector('app-plan-card')!;
            const inFirst = (selector: string) =>
                [...first.querySelectorAll(selector)].map((el) =>
                    el.textContent!.replace(/\s+/g, ' ').trim()
                );
            expect(inFirst('.plan-card__workout-name')).toEqual([
                'Tabata',
                'Kettlebell AMRAP',
                '20-minute AMRAP',
                'Cardio intervals',
                'Mobility flow',
                'Full-body stretch',
            ]);
            expect(inFirst('.plan-card__workout-days')).toEqual([
                'Mon',
                'Tue',
                'Thu',
                'Sat',
                'Wed',
                'Sun',
            ]);
            expect(inFirst('.plan-card__count')).toEqual(['4 days a week']);
            expect(inFirst('.plan-card__rest-count')).toEqual(['+ 2 active rest']);
            expect(inFirst('.plan-card__rest-label')).toEqual(['On rest days']);
            expect(element().querySelector('.plan-card__use')!.classList).toContain('btn-main');
            for (const link of element().querySelectorAll('.plans__actions a')) {
                expect(link.classList).toContain('btn-pill');
            }
            expect(
                [...element().querySelectorAll('.plans__actions a')].map((link) => [
                    link.textContent!.trim(),
                    link.getAttribute('href'),
                ])
            ).toEqual([
                ['All plans', '/ready-made-plans'],
                ['Make your own plan', '/plan'],
            ]);
            expect(element().querySelector('app-week-strip')).toBeNull();
        });

        it('has a dot for each plan, which shows it, and marks the one shown', async () => {
            TestBed.inject(SettingsStore).update({
                trainingGoal: 'fitness',
                myEquipment: ['kettlebell'],
            });
            create();
            document.body.appendChild(element());

            const dots = () => [
                ...element().querySelectorAll<HTMLButtonElement>('app-get-started .carousel__dot'),
            ];
            expect(dots().map((dot) => dot.getAttribute('aria-label'))).toEqual(
                PLANS_FOR_KETTLEBELL.map(
                    (_, i) => `Plan ${i + 1} of ${PLANS_FOR_KETTLEBELL.length}`
                )
            );
            expect(dots().map((dot) => dot.getAttribute('aria-current'))).toEqual(
                PLANS_FOR_KETTLEBELL.map((_, i) => (i === 0 ? 'true' : null))
            );
            // Over the slides, as they're too tall for dots under them to be seen, and above All
            // plans and Make your own plan
            const firstSlide = element().querySelector('app-get-started .carousel__slide')!;
            expect(
                dots()[0].compareDocumentPosition(firstSlide) & Node.DOCUMENT_POSITION_FOLLOWING
            ).toBeTruthy();
            const actions = element().querySelector('.plans__actions')!;
            expect(
                dots()[0].compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING
            ).toBeTruthy();

            dots()[1].click();
            fixture.detectChanges();
            expect(dots()[1].getAttribute('aria-current')).toBe('true');
            const track = element().querySelector<HTMLElement>('app-get-started .carousel__track')!;
            const second = element().querySelectorAll<HTMLElement>('.carousel__slide')[1];
            await vi.waitFor(() => expect(track.scrollLeft).toBe(second.offsetLeft));
            element().remove();
        });

        it('only offers plans for your equipment, with none picked those needing none', () => {
            create();

            expect(text('.plan-card__title')).toEqual(['No equipment, 3 days']);
            // One alone: no dots
            expect(element().querySelector('app-get-started .carousel__dot')).toBeNull();
        });

        it('uses it in one tap: the week planned with its workouts, with Undo', async () => {
            create();
            // On the page, so focus can move
            document.body.appendChild(element());
            expect(text('.plan-card__title')).toEqual(['No equipment, 3 days']);
            await useThePlan();

            // Its ready-made workouts are planned as they are, not copied
            expect(TestBed.inject(WorkoutStore).workouts()).toEqual([]);
            expect(TestBed.inject(PlanStore).plan().days.flat()).toContain(
                'builtin:bodyweight-basics'
            );
            expect(TestBed.inject(UndoService).offer()?.message).toBe(
                'Your week is planned: No equipment, 3 days'
            );
            expect(element().querySelector('app-get-started')).toBeNull();
            expect(element().querySelector('.week__days')).not.toBeNull();
            // Used on a Sunday, its Mon, Wed and Fri have gone by: it starts next week
            expect(text('.week__so-far')).toEqual(['Your plan starts next week']);
            expect(document.activeElement).toBe(element().querySelector('.week__edit'));

            TestBed.inject(UndoService).undo();
            fixture.detectChanges();
            expect(TestBed.inject(WorkoutStore).workouts()).toEqual([]);
            expect(TestBed.inject(PlanStore).hasPlan()).toBe(false);
            expect(element().querySelector('app-get-started')).not.toBeNull();
            element().remove();
        });
    });

    describe('muscles worked this week', () => {
        it('shows the body map of the last 7 days, with a link to the bars on Progress', async () => {
            TestBed.inject(HistoryStore).record(entry);
            create();

            // Its space kept while its drawings load, after the page
            const card = element().querySelector('app-muscles-this-week .muscles-week')!;
            expect(card.querySelector('.muscles-week__map-space')).not.toBeNull();
            await vi.waitFor(() => {
                fixture.detectChanges();
                expect(card.querySelector('app-body-map')).not.toBeNull();
            });
            // Its space gives way to it
            const space = card.querySelector('.muscles-week__map-space')!;
            expect(getComputedStyle(space).display).toBe('none');
            expect(card.querySelector('app-muscle-bars')).toBeNull();
            expect(card.querySelector('.muscles-week__more')!.getAttribute('href')).toBe(
                '/history'
            );
        });

        it("isn't there with no workout done in the last 7 days, as its map would be blank", () => {
            TestBed.inject(HistoryStore).record({
                ...entry,
                startedAt: NOW - 8 * 24 * HOUR,
                endedAt: NOW - 8 * 24 * HOUR + 600_000,
            });
            create();

            expect(element().querySelector('.muscles-week')).toBeNull();
        });
    });

    it('suggests the saved workout for the least worked muscles, and starts it', () => {
        const workouts = TestBed.inject(WorkoutStore);
        const push = workouts.addWorkout({
            title: 'Push',
            repeats: 3,
            blocks: asOneGroup([
                { kind: 'reps', reps: 5, name: 'Bench press', exerciseId: 'builtin:bench-press' },
            ]),
        });
        TestBed.inject(HistoryStore).record(yesterday);
        create();

        expect(text('.suggestion__title')).toEqual(['Push']);
        expect(text('.suggestion__reason')).toEqual([
            "It works your Chest, which you haven't trained in the last 7 days.",
        ]);
        const more = element().querySelector<HTMLAnchorElement>('.suggestion__more')!;
        expect(more.textContent).toContain('See your week');
        expect(more.getAttribute('href')).toBe('/history');
        expect(element().querySelector('app-get-started')).toBeNull();

        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        (element().querySelector('[aria-label="Start Push"]') as HTMLButtonElement).click();

        expect(TestBed.inject(ActiveRunService).workout()?.id).toBe(push.id);
        expect(router.navigate).toHaveBeenCalledWith(['/workout']);
    });

    it('says when the muscles it works have had some sets, but the least', () => {
        TestBed.inject(WorkoutStore).addWorkout({
            title: 'Squats',
            repeats: 2,
            blocks: asOneGroup([
                { kind: 'reps', reps: 5, name: 'Back squat', exerciseId: 'builtin:back-squat' },
            ]),
        });
        TestBed.inject(HistoryStore).record(yesterday);
        create();

        expect(text('.suggestion__title')).toEqual(['Squats']);
        expect(text('.suggestion__reason')[0]).toMatch(
            /^It works your .+, which you've trained least in the last 7 days\.$/
        );
    });

    it('only suggests workouts you have the equipment for', () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.addWorkout({
            title: 'Barbell bench',
            repeats: 3,
            blocks: asOneGroup([
                { kind: 'reps', reps: 5, name: 'Bench press', exerciseId: 'builtin:bench-press' },
            ]),
        });
        workouts.addWorkout({
            title: 'Bodyweight',
            repeats: 3,
            blocks: asOneGroup([
                { kind: 'reps', reps: 10, name: 'Push-up', exerciseId: 'builtin:push-up' },
            ]),
        });
        TestBed.inject(HistoryStore).record(yesterday);
        TestBed.inject(SettingsStore).update({ myEquipment: ['none'] });
        create();

        expect(text('.suggestion__title')).toEqual(['Bodyweight']);
    });

    describe('this week (PLN-4)', () => {
        function addWorkout(title: string) {
            return TestBed.inject(WorkoutStore).addWorkout({
                title,
                repeats: 1,
                blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Back squat' }]),
            });
        }
        const days = () =>
            [...element().querySelectorAll('.week__day')].map((day) => ({
                letter: day.querySelector('.week__letter')!.textContent!.trim(),
                mark: [...day.classList]
                    .filter((name) => name.startsWith('week__day--') && name !== 'week__day--today')
                    .map((name) => name.replace('week__day--', ''))[0],
                today: day.getAttribute('aria-current') === 'date',
            }));

        it("isn't there before there's a workout to plan", () => {
            create();

            expect(element().querySelector('app-week-strip')).toBeNull();
        });

        it('with nothing planned, offers the ready-made weeks, more plans, or planning your own', () => {
            TestBed.inject(SettingsStore).update({
                trainingGoal: 'fitness',
                myEquipment: ['kettlebell'],
            });
            addWorkout('Legs');
            create();

            expect(text('.week__label')).toEqual(['This week']);
            expect(text('.week__empty')).toEqual([
                "Nothing planned yet. Here are some weeks of ready-made workouts for your goal and equipment, best first, or plan your own and Today shows what's due each day.",
            ]);
            // Each your kit allows, to swipe between, as on Get started
            expect(text('app-week-strip .plan-card__title')).toEqual(PLANS_FOR_KETTLEBELL);
            expect(element().querySelectorAll('app-week-strip .carousel__dot').length).toBe(
                PLANS_FOR_KETTLEBELL.length
            );
            expect(element().querySelector('.plan-card__use')!.classList).toContain('btn-main');
            expect(
                [...element().querySelectorAll('.plans__actions a')].map((link) => [
                    link.textContent!.trim(),
                    link.getAttribute('href'),
                    link.classList.contains('btn-pill'),
                ])
            ).toEqual([
                ['All plans', '/ready-made-plans', true],
                ['Make your own plan', '/plan', true],
            ]);
            expect(element().querySelector('.week__days')).toBeNull();
        });

        it('uses the ready-made week in one tap, alongside your workouts, with Undo', async () => {
            const legs = addWorkout('Legs');
            create();
            document.body.appendChild(element());
            expect(text('.plan-card__title')).toEqual(['No equipment, 3 days']);
            await useThePlan();

            expect(TestBed.inject(WorkoutStore).workouts()).toEqual([legs]);
            expect(TestBed.inject(PlanStore).plan().days.flat()).toContain(
                'builtin:bodyweight-basics'
            );
            expect(TestBed.inject(UndoService).offer()?.message).toBe(
                'Your week is planned: No equipment, 3 days'
            );
            expect(element().querySelector('.week__days')).not.toBeNull();
            expect(document.activeElement).toBe(element().querySelector('.week__edit'));

            TestBed.inject(UndoService).undo();
            fixture.detectChanges();
            expect(TestBed.inject(WorkoutStore).workouts()).toEqual([legs]);
            expect(element().querySelector('.week__days')).toBeNull();
        });

        describe('on a day with nothing planned', () => {
            // A Wednesday, with Legs planned on Thursday
            const WEDNESDAY = new Date(2026, 9, 14, 12, 0).getTime();

            async function restDay() {
                vi.setSystemTime(WEDNESDAY);
                const legs = addWorkout('Legs');
                TestBed.inject(WorkoutStore).addWorkout({
                    title: 'Push',
                    repeats: 1,
                    blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Bench press' }]),
                });
                TestBed.inject(PlanStore).add(3, legs.id);
                await TestBed.inject(WorkoutStore).loadReadyMade();
                create();
            }

            it('offers a workout, saying resting is fine too, and leaves Thursday’s muscles fresh', async () => {
                await restDay();

                expect(text('.suggestion__label')).toEqual(['Fancy a workout today?']);
                const said = text('.suggestion__reason');
                expect(said[0]).toBe(
                    "Nothing's planned today, so resting is fine too. If you'd like to train:"
                );
                expect(said[1]).toMatch(/fresh for Legs on Thursday\.$/);
                // Not the one planned next, which back squats are, among any to swipe to
                expect(text('.suggestion__title').length).toBeGreaterThan(1);
                expect(text('.suggestion__title')).not.toContain('Legs');
            });

            it('says See your week only with something done for Progress to show', async () => {
                await restDay();
                expect(element().querySelector('.suggestion__more')).toBeNull();

                TestBed.inject(HistoryStore).record(yesterday);
                fixture.detectChanges();
                expect(text('.suggestion__more')).toEqual(['See your week chevron_right']);
            });

            it('offers nothing extra on a day with something planned', async () => {
                await restDay();
                fixture.destroy();
                TestBed.inject(PlanStore).add(2, TestBed.inject(WorkoutStore).workouts()[1].id);
                create();

                expect(element().querySelector('.suggestion')).toBeNull();
            });
        });

        it('shows each day Monday first, marked, with today picked out, and Edit plan', () => {
            // NOW is a Sunday, the plan's day 6
            const legs = addWorkout('Legs');
            const push = addWorkout('Push');
            const plan = TestBed.inject(PlanStore);
            // Planned last week, so this week's days count
            vi.setSystemTime(NOW - 7 * 24 * HOUR);
            plan.add(0, legs.id);
            plan.add(2, push.id);
            plan.add(6, legs.id);
            plan.add(6, push.id);
            vi.setSystemTime(NOW);
            // Wednesday's Push was done; Monday's Legs wasn't
            TestBed.inject(HistoryStore).record({
                ...entry,
                workoutId: push.id,
                startedAt: NOW - 4 * 24 * HOUR,
            });
            create();

            expect(days()).toEqual([
                { letter: 'M', mark: 'missed', today: false },
                { letter: 'T', mark: 'free', today: false },
                { letter: 'W', mark: 'done', today: false },
                { letter: 'T', mark: 'free', today: false },
                { letter: 'F', mark: 'free', today: false },
                { letter: 'S', mark: 'free', today: false },
                { letter: 'S', mark: 'planned', today: true },
            ]);
            expect(text('.week__day .sr-only')).toEqual([
                'Monday: Legs, missed',
                'Tuesday: nothing planned',
                'Wednesday: Push, done',
                'Thursday: nothing planned',
                'Friday: nothing planned',
                'Saturday: nothing planned',
                'Sunday, today: Legs, due today; Push, due today',
            ]);
            expect(text('.week__so-far')).toEqual(['1 of 4 done this week']);
            const edit = element().querySelector('.week__edit')!;
            expect(edit.textContent!.trim()).toBe('Edit plan');
            expect(edit.getAttribute('href')).toBe('/plan');
        });

        it("doesn't count days already gone when they were planned: the plan starts next week", () => {
            // NOW is a Sunday, so Monday and Wednesday have gone by
            const legs = addWorkout('Legs');
            const plan = TestBed.inject(PlanStore);
            plan.add(0, legs.id);
            plan.add(2, legs.id);
            create();

            expect(days().map((d) => d.mark)).toEqual([
                'free',
                'free',
                'free',
                'free',
                'free',
                'free',
                'free',
            ]);
            expect(text('.week__day .sr-only')[0]).toBe('Monday: Legs, from next week');
            expect(text('.week__so-far')).toEqual(['Your plan starts next week']);
            expect(
                element().querySelector('.week__so-far app-help-link a')!.getAttribute('href')
            ).toBe('/help?q=starts-next-week');
        });

        it('names the next workout to come, and says when the week is all done', () => {
            vi.setSystemTime(NOW - 3 * 24 * HOUR); // Thursday
            const legs = addWorkout('Legs');
            const plan = TestBed.inject(PlanStore);
            plan.add(3, legs.id);
            plan.add(5, legs.id);
            create();

            expect(text('.week__so-far')).toEqual([
                '0 of 2 done this week · Next: Legs on Saturday',
            ]);
            fixture.destroy();

            TestBed.inject(PlanStore).remove(5, legs.id);
            TestBed.inject(HistoryStore).record({
                ...entry,
                workoutId: legs.id,
                startedAt: NOW - 3 * 24 * HOUR - HOUR,
            });
            create();

            expect(text('.week__so-far')).toEqual(['Done for the week']);
        });

        it('marks a day by all its workouts: done once all are, missed if any were', () => {
            const of = (...statuses: PlannedStatus[]) => statuses.map((status) => ({ status }));
            expect(markFor([])).toBe('free');
            expect(markFor(of('done', 'done'))).toBe('done');
            expect(markFor(of('done', 'missed'))).toBe('missed');
            expect(markFor(of('done', 'today'))).toBe('planned');
            expect(markFor(of('to come'))).toBe('planned');
        });

        it('marks a day of only active rest as such until it goes by, and ignores it beside training', () => {
            const rest = (status: PlannedStatus) => ({ status, activeRest: true as const });
            expect(markFor([rest('to come')])).toBe('rest');
            expect(markFor([rest('rested')])).toBe('free');
            expect(markFor([rest('done')])).toBe('done');
            expect(markFor([{ status: 'done' }, rest('rested')])).toBe('done');
            expect(markFor([{ status: 'today' }, rest('today')])).toBe('planned');
        });
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
            expect(element().querySelector('app-get-started')).toBeNull();
        });

        /** A workout of only stretches, which is active rest. */
        function addStretches() {
            return TestBed.inject(WorkoutStore).addWorkout({
                title: 'Stretches',
                repeats: 1,
                blocks: asOneGroup([
                    {
                        kind: 'work',
                        seconds: 60,
                        name: "Child's pose",
                        exerciseId: 'builtin:childs-pose',
                    },
                ]),
            });
        }

        it('offers a day of only active rest, rather than pressing it', () => {
            TestBed.inject(PlanStore).add(6, addStretches().id);
            create();

            expect(text('.due__label')).toEqual(['Active rest today']);
            expect(text('.due__hint')).toEqual([
                'There if you fancy it: a gentle stretch, or just rest.',
            ]);
            const start = element().querySelector('.due__workout button')!;
            expect(start.classList).toContain('btn-pill');
            expect(start.classList).not.toContain('btn-main');
        });

        it('lists one done today instead, this week only, saying where from', () => {
            const { legs } = planToday();
            const plan = TestBed.inject(PlanStore);
            plan.remove(6, legs.id);
            plan.moveThisWeek(legs.id, 0, 6);
            create();

            expect(text('.due__title')).toEqual(['Push', 'Legs']);
            expect(text('.due__kind')).toEqual(['Moved from Monday']);
        });

        it("offers a workout on a day whose only one was moved off it this week, and not on the day it's moved to", () => {
            const plan = TestBed.inject(PlanStore);
            const { push, legs } = planToday();
            plan.remove(6, legs.id);
            plan.moveThisWeek(push.id, 6, 5);
            create();

            expect(element().querySelector('app-due-today .due')).toBeNull();
            expect(element().textContent).toContain('Fancy a workout today?');
        });

        it('puts active rest after training, marked as such, with a quieter Start', () => {
            const plan = TestBed.inject(PlanStore);
            plan.add(6, addStretches().id);
            const { push } = planToday();
            plan.remove(6, push.id);
            plan.add(6, push.id);
            create();

            expect(text('.due__label')).toEqual(['Due today']);
            expect(text('.due__title')).toEqual(['Legs', 'Push', 'Stretches']);
            expect(text('.due__kind')).toEqual(['Active rest, if you fancy it']);
            const starts = [
                ...element().querySelectorAll<HTMLButtonElement>('.due__workout button'),
            ];
            expect(starts[0].classList).toContain('btn-main');
            expect(starts[2].classList).toContain('btn-pill');
        });

        it('never marks active rest missed, nor counts it in the week', () => {
            const stretches = addStretches();
            const plan = TestBed.inject(PlanStore);
            // Planned last week: Tuesday's gone by without it; today, Sunday, there's training
            vi.setSystemTime(NOW - 7 * 24 * HOUR);
            plan.add(1, stretches.id);
            planToday();
            vi.setSystemTime(NOW);
            create();

            const days = [...element().querySelectorAll('.week__day')];
            expect(days[1].classList).toContain('week__day--free');
            expect(days[1].textContent).toContain('Tuesday: Stretches, active rest, rested');
            // Push and Legs today, and Monday's Legs missed: three, not counting the stretches
            expect(text('.week__so-far')).toEqual(['0 of 3 done this week']);
        });

        it('leaves out one run today, saying so, and offers no stretches while any are left', () => {
            const { legs } = planToday();
            TestBed.inject(HistoryStore).record({ ...entry, workoutId: legs.id });
            create();

            expect(text('.due__title')).toEqual(['Push']);
            expect(text('.due__done')).toEqual(['Done today: Legs']);
            expect(element().querySelector('.suggestion')).toBeNull();
        });

        it('says all done once each has been run today, leaving what is next to the plan', () => {
            const { push, legs } = planToday();
            const history = TestBed.inject(HistoryStore);
            history.record({ ...entry, workoutId: legs.id });
            history.record({ ...entry, id: 'run-2', workoutId: push.id });
            create();

            expect(text('.due__all-done')).toEqual(['check All done: Push, Legs']);
            // With a week planned, the week says what's next, not a suggestion: only the
            // stretches for what was done (PRG-16)
            expect(text('.suggestion__label')).toEqual(["After today's training"]);
            expect(text('.suggestion__title')).toEqual(['Stretch what you worked']);
            expect(element().querySelector('.suggestion__more')).toBeNull();
        });

        it('offers stretches for today first, starting them, and none once done', () => {
            TestBed.inject(WorkoutStore).addWorkout({
                title: 'Push',
                repeats: 3,
                blocks: asOneGroup([
                    {
                        kind: 'reps',
                        reps: 5,
                        name: 'Bench press',
                        exerciseId: 'builtin:bench-press',
                    },
                ]),
            });
            const history = TestBed.inject(HistoryStore);
            history.record(entry);
            create();

            // The stretches, then the workouts to swipe to
            expect(text('.suggestion__label')).toEqual(["After today's training"]);
            expect(text('.suggestion__title')).toEqual(['Stretch what you worked', 'Push']);
            expect(text('.suggestion__reason')[0]).toMatch(
                /^About \d+ min for your .*Quads.*, each held 30 seconds\.$/
            );
            expect(
                [...element().querySelectorAll('.carousel__dot')].map((dot) =>
                    dot.getAttribute('aria-label')
                )
            ).toEqual(['Suggestion 1 of 2', 'Suggestion 2 of 2']);

            const router = TestBed.inject(Router);
            vi.spyOn(router, 'navigate').mockResolvedValue(true);
            element().querySelector<HTMLButtonElement>('[aria-label^="Start stretches"]')!.click();
            expect(TestBed.inject(ActiveRunService).workout()?.id).toBe(STRETCH_ROUTINE_ID);
            expect(router.navigate).toHaveBeenCalledWith(['/workout']);

            // Stretched since: just the workout again
            history.record({
                ...entry,
                id: 'run-2',
                workoutId: STRETCH_ROUTINE_ID,
                startedAt: NOW - 10 * 60_000,
                sets: [
                    {
                        round: 0,
                        step: 0,
                        name: 'Standing quad stretch',
                        seconds: 30,
                        exerciseId: 'builtin:standing-quad-stretch',
                    },
                ],
            });
            fixture.detectChanges();
            expect(text('.suggestion__label')).toEqual(['Suggested next workout']);
            expect(text('.suggestion__title')).toEqual(['Push']);
        });

        it('shows nothing on a day with nothing planned', () => {
            TestBed.inject(PlanStore).add(0, 'workout-1');
            create();

            expect(element().querySelector('.due')).toBeNull();
        });
    });
});
