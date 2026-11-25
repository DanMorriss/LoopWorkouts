import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { WritableSignal } from '@angular/core';
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
import { PlanDrag, PlannedDrag } from './plan-drag';
import { SettingsStore } from '../shared/state/settings-store.service';

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
    /** The week's day tabs, Monday first. */
    const tab = (day: number) => el().querySelectorAll<HTMLButtonElement>('[role="tab"]')[day];
    /** Shows `day`'s workouts under the week, as a tap on its tab does. */
    const show = async (day: number) => {
        tab(day).click();
        await render();
    };
    /** The day shown, as it reads, e.g. "Monday: Legs Done". */
    const shown = () => {
        const day = el().querySelector('.plan__day')!;
        const name = text(day.querySelector('.plan__day-name')!);
        const workouts = Array.from(day.querySelectorAll('.plan__workout'), (row) =>
            [
                row.querySelector('.row__text')!.textContent!.trim(),
                row.querySelector('.row__status')?.textContent!.replace('check', '').trim(),
            ]
                .filter(Boolean)
                .join(' ')
        );
        return `${name}: ${workouts.join(', ') || 'Nothing planned'}`;
    };
    /** Each day as it reads, each shown in turn, then today's shown again. */
    const days = async () => {
        const read: string[] = [];
        for (let day = 0; day < 7; day++) {
            await show(day);
            read.push(shown());
        }
        await show(2);
        return read;
    };
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

        expect(await days()).toEqual([
            'Monday: Legs Done',
            'Tuesday: Push Missed',
            'Wednesday · today: Legs Due, Push Due',
            'Thursday: Nothing planned',
            'Friday: Legs',
            'Saturday: Nothing planned',
            'Sunday: Nothing planned',
        ]);
        // As Today says it
        expect(text(el().querySelector('.plan__so-far')!)).toContain('1 of 5 done this week');
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

        expect(await days()).toEqual([
            'Monday: Nothing planned',
            'Tuesday: Stretches Rested',
            'Wednesday · today: Legs Due, Stretches Active rest',
            'Thursday: Nothing planned',
            'Friday: Stretches Active rest',
            'Saturday: Nothing planned',
            'Sunday: Nothing planned',
        ]);
        expect(text(el().querySelector('.plan__so-far')!)).toBe('0 of 1 done this week');
    });

    it('says a workout planned once its day had gone by starts next week, not counting it', async () => {
        // NOW is a Wednesday: Monday has gone by
        TestBed.inject(PlanStore).add(0, legs.id);
        await open();

        expect((await days())[0]).toBe('Monday: Legs From next week');
        expect(text(el().querySelector('.plan__so-far')!)).toBe('Your plan starts next week');
    });

    it('lists every day under the week, the picked one open, and opens another pressed', async () => {
        const plan = TestBed.inject(PlanStore);
        plan.add(0, legs.id);
        plan.add(3, push.id);
        await open();

        // Each day not picked reads at a glance: its workouts, or a rest day
        const summaries = [...el().querySelectorAll('app-plan-day-summary')].map(text);
        expect(summaries).toHaveLength(6);
        expect(summaries[0]).toBe('Monday Legs, From next week');
        expect(summaries[1]).toMatch(/^Tuesday .*Rest day$/);
        expect(summaries[2]).toBe('Thursday Push');
        expect(shown()).toBe('Wednesday · today: Nothing planned');

        el().querySelectorAll<HTMLButtonElement>('.summary__pick')[2].click();
        await render();
        expect(shown()).toBe('Thursday: Push');
        expect(tab(3).getAttribute('aria-selected')).toBe('true');
        expect(document.activeElement?.id).toBe('plan-day-3');
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

            // The week, today's tab picked, today's workouts under it
            expect(el().querySelector('[data-tour="plan-today"] [aria-selected="true"]')!.id).toBe(
                'week-day-2'
            );
            expect(text(el().querySelector('.plan__day-name')!)).toBe('Wednesday · today');
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

        await show(3);
        await click('#plan-add-3');
        expect(text(el().querySelector('.choice__title')!)).toBe('Plan on Thursday');
        // After Make a new workout, first: Legs, then Push
        el().querySelectorAll<HTMLButtonElement>('.choice__choice')[2].click();
        await render();

        expect(TestBed.inject(PlanStore).plan().days[3]).toEqual([push.id]);
        expect(document.activeElement?.id).toBe('plan-add-3');
        expect(el().querySelector('app-workout-choice-dialog')).toBeNull();
        expect(text(el().querySelector('[role="status"]')!)).toBe('Push planned on Thursday');
        expect((await days())[3]).toBe('Thursday: Push');
    });

    it("doesn't offer a workout already planned that day", async () => {
        TestBed.inject(PlanStore).add(3, legs.id);
        await open();

        await show(3);
        await click('#plan-add-3');

        const legsChoice = el().querySelectorAll<HTMLButtonElement>('.choice__choice')[1];
        expect(text(legsChoice)).toContain('Planned');
        expect(legsChoice.disabled).toBe(true);
    });

    it('takes a workout off a day', async () => {
        TestBed.inject(PlanStore).add(5, legs.id);
        await open();

        await show(5);
        await click('[aria-label="Take Legs off Saturday"]');

        expect(TestBed.inject(PlanStore).plan().days[5]).toEqual([]);
        expect((await days())[5]).toBe('Saturday: Nothing planned');
        // With Undo, which puts it back
        const undo = TestBed.inject(UndoService);
        expect(undo.offer()?.message).toBe('Legs taken off Saturday');
        undo.undo();
        await render();
        expect(TestBed.inject(PlanStore).plan().days[5]).toEqual([legs.id]);
    });

    describe('moving a workout by its handle (PLN-1)', () => {
        /**
         * Lets go of `workoutId`, dragged from `from`'s list: on `to`'s tab in the week, or, on
         * its own day, at `index`, as the CDK says.
         */
        const drop = async (workoutId: string, from: number, to: number, index = 0) => {
            await show(from);
            const list = fixture.debugElement
                .query(By.directive(CdkDropList))
                .injector.get(CdkDropList<number>);
            const page = fixture.debugElement.query(By.directive(PlanComponent))
                .componentInstance as unknown as { dropOn: WritableSignal<number | null> };
            page.dropOn.set(to === from ? null : to);
            list.dropped.emit({
                previousIndex: TestBed.inject(PlanStore).plan().days[from].indexOf(workoutId),
                currentIndex: index,
                container: list,
                previousContainer: list,
                item: { data: { day: from, workoutId } },
            } as unknown as CdkDragDrop<number, number, PlannedDrag>);
            await render();
        };

        it('moves one dragged to another day there, and says so', async () => {
            TestBed.inject(PlanStore).add(1, legs.id);
            TestBed.inject(PlanStore).add(3, push.id);
            await open();

            await drop(legs.id, 1, 3);

            // Thursday's shown, focus on its handle there; it goes at the end
            expect(document.activeElement?.id).toBe(`plan-move-3-${legs.id}`);
            expect(shown()).toBe('Thursday: Push, Legs');
            expect(TestBed.inject(UndoService).offer()?.message).toBe('Legs moved to Thursday');
            expect((await days())[1]).toBe('Tuesday: Nothing planned');
        });

        it('puts the week back as it was on Undo', async () => {
            TestBed.inject(PlanStore).add(1, legs.id);
            await open();
            const before = TestBed.inject(PlanStore).plan();

            await drop(legs.id, 1, 3);
            TestBed.inject(UndoService).undo();
            await render();

            expect(TestBed.inject(PlanStore).plan().days).toEqual(before.days);
            expect(document.activeElement?.id).toBe(`plan-move-1-${legs.id}`);
        });

        it('moves one dragged on its own day to its new place', async () => {
            TestBed.inject(PlanStore).add(4, legs.id);
            TestBed.inject(PlanStore).add(4, push.id);
            await open();

            await drop(legs.id, 4, 4, 1);

            expect((await days())[4]).toBe('Friday: Push, Legs');
            expect(TestBed.inject(UndoService).offer()?.message).toBe(
                'Legs moved to 2 of 2 on Friday'
            );
        });

        it("only lets one onto a day it isn't on yet, and that isn't full", () => {
            const plan = TestBed.inject(PlanStore);
            plan.add(0, legs.id);
            plan.add(2, legs.id);
            const drag = new PlanDrag(plan.plan);

            expect(drag.canGo(legs.id, 0, 0)).toBe(true);
            expect(drag.canGo(legs.id, 0, 1)).toBe(true);
            expect(drag.canGo(legs.id, 0, 2)).toBe(false);
        });

        it('moves one up or down its day from its menu, without dragging', async () => {
            const plan = TestBed.inject(PlanStore);
            plan.add(4, legs.id);
            plan.add(4, push.id);
            await open();
            await show(4);

            await click(`#plan-name-4-${legs.id}`);
            const item = (name: string) =>
                [...el().querySelectorAll<HTMLButtonElement>('.menu__item')].find((button) =>
                    button.textContent!.includes(name)
                );
            expect(item('Move up')).toBeUndefined();
            item('Move down')!.click();
            await render();

            expect(shown()).toBe('Friday: Push, Legs');
            expect(document.activeElement?.id).toBe(`plan-name-4-${legs.id}`);
            expect(TestBed.inject(UndoService).offer()?.message).toBe(
                'Legs moved to 2 of 2 on Friday'
            );
        });

        it('pressed, opens its days, moving it with Undo', async () => {
            TestBed.inject(PlanStore).add(1, legs.id);
            await open();

            await show(1);
            await click(`#plan-move-1-${legs.id}`);
            expect(text(el().querySelector('.choice__title')!)).toBe('Plan Legs on…');
            const choices = el().querySelectorAll<HTMLButtonElement>('.choice__choice');
            choices[1].click();
            choices[4].click();
            await render();
            el().querySelector<HTMLButtonElement>('.choice__done')!.click();
            await render();

            expect((await days())[1]).toBe('Tuesday: Nothing planned');
            expect((await days())[4]).toBe('Friday: Legs');
            expect(TestBed.inject(UndoService).offer()?.message).toBe(
                'Legs planned on Friday, and taken off Tuesday'
            );
        });
    });

    describe('swapping two days (PLN-1)', () => {
        const swapButton = (day: number) =>
            el().querySelector<HTMLButtonElement>(`#plan-swap-${day}`);
        const status = () => text(el().querySelector('.sr-only[role="status"]')!);

        it('has no Swap with nothing planned', async () => {
            await open();
            expect(swapButton(2)).toBeNull();
        });

        it('swaps the day shown with the next one picked in the week, with Undo', async () => {
            const plan = TestBed.inject(PlanStore);
            plan.add(3, legs.id);
            plan.add(5, push.id);
            await open();
            await show(3);
            expect(text(swapButton(3)!)).toContain('Swap Thursday with another day');

            await click('#plan-swap-3');
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('true');
            expect(text(el().querySelector('.plan__swap-hint')!)).toBe(
                'Now pick the day to swap Thursday with. Cancel'
            );
            expect(status()).toBe('Thursday picked. Now pick the day to swap it with.');

            await show(5);
            expect(el().querySelector('.plan__swap-hint')).toBeNull();
            const undo = TestBed.inject(UndoService);
            expect(undo.offer()?.message).toBe('Thursday and Saturday swapped');
            expect(TestBed.inject(PlanStore).plan().days[3]).toEqual([push.id]);
            expect(TestBed.inject(PlanStore).plan().days[5]).toEqual([legs.id]);

            undo.undo();
            await render();
            expect(document.activeElement?.id).toBe('plan-swap-3');
            expect((await days())[3]).toBe('Thursday: Legs');
            expect((await days())[5]).toBe('Saturday: Push');
        });

        it('swaps with a day with nothing on it, moving its workouts there', async () => {
            TestBed.inject(PlanStore).add(3, legs.id);
            await open();

            await show(6);
            await click('#plan-swap-6');
            await show(3);

            expect((await days())[3]).toBe('Thursday: Nothing planned');
            expect((await days())[6]).toBe('Sunday: Legs');
        });

        it('puts the day down picked again, with Cancel, or with Escape', async () => {
            TestBed.inject(PlanStore).add(3, legs.id);
            await open();
            await show(3);

            await click('#plan-swap-3');
            await show(3);
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('false');
            expect(status()).toBe('Thursday put down');

            await click('#plan-swap-3');
            await click('.plan__swap-cancel');
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('false');

            await click('#plan-swap-3');
            swapButton(3)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await render();
            expect(swapButton(3)!.getAttribute('aria-pressed')).toBe('false');
            expect(TestBed.inject(UndoService).offer()).toBeNull();
            expect((await days())[3]).toBe('Thursday: Legs');
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
            await show(1);
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
            expect((await days())[1]).toBe('Tuesday: Legs Missed');

            await show(1);
            await click(`#plan-name-1-${legs.id}`);
            menuItem('Do it today instead')!.click();
            await render();

            expect((await days())[1]).toBe('Tuesday: Nothing planned');
            expect((await days())[2]).toBe('Wednesday · today: Legs Due');
            await show(2);
            expect(text(el().querySelector('.row__moved')!)).toBe('From Tuesday, this week');
            expect(TestBed.inject(UndoService).offer()?.message).toBe('Legs moved to today');
            // Still on Tuesday every other week
            expect(TestBed.inject(PlanStore).plan().days[1]).toEqual([legs.id]);

            await click(`#plan-name-2-${legs.id}`);
            expect(menuItem('Do it today instead')).toBeUndefined();
            menuItem('Put back on Tuesday')!.click();
            await render();
            // Tuesday's shown, focus on it there
            expect(document.activeElement?.id).toBe(`plan-name-1-${legs.id}`);
            expect(shown()).toBe('Tuesday: Legs Missed');
            expect(text(el().querySelector('.sr-only[role="status"]')!)).toBe(
                'Legs back on Tuesday'
            );
        });

        it('closes with Escape, focus on the name', async () => {
            await open();
            await show(1);
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

        expect((await days())[4]).toBe('Friday: Nothing planned');
    });

    it('offers the ready-made workouts after yours, A to Z, under headings, each with its muscles', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        await workouts.loadReadyMade();
        await open();

        await show(3);
        await click('#plan-add-3');
        const choices = [...el().querySelectorAll<HTMLButtonElement>('.choice__choice')];
        const names = choices.map((choice) =>
            choice.querySelector('.choice__name')!.childNodes[0].textContent!.trim()
        );
        expect(names.slice(0, 4)).toEqual([
            'Make a new workout',
            'Legs',
            'Push',
            '20-minute AMRAP',
        ]);
        expect(names).toHaveLength(3 + workouts.readyMade().length);
        expect([...el().querySelectorAll('.choice__group')].map(text)).toEqual([
            'Your workouts',
            'Ready-made',
        ]);
        expect(text(choices[3].querySelector('.choice__note')!)).toContain('Chest');

        choices[3].click();
        await render();
        expect(TestBed.inject(PlanStore).plan().days[3]).toEqual(['builtin:20-minute-amrap']);
        expect((await days())[3]).toBe('Thursday: 20-minute AMRAP');
    });

    it('puts the ready-made workouts your equipment can do first', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        await workouts.loadReadyMade();
        TestBed.inject(SettingsStore).update({ myEquipment: ['kettlebell'] });
        await open();

        await click('#plan-add-2');
        expect([...el().querySelectorAll('.choice__group')].map(text)).toEqual([
            'Your workouts',
            'Ready-made, for your equipment',
            'Ready-made, other equipment',
        ]);
    });

    it('can plan a ready-made workout with none of your own', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.deleteWorkout(legs.id);
        workouts.deleteWorkout(push.id);
        await workouts.loadReadyMade();
        await open();

        expect(el().querySelector('#plan-add-2')).not.toBeNull();
    });

    it('starts with nothing planned on the ready-made week for you, used in one tap (PLN-6)', async () => {
        await TestBed.inject(WorkoutStore).loadReadyMade();
        await open();

        const start = el().querySelector('app-plan-start')!;
        expect(text(start.querySelector('.start__title')!)).toBe('Start with a ready-made week');
        expect(start.querySelector('app-plan-card')).not.toBeNull();
        // Swiped between, as on Today; All plans comes back here, and no Make your own plan
        expect(start.querySelector('app-plans-for-you app-carousel')).not.toBeNull();
        const all = [...start.querySelectorAll('a')].find((a) => text(a) === 'All plans')!;
        expect(all.getAttribute('href')).toBe('/ready-made-plans?from=plan');
        expect([...start.querySelectorAll('a')].map(text)).not.toContain('Make your own plan');
        expect(el().querySelector('.plan__ready-made')).toBeNull();

        start.querySelector<HTMLButtonElement>('app-plan-card .btn-main')!.click();
        await render();
        expect(TestBed.inject(PlanStore).hasPlan()).toBe(true);
        expect(el().querySelector('app-plan-start')).toBeNull();
        expect(TestBed.inject(UndoService).offer()).not.toBeNull();
    });

    it('links to the ready-made plans once something is planned, coming back here', async () => {
        TestBed.inject(PlanStore).add(3, legs.id);
        await open();

        const link = el().querySelector('.plan__ready-made')!;
        expect(text(link)).toBe('Ready-made plans');
        expect(link.getAttribute('href')).toBe('/ready-made-plans?from=plan');
    });

    it('offers Make a new workout first when picking, which opens Create for that day (PLN-5)', async () => {
        await open();

        await show(3);
        await click('#plan-add-3');
        const choices = [...el().querySelectorAll<HTMLButtonElement>('.choice__choice')];
        expect(
            choices.map((choice) =>
                choice.querySelector('.choice__name')!.childNodes[0].textContent!.trim()
            )
        ).toEqual(['Make a new workout', 'Legs', 'Push']);
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
