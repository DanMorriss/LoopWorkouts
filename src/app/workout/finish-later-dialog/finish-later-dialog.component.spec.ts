import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Step, Workout } from '../../models/workout';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { fakeReducedMotion } from '../../shared/testing/fake-reduced-motion';
import { FakeAudioContext, provideFakeAudioContext } from '../../shared/testing/fake-audio-context';
import { makeWorkout, reps, work } from '../../shared/testing/make-workout';
import { WORKOUT_TOUR_KEY } from '../../tour/tour.service';
import { WorkoutComponent } from '../workout.component';
import { WorkoutView } from '../workout-view';

// Exercises skipped to do later and still put aside at the end (RUN-16): do one first?
describe('FinishLaterDialogComponent', () => {
    let fixture: ComponentFixture<WorkoutComponent>;
    const page = () => fixture.nativeElement as HTMLElement;
    const view = () => fixture.debugElement.injector.get(WorkoutView);
    const run = () => TestBed.inject(ActiveRunService);
    const entries = () => TestBed.inject(HistoryStore).entries();

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

    /** Renders, with the hooks that run after it (focus), as the browser would. */
    function render() {
        fixture.detectChanges();
        TestBed.tick();
    }

    function press(element: Element | null | undefined) {
        (element as HTMLElement).click();
        render();
    }

    function wait(ms: number) {
        vi.advanceTimersByTime(ms);
        render();
    }

    const skip = () => press(page().querySelector('.workout-control--skip button'));
    const dialog = () => page().querySelector('app-finish-later-dialog');
    const title = () => dialog()?.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim();
    const buttonNamed = (name: string) =>
        [...(dialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
            (b) => b.textContent?.trim() === name
        );
    const summary = () => page().querySelector('app-workout-summary');

    it('asks at the end, rather than finishing, with focus on Do it now', () => {
        start(circuit);
        skip(); // Plank
        wait(20_000); // Squats, Lunges

        expect(title()).toBe('Do Plank before you finish?');
        expect(dialog()!.textContent).toContain('You skipped it earlier · 00:10');
        expect(document.activeElement).toBe(buttonNamed('Do it now'));
        expect(summary()).toBeNull();
        expect(run().isComplete()).toBe(false);
        expect(entries()).toEqual([]);
        // The button for doing it later goes with the controls
        expect(page().querySelector('.later__button')).toBeNull();
    });

    it("doesn't ask with nothing put aside", () => {
        start(circuit);
        wait(30_000);

        expect(dialog()).toBeNull();
        expect(summary()).not.toBeNull();
    });

    it('does it now, with focus on Pause, then finishes, logging its set where it was', () => {
        start(circuit);
        skip();
        wait(20_000);
        // Time spent deciding isn't the workout's
        wait(60_000);

        press(buttonNamed('Do it now'));
        expect(dialog()).toBeNull();
        expect(view().state()?.step?.name).toBe('Plank');
        expect(view().state()?.remainingSeconds).toBe(10);
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Pause');

        wait(10_000);
        expect(run().isComplete()).toBe(true);
        expect(summary()).not.toBeNull();
        const [entry] = entries();
        expect(entry.outcome).toBe('finished');
        expect(entry.activeSeconds).toBe(30);
        expect(entry.endedAt).toBe(Date.now());
        expect(entry.sets).toEqual([
            expect.objectContaining({ name: 'Plank', seconds: 10 }),
            expect.objectContaining({ name: 'Squats', seconds: 10 }),
            expect.objectContaining({ name: 'Lunges', seconds: 10 }),
        ]);
    });

    it('finishes without it on Finish, or Escape', () => {
        start(circuit);
        skip();
        wait(20_000);

        press(buttonNamed('Finish'));
        expect(dialog()).toBeNull();
        expect(summary()).not.toBeNull();
        expect(entries()[0].outcome).toBe('finished');
        expect(entries()[0].sets?.map((set) => set.name)).toEqual(['Squats', 'Lunges']);
        fixture.destroy();
        run().stop();

        start(circuit);
        skip();
        wait(20_000);
        dialog()!
            .querySelector('.dialog-card')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        render();
        expect(dialog()).toBeNull();
        expect(run().isComplete()).toBe(true);
    });

    it('lists several to pick one, asking again about the rest after it', () => {
        start(
            makeWorkout({
                steps: [
                    exercise('Plank', 'builtin:plank'),
                    { ...reps(10, 'Squats'), exerciseId: 'builtin:bodyweight-squat' },
                    exercise('Lunges', 'builtin:reverse-lunge'),
                ],
                repeats: 1,
            })
        );
        skip(); // Plank
        skip(); // Squats
        wait(10_000); // Lunges

        expect(title()).toBe('Do one before you finish?');
        const names = [...dialog()!.querySelectorAll('.later-option__name')].map(
            (name) => name.textContent
        );
        expect(names).toEqual(['Plank', 'Squats']);
        expect(document.activeElement).toBe(dialog()!.querySelector('.menu__item'));

        press(dialog()!.querySelectorAll('.menu__item')[1]);
        expect(view().state()?.step?.name).toBe('Squats');
        expect(view().isRepsActive()).toBe(true);

        // Done on the squats, done later
        press(page().querySelector('button.up-next--done'));
        expect(title()).toBe('Do Plank before you finish?');
        expect(entries()).toEqual([]);

        press(buttonNamed('Finish'));
        expect(entries()[0].sets?.map((set) => set.name)).toEqual(['Squats', 'Lunges']);
    });

    it('is logged as finished if the run ends while it asks', () => {
        start(circuit);
        skip();
        wait(20_000);

        run().stop();

        expect(entries()[0].outcome).toBe('finished');
    });
});
