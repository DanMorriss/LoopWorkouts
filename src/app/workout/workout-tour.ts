import { DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { ActiveRunService } from '../shared/run/active-run.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { TourService } from '../tour/tour.service';

/** A run opened within this long of its start counts as just started, from a Start button. */
const JUST_STARTED_MS = 3000;

/**
 * The tour of the workout page (RUN-13), once, on the first workout run on a device: one with
 * nothing in its history, so a device already in use doesn't get it. The run's clock is held
 * while it's on, showing the page as it looks mid-run, and starts as the tour ends, however
 * it ends. Not for a run picked up after a reload or opened from the run bar. Call it in the
 * workout page's injection context.
 */
export function tourFirstWorkout() {
    const run = inject(ActiveRunService);
    const tour = inject(TourService);
    const history = inject(HistoryStore);
    let destroyed = false;
    /** The tour's on, and the clock waits for it to end. */
    const waiting = signal(false);

    effect(() => {
        if (waiting() && tour.stop() === null) {
            waiting.set(false);
            untracked(() => run.release());
        }
    });
    inject(DestroyRef).onDestroy(() => {
        destroyed = true;
        run.release();
    });

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
            waiting.set(true);
        } else {
            run.release();
        }
    });
}
