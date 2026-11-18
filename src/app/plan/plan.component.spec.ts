import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from '../models/history';
import { PageSlide } from '../shared/navigation/page-slide';
import { asOneGroup, Workout } from '../models/workout';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { PLAN_TOUR_KEY, TourService } from '../tour/tour.service';
import { UndoService } from '../shared/undo/undo.service';
import { PlanComponent } from './plan.component';
import { PlannedDrag } from './plan-drag';

/** Wednesday 28 October 2026, mid-morning. */
const NOW = new Date(2026, 9, 28, 10).getTime();

describe('PlanComponent', () => {
    let fixture: ComponentFixture<unknown>;
    let legs: Workout;
    let push: Workout;

    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'library', children: [] },
                    { path: 'plan', component: PlanComponent },
                ]),
            ],
        });
        const workouts = TestBed.inject(WorkoutStore);
        const workout = (title: string) =>
            workouts.addWorkout({
                title,
                repeats: 1,
                blocks: asOneGroup([{ kind: 'reps', reps: 5, name: 'Squat' }]),
            });
        legs = workout('Legs');
        push = workout('Push');
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
    });

    async function open() {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/plan');
        fixture = harness.fixture;
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const text = (node: Element) => node.textContent!.replace(/\s+/g, ' ').trim();
    /** Each day as it reads, e.g. "Monday: Legs Done". */
    const days = () =>
        Array.from(el().querySelectorAll('.plan__day'), (day) => {
            const name = text(day.querySelector('.plan__day-name')!);
            const workouts = Array.from(day.querySelectorAll('.plan__workout'), (row) =>
                [
                    row.querySelector('.row__title')!.textContent!.trim(),
                    row.querySelector('.row__status')?.textContent!.replace('check', '').trim(),
                ]
                    .filter(Boolean)
                    .join(' ')
            );
            return `${name}: ${workouts.join(', ') || 'Nothing planned'}`;
        });
    const click = async (selector: string) => {
        el().querySelector<HTMLElement>(selector)!.click();
        await render();
    };

    it('lists Monday to Sunday, today marked, with where each planned workout is this week', async () => {
        const plan = TestBed.inject(PlanStore);
        // Planned last week, so this week's days count
        vi.setSystemTime(NOW - 7 * 24 * 60 * 60 * 1000);
        plan.add(0, legs.id);
        plan.add(1, push.id);
        plan.add(2, legs.id);
        plan.add(2, push.id);
        plan.add(4, legs.id);
        vi.setSystemTime(NOW);
        const run: HistoryEntry = {
            id: 'run-1',
            workoutId: legs.id,
            title: 'Legs',
            startedAt: new Date(2026, 9, 26, 18).getTime(),
            endedAt: new Date(2026, 9, 26, 19).getTime(),
            updatedAt: 1,
            activeSeconds: 600,
            roundsCompleted: 1,
            totalRounds: 1,
            outcome: 'finished',
            sets: [],
        };
        TestBed.inject(HistoryStore).record(run);
        await open();

        expect(days()).toEqual([
            'Monday: Legs Done',
            'Tuesday: Push Missed',
            'Wednesday · today: Legs Due, Push Due',
            'Thursday: Nothing planned',
            'Friday: Legs',
            'Saturday: Nothing planned',
            'Sunday: Nothing planned',
        ]);
        expect(text(el().querySelector('.plan__so-far')!)).toBe('1 of 4 done so far this week');
    });

    it('says active rest gone by was rested, not missed, and leaves it out of the tally', async () => {
        const stretches = TestBed.inject(WorkoutStore).addWorkout({
            title: 'Stretches',
            repeats: 1,
            blocks: asOneGroup([
                { kind: 'work', seconds: 60, name: 'Pigeon', exerciseId: 'builtin:pigeon-stretch' },
            ]),
        });
        const plan = TestBed.inject(PlanStore);
        vi.setSystemTime(NOW - 7 * 24 * 60 * 60 * 1000);
        plan.add(1, stretches.id);
        plan.add(2, legs.id);
        plan.add(2, stretches.id);
        plan.add(4, stretches.id);
        vi.setSystemTime(NOW);
        await open();

        expect(days()).toEqual([
            'Monday: Nothing planned',
            'Tuesday: Stretches Rested',
            'Wednesday · today: Legs Due, Stretches Active rest',
            'Thursday: Nothing planned',
            'Friday: Stretches Active rest',
            'Saturday: Nothing planned',
            'Sunday: Nothing planned',
        ]);
        expect(text(el().querySelector('.plan__so-far')!)).toBe('0 of 1 done so far this week');
    });

    it('says a workout planned once its day had gone by starts next week, not counting it', async () => {
        // NOW is a Wednesday: Monday has gone by
        TestBed.inject(PlanStore).add(0, legs.id);
        await open();

        expect(days()[0]).toBe('Monday: Legs From next week');
        expect(el().querySelector('.plan__so-far')).toBeNull();
    });

    describe('the tour of the page (PLN-8)', () => {
        it('starts the first time the page opens', async () => {
            const tour = TestBed.inject(TourService);
            await open();

            expect(tour.tour()).toBe('plan');
            expect(tour.stop()).toBe(0);
            expect(localStorage.getItem(PLAN_TOUR_KEY)).toBe('seen');
        });

        it("doesn't start once it's been seen on this device", async () => {
            localStorage.setItem(PLAN_TOUR_KEY, 'seen');
            await open();

            expect(TestBed.inject(TourService).stop()).toBeNull();
        });

        it('has the parts it lights up, on today and the first planned workout', async () => {
            // NOW is a Wednesday
            TestBed.inject(PlanStore).add(2, legs.id);
            await open();

            expect(text(el().querySelector('[data-tour="plan-today"] h3')!)).toBe(
                'Wednesday · today'
            );
            expect(text(el().querySelector('[data-tour="plan-workout"]')!)).toContain('Legs');
            expect(el().querySelector('[data-tour="plan-ready-made"]')).not.toBeNull();
            // Where focus goes as it ends
            expect(el().querySelector('#plan-title')!.getAttribute('tabindex')).toBe('-1');
        });

        it('waits for a tour already on', async () => {
            const tour = TestBed.inject(TourService);
            tour.start('app');
            await open();

            expect(tour.tour()).toBe('app');
            expect(localStorage.getItem(PLAN_TOUR_KEY)).toBeNull();
        });
    });

    it('plans a workout from the library on a day, then focuses that day again', async () => {
        await open();

        await click('#plan-add-3');
        expect(text(el().querySelector('.choice__title')!)).toBe('Plan on Thursday');
        // After Make a new workout, first: Legs, then Push
        el().querySelectorAll<HTMLButtonElement>('.choice__choice')[2].click();
        await render();

        expect(TestBed.inject(PlanStore).plan().days[3]).toEqual([push.id]);
        expect(days()[3]).toBe('Thursday: Push');
        expect(el().querySelector('app-workout-choice-dialog')).toBeNull();
        expect(text(el().querySelector('[role="status"]')!)).toBe('Push planned on Thursday');
        expect(document.activeElement?.id).toBe('plan-add-3');
    });

    it("doesn't offer a workout already planned that day", async () => {
        TestBed.inject(PlanStore).add(3, legs.id);
        await open();

        await click('#plan-add-3');

        const legsChoice = el().querySelectorAll<HTMLButtonElement>('.choice__choice')[1];
        expect(text(legsChoice)).toContain('Planned');
        expect(legsChoice.disabled).toBe(true);
    });

    it('takes a workout off a day', async () => {
        TestBed.inject(PlanStore).add(5, legs.id);
        await open();

        await click('[aria-label="Take Legs off Saturday"]');

        expect(TestBed.inject(PlanStore).plan().days[5]).toEqual([]);
        expect(days()[5]).toBe('Saturday: Nothing planned');
        expect(text(el().querySelector('[role="status"]')!)).toBe('Legs taken off Saturday');
    });

    describe('moving a workout by its handle (PLN-1)', () => {
        /** Lets go of `workoutId`, dragged from `from`, at `index` on `to`, as the CDK says. */
        const drop = async (workoutId: string, from: number, to: number, index: number) => {
            const lists = fixture.debugElement
                .queryAll(By.directive(CdkDropList))
                .map((list) => list.injector.get(CdkDropList<number>));
            const fromIndex = TestBed.inject(PlanStore).plan().days[from].indexOf(workoutId);
            lists[to].dropped.emit({
                previousIndex: fromIndex,
                currentIndex: index,
                container: lists[to],
                previousContainer: lists[from],
                item: { data: { day: from, workoutId } },
            } as unknown as CdkDragDrop<number, number, PlannedDrag>);
            await render();
        };

        it('moves one dragged to another day there, and says so', async () => {
            TestBed.inject(PlanStore).add(1, legs.id);
            TestBed.inject(PlanStore).add(3, push.id);
            await open();

            await drop(legs.id, 1, 3, 0);

            expect(days()[1]).toBe('Tuesday: Nothing planned');
            expect(days()[3]).toBe('Thursday: Legs, Push');
            expect(text(el().querySelector('[role="status"]')!)).toBe('Legs moved to Thursday');
            expect(document.activeElement?.id).toBe(`plan-move-3-${legs.id}`);
        });

        it('moves one dragged on its own day to its new place', async () => {
            TestBed.inject(PlanStore).add(4, legs.id);
            TestBed.inject(PlanStore).add(4, push.id);
            await open();

            await drop(legs.id, 4, 4, 1);

            expect(days()[4]).toBe('Friday: Push, Legs');
            expect(text(el().querySelector('[role="status"]')!)).toBe(
                'Legs moved to 2 of 2 on Friday'
            );
        });

        it("only lets one onto a day it isn't on yet", async () => {
            TestBed.inject(PlanStore).add(0, legs.id);
            TestBed.inject(PlanStore).add(2, legs.id);
            await open();
            const lists = fixture.debugElement
                .queryAll(By.directive(CdkDropList))
                .map((list) => list.injector.get(CdkDropList<number>));
            const drag = { data: { day: 0, workoutId: legs.id } } as CdkDrag<PlannedDrag>;

            expect(lists[0].enterPredicate(drag, lists[0])).toBe(true);
            expect(lists[1].enterPredicate(drag, lists[1])).toBe(true);
            expect(lists[2].enterPredicate(drag, lists[2])).toBe(false);
        });

        it('pressed, opens its days, moving it with Undo', async () => {
            TestBed.inject(PlanStore).add(1, legs.id);
            await open();

            await click(`#plan-move-1-${legs.id}`);
            expect(text(el().querySelector('.choice__title')!)).toBe('Plan Legs on…');
            const choices = el().querySelectorAll<HTMLButtonElement>('.choice__choice');
            choices[1].click();
            choices[4].click();
            await render();
            el().querySelector<HTMLButtonElement>('.choice__done')!.click();
            await render();

            expect(days()[1]).toBe('Tuesday: Nothing planned');
            expect(days()[4]).toBe('Friday: Legs');
            expect(TestBed.inject(UndoService).offer()?.message).toBe(
                'Legs planned on Friday, and taken off Tuesday'
            );
        });
    });

    describe('swapping two days (PLN-1)', () => {
        const swapButton = (day: number) =>
            el().querySelector<HTMLButtonElement>(`#plan-swap-${day}`);
        const status = () => text(el().querySelector('[role="status"]')!);

        it('has no ⇄ with nothing planned', async () => {
            await open();
            expect(swapButton(0)).toBeNull();
        });

        it('swaps a day with the next one pressed, with Undo', async () => {
            const plan = TestBed.inject(PlanStore);
            plan.add(3, legs.id);
            plan.add(5, push.id);
            await open();
            expect(swapButton(3)!.getAttribute('aria-label')).toBe(
                'Swap Thursday with another day'
            );

            await click('#plan-swap-3');
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('true');
            expect(swapButton(5)!.getAttribute('aria-label')).toBe('Swap Saturday with Thursday');
            expect(text(el().querySelector('.plan__swap-hint')!)).toBe(
                'Now press ⇄ on the day to swap it with.'
            );
            expect(status()).toBe('Thursday picked. Now pick the day to swap it with.');

            await click('#plan-swap-5');
            expect(days()[3]).toBe('Thursday: Push');
            expect(days()[5]).toBe('Saturday: Legs');
            expect(el().querySelector('.plan__swap-hint')).toBeNull();
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('false');
            const undo = TestBed.inject(UndoService);
            expect(undo.offer()?.message).toBe('Thursday and Saturday swapped');

            undo.undo();
            await render();
            expect(days()[3]).toBe('Thursday: Legs');
            expect(days()[5]).toBe('Saturday: Push');
            expect(document.activeElement?.id).toBe('plan-swap-3');
        });

        it('swaps with a day with nothing on it, moving its workouts there', async () => {
            TestBed.inject(PlanStore).add(3, legs.id);
            await open();

            await click('#plan-swap-6');
            await click('#plan-swap-3');

            expect(days()[3]).toBe('Thursday: Nothing planned');
            expect(days()[6]).toBe('Sunday: Legs');
        });

        it('puts the day down pressed again, or with Escape', async () => {
            TestBed.inject(PlanStore).add(3, legs.id);
            await open();

            await click('#plan-swap-3');
            await click('#plan-swap-3');
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('false');
            expect(status()).toBe('Thursday put down');

            await click('#plan-swap-3');
            swapButton(3)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await render();
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('false');
            expect(TestBed.inject(UndoService).offer()).toBeNull();
            expect(days()[3]).toBe('Thursday: Legs');
        });
    });

    describe("a workout's menu, from its name", () => {
        const menuItem = (name: string) =>
            [...el().querySelectorAll<HTMLButtonElement>('.menu__item')].find((item) =>
                item.textContent!.includes(name)
            );

        beforeEach(() => {
            // Planned last week, so Tuesday's is missed
            vi.setSystemTime(NOW - 7 * 24 * 60 * 60 * 1000);
            TestBed.inject(PlanStore).add(1, legs.id);
            vi.setSystemTime(NOW);
        });

        it('opens Details, coming back here', async () => {
            await open();
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});

            await click(`#plan-name-1-${legs.id}`);
            expect(
                el().querySelector(`#plan-name-1-${legs.id}`)!.getAttribute('aria-expanded')
            ).toBe('true');
            menuItem('Details')!.click();

            expect(slide).toHaveBeenCalledWith(`/library/${legs.id}?from=plan`, 'in');
        });

        it('does a missed one today instead, this week only, with Undo, and puts it back', async () => {
            await open();
            expect(days()[1]).toBe('Tuesday: Legs Missed');

            await click(`#plan-name-1-${legs.id}`);
            menuItem('Do it today instead')!.click();
            await render();

            expect(days()[1]).toBe('Tuesday: Nothing planned');
            expect(days()[2]).toBe('Wednesday · today: Legs Due');
            expect(text(el().querySelector('.row__moved')!)).toBe('From Tuesday, this week');
            expect(TestBed.inject(UndoService).offer()?.message).toBe('Legs moved to today');
            // Still on Tuesday every other week
            expect(TestBed.inject(PlanStore).plan().days[1]).toEqual([legs.id]);

            await click(`#plan-name-2-${legs.id}`);
            expect(menuItem('Do it today instead')).toBeUndefined();
            menuItem('Put back on Tuesday')!.click();
            await render();
            expect(days()[1]).toBe('Tuesday: Legs Missed');
            expect(text(el().querySelector('[role="status"]')!)).toBe('Legs back on Tuesday');
            expect(document.activeElement?.id).toBe(`plan-name-1-${legs.id}`);
        });

        it('closes with Escape, focus on the name', async () => {
            await open();
            await click(`#plan-name-1-${legs.id}`);
            menuItem('Start')!.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
            );
            await render();

            expect(el().querySelector('.menu')).toBeNull();
            expect(document.activeElement?.id).toBe(`plan-name-1-${legs.id}`);
        });
    });

    it('leaves out a workout no longer in the library', async () => {
        TestBed.inject(PlanStore).add(4, legs.id);
        TestBed.inject(WorkoutStore).deleteWorkout(legs.id);
        await open();

        expect(days()[4]).toBe('Friday: Nothing planned');
    });

    it('offers the ready-made workouts after yours, A to Z, each with its badge', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        await workouts.loadReadyMade();
        await open();

        await click('#plan-add-3');
        const choices = [...el().querySelectorAll<HTMLButtonElement>('.choice__choice')];
        const names = choices.map((choice) => text(choice.querySelector('.choice__name')!));
        expect(names.slice(0, 4)).toEqual([
            'Make a new workout',
            'Legs',
            'Push',
            '20-minute AMRAP',
        ]);
        expect(names).toHaveLength(3 + workouts.readyMade().length);
        expect(choices[2].querySelector('app-ready-made-badge')).toBeNull();
        expect(choices[3].querySelector('app-ready-made-badge')).not.toBeNull();

        choices[3].click();
        await render();
        expect(TestBed.inject(PlanStore).plan().days[3]).toEqual(['builtin:20-minute-amrap']);
        expect(days()[3]).toBe('Thursday: 20-minute AMRAP');
    });

    it('can plan a ready-made workout with none of your own', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.deleteWorkout(legs.id);
        workouts.deleteWorkout(push.id);
        await workouts.loadReadyMade();
        await open();

        expect(el().querySelector('#plan-add-0')).not.toBeNull();
    });

    it('links to the ready-made plans, coming back here (PLN-6)', async () => {
        await open();

        const link = el().querySelector('.plan__ready-made')!;
        expect(text(link)).toBe('Start from a ready-made plan');
        expect(link.getAttribute('href')).toBe('/ready-made-plans?from=plan');
    });

    it('offers Make a new workout first when picking, which opens Create for that day (PLN-5)', async () => {
        await open();

        await click('#plan-add-3');
        const choices = [...el().querySelectorAll<HTMLButtonElement>('.choice__choice')];
        expect(choices.map((choice) => text(choice.querySelector('.choice__name')!))).toEqual([
            'Make a new workout',
            'Legs',
            'Push',
        ]);
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});
        choices[0].click();
        await render();

        expect(slide).toHaveBeenCalledWith('/setup?planOn=3&from=/plan', 'in');
        expect(TestBed.inject(PlanStore).plan().days[3]).toEqual([]);
    });

    it('points out a workout just made for a day in Create, and says so', async () => {
        TestBed.inject(PlanStore).add(3, push.id);
        const harness = await RouterTestingHarness.create();
        fixture = harness.fixture;
        // On the page, so focus can move
        document.body.appendChild(el());
        await harness.navigateByUrl(`/plan?saved=${push.id}`);
        await render();

        const saved = [...el().querySelectorAll('.plan__workout--saved')].map(text);
        expect(saved).toHaveLength(1);
        expect(saved[0]).toContain('Push');
        expect(document.activeElement?.id).toBe('plan-add-3');
        expect(text(el().querySelector('[role="status"]')!)).toBe(
            'Saved Push, planned on Thursday'
        );
        el().remove();
    });
});
