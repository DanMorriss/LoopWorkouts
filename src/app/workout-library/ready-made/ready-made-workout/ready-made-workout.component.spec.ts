import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BUILT_IN_WORKOUTS, copyOfBuiltIn } from '../../../models/built-in-workouts';
import { allSteps } from '../../../models/workout';
import { PageSlide } from '../../../nav/page-slide';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { UndoService } from '../../../shared/undo/undo.service';
import { ReadyMadeWorkoutComponent } from './ready-made-workout.component';

describe('ReadyMadeWorkoutComponent', () => {
    let fixture: ComponentFixture<unknown>;
    let store: WorkoutStore;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'library', children: [] },
                    { path: 'workout', children: [] },
                    { path: 'ready-made/:id', component: ReadyMadeWorkoutComponent },
                    {
                        path: 'ready-made-plans/:id',
                        component: ReadyMadeWorkoutComponent,
                        data: { inPlan: true },
                    },
                ]),
            ],
        });
        store = TestBed.inject(WorkoutStore);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    async function open(slug: string) {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(`/ready-made/${slug}`);
        fixture = harness.fixture;
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const text = (node: Element = el()) => node.textContent!.replace(/\s+/g, ' ').trim();

    async function press(selector: string) {
        el().querySelector<HTMLButtonElement>(selector)!.click();
        await render();
    }

    it('shows what it needs, its exercises and sets, and its muscles', async () => {
        await open('gym-legs');

        expect(text(el().querySelector('.preview__title')!)).toBe('Gym legs');
        expect(text()).toContain('Once through');
        expect(text()).toContain('Back squat 3 sets: 12, 10, 8, rest 2:30');
        expect(text()).toContain('Superset 3 rounds, rest 1:00');
        expect(el().querySelector('app-body-map')).not.toBeNull();
        expect(text()).not.toContain('You have a workout called this');
    });

    it('has no exercise links from Workouts', async () => {
        await open('gym-legs');

        expect(el().querySelector('.outline__link')).toBeNull();
    });

    it('goes back to Workouts with ‹ Workouts, saying which card to put focus on', async () => {
        await open('gym-legs');
        const back = el().querySelector('.back-link')!;

        expect(text(back)).toBe('chevron_left Workouts');
        expect(back.getAttribute('href')).toBe('/library?ready-made=gym-legs');
    });

    describe("from a ready-made plan's card", () => {
        async function openFrom(from: string) {
            const harness = await RouterTestingHarness.create();
            await harness.navigateByUrl(`/ready-made-plans/gym-legs?from=${from}`);
            fixture = harness.fixture;
            await render();
        }

        it.each([
            ['today', 'chevron_left Today', '/home'],
            ['plans', 'chevron_left Plans', '/ready-made-plans'],
            ['plan', 'chevron_left Plans', '/ready-made-plans?from=plan'],
            ['elsewhere', 'chevron_left Plans', '/ready-made-plans'],
        ])('goes back from %s to where the card was', async (from, label, url) => {
            await openFrom(from);
            const back = el().querySelector('.back-link')!;

            expect(text(back)).toBe(label);
            expect(back.getAttribute('href')).toBe(url);
        });

        it('links each exercise to its page, which comes back here', async () => {
            await openFrom('today');
            const links = Array.from(el().querySelectorAll('.outline__link'));

            expect(links.map((a) => text(a))).toContain('Back squat chevron_right');
            expect(links[0].getAttribute('href')).toBe(
                '/ready-made-plans/gym-legs/back-squat?from=today'
            );
        });

        it('shows the workout to look at, with nothing to add', async () => {
            await openFrom('plans');

            expect(text(el().querySelector('.preview__title')!)).toBe('Gym legs');
            expect(text()).toContain('Back squat chevron_right 3 sets: 12, 10, 8, rest 2:30');
            expect(el().querySelector('.preview__add')).toBeNull();
            expect(el().querySelector('.preview__start')).toBeNull();
        });
    });

    it('says when one of the same name is in your workouts already', async () => {
        const gymLegs = BUILT_IN_WORKOUTS.find((w) => w.title === 'Gym legs')!;
        store.addWorkout(copyOfBuiltIn(gymLegs));
        await open('gym-legs');

        expect(text()).toContain('You have a workout called this in your workouts already.');
    });

    it('adds a copy to your workouts, with Undo, and slides back out to Workouts with it', async () => {
        await open('core-in-15');
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});
        await press('.preview__add');

        expect(store.workouts().map((w) => w.title)).toEqual(['Core in 15']);
        const added = store.workouts()[0];
        const builtIn = BUILT_IN_WORKOUTS.find((w) => w.title === 'Core in 15')!;
        expect(added.id).not.toBe(builtIn.id);
        expect(allSteps(added).map((s) => s.exerciseId)).toEqual(
            allSteps(builtIn).map((s) => s.exerciseId)
        );
        expect(slide).toHaveBeenCalledWith(`/library?added=${added.id}`, 'out');
        expect(TestBed.inject(UndoService).offer()?.message).toBe(
            'Added "Core in 15" to your workouts'
        );

        TestBed.inject(UndoService).undo();
        expect(store.workouts()).toEqual([]);
    });

    it('adds and starts one straight away', async () => {
        await open('cardio-intervals');
        await press('.preview__start');

        expect(store.workouts().map((w) => w.title)).toEqual(['Cardio intervals']);
        expect(store.activeWorkout()?.id).toBe(store.workouts()[0].id);
        expect(TestBed.inject(Router).url).toBe('/workout');
    });

    it('says so for a link to one there is not, with the way back to them all', async () => {
        await open('no-such-workout');

        expect(text(el().querySelector('.preview__title')!)).toBe('Workout not found');
        expect(el().querySelector('.preview__add')).toBeNull();
        expect(el().querySelector('a.btn-pill')!.getAttribute('href')).toBe('/ready-made');
    });
});
