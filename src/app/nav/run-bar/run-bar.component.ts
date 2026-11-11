import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { formatSeconds } from '../../shared/format-time';
import { SideSwipe } from '../../shared/side-swipe';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { criticallyDampedSpring } from '../../shared/spring';
import { injectCurrentUrl, isOnPage } from '../../shared/navigation/current-url';
import { WorkoutMorph } from '../workout-morph';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { stepKindName } from '../../models/workout';

/**
 * The workout in progress, in a bar above the tabs on every page but its own, like a music
 * app's mini player: its name, the step and its time, and Pause or Resume. The rest of the
 * bar opens the workout. Once it's finished, the bar says so and opens its summary.
 *
 * Swiping the bar right ends the workout, as End workout does: "End workout" shows behind it
 * as it follows the finger, and let go past halfway (or flicked) it slides off and the
 * workout's summary opens, where Back to workout takes it up again. Touch and pen only, as
 * with swiping back; with a mouse, End workout is on the paused workout page.
 */
@Component({
    selector: 'app-run-bar',
    imports: [IconComponent],
    templateUrl: './run-bar.component.html',
    styleUrl: './run-bar.component.scss',
})
export class RunBarComponent {
    private readonly run = inject(ActiveRunService);
    private readonly url = injectCurrentUrl();
    protected readonly morph = inject(WorkoutMorph);

    protected readonly shown = computed(
        () => !!this.run.workout() && !isOnPage(this.url(), '/workout')
    );
    protected readonly isPaused = this.run.isPaused;
    /** Over, and waiting on its summary. */
    protected readonly finished = this.run.summaryOpen;

    protected readonly title = computed(() => this.run.workout()?.title.trim() || 'Workout');
    /** Colours the dot: the step's kind, or paused, or finished. */
    protected readonly phase = computed(() => {
        if (this.finished()) {
            return 'finished';
        }
        return this.isPaused() ? 'paused' : (this.run.state()?.phase ?? 'work');
    });
    /** e.g. "Squats · 00:23", "Push-ups · 20 reps", "Paused · Rest · 00:12". */
    protected readonly status = computed(() => {
        if (this.finished()) {
            return this.run.isComplete() ? 'Finished: see how it went' : 'See how it went';
        }
        const state = this.run.state();
        const step = state?.step;
        if (!state || !step) {
            return '';
        }
        const name = step.name || stepKindName(step.kind);
        const amount =
            step.kind === 'reps' ? `${step.reps} reps` : formatSeconds(state.remainingSeconds);
        return `${this.isPaused() ? 'Paused · ' : ''}${name} · ${amount}`;
    });

    protected togglePause() {
        this.run.togglePause();
    }

    // Swiping right to end the workout

    private readonly router = inject(Router);
    private readonly reducedMotion = injectPrefersReducedMotion();
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');
    /** The bar's move with the finger (px). */
    private offset = 0;
    protected readonly swipe = new SideSwipe({
        element: () => this.bar()?.nativeElement,
        canStart: () => !this.finished(),
        // Where it is on screen now, mid-spring included, and stop it there (End workout
        // behind with it)
        caughtAt: (bar) => {
            const offset = new DOMMatrix(getComputedStyle(bar).transform).m41;
            this.host.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
            return offset;
        },
        moveTo: (offset) => {
            const wasPast = this.isPast(this.offset);
            this.moveTo(offset);
            // A tick as it crosses the point where letting go would end the workout
            if (wasPast !== this.isPast(offset)) {
                navigator.vibrate?.(8);
            }
        },
        released: (velocity, past) => void this.released(velocity, past),
        settle: () => void this.springTo(0, 0),
    });

    constructor() {
        // On the way down, so it's dropped before the link or button it would land on hears it
        this.host.addEventListener('click', (event) => this.swipe.swallowed(event), {
            capture: true,
        });
    }

    /** Let go: past halfway (or flicked), the workout ends; otherwise the bar goes back. */
    private async released(velocity: number, past: boolean) {
        const bar = this.bar()?.nativeElement;
        if (!bar) {
            return;
        }
        if (!past) {
            await this.springTo(0, velocity);
            return;
        }
        const press = this.swipe.presses;
        await this.springTo(bar.offsetWidth, velocity);
        // Caught again on its way off: the new press has it now, so the workout goes on
        if (press !== this.swipe.presses) {
            return;
        }
        this.run.end();
        // Off to its summary; the bar is put back once it's gone with the page
        await this.router.navigateByUrl('/workout');
        this.moveTo(0);
    }

    /** Over far enough that letting go there would end the workout: past halfway. */
    private isPast(offset: number): boolean {
        return offset > (this.bar()?.nativeElement.offsetWidth ?? 0) / 2;
    }

    /** Slides the bar `offset` px right, showing as much of End workout behind as it leaves. */
    private moveTo(offset: number) {
        this.offset = offset;
        const bar = this.bar()?.nativeElement;
        if (bar) {
            bar.style.transform = offset ? `translateX(${offset}px)` : '';
        }
        this.host.style.setProperty('--reveal', `${offset}px`);
        this.host.classList.toggle('run-bar--past-end', this.isPast(offset));
    }

    /**
     * Springs the bar to `to` px right, carrying on at the finger's `velocity` (px/s), so
     * there's no seam where the swipe lets go. With reduced motion it's just there.
     */
    private async springTo(to: number, velocity: number) {
        const bar = this.bar()?.nativeElement;
        const from = this.offset;
        this.moveTo(to);
        if (!bar || Math.abs(to - from) < 1 || this.reducedMotion()) {
            return;
        }
        // The spring wants speed as a share of the distance left per second
        const timing = criticallyDampedSpring(0.3, { velocity: velocity / (to - from) });
        // End workout behind shows as much as the bar leaves, all the way along
        this.host
            .querySelector('.run-bar__end')
            ?.animate([{ clipPath: revealClip(from) }, { clipPath: revealClip(to) }], timing);
        await bar
            .animate(
                [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
                timing
            )
            .finished.catch(() => undefined);
    }
}

/** The part of End workout behind that a bar slid `offset` px right leaves showing. */
function revealClip(offset: number): string {
    return `inset(0 calc(100% - ${Math.max(0, offset)}px) 0 0 round 999px)`;
}
