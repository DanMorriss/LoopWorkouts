import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Workout } from '../models/workout';
import { ActiveRunService } from '../shared/run/active-run.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { FakeAudioContext, provideFakeAudioContext } from '../shared/testing/fake-audio-context';
import { makeWorkout, reps, rest } from '../shared/testing/make-workout';
import { TOURS } from '../tour/tour-stops';
import { TourService, WORKOUT_TOUR_KEY } from '../tour/tour.service';
import { WorkoutComponent } from './workout.component';

describe('The tour of the workout page (RUN-13)', () => {
    let fixture: ComponentFixture<WorkoutComponent>;
    let run: ActiveRunService;
    let tour: TourService;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({
            imports: [WorkoutComponent],
            providers: [provideRouter([]), provideFakeAudioContext(new FakeAudioContext())],
        });
        run = TestBed.inject(ActiveRunService);
        tour = TestBed.inject(TourService);
    });

    afterEach(() => {
        fixture?.destroy();
        tour.end();
        localStorage.clear();
        sessionStorage.clear();
    });

    /** A timed bench press, so there's an (i), then a rest. */
    const workout = (): Workout =>
        makeWorkout({
            steps: [
                {
                    kind: 'work',
                    seconds: 30,
                    name: 'Bench press',
                    exerciseId: 'builtin:bench-press',
                },
                rest(10),
            ],
        });

    /** Starts `workout` and opens the page on it, then waits for the history to load. */
    async function open(started: Workout = workout()) {
        run.start(started);
        fixture = TestBed.createComponent(WorkoutComponent);
        fixture.detectChanges();
        await TestBed.inject(HistoryStore).ready;
        await fixture.whenStable();
    }

    const el = (selector: string): HTMLElement | null =>
        fixture.nativeElement.querySelector(selector);

    it('starts on the first workout, holding the clock with the page shown as running', async () => {
        await open();

        expect(tour.tour()).toBe('workout');
        expect(tour.stop()).toBe(0);
        expect(localStorage.getItem(WORKOUT_TOUR_KEY)).toBe('seen');
        // The clock stands still, but Pause and Skip show, not Resume and End workout
        expect(run.isPaused()).toBe(true);
        expect(run.held()).toBe(true);
        expect(el('[aria-label="Pause"]')).not.toBeNull();
        expect(el('.workout-paused')).toBeNull();
        // What each stop lights up is on the page
        const parts = ['stage', 'next', 'info', 'controls'];
        expect(parts.filter((part) => !el(`[data-tour="${part}"]`))).toEqual([]);
    });

    it('starts the clock as the tour ends', async () => {
        await open();
        tour.end();
        fixture.detectChanges();

        expect(run.isPaused()).toBe(false);
        expect(run.held()).toBe(false);
        expect(el('.workout-paused')).toBeNull();
    });

    it('lights up the reps and weight on a rep step', async () => {
        await open(makeWorkout({ steps: [reps(10)], repeats: 1 }));

        expect(el('[data-tour="reps"] .workout-face__count')).not.toBeNull();
        expect(el('[data-tour="reps"] .workout-face__weight')).not.toBeNull();
    });

    it('ends on Pause, which then takes focus', () => {
        expect(TOURS.workout.doneFocus).toBe('workout-pause');
        expect(TOURS.workout.skipFocus).toBe('workout-pause');
    });

    it("isn't shown again", async () => {
        await open();
        tour.end();
        fixture.destroy();

        await open();
        expect(tour.stop()).toBeNull();
        expect(run.isPaused()).toBe(false);
    });

    it("isn't shown on a device with workouts in its history", async () => {
        const history = TestBed.inject(HistoryStore);
        await history.ready;
        history.record({
            id: 'old-run',
            workoutId: 'old-workout',
            title: 'Old',
            startedAt: Date.now() - 600_000,
            endedAt: Date.now() - 540_000,
            activeSeconds: 60,
            roundsCompleted: 1,
            totalRounds: 1,
            outcome: 'finished',
            sets: [],
        });
        await open();

        expect(tour.stop()).toBeNull();
        expect(run.isPaused()).toBe(false);
        expect(localStorage.getItem(WORKOUT_TOUR_KEY)).toBeNull();
    });

    it("isn't shown for a run already under way, e.g. picked up after a reload", async () => {
        const now = Date.now();
        TestBed.inject(WorkoutStore).setActiveWorkout(workout());
        vi.spyOn(Date, 'now').mockReturnValue(now + 10_000);
        run.sync();
        fixture = TestBed.createComponent(WorkoutComponent);
        fixture.detectChanges();
        await TestBed.inject(HistoryStore).ready;
        await fixture.whenStable();

        expect(tour.stop()).toBeNull();
        expect(run.isPaused()).toBe(false);
    });

    it('waits for a tour already on', async () => {
        tour.start('app');
        await open();

        expect(tour.tour()).toBe('app');
        expect(run.isPaused()).toBe(false);
        expect(localStorage.getItem(WORKOUT_TOUR_KEY)).toBeNull();
    });

    it('starts the clock if the page closes while it waits', async () => {
        await open();
        fixture.destroy();

        expect(run.isPaused()).toBe(false);
        expect(run.held()).toBe(false);
    });
});

