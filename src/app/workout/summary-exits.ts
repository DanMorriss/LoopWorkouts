import { afterNextRender, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Workout } from '../models/workout';
import { ActiveRunService } from '../shared/run/active-run.service';
import { editUrl } from '../shared/state/make-copy.service';

/** The workout page's buttons that focus goes to as the summary closes onto the page. */
export interface SummaryExitFocus {
    /** Resume, on the paused run. */
    resume: () => HTMLElement | undefined;
    /** Pause, or Done on a rep step, on a run going. */
    main: () => HTMLElement | undefined;
}

/**
 * Where the workout summary's buttons go: back to the run, on to the stretches for it, or,
 * the run over, on to another page. Made in an injection context, by the workout page.
 */
export class SummaryExits {
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);

    constructor(private readonly focus: SummaryExitFocus) {}

    /** Back from the summary to the paused run, with focus on Resume. */
    backToWorkout() {
        this.run.back();
        this.focusAfterRender(this.focus.resume);
    }

    /**
     * Start stretches: this run is over, and the stretches start in its place, with focus on
     * Pause.
     */
    startStretches(routine: Workout) {
        this.run.stop();
        this.run.start(routine);
        this.focusAfterRender(this.focus.main);
    }

    /** A copy made of the ready-made workout just run: the summary closes, and it opens in Create. */
    async openCopy(copy: Workout) {
        this.run.stop();
        await this.router.navigateByUrl(editUrl(copy));
    }

    /** The run is over, on to the Body weight box on You → Profile. */
    async addWeight() {
        this.run.stop();
        await this.router.navigate(['/account'], { queryParams: { focus: 'body-weight' } });
    }

    /** Done: the run is over, on to it in the history (highlighted if logged). */
    async closeSummary() {
        const run = this.run.runId();
        this.run.stop();
        await this.router.navigate(['/history'], run ? { queryParams: { run } } : {});
    }

    private focusAfterRender(target: () => HTMLElement | undefined) {
        afterNextRender(() => target()?.focus(), { injector: this.injector });
    }
}
