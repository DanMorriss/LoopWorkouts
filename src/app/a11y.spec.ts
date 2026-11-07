import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import axe from 'axe-core';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { LeaveCheck } from './nav/leave-check';
import {
    FakeAccountClient,
    fakeAccountClient,
    provideFakeAccountClient,
    sessionFor,
} from './shared/testing/fake-account-client';
import { provideFakeSyncStarter } from './shared/testing/fake-sync';
import { makeWorkout, reps, rest, work } from './shared/testing/make-workout';
import { ExerciseStore } from './shared/state/exercise-store.service';
import { HistoryStore } from './shared/state/history-store.service';
import { PlanStore } from './shared/state/plan-store.service';
import { weekdayOf } from './models/plan';
import { WorkoutStore } from './shared/state/workout-store.service';
import { AddressMove } from './nav/moved-banner/address-move.service';
import { UndoService } from './shared/undo/undo.service';
import { asOneGroup } from './models/workout';

/**
 * Runs axe (WCAG 2.1 A/AA plus best practices) over every page and state of the app,
 * rendered inside the real app shell, so accessibility regressions fail the tests.
 */

const sprints = makeWorkout({ title: 'Sprints', workSeconds: 2, restSeconds: 2, repeats: 2 });
const untitled = makeWorkout({
    id: 'workout-2',
    title: '',
    workSeconds: 30,
    restSeconds: 2,
    repeats: 2,
});

// These rules look at the whole document (one <main>, one <h1>, everything inside a
// landmark). The test page around the app isn't ours, so they're left to the
// real-browser checks; the app shell provides <header>, <main> and the <h1>.
const DOCUMENT_LEVEL_RULES = [
    'region',
    'landmark-one-main',
    'page-has-heading-one',
    'html-has-lang',
    'document-title',
];

// A closed wheel's other numbers: scrolled out of its one-row window and hidden from screen
// readers. Setup has over 700, and checking their contrast was most of axe's time there.
const UNSEEN_WHEEL_NUMBERS =
    'app-wheel-picker:not(.wheel-picker--open) .wheel-picker__item:not(.wheel-picker__item--selected)';

// Each check renders the whole app and runs axe once or twice over it, which takes a few
// seconds on a busy CI machine: past the default 15s, now and then, for the bigger pages
const AXE_TEST_TIMEOUT_MS = 45_000;