describe('The tour of the workout page, from Help (RUN-13)', () => {
    let harness: RouterTestingHarness;
    let run: ActiveRunService;
    let tour: TourService;

    beforeEach(async () => {
        localStorage.clear();
        sessionStorage.clear();
        // Seen already: from Help, it's taken again
        localStorage.setItem(WORKOUT_TOUR_KEY, 'seen');
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'workout', component: WorkoutComponent },
                    { path: 'help', children: [] },
                ]),
                provideFakeAudioContext(new FakeAudioContext()),
            ],
        });
        run = TestBed.inject(ActiveRunService);
        tour = TestBed.inject(TourService);
        harness = await RouterTestingHarness.create();
    });

    afterEach(() => {
        tour.end();
        run.stop();
        localStorage.clear();
        sessionStorage.clear();
    });

    const router = () => TestBed.inject(Router);

    async function open(url: string) {
        await harness.navigateByUrl(url);
        harness.fixture.detectChanges();
        await harness.fixture.whenStable();
    }

    it('tours the run going, holding it, then carries on as it was', async () => {
        run.start(makeWorkout());
        await open('/workout?tour=run');

        expect(tour.tour()).toBe('workout');
        expect(tour.stop()).toBe(0);
        expect(run.held()).toBe(true);
        // Off the address, so a reload doesn't take it again
        expect(router().url).toBe('/workout');

        tour.end();
        harness.fixture.detectChanges();
        expect(run.isPaused()).toBe(false);
    });

    it('leaves a paused run paused, with focus on Resume', async () => {
        run.start(makeWorkout());
        run.togglePause();
        await open('/workout?tour=run');

        expect(run.held()).toBe(true);
        expect(harness.routeNativeElement!.querySelector('.workout-paused')).toBeNull();

        tour.end();
        harness.fixture.detectChanges();
        await harness.fixture.whenStable();
        expect(run.isPaused()).toBe(true);
        expect(document.activeElement?.id).toBe('workout-resume');
    });

    it('ends a practice run as it ends, logging nothing, back on Help', async () => {
        run.start(makeWorkout());
        await open('/workout?tour=practice');

        expect(tour.tour()).toBe('workout-practice');
        expect(TOURS['workout-practice'].stops.at(-1)!.text).toContain('goes back to Help');

        tour.end();
        await harness.fixture.whenStable();
        await vi.waitFor(() => expect(router().url).toBe('/help'));
        expect(run.workout()).toBeNull();
        const history = TestBed.inject(HistoryStore);
        await history.ready;
        expect(history.entries()).toEqual([]);
    });
});
