import {
    afterNextRender,
    DestroyRef,
    DOCUMENT,
    effect,
    EnvironmentInjector,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActiveRunService } from '../shared/run/active-run.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { TourService } from '../tour/tour.service';

/** A run opened within this long of its start counts as just started, from a Start button. */
const JUST_STARTED_MS = 3000;

/**
 * What Help adds to the workout page's address to take its tour: `run` for the run going,
 * `practice` for a practice run Help has just started.
 */
export type WorkoutTourParam = 'run' | 'practice';

/**
 * The tour of the workout page (RUN-13), with the run's clock held while it's on, showing the
 * page as it looks mid-run:
 *
 * - **Once, on the first workout run on a device:** one with nothing in its history, so a
 *   device already in use doesn't get it, and only as it starts, not for a run picked up after
 *   a reload or opened from the run bar. The clock starts as the tour ends, however it ends.
 * - **From Help** (`?tour=run`), on the run going, any time: it carries on as it was, running
 *   or paused, as the tour ends.
 * - **On a practice run from Help** (`?tour=practice`): the run's stopped as the tour ends,
 *   having logged nothing, and it's back to Help, with focus on its button.
 *
 * Call it in the workout page's injection context.
 */
export function tourWorkoutPage() {
    const run = inject(ActiveRunService);
    const tour = inject(TourService);
    const history = inject(HistoryStore);
    const router = inject(Router);
    const route = inject(ActivatedRoute);
    const document = inject(DOCUMENT);
    // The app's, as the page has gone by the time focus moves to Help
    const appInjector = inject(EnvironmentInjector);
    let destroyed = false;
    /** The tour's on, and the run waits for it to end. */
    const waiting = signal<'first' | WorkoutTourParam | null>(null);

    effect(() => {
        const kind = waiting();
        if (kind && tour.stop() === null) {
            waiting.set(null);
            untracked(() => (kind === 'practice' ? endPractice() : release()));
        }
    });
    inject(DestroyRef).onDestroy(() => {
        destroyed = true;
        run.release();
    });

    /** The clock carries on, or the run stays paused, with focus on Resume then. */
    function release() {
        run.release();
        if (run.isPaused()) {
            afterNextRender(() => document.getElementById('workout-resume')?.focus(), {
                injector: appInjector,
            });
        }
    }

    async function endPractice() {
        // Off the page first, so it doesn't show "No workout selected" on its way out
        const left = await router.navigateByUrl('/help');
        run.stop();
        if (left) {
            afterNextRender(() => document.getElementById('help-tour-workout')?.focus(), {
                injector: appInjector,
            });
        }
    }

    const asked = route.snapshot.queryParamMap.get('tour');
    if (asked === 'run' || asked === 'practice') {
        // Off the address, so a reload or Back doesn't take it again
        void router.navigate([], {
            relativeTo: route,
            queryParams: { tour: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
        if (run.workout() && !run.summaryOpen() && tour.stop() === null) {
            run.hold();
            tour.start(asked === 'practice' ? 'workout-practice' : 'workout');
            waiting.set(asked);
        }
        return;
    }

    const justStarted = (run.elapsedMs() ?? Infinity) < JUST_STARTED_MS;
    if (!tour.due('workout') || !justStarted || run.isPaused() || run.isComplete()) {
        return;
    }
    // Held while the history loads, so the clock doesn't start only to stop again
    run.hold();
    void history.ready.then(() => {
        if (destroyed) {
            return;
        }
        if (history.entries().length === 0 && tour.due('workout')) {
            tour.start('workout');
            waiting.set('first');
        } else {
            run.release();
        }
    });
}