// Every page and state is checked in both themes, so neither can fall below WCAG AA
for (const theme of ['dark', 'light'] as const) {
    describe(`Accessibility (axe), ${theme} theme`, { timeout: AXE_TEST_TIMEOUT_MS }, () => {
        let fixture: ComponentFixture<AppComponent>;
        let router: Router;
        let store: WorkoutStore;
        let accountClient: FakeAccountClient;

        beforeEach(() => {
            document.documentElement.dataset['theme'] = theme;
            localStorage.clear();
            sessionStorage.clear();
            accountClient = fakeAccountClient();
            TestBed.configureTestingModule({
                providers: [
                    provideRouter(routes),
                    provideFakeAccountClient(accountClient),
                    provideFakeSyncStarter(),
                ],
            });
            router = TestBed.inject(Router);
            store = TestBed.inject(WorkoutStore);
            fixture = TestBed.createComponent(AppComponent);
        });

        afterEach(() => {
            fixture.destroy();
            delete document.documentElement.dataset['theme'];
            localStorage.clear();
            sessionStorage.clear();
        });

        async function open(url: string) {
            await router.navigateByUrl(url);
            await settle();
        }

        // Not fixture.whenStable(): the workout page's clock interval means it never settles
        async function settle(ms = 50) {
            fixture.detectChanges();
            await new Promise((resolve) => setTimeout(resolve, ms));
            fixture.detectChanges();
        }

        function click(selector: string) {
            const element = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
            expect(element, `expected to find ${selector}`).not.toBeNull();
            element!.click();
        }

        async function expectNoViolations() {
            // Check what's seen once things have moved into place: a dialog fading in would
            // otherwise read as low contrast. Looping ones (the logo's light) carry on.
            document
                .getAnimations()
                .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
                .forEach((animation) => animation.finish());
            const context = {
                include: [fixture.nativeElement as HTMLElement],
                exclude: [UNSEEN_WHEEL_NUMBERS],
            };
            const results = await axe.run(context, {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
                },
                rules: Object.fromEntries(
                    DOCUMENT_LEVEL_RULES.map((rule) => [rule, { enabled: false }])
                ),
            });
            const report = results.violations.map(
                (v) =>
                    `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`
            );
            expect(report, 'axe violations').toEqual([]);
        }

        it('the banner on the old address, over Home', async () => {
            TestBed.inject(AddressMove).state.set('guest');
            store.addWorkout(sprints);
            await open('/home');
            expect(fixture.nativeElement.querySelector('.moved')).not.toBeNull();
            await expectNoViolations();
        });

        describe('the bars along the bottom', () => {
            it('the tabs, on a page under one (setup, under Library)', async () => {
                await open('/setup');
                expect(fixture.nativeElement.querySelector('.tab-bar')).not.toBeNull();
                await expectNoViolations();
            });

            it('with a workout going, above the tabs', async () => {
                store.setActiveWorkout(store.addWorkout(sprints));
                await open('/history');
                // Past the bar's rise into place, which axe would see as low contrast
                await settle(600);
                expect(fixture.nativeElement.querySelector('.run-bar')).not.toBeNull();
                await expectNoViolations();
            });

            it('with that workout paused', async () => {
                store.setActiveWorkout(store.addWorkout(sprints));
                await open('/history');
                click('.run-bar__pause');
                await settle(600);
                await expectNoViolations();
            });
        });

        describe('setup', () => {
            it('new workout, with its one empty rep step', async () => {
                await open('/setup');
                await expectNoViolations();
            });

            it('with a named step and no work (and the "needs a timed step" error)', async () => {
                await open('/setup');
                const box = fixture.nativeElement.querySelector('.step input');
                box.value = 'Squats';
                box.dispatchEvent(new Event('input'));
                await settle();
                expect(fixture.nativeElement.textContent).toContain('Workout needs');
                await expectNoViolations();
            });

            it('with the info tip by Steps showing', async () => {
                await open('/setup');
                click('#steps-info');
                await settle(300); // past the tip's fade-in
                await expectNoViolations();
            });

            it("with a step's kind menu open", async () => {
                await open('/setup');
                click('.step__kind-button');
                await settle();
                await expectNoViolations();
            });

            it('with several steps of each kind, one of them moved', async () => {
                await open('/setup');
                click('.add-step');
                await settle();
                click('.step:nth-child(2) .step__kind-button');
                await settle();
                click('.step__kind-option--rest');
                await settle();
                click('.add-step');
                await settle();
                click('.step:nth-child(3) .step__kind-button');
                await settle();
                click('.step__kind-option--work');
                await settle();
                click('.step:nth-child(3) .step__action');
                await settle();
                await expectNoViolations();
            });

            it("with a step's sets varying, one row open on its wheels", async () => {
                await open('/setup');
                click('[id$="-sets"] [data-value="3"]');
                await settle();
                click('[id$="-vary"] [role="switch"]');
                await settle();
                click('.wheel-row__toggle');
                await settle();
                expect(fixture.nativeElement.querySelector('[id$="-set-0-reps"]')).not.toBeNull();
                await expectNoViolations();
            });

            it('with the until-stopped switch on', async () => {
                await open('/setup');
                click('app-infinity-switch [role="switch"]');
                await settle();
                await expectNoViolations();
            });

            it('with a time limit of 00:00 (and its error)', async () => {
                await open('/setup');
                click('input[name="repeatMode"][value="time"]');
                await settle();
                click('#limit-minutes [data-value="0"]');
                await settle();
                expect(fixture.nativeElement.textContent).toContain('Time limit needs');
                await expectNoViolations();
            });

            it('editing a workout', async () => {
                const saved = store.addWorkout(sprints);
                await open('/setup?editId=' + saved.id);
                await expectNoViolations();
            });

            it('after deleting a step, with Undo offered', async () => {
                const saved = store.addWorkout(sprints);
                await open('/setup?editId=' + saved.id);
                click('.step__toggle');
                await settle();
                click('.step__action--delete');
                await settle();
                expect(fixture.nativeElement.querySelector('.undo-bar')).not.toBeNull();
                await expectNoViolations();
            });

            it("picking an exercise, with each one's muscles and equipment", async () => {
                await open('/setup');
                click('.add-step');
                await settle();
                const box = fixture.nativeElement.querySelector('[role="combobox"]');
                box.focus();
                box.value = 'squat';
                box.dispatchEvent(new Event('input'));
                await settle();
                expect(
                    fixture.nativeElement.querySelector('.exercise-picker__hint')
                ).not.toBeNull();
                await expectNoViolations();
            });

            it("with an exercise's details open", async () => {
                const saved = store.addWorkout(
                    makeWorkout({
                        steps: [
                            {
                                kind: 'reps',
                                reps: 8,
                                name: 'Inverted row',
                                exerciseId: 'builtin:inverted-row',
                            },
                        ],
                    })
                );
                TestBed.inject(ExerciseStore).setNote('builtin:inverted-row', 'Feet on a box');
                await open('/setup?editId=' + saved.id);
                click('.step__toggle');
                await settle();
                click('.step__exercise-details');
                await settle();
                expect(
                    fixture.nativeElement.querySelector('app-exercise-details-dialog')
                ).not.toBeNull();
                await expectNoViolations();
            });

            it('swapping an exercise for another, then with Undo offered', async () => {
                const saved = store.addWorkout(
                    makeWorkout({
                        steps: [
                            {
                                kind: 'reps',
                                reps: 8,
                                name: 'Inverted row',
                                exerciseId: 'builtin:inverted-row',
                            },
                        ],
                    })
                );
                await open('/setup?editId=' + saved.id);
                click('.step__toggle');
                await settle();
                click('.step__exercise-swap');
                await settle();
                expect(
                    fixture.nativeElement.querySelector('app-swap-exercise-dialog')
                ).not.toBeNull();
                await expectNoViolations();

                click('.swap__option');
                await settle();
                expect(fixture.nativeElement.textContent).toContain('Swapped to');
                await expectNoViolations();
            });

            it('browsing the exercises for a step, cut down to a muscle', async () => {
                await open('/setup');
                click('[id$="-browse"]');
                await settle();
                expect(
                    fixture.nativeElement.querySelector('app-browse-exercises-dialog')
                ).not.toBeNull();
                click('.muscle-chips__chip:nth-child(2)');
                // A short list, so the check reads a few cards rather than every exercise
                const box = fixture.nativeElement.querySelector('#browse-search');
                box.value = 'press';
                box.dispatchEvent(new Event('input'));
                await settle();
                expect(
                    fixture.nativeElement.querySelectorAll(
                        'app-browse-exercises-dialog .exercise-card'
                    ).length
                ).toBeGreaterThan(0);
                await expectNoViolations();
            });
        });

        describe('home', () => {
            it('before any workout', async () => {
                localStorage.setItem('welcomed', 'guest');
                await open('/home');
                expect(fixture.nativeElement.querySelector('app-get-started')).not.toBeNull();
                await expectNoViolations();
            });

            it('with the tour on (NAV-8)', async () => {
                localStorage.setItem('welcomed', 'guest');
                await open('/home');
                click('.offer__start');
                // The tour loads, opens Today and lights up Getting started
                await settle(400);
                expect(fixture.nativeElement.querySelector('.tour__light')).not.toBeNull();
                await expectNoViolations();
            });

            it('with the week planned', async () => {
                const push = store.addWorkout({
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
                const now = Date.now();
                // Push was done today, as planned, so Due today says all done
                TestBed.inject(HistoryStore).record({
                    id: 'run-0',
                    workoutId: push.id,
                    title: 'Push',
                    startedAt: now - 60_000,
                    endedAt: now,
                    activeSeconds: 60,
                    roundsCompleted: 1,
                    totalRounds: 1,
                    outcome: 'finished',
                    sets: [
                        {
                            round: 0,
                            step: 0,
                            name: 'Back squat',
                            reps: 5,
                            exerciseId: 'builtin:back-squat',
                        },
                    ],
                });
                // Planned on two days, one of them today, so the week shows each kind of day
                const plan = TestBed.inject(PlanStore);
                plan.add(0, push.id);
                plan.add(weekdayOf(now), push.id);
                plan.add(6, push.id);
                await open('/home');
                expect(fixture.nativeElement.querySelector('.week__days')).not.toBeNull();
                await expectNoViolations();
            });

            it('with a suggested workout, nothing planned', async () => {
                const push = store.addWorkout({
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
                const now = Date.now();
                TestBed.inject(HistoryStore).record({
                    id: 'run-0',
                    workoutId: push.id,
                    title: 'Push',
                    startedAt: now - 60_000,
                    endedAt: now,
                    activeSeconds: 60,
                    roundsCompleted: 1,
                    totalRounds: 1,
                    outcome: 'finished',
                });
                await open('/home');
                expect(fixture.nativeElement.querySelector('.suggestion')).not.toBeNull();
                expect(fixture.nativeElement.querySelector('.week__ready-made')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('ready-made plans', () => {
            it('the list, each with its week and Use this plan', async () => {
                await open('/ready-made-plans');
                expect(fixture.nativeElement.querySelectorAll('app-plan-card').length).toBe(6);
                await expectNoViolations();
            });

            it('one of their workouts, on its own page', async () => {
                await open('/ready-made-plans/gym-legs?from=plans');
                expect(fixture.nativeElement.querySelector('.preview__title')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('ready-made workouts', () => {
            it('listed on Workouts with their badges, the filters and equipment open', async () => {
                await TestBed.inject(WorkoutStore).readyMadeLoaded;
                await open('/library');
                expect(
                    fixture.nativeElement.querySelector('.workout-card app-ready-made-badge')
                ).not.toBeNull();
                click('[aria-controls="library-more-filters"]');
                await settle();
                click('.kit__edit');
                await settle();
                await expectNoViolations();
            });

            it('a workout, on its Details, with Make a copy', async () => {
                await TestBed.inject(WorkoutStore).readyMadeLoaded;
                await open('/ready-made/gym-legs');
                expect(fixture.nativeElement.querySelector('.details__copy')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('plan', () => {
            /**
             * Legs planned yesterday (missed) and today, Push today too and done. Legs is back
             * squats, so the muscle groups the plan misses show under the week.
             */
            function planned() {
                const legs = store.addWorkout(
                    makeWorkout({ title: 'Legs', steps: [reps(10, 'Back squat')] })
                );
                const push = store.addWorkout(makeWorkout({ title: 'Push' }));
                const plan = TestBed.inject(PlanStore);
                const today = weekdayOf(Date.now());
                plan.add((today + 6) % 7, legs.id);
                plan.add(today, legs.id);
                plan.add(today, push.id);
                const now = Date.now();
                TestBed.inject(HistoryStore).record({
                    id: 'run-0',
                    workoutId: push.id,
                    title: 'Push',
                    startedAt: now - 1,
                    endedAt: now,
                    activeSeconds: 1,
                    roundsCompleted: 1,
                    totalRounds: 1,
                    outcome: 'finished',
                    sets: [],
                });
            }

            it('the week, with workouts done, missed and due, and the muscles missed', async () => {
                planned();
                await open('/plan');
                expect(fixture.nativeElement.querySelector('.plan__workout')).not.toBeNull();
                expect(fixture.nativeElement.querySelector('.plan-muscles')).not.toBeNull();
                await expectNoViolations();
            });

            it('picking a workout to plan', async () => {
                planned();
                await open('/plan');
                click('#plan-add-0');
                await settle();
                await expectNoViolations();
            });

            it('due today on Home', async () => {
                planned();
                await open('/home');
                expect(fixture.nativeElement.querySelector('.due')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('library', () => {
            it('empty', async () => {
                await open('/library');
                await expectNoViolations();
            });

            it('with workouts, including an untitled one', async () => {
                store.addWorkout(sprints);
                store.addWorkout(untitled);
                await open('/library');
                await expectNoViolations();
            });

            it('with a workout just saved in Create highlighted (BLD-15)', async () => {
                store.addWorkout(sprints);
                const saved = store.addWorkout(untitled);
                await open(`/library?saved=${saved.id}`);
                expect(
                    fixture.nativeElement.querySelector('.workout-card--highlighted')
                ).not.toBeNull();
                await expectNoViolations();
            });

            it('with a card selected and its options open', async () => {
                store.addWorkout(sprints);
                await open('/library');
                click('.workout-card');
                click('.workout-card__action--menu');
                await settle();
                await expectNoViolations();
            });

            it('after deleting a workout, with Undo offered', async () => {
                store.addWorkout(sprints);
                await open('/library');
                // Your own one's, not a ready-made one's, which can't be deleted
                click('.workout-card:not([data-workout^="builtin:"]) .workout-card__action--menu');
                await settle();
                click('.workout-card__menu-item--danger');
                await settle();
                expect(fixture.nativeElement.querySelector('.undo-bar')).not.toBeNull();
                await expectNoViolations();
            });

            it("with a ready-made card's options open", async () => {
                store.addWorkout(sprints);
                await store.readyMadeLoaded;
                await open('/library');
                click('[data-workout="builtin:gym-legs"] .workout-card__action--menu');
                await settle();
                expect(
                    fixture.nativeElement.querySelector('.workout-card__menu-item--copy')
                ).not.toBeNull();
                await expectNoViolations();
            });

            it('leaving Create with unsaved changes', async () => {
                await open('/setup');
                const title = fixture.nativeElement.querySelector('#title') as HTMLInputElement;
                title.value = 'Sprints';
                title.dispatchEvent(new Event('input', { bubbles: true }));
                await settle();
                void TestBed.inject(LeaveCheck).confirm();
                await settle();
                expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).not.toBeNull();
                await expectNoViolations();
            });

            it("a workout's details, its muscles and runs", async () => {
                const legs = store.addWorkout(
                    makeWorkout({ title: 'Legs', steps: [reps(10, 'Back squat')] })
                );
                const now = Date.now();
                TestBed.inject(HistoryStore).record({
                    id: 'run-1',
                    workoutId: legs.id,
                    title: 'Legs',
                    startedAt: now - 86_400_000,
                    endedAt: now - 86_400_000 + 600_000,
                    activeSeconds: 600,
                    roundsCompleted: 3,
                    totalRounds: 3,
                    outcome: 'finished',
                });
                await open(`/library/${legs.id}`);
                expect(fixture.nativeElement.querySelector('.details__title')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('exercises', () => {
            it('the list, with the equipment open, one hidden and one of your own', async () => {
                const exercises = TestBed.inject(ExerciseStore);
                exercises.addOwn('Sled push', 'reps');
                exercises.setHidden('builtin:plank', true);
                await open('/exercises');
                click('.kit__edit');
                click('.exercises__hidden-toggle');
                await settle();
                await expectNoViolations();
            });

            it('the list, with nothing matching', async () => {
                await open('/exercises');
                const box = fixture.nativeElement.querySelector('#exercise-search');
                box.value = 'zzz';
                box.dispatchEvent(new Event('input'));
                await settle();
                await expectNoViolations();
            });

            it('making a new exercise', async () => {
                await open('/exercises');
                click('#exercise-list-new');
                await settle();
                await expectNoViolations();
            });

            it('a built-in exercise, with your note, hidden', async () => {
                const exercises = TestBed.inject(ExerciseStore);
                exercises.setNote('builtin:inverted-row', 'Feet on a box');
                exercises.setHidden('builtin:inverted-row', true);
                await open('/exercises/inverted-row');
                await expectNoViolations();
            });

            it("a built-in exercise's animated demo, in 3D with Turn, paused", async () => {
                await TestBed.inject(ExerciseStore).loadMotion();
                await open('/exercises/back-squat');
                // three.js loads with the first demo
                await vi.waitFor(
                    () =>
                        expect(
                            fixture.nativeElement.querySelector('app-exercise-figure-3d')
                        ).not.toBeNull(),
                    { timeout: 10000 }
                );
                fixture.detectChanges();
                click('.demo__toggle');
                await settle();
                await expectNoViolations();
            });

            it("a built-in exercise's demo as stills, with reduced motion", async () => {
                // Reduced motion asked for, leaving the app's other media queries (its theme) be
                const matchMedia = window.matchMedia.bind(window);
                vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
                    query === '(prefers-reduced-motion: reduce)'
                        ? ({
                              matches: true,
                              addEventListener: () => undefined,
                              removeEventListener: () => undefined,
                          } as unknown as MediaQueryList)
                        : matchMedia(query)
                );
                await TestBed.inject(ExerciseStore).loadMotion();
                await open('/exercises/lateral-raise');
                expect(fixture.nativeElement.querySelector('.demo__stills')).not.toBeNull();
                await expectNoViolations();
            });

            it('adding an exercise to a workout, one of them full', async () => {
                store.addWorkout(makeWorkout({ title: 'Legs' }));
                store.addWorkout(
                    makeWorkout({
                        steps: Array.from({ length: 20 }, () => ({
                            kind: 'reps' as const,
                            reps: 5,
                            name: 'Lunge',
                        })),
                    })
                );
                await open('/exercises/back-squat');
                click('#exercise-page-add');
                await settle();
                await expectNoViolations();
            });

            it('your own exercise, being edited with errors', async () => {
                const mine = TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
                await open(`/exercises/${mine.id}`);
                click('#exercise-page-edit');
                await settle();
                const name = fixture.nativeElement.querySelector('#exercise-editor-name');
                name.value = '';
                name.dispatchEvent(new Event('input'));
                const steps = fixture.nativeElement.querySelector('#exercise-editor-steps');
                steps.value = Array.from({ length: 20 }, () => 'Step').join('\n');
                steps.dispatchEvent(new Event('input'));
                await settle();
                await expectNoViolations();
            });

            it("your own exercise in use, saying why it can't be deleted", async () => {
                const mine = TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
                store.addWorkout(
                    makeWorkout({
                        steps: [{ kind: 'reps', reps: 5, name: 'Sled push', exerciseId: mine.id }],
                    })
                );
                await open(`/exercises/${mine.id}`);
                click('#exercise-page-delete');
                await settle();
                await expectNoViolations();
            });

            it('your own exercise deleted, with Undo offered on the list', async () => {
                const mine = TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
                await open(`/exercises/${mine.id}`);
                click('#exercise-page-delete');
                await settle(300);
                expect(fixture.nativeElement.querySelector('.undo-bar')).not.toBeNull();
                await expectNoViolations();
            });

            it('an exercise that is not there', async () => {
                await open('/exercises/not-one');
                await expectNoViolations();
            });
        });

        describe('history', () => {
            it('with no workouts yet', async () => {
                await open('/history');
                await expectNoViolations();
            });

            it('with workouts, and after deleting one', async () => {
                const now = Date.now();
                for (const [i, outcome] of (
                    ['finished', 'stopped', 'finished'] as const
                ).entries()) {
                    TestBed.inject(HistoryStore).record({
                        id: 'run-' + i,
                        workoutId: 'workout-1',
                        title: i === 1 ? '' : 'Sprints',
                        startedAt: now - i * 86_400_000,
                        endedAt: now - i * 86_400_000 + 60_000,
                        activeSeconds: 60,
                        roundsCompleted: 2,
                        totalRounds: outcome === 'stopped' ? 0 : 2,
                        outcome,
                        ...(i === 0
                            ? {
                                  sets: [
                                      { round: 0, step: 0, name: 'Squats', reps: 10, weight: 60 },
                                  ],
                              }
                            : {}),
                    });
                }
                await open('/history');
                await expectNoViolations();

                // The time per week, as a table
                click('.weeks__toggle');
                await settle();
                await expectNoViolations();

                click('.entry__menu-button');
                await settle();
                await expectNoViolations();

                click('.entry__edit-note');
                await settle();
                await expectNoViolations();

                click('.entry__menu-button');
                await settle();
                click('.entry__delete');
                await settle();
                expect(fixture.nativeElement.querySelector('.undo-bar')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('help', () => {
            it('as first opened, and opened on a question', async () => {
                await open('/help');
                await expectNoViolations();

                await open('/help?q=plan-statuses');
                expect(fixture.nativeElement.querySelector('#help-plan-statuses').open).toBe(true);
                await expectNoViolations();
            });

            it('searching, and finding nothing', async () => {
                await open('/help');
                const box = fixture.nativeElement.querySelector('input[type="search"]');
                box.value = 'sound';
                box.dispatchEvent(new Event('input'));
                await settle();
                await expectNoViolations();

                box.value = 'zzqx';
                box.dispatchEvent(new Event('input'));
                await settle();
                expect(fixture.nativeElement.querySelector('.help__none')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('settings', () => {
            it('as first opened', async () => {
                await open('/settings');
                await expectNoViolations();
            });

            it('with sound turned off', async () => {
                await open('/settings');
                click('[role="switch"][aria-labelledby="sound-label"]');
                await settle();
                await expectNoViolations();
            });

            it('the privacy notice', async () => {
                await open('/privacy');
                await expectNoViolations();
            });

            it('the terms of use', async () => {
                await open('/terms');
                await expectNoViolations();
            });
        });

        describe('welcome', () => {
            it('on a device new to the app', async () => {
                await open('/');
                expect(fixture.nativeElement.querySelector('app-welcome')).not.toBeNull();
                await expectNoViolations();
            });

            it('the setup, its name, equipment and body questions, then Today, all set and getting started', async () => {
                // Welcomed as a guest, as the welcome screen does before the setup
                localStorage.setItem('welcomed', 'guest');
                localStorage.setItem('setup', 'due');
                await open('/welcome/setup');
                await expectNoViolations();

                // Name, goal, then equipment, with a chip picked
                click('.setup__actions .btn-main');
                await settle();
                click('.setup__actions .btn-main');
                await settle();
                click('app-equipment-chips button');
                await settle();
                await expectNoViolations();

                click('.setup__actions .btn-main');
                await settle();
                expect(fixture.nativeElement.querySelector('app-body-map')).not.toBeNull();
                await expectNoViolations();

                // Units, then Done: on to Today, with the notice and a workout to add
                click('.setup__actions .btn-main');
                await settle();
                click('.setup__actions .btn-main');
                await settle();
                expect(fixture.nativeElement.querySelector('app-get-started')).not.toBeNull();
                expect(fixture.nativeElement.querySelector('.undo-bar')).not.toBeNull();
                await expectNoViolations();
            });
        });

        describe('account', () => {
            it('as first opened, signed out', async () => {
                await open('/account');
                await expectNoViolations();
            });

            it('after an import, with View library in the bar', async () => {
                await open('/account');
                TestBed.inject(UndoService).notify('Added 2 workouts.', {
                    quiet: true,
                    link: { label: 'View library', url: '/library' },
                });
                await settle();
                expect(fixture.nativeElement.querySelector('a.undo-bar__action')).not.toBeNull();
                await expectNoViolations();
            });

            it('signing in with no email (and its error)', async () => {
                await open('/account');
                click('.sign-in__form button[type="submit"]');
                await settle();
                await expectNoViolations();
            });

            it('asking for the code from the email', async () => {
                await open('/account');
                const input = fixture.nativeElement.querySelector(
                    '#account-email'
                ) as HTMLInputElement;
                input.value = 'me@example.com';
                input.dispatchEvent(new Event('input'));
                click('.sign-in__form button[type="submit"]');
                await settle();
                expect(fixture.nativeElement.querySelector('#account-code')).not.toBeNull();
                await expectNoViolations();
            });

            it('signed in, asking before deleting the account', async () => {
                accountClient.change(sessionFor('me@example.com'));
                await open('/account');
                await expectNoViolations();
                click('#account-delete');
                await settle();
                await expectNoViolations();
            });

            it('asking before clearing this device', async () => {
                await open('/account');
                click('app-clear-device button');
                await settle();
                await expectNoViolations();
            });
        });

        describe('workout', () => {
            it('with no workout selected', async () => {
                await open('/workout');
                await expectNoViolations();
            });

            it('during work, rest and once finished, with its summary', async () => {
                store.setActiveWorkout(store.addWorkout(sprints)); // 2s work, 2s rest, 2 rounds
                await open('/workout');
                await expectNoViolations();

                await settle(2300);
                expect(fixture.nativeElement.textContent).toContain('Rest');
                await expectNoViolations();

                await settle(4000);
                expect(fixture.nativeElement.textContent).toContain('Workout finished');
                await expectNoViolations();
            }, 15000);

            it('running a round of several named steps', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({ steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20)] })
                    )
                );
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('step 1 of 3');
                await expectNoViolations();
            });

            it('waiting on a rep step', async () => {
                store.setActiveWorkout(
                    store.addWorkout(makeWorkout({ steps: [reps(20, 'Push-ups'), work(30)] }))
                );
                await open('/workout');
                expect(fixture.nativeElement.querySelector('.workout-next--done')).not.toBeNull();
                await expectNoViolations();
            });

            it('on an exercise, with the (i) by its name and then its details open', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({
                            steps: [
                                {
                                    kind: 'reps',
                                    reps: 8,
                                    name: 'Inverted row',
                                    exerciseId: 'builtin:inverted-row',
                                },
                            ],
                        })
                    )
                );
                await open('/workout');
                await expectNoViolations();

                click('.workout-face__info');
                await settle();
                expect(
                    fixture.nativeElement.querySelector('app-exercise-details-dialog')
                ).not.toBeNull();
                await expectNoViolations();
            });

            it('changing the reps of a rep step, its wheel open on the face', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({
                            steps: [{ kind: 'reps', reps: 10, name: 'Squats', weight: 60 }],
                        })
                    )
                );
                await open('/workout');
                fixture.nativeElement
                    .querySelector('.workout-face__count [role="spinbutton"]')
                    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                await settle();
                expect(
                    fixture.nativeElement.querySelector('.workout-face__count.wheel-picker--open')
                ).not.toBeNull();
                await expectNoViolations();
            });

            it('running until stopped', async () => {
                store.setActiveWorkout(store.addWorkout({ ...sprints, repeats: 0 }));
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('round 1 of ∞');
                await expectNoViolations();
            });

            it('running to a time limit', async () => {
                store.setActiveWorkout(
                    store.addWorkout({ ...sprints, repeats: 0, timeLimitSeconds: 1200 })
                );
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('20:00 left');
                await expectNoViolations();
            });

            it("time's up on a rep step, asking how many reps were done", async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({
                            steps: [reps(20, 'Push-ups'), work(30)],
                            timeLimitSeconds: 1,
                        })
                    )
                );
                await open('/workout');
                await settle(1200);
                expect(fixture.nativeElement.textContent).toContain('Time ran out during Push-ups');
                await expectNoViolations();
            });

            it('paused', async () => {
                store.setActiveWorkout(store.addWorkout(sprints));
                store.pause();
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('Paused');
                await expectNoViolations();
            });

            it('paused on an exercise, with its name and (i) over the ring', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({
                            steps: [{ ...reps(20, 'Push-ups'), exerciseId: 'builtin:push-up' }],
                        })
                    )
                );
                store.pause();
                await open('/workout');
                expect(fixture.nativeElement.querySelector('.workout-paused__info')).not.toBeNull();
                await expectNoViolations();
            });

            it('ended, with its sets being changed and the next-time question', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({
                            steps: [{ kind: 'reps', reps: 10, name: 'Squats', weight: 60 }],
                            repeats: 3,
                        })
                    )
                );
                await open('/workout');
                click('.workout-next--done');
                await settle();
                click('.workout-control--main button'); // Pause
                await settle();
                click('.workout-paused__end');
                await settle();
                click('.summary__change');
                await settle();
                click('.summary app-wheel-picker [data-value="8"]');
                await settle();
                expect(fixture.nativeElement.textContent).toContain(
                    'Use these settings next time?'
                );
                await expectNoViolations();
            });

            it('swapping an exercise, then asked whether to use it next time', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({
                            steps: [
                                {
                                    kind: 'reps',
                                    reps: 10,
                                    name: 'Back squat',
                                    weight: 60,
                                    exerciseId: 'builtin:back-squat',
                                },
                            ],
                            repeats: 2,
                        })
                    )
                );
                await open('/workout');
                click('.workout-face__info');
                await settle();
                click('.details__pick-another');
                await settle();
                expect(
                    fixture.nativeElement.querySelector('app-swap-exercise-dialog')
                ).not.toBeNull();
                await expectNoViolations();

                click('.swap__option');
                await settle();
                click('.workout-next--done');
                await settle();
                click('.workout-next--done');
                await settle();
                expect(fixture.nativeElement.textContent).toContain('next time?');
                await expectNoViolations();
            });
        });
    });
}
