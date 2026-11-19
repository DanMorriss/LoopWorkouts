import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Step, Workout } from '../../models/workout';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { fakeReducedMotion } from '../../shared/testing/fake-reduced-motion';
import { FakeAudioContext, provideFakeAudioContext } from '../../shared/testing/fake-audio-context';
import { makeWorkout, rest, work } from '../../shared/testing/make-workout';
import { WORKOUT_TOUR_KEY } from '../../tour/tour.service';
import { WorkoutComponent } from '../workout.component';
import { WorkoutView } from '../workout-view';

// The exercises skipped to do later (RUN-16), on the workout page
describe('LaterListComponent', () => {
    let fixture: ComponentFixture<WorkoutComponent>;
    const page = () => fixture.nativeElement as HTMLElement;
    const view = () => fixture.debugElement.injector.get(WorkoutView);
    const undo = () => TestBed.inject(UndoService);

    // Three exercises of 10s each, one round, linked to their exercises so their sets are logged
    const exercise = (name: string, exerciseId: string): Step => ({
        ...work(10, name),
        exerciseId,
    });
    const circuit = makeWorkout({
        steps: [
            exercise('Plank', 'builtin:plank'),
            exercise('Squats', 'builtin:bodyweight-squat'),
            exercise('Lunges', 'builtin:reverse-lunge'),
        ],
        repeats: 1,
    });

    beforeEach(async () => {
        vi.useFakeTimers();
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem(WORKOUT_TOUR_KEY, 'seen');
        fakeReducedMotion(true);
        await TestBed.configureTestingModule({
            imports: [WorkoutComponent],
            providers: [provideRouter([]), provideFakeAudioContext(new FakeAudioContext())],
        }).compileComponents();
    });

    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
        localStorage.clear();
        sessionStorage.clear();
    });

    function start(workout: Workout) {
        TestBed.inject(WorkoutStore).setActiveWorkout(workout);
        fixture = TestBed.createComponent(WorkoutComponent);
        render();
    }

    /** Renders, with the hooks that run after it (focus, the fly), as the browser would. */
    function render() {
        fixture.detectChanges();
        TestBed.tick();
    }

    function press(element: Element | null | undefined) {
        (element as HTMLElement).click();
        render();
    }

    const button = () => page().querySelector<HTMLButtonElement>('.later__button');
    const skip = () => press(page().querySelector('.workout-control--skip button'));
    const upNext = () =>
        page().querySelector('.up-next__text')?.textContent?.replace(/\s+/g, ' ').trim();
    const buttonNamed = (name: string) =>
        [...page().querySelectorAll<HTMLButtonElement>('.later__menu button')].find(
            (b) => b.textContent?.trim() === name
        );

    it('appears once an exercise is skipped, named for it', () => {
        start(circuit);
        expect(button()).toBeNull();

        skip();

        expect(button()!.getAttribute('aria-label')).toBe('Skipped: Plank');
        expect(button()!.getAttribute('aria-expanded')).toBe('false');
        expect(page().querySelector('.later__count')).toBeNull();
    });

    it("isn't offered for a rest, or with a time limit", () => {
        start(makeWorkout({ steps: [work(10, 'Plank'), rest(10)], repeats: 2 }));
        vi.advanceTimersByTime(10_000);
        render();
        expect(view().isRestActive()).toBe(true);

        skip();
        expect(button()).toBeNull();
        fixture.destroy();

        start({ ...circuit, repeats: 0, timeLimitSeconds: 600 });
        skip();
        expect(button()).toBeNull();
    });

    it('asks to do it next, Not now and Escape closing it with focus back on the button', () => {
        start(circuit);
        skip();

        press(button());
        expect(button()!.getAttribute('aria-expanded')).toBe('true');
        expect(page().querySelector('.later__heading')!.textContent).toContain('Do Plank next?');
        expect(document.activeElement).toBe(buttonNamed('Do it next'));

        press(buttonNamed('Not now'));
        expect(page().querySelector('.later__menu')).toBeNull();
        expect(document.activeElement).toBe(button());

        press(button());
        page()
            .querySelector('.later')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        render();
        expect(page().querySelector('.later__menu')).toBeNull();
        expect(document.activeElement).toBe(button());
        // Only the menu closed: the run carries on
        expect(view().isPaused()).toBe(false);
    });

    it('puts the one picked next, with Undo, and focus on the controls once the button goes', () => {
        start(circuit);
        skip();
        expect(upNext()).toContain('Lunges');

        press(button());
        press(buttonNamed('Do it next'));

        expect(upNext()).toContain('Plank');
        expect(button()).toBeNull();
        expect(undo().offer()?.message).toBe('Plank is up next');
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Pause');

        undo().undo();
        render();
        expect(upNext()).toContain('Lunges');
        expect(button()!.getAttribute('aria-label')).toBe('Skipped: Plank');
    });

    it('runs the one picked after the step on now, then carries on, logging its set where it was', () => {
        start(circuit);
        skip();
        press(button());
        press(buttonNamed('Do it next'));

        vi.advanceTimersByTime(10_000); // Squats
        render();
        expect(view().state()?.step?.name).toBe('Plank');
        expect(undo().offer()).toBeNull();

        vi.advanceTimersByTime(10_000); // Plank, done later
        render();
        expect(view().state()?.step?.name).toBe('Lunges');

        vi.advanceTimersByTime(10_000);
        render();
        expect(view().isComplete()).toBe(true);
        expect(TestBed.inject(HistoryStore).entries()[0].sets).toEqual([
            expect.objectContaining({ name: 'Plank', seconds: 10 }),
            expect.objectContaining({ name: 'Squats', seconds: 10 }),
            expect.objectContaining({ name: 'Lunges', seconds: 10 }),
        ]);
    });

    it('lists more than one, with a count, to pick one', () => {
        start(circuit);
        skip();
        skip();

        expect(button()!.getAttribute('aria-label')).toBe('2 skipped exercises');
        expect(page().querySelector('.later__count')!.textContent).toBe('2');

        press(button());
        const items = [...page().querySelectorAll('.later__name')].map((n) => n.textContent);
        expect(items).toEqual(['Plank', 'Squats']);
        expect(document.activeElement).toBe(page().querySelector('.later__item'));

        press(page().querySelectorAll('.later__item')[1]);
        expect(upNext()).toContain('Squats');
        // One's left, so focus stays on its button
        expect(button()!.getAttribute('aria-label')).toBe('Skipped: Plank');
        expect(document.activeElement).toBe(button());
    });
});
