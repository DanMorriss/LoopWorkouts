import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from '../models/history';
import { PageSlide } from '../shared/navigation/page-slide';
import { asOneGroup, Workout } from '../models/workout';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { PLAN_TOUR_KEY, TourService } from '../tour/tour.service';
import { PlanComponent } from './plan.component';

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
                    row.querySelector('.plan__workout-name')!.textContent!.trim(),
                    row.querySelector('.plan__status')?.textContent!.replace('check', '').trim(),
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
