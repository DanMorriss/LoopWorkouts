import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { formatSeconds } from '../../shared/format-time';
import { project, rubberband, VelocityTracker } from '../../shared/gesture';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { criticallyDampedSpring } from '../../shared/spring';
import { injectCurrentUrl, isOnPage } from '../current-url';
import { WorkoutMorph } from '../workout-morph';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { stepKindName } from '../../models/workout';

/** px a finger moves before it's taken as a swipe or a scroll. */
const SLOP = 10;

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
    /** The finger being followed, from where it went down. */
    private start?: { id: number; x: number; y: number };
    /** Moved sideways past SLOP: the bar is following it. */
    private swiping = false;
    /** Where the bar was when the finger went down (px), caught mid-spring. */
    private startOffset = 0;
    /** Counts presses, so a swipe's spring knows if a new press caught the bar mid-way. */
    private presses = 0;
    /** The bar's move with the finger (px). */
    private offset = 0;
    private tracker = new VelocityTracker();
    /** A swipe just ended, so the click it would make on what it started on is dropped. */
    private swallowClick = false;

    constructor() {
        // On the way down, so it's dropped before the link or button it would land on hears it
        this.host.addEventListener('click', (event) => this.onClick(event), { capture: true });
    }

    protected onPointerDown(event: PointerEvent) {
        const bar = this.bar()?.nativeElement;
        if (!bar || event.pointerType === 'mouse' || !event.isPrimary || this.finished()) {
            return;
        }
        this.presses++;
        // Where it is on screen now, mid-spring included, and stop it there (End workout
        // behind with it)
        const offset = new DOMMatrix(getComputedStyle(bar).transform).m41;
        this.host.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
        this.moveTo(offset);
        this.start = { id: event.pointerId, x: event.clientX, y: event.clientY };
        this.swiping = false;
        this.startOffset = offset;
        this.tracker = new VelocityTracker();
        this.tracker.add(event.clientX, event.timeStamp);
    }

    protected onPointerMove(event: PointerEvent) {
        const start = this.start;
        const bar = this.bar()?.nativeElement;
        if (!start || !bar || event.pointerId !== start.id) {
            return;
        }
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!this.swiping) {
            if (Math.hypot(dx, dy) < SLOP) {
                return;
            }
            // Mostly rightwards is a swipe; anything else is the page's, so let it go (and a
            // bar caught on its way back into place carries on there)
            if (dx <= Math.abs(dy)) {
                this.start = undefined;
                void this.springTo(0, 0);
                return;
            }
            this.swiping = true;
            bar.setPointerCapture(event.pointerId);
        }
        const wasPast = this.isPast(this.offset);
        // Left of where it rests there's nothing, so it resists more the further it's pulled,
        // rather than stopping dead
        const pulled = this.startOffset + dx;
        this.moveTo(pulled < 0 ? rubberband(pulled, bar.offsetWidth || 1) : pulled);
        this.tracker.add(event.clientX, event.timeStamp);
        // A tick as it crosses the point where letting go would end the workout
        if (wasPast !== this.isPast(this.offset)) {
            navigator.vibrate?.(8);
        }
    }

    protected async onPointerUp(event: PointerEvent) {
        const bar = this.bar()?.nativeElement;
        if (!this.start || !bar || event.pointerId !== this.start.id) {
            return;
        }
        this.start = undefined;
        if (!this.swiping) {
            // A tap on a bar caught mid-spring: it carries on into place
            void this.springTo(0, 0);
            return;
        }
        this.swiping = false;
        this.swallowClick = true;
        // Cleared after the click this pointerup makes, if any, has gone by
        setTimeout(() => (this.swallowClick = false));
        const velocity = this.tracker.velocity(event.timeStamp);
        const press = this.presses;
        // Where a flick would carry it: past halfway over, the workout ends
        if (this.isPast(this.offset + project(velocity))) {
            await this.springTo(bar.offsetWidth, velocity);
            // Caught again on its way off: the new press has it now, so the workout goes on
            if (press !== this.presses) {
                return;
            }
            this.run.end();
            // Off to its summary; the bar is put back once it's gone with the page
            await this.router.navigateByUrl('/workout');
            this.moveTo(0);
        } else {
            await this.springTo(0, velocity);
        }
    }

    protected cancel() {
        this.start = undefined;
        this.swiping = false;
        void this.springTo(0, 0);
    }

    private onClick(event: MouseEvent) {
        if (this.swallowClick) {
            this.swallowClick = false;
            event.preventDefault();
            event.stopPropagation();
        }
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
