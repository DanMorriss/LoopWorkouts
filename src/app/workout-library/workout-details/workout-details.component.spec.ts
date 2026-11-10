import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from '../../models/history';
import { allSteps, RepStep } from '../../models/workout';
import { UndoService } from '../../shared/undo/undo.service';
import { PageSlide } from '../../nav/page-slide';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { fakeReducedMotion } from '../../shared/testing/fake-reduced-motion';
import { makeWorkout as baseWorkout } from '../../shared/testing/make-workout';
import { WorkoutDetailsComponent } from './workout-details.component';

describe('WorkoutDetailsComponent (LIB-4)', () => {
    let harness: RouterTestingHarness;
    let store: WorkoutStore;

    beforeEach(async () => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'library', children: [] },
                    { path: 'history', children: [] },
                    { path: 'setup', children: [] },
                    { path: 'library/:id', component: WorkoutDetailsComponent },
                ]),
            ],
        });
        store = TestBed.inject(WorkoutStore);
        harness = await RouterTestingHarness.create();
    });

    afterEach(() => localStorage.clear());

    function addSprints() {
        const { id: _id, ...workout } = baseWorkout({ title: 'Sprints' });
        return store.addWorkout(workout);
    }

    async function open(id: string) {
        await harness.navigateByUrl(`/library/${id}`);
        harness.fixture.detectChanges();
        await harness.fixture.whenStable();
    }

    const el = (): HTMLElement => harness.routeNativeElement!;
    const text = (node: Element = el()) => node.textContent!.replace(/\s+/g, ' ').trim();

    describe('Add to plan (PLN-1)', () => {
        const render = async () => {
            harness.fixture.detectChanges();
            await harness.fixture.whenStable();
        };
        const planButton = () => el().querySelector<HTMLButtonElement>('#workout-details-plan')!;
        const dayButtons = () =>
            Array.from(document.querySelectorAll<HTMLButtonElement>('.choice__choice'));

        it('plans it on several days at once, says where, with Undo, and focus back', async () => {
            const sprints = addSprints();
            const plan = TestBed.inject(PlanStore);
            plan.add(0, 'other');
            await open(sprints.id);
            document.body.appendChild(el());
            expect(text(planButton())).toBe('event Add to plan');
            expect(el().querySelector('.details__planned')).toBeNull();

            planButton().click();
            await render();
            expect(text(document.querySelector('.choice__title')!)).toBe('Plan Sprints on…');
            expect(dayButtons()).toHaveLength(7);
            dayButtons()[0].click();
            dayButtons()[3].click();
            await render();
            document.querySelector<HTMLButtonElement>('.choice__done')!.click();
            await render();

            expect(plan.plan().days[0]).toEqual(['other', sprints.id]);
            expect(plan.plan().days[3]).toEqual([sprints.id]);
            expect(text(el().querySelector('.details__planned')!)).toBe('On your plan: Mon, Thu');
            expect(text(planButton())).toBe('event Change days');
            const undo = TestBed.inject(UndoService);
            expect(undo.offer()?.message).toBe('Sprints planned on Monday and Thursday');

            undo.undo();
            await render();
            expect(plan.plan().days.flat()).toEqual(['other']);
            expect(document.activeElement).toBe(planButton());
            el().remove();
        });

        it('starts with the days it is on chosen, so unchoosing one takes it off', async () => {
            const sprints = addSprints();
            const plan = TestBed.inject(PlanStore);
            plan.add(2, sprints.id);
            plan.add(4, sprints.id);
            await open(sprints.id);
            expect(text(el().querySelector('.details__planned')!)).toBe('On your plan: Wed, Fri');

            planButton().click();
            await render();
            expect(dayButtons().map((day) => day.getAttribute('aria-pressed'))).toEqual([
                'false',
                'false',
                'true',
                'false',
                'true',
                'false',
                'false',
            ]);
            dayButtons()[4].click();
            await render();
            document.querySelector<HTMLButtonElement>('.choice__done')!.click();
            await render();

            expect(plan.plan().days[2]).toEqual([sprints.id]);
            expect(plan.plan().days[4]).toEqual([]);
            expect(TestBed.inject(UndoService).offer()?.message).toBe('Sprints taken off Friday');
        });

        it('changes nothing when closed without Done', async () => {
            const sprints = addSprints();
            await open(sprints.id);
            document.body.appendChild(el());
            planButton().click();
            await render();
            dayButtons()[1].click();
            document.querySelector<HTMLButtonElement>('app-dialog-back button')!.click();
            await render();

            expect(TestBed.inject(PlanStore).plan().days.flat()).toEqual([]);
            expect(TestBed.inject(UndoService).offer()).toBeNull();
            expect(document.activeElement).toBe(planButton());
            el().remove();
        });
    });

    it('has no reps and weights to set for one of yours, which has Edit', async () => {
        await open(addSprints().id);

        expect(el().querySelector('app-ready-made-amounts .amounts')).toBeNull();
    });

    it("lists what's in it at the bottom, so it can be read without Edit", async () => {
        const legs = store.addWorkout({
            title: 'Legs',
            repeats: 2,
            blocks: [
                { kind: 'heading', text: 'Main' },
                {
                    kind: 'group',
                    rounds: 3,
                    restSeconds: 60,
                    steps: [{ kind: 'reps', reps: 10, name: 'Back squat' }],
                },
                {
                    kind: 'group',
                    rounds: 1,
                    restSeconds: 0,
                    steps: [{ kind: 'work', seconds: 30, name: '' }],
                },
            ],
        });
        await open(legs.id);

        const headings = Array.from(el().querySelectorAll('h3'), (h) => text(h));
        expect(headings).toEqual(['Muscles it works', 'History', "What's in it"]);
        expect(text(el().querySelector('.outline__repeats')!)).toBe('2 rounds of all of it');
        const lines = Array.from(el().querySelectorAll('.outline__part, .outline__line'), (line) =>
            text(line)
        );
        // An unnamed step goes by its kind, as in the history
        expect(lines).toEqual(['Main', 'Back squat chevron_right 3 × 10, rest 1:00', 'Work 0:30']);
    });

    it('links each exercise with a page, sliding it in under this workout', async () => {
        const legs = store.addWorkout({
            title: 'Legs',
            repeats: 1,
            blocks: [
                {
                    kind: 'group',
                    rounds: 3,
                    restSeconds: 60,
                    steps: [{ kind: 'reps', reps: 10, name: 'Plank', exerciseId: 'builtin:plank' }],
                },
                {
                    kind: 'group',
                    rounds: 2,
                    restSeconds: 30,
                    steps: [
                        {
                            kind: 'reps',
                            reps: 8,
                            name: 'Back squat',
                            exerciseId: 'builtin:back-squat',
                        },
                        { kind: 'work', seconds: 30, name: '' },
                    ],
                },
            ],
        });
        await open(legs.id);
        const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('.outline__link'));

        expect(links.map((a) => [text(a), a.getAttribute('href')])).toEqual([
            // Each with a › (an icon font's ligature) to show it can be pressed
            ['Plank chevron_right', `/library/${legs.id}/plank`],
            ['Back squat chevron_right', `/library/${legs.id}/back-squat`],
        ]);
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});
        links[0].click();
        expect(slide).toHaveBeenCalledWith(`/library/${legs.id}/plank`, 'in');
    });

    it("says when it hasn't been done yet, or has no exercises", async () => {
        await open(addSprints().id);

        expect(text(el().querySelector('h2')!)).toBe('Sprints');
        expect(text()).toContain('Not done yet.');
        expect(text()).toContain('None of its steps is an exercise yet');
    });

    it('lists its runs, newest first, linking to them in the history', async () => {
        const sprints = addSprints();
        const run = (startedAt: number): HistoryEntry => ({
            id: `${startedAt}-${sprints.id}`,
            workoutId: sprints.id,
            title: 'Sprints',
            startedAt,
            endedAt: startedAt + 300_000,
            activeSeconds: 300,
            roundsCompleted: 4,
            totalRounds: 4,
            outcome: 'finished',
            updatedAt: startedAt,
        });
        const history = TestBed.inject(HistoryStore);
        history.record(run(Date.UTC(2026, 9, 20, 12)));
        history.record(run(Date.UTC(2026, 9, 24, 12)));
        await open(sprints.id);

        expect(text()).toContain('Done 2 times');
        const runs = Array.from(el().querySelectorAll('.details__run'));
        expect(runs.map((a) => text(a))).toEqual([
            'Sat 24 Oct 4 rounds · 5:00',
            'Tue 20 Oct 4 rounds · 5:00',
        ]);
        expect(runs[0].getAttribute('href')).toBe(
            `/history?run=${Date.UTC(2026, 9, 24, 12)}-${sprints.id}`
        );
    });

    it('starts it from Start workout under its title, opening the workout page', async () => {
        const sprints = addSprints();
        await open(sprints.id);
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        const start = el().querySelector<HTMLButtonElement>('.details__start')!;

        expect(start.getAttribute('aria-label')).toBe('Start Sprints');
        start.click();

        expect(store.activeWorkout()?.title).toBe('Sprints');
        expect(navigate).toHaveBeenCalledWith(['/workout']);
    });

    it('makes a copy of it beside Edit, keeping both, opening the copy in Create', async () => {
        const sprints = addSprints();
        await open(sprints.id);
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});

        el().querySelector<HTMLButtonElement>('.details__copy')!.click();

        const copy = store.workouts()[1];
        expect(store.workouts().map((w) => w.title)).toEqual(['Sprints', 'Sprints (copy)']);
        expect(el().querySelector('.details__edit')).not.toBeNull();
        expect(slide).toHaveBeenCalledWith(
            `/setup?editId=${copy.id}&from=%2Flibrary%2F${copy.id}`,
            'in'
        );
    });

    describe('of a ready-made workout (LIB-6)', () => {
        beforeEach(async () => {
            await store.readyMadeLoaded;
            await open('builtin:gym-legs');
        });

        it('has its badge and description, and what is in it', () => {
            expect(text(el().querySelector('.details__title')!)).toBe('Gym legs');
            expect(el().querySelector('app-ready-made-badge')).not.toBeNull();
            expect(text(el().querySelector('.details__description')!)).toContain('Squats');
            expect(text()).toContain('Back squat');
        });

        it('has Make a copy for Edit, which opens the copy in Create, coming back to it', () => {
            expect(el().querySelector('.details__edit')).toBeNull();
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            el().querySelector<HTMLButtonElement>('.details__copy')!.click();

            const copy = store.workouts()[0];
            expect(copy.title).toBe('Gym legs (copy)');
            expect(slide).toHaveBeenCalledWith(
                `/setup?editId=${copy.id}&from=%2Flibrary%2F${copy.id}`,
                'in'
            );
        });

        it('puts your own reps and weights back as it came, with Undo', async () => {
            expect(el().querySelector('.details__reset')).toBeNull();
            store.setActiveWorkout(store.findAnyWorkout('builtin:gym-legs')!);
            const deadlift = allSteps(store.activeWorkout()!)[1] as RepStep;
            store.updateActiveStep(1, { ...deadlift, reps: 8 });
            store.stop();
            harness.detectChanges();
            await harness.fixture.whenStable();

            expect(text(el().querySelector('.details__own')!)).toBe(
                'With your own reps and weights.'
            );
            el().querySelector<HTMLButtonElement>('.details__reset')!.click();
            harness.detectChanges();
            await harness.fixture.whenStable();

            expect(allSteps(store.findAnyWorkout('builtin:gym-legs')!)[1]).toEqual(deadlift);
            expect(el().querySelector('.details__reset')).toBeNull();

            const undo = TestBed.inject(UndoService);
            expect(undo.offer()?.message).toBe('Reset the reps and weights of "Gym legs"');
            undo.undo();
            harness.detectChanges();
            await harness.fixture.whenStable();
            expect((allSteps(store.findAnyWorkout('builtin:gym-legs')!)[1] as RepStep).reps).toBe(
                8
            );
            expect(document.activeElement?.id).toBe('workout-details-reset');

            // Closing the bar instead leaves focus on Make a copy
            el().querySelector<HTMLButtonElement>('.details__reset')!.click();
            undo.dismiss();
            harness.detectChanges();
            await harness.fixture.whenStable();
            expect(document.activeElement?.id).toBe('workout-details-copy');
        });

        describe('your reps and weights, set before running it', () => {
            const render = async () => {
                harness.detectChanges();
                await harness.fixture.whenStable();
            };
            const lines = () =>
                Array.from(el().querySelectorAll('.amounts__line'), (line) =>
                    line.getAttribute('aria-label')
                );
            const squat = () => el().querySelector<HTMLButtonElement>('#ready-made-amounts-0')!;
            const wheels = () =>
                Array.from(document.querySelectorAll<HTMLElement>('[role="spinbutton"]'));
            /** Turns a wheel one place on, as the arrow keys do. */
            const turn = async (wheel: HTMLElement) => {
                // A freshly shown wheel jumps to its value a frame later
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
                wheel.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
                );
                await render();
            };

            beforeEach(() => document.body.appendChild(el()));
            afterEach(() => el().remove());

            it('lists each rep exercise with its sets', () => {
                expect(lines()).toEqual([
                    'Change Back squat, 12, 10, 8',
                    'Change Romanian deadlift, 3 × 10',
                    'Change Leg press, 3 × 12',
                    'Change Leg curl, 3 × 12',
                    'Change Seated calf raise, 3 × 15',
                ]);
            });

            it("keeps a set's reps as the summary's Apply would, with Undo, and focus back", async () => {
                fakeReducedMotion(true);
                squat().click();
                await render();
                expect(text(document.querySelector('.amounts__title')!)).toBe('Back squat');
                // Set 1, 2 and 3, each with Reps and Weight
                expect(wheels()).toHaveLength(6);

                await turn(wheels()[0]);
                document.querySelector<HTMLButtonElement>('.amounts__save')!.click();
                await render();

                const steps = allSteps(store.findAnyWorkout('builtin:gym-legs')!);
                expect((steps[0] as RepStep).sets?.map((set) => set.reps)).toEqual([13, 10, 8]);
                expect(lines()[0]).toBe('Change Back squat, 13, 10, 8');
                expect(text(el().querySelector('.details__own')!)).toBe(
                    'With your own reps and weights.'
                );
                const undo = TestBed.inject(UndoService);
                expect(undo.offer()?.message).toBe('Back squat: 13, 10, 8');

                undo.undo();
                await render();
                expect(lines()[0]).toBe('Change Back squat, 12, 10, 8');
                expect(el().querySelector('.details__own')).toBeNull();
                expect(document.activeElement).toBe(squat());
            });

            it('changes nothing when closed without Save, with focus back', async () => {
                squat().click();
                await render();
                await turn(wheels()[0]);
                document.querySelector<HTMLButtonElement>('app-dialog-back button')!.click();
                await render();

                expect(lines()[0]).toBe('Change Back squat, 12, 10, 8');
                expect(TestBed.inject(UndoService).offer()).toBeNull();
                expect(document.activeElement).toBe(squat());
            });
        });

        it('makes it a favourite from its heart, as a ready-made one', () => {
            el().querySelector<HTMLElement>('.details__top .favourite-button')!.click();
            harness.detectChanges();

            expect(store.findAnyWorkout('builtin:gym-legs')?.favourite).toBe(true);
            expect(store.workouts()).toEqual([]);
        });
    });

    it('makes it a favourite from the heart by its title, and not again', async () => {
        const sprints = addSprints();
        await open(sprints.id);
        const heart = () => el().querySelector<HTMLElement>('.details__top .favourite-button')!;
        expect(heart().getAttribute('aria-label')).toBe('Favourite Sprints');
        expect(heart().getAttribute('aria-pressed')).toBe('false');

        heart().click();
        harness.detectChanges();
        expect(store.findWorkoutById(sprints.id)?.favourite).toBe(true);
        expect(heart().getAttribute('aria-pressed')).toBe('true');

        heart().click();
        harness.detectChanges();
        expect(store.findWorkoutById(sprints.id)?.favourite).toBeUndefined();
    });

    describe('arriving from Save in Create', () => {
        async function arrive() {
            const sprints = addSprints();
            await harness.navigateByUrl(`/library/${sprints.id}?saved=1`);
            harness.fixture.detectChanges();
            await harness.fixture.whenStable();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            harness.fixture.detectChanges();
        }

        it('says it was saved, with focus on Edit when it is in view', async () => {
            await arrive();

            expect(text(el().querySelector('[aria-live]')!)).toBe('Saved Sprints');
            expect(document.activeElement).toBe(el().querySelector('.details__edit'));
        });

        it('puts focus on its title when Edit is out of view, as for a new copy', async () => {
            const tall = document.createElement('div');
            tall.style.height = '5000px';
            document.body.prepend(tall);
            await arrive();
            tall.remove();

            expect(document.activeElement).toBe(el().querySelector('.details__title'));
        });
    });

    it('goes back with ‹ Workouts, saying which card to put focus on', async () => {
        const sprints = addSprints();
        await open(sprints.id);
        const back = el().querySelector('.back-link')!;

        expect(text(back)).toBe('chevron_left Workouts');
        expect(back.getAttribute('href')).toBe(`/library?details=${sprints.id}`);
    });

    it('goes back with ‹ Progress to the run it was opened from there', async () => {
        const sprints = addSprints();
        await harness.navigateByUrl(`/library/${sprints.id}?run=123-${sprints.id}`);
        harness.fixture.detectChanges();

        const back = el().querySelector('.back-link')!;
        expect(text(back)).toBe('chevron_left Progress');
        expect(back.getAttribute('href')).toBe(`/history?run=123-${sprints.id}`);
    });

    it('edits the workout from its Edit button, coming back here', async () => {
        const sprints = addSprints();
        await open(sprints.id);
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});
        el().querySelector<HTMLButtonElement>('.details__edit')!.click();

        expect(slide).toHaveBeenCalledWith(
            `/setup?editId=${sprints.id}&from=%2Flibrary%2F${sprints.id}`,
            'in'
        );
    });

    it('says so for a link to one there is not, with the way back', async () => {
        await open('no-such-workout');

        expect(text(el().querySelector('h2')!)).toBe('Workout not found');
        expect(el().querySelector('.details__edit')).toBeNull();
        expect(el().querySelector('.back-link')).not.toBeNull();
    });
});
