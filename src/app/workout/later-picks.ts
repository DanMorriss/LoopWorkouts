import { inject } from '@angular/core';
import { LaterStep, putAside, sameStep } from '../models/later';
import { canPutAside, moveAside, pickAllAt, pickAt, pickNext, unpick } from '../models/later-pick';
import { ActiveRunService } from '../shared/run/active-run.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/**
 * The workout page's presses for exercises skipped to do later (RUN-16): putting one aside on
 * Skip, and picking one to do next. Kept beside the page, rather than in ActiveRunService,
 * which is in every page's first download. Make it in an injection context.
 */
export class LaterPicks {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);

    /**
     * Skip (RUN-12), with an exercise skipped put aside, to do later if wanted. Returns whether
     * it was: one done later and skipped again goes back on the list too.
     */
    skip(): boolean {
        this.run.sync();
        const workout = this.run.running();
        const state = this.run.state();
        const aside = !!workout && !!state && canPutAside(workout, state);
        if (aside) {
            this.store.setActiveLater(putAside(this.store.activeLater(), state));
        }
        this.run.skipStep();
        return aside || !!state?.later;
    }

    /**
     * `step`, put aside, is done next: straight after the step on now, or after the one done
     * later that's on now. It runs from its full time, then the workout carries on where it
     * was. Returns whether it was picked.
     */
    doNext(step: LaterStep): boolean {
        this.run.sync();
        const state = this.run.state();
        const elapsedMs = this.run.elapsedMs();
        const later = this.store.activeLater();
        if (
            !state ||
            elapsedMs === null ||
            state.phase === 'complete' ||
            !later.aside.some((other) => sameStep(other, step))
        ) {
            return false;
        }
        this.store.setActiveLater(
            pickNext(later, step, state, {
                elapsedMs,
                repStepsDone: this.store.activeRepStepsDone(),
            })
        );
        this.run.sync();
        return true;
    }

    /**
     * At the finish, while the run asks about what's put aside (`ActiveRunService.askingFinish`):
     * `step` is done now, from its full time, then the workout finishes, or asks again about
     * any left. Returns whether it was picked.
     */
    doBeforeFinish(step: LaterStep): boolean {
        if (!this.store.activeLater().aside.some((other) => sameStep(other, step))) {
            return false;
        }
        const at = this.run.leaveFinish(true);
        if (!at) {
            return false;
        }
        this.store.setActiveLater(pickAt(this.store.activeLater(), step, at.atMs, at.repStepsDone));
        this.run.sync();
        return true;
    }

    /**
     * At the finish, as for doBeforeFinish(): every exercise put aside is done now, one after
     * another in the list's order, then the workout finishes. Returns whether they were picked.
     */
    doAllBeforeFinish(): boolean {
        const at = this.store.activeLater().aside.length > 0 && this.run.leaveFinish(true);
        if (!at) {
            return false;
        }
        this.store.setActiveLater(pickAllAt(this.store.activeLater(), at.atMs, at.repStepsDone));
        this.run.sync();
        return true;
    }

    /** The exercise put aside at `from` in the list moves to `to`, e.g. dragged there. */
    move(from: number, to: number) {
        this.store.setActiveLater(moveAside(this.store.activeLater(), from, to));
    }

    /** At the finish, the exercises put aside are left undone, and the workout finishes. */
    finish() {
        if (this.run.leaveFinish(false)) {
            this.store.setActiveLater({ ...this.store.activeLater(), aside: [] });
            this.run.sync();
        }
    }

    /** Undoes doNext(), unless the step has started: it's back on the list. */
    undoNext(step: LaterStep) {
        const state = this.run.state();
        if (state?.later && sameStep(state, step)) {
            return;
        }
        this.store.setActiveLater(unpick(this.store.activeLater(), step));
    }
}
