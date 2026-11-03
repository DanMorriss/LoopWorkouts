import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from '../models/history';
import { asOneGroup, Workout } from '../models/workout';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
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
        plan.add(0, legs.id);
        plan.add(1, push.id);
        plan.add(2, legs.id);
        plan.add(2, push.id);
        plan.add(4, legs.id);
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

    it('plans a workout from the library on a day, then focuses that day again', async () => {
        await open();

        await click('#plan-add-3');
        expect(text(el().querySelector('.choice__title')!)).toBe('Plan on Thursday');
        el().querySelectorAll<HTMLButtonElement>('.choice__choice')[1].click();
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

        const legsChoice = el().querySelector<HTMLButtonElement>('.choice__choice')!;
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

    it('says to make a workout first when there are none, with no Add', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.deleteWorkout(legs.id);
        workouts.deleteWorkout(push.id);
        await open();

        expect(el().textContent).toContain('Make a workout in Workouts first');
        expect(el().querySelector('.plan__add')).toBeNull();
    });
});
