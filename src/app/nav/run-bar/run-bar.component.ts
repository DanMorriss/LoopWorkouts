import {
    afterNextRender,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    Injector,
    untracked,
    viewChild,
} from '@angular/core';
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

/** The bar's one button: the one to press now, as the workout page's big button is. */
type ButtonMode = 'pause' | 'resume' | 'start' | 'done';
const BUTTONS: Record<ButtonMode, { label: string; icon: string }> = {
    pause: { label: 'Pause', icon: 'pause' },
    resume: { label: 'Resume', icon: 'play_arrow' },
    start: { label: 'Start', icon: 'play_arrow' },
    done: { label: 'Done', icon: 'check' },
};

/**
 * The workout in progress, in a bar above the tabs on every page but its own, like a music
 * app's mini player, read like a stopwatch: the step, with the workout's name under it, its
 * time (or reps) large at the right, and the one button to press now: Pause or Resume, Done
 * on a rep step, or Start on a timed exercise waiting for it. The rest of the bar opens the
 * workout. Once it's finished, the bar says so and opens its summary.
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
    private readonly injector = inject(Injector);
    protected readonly morph = inject(WorkoutMorph);

    protected readonly shown = computed(
        () => !!this.run.workout() && !isOnPage(this.url(), '/workout')
    );
    protected readonly isPaused = this.run.isPaused;
    /** A timed exercise after a long rest waiting for Start, which the bar's button presses. */
    protected readonly waiting = computed(() => this.run.waiting() && !this.isPaused());
    /** Over, and waiting on its summary. */
    protected readonly finished = this.run.summaryOpen;

    private readonly workoutTitle = computed(() => this.run.workout()?.title.trim() || 'Workout');
    /** Colours the dot: the step's kind, or paused, or finished. */
    protected readonly phase = computed(() => {
        if (this.finished()) {
            return 'finished';
        }
        return this.isPaused() ? 'paused' : (this.run.state()?.phase ?? 'work');
    });

    /** The first line: the step, or once it's finished, where to go. */
    protected readonly step = computed(() => {
        if (this.finished()) {
            return 'See how it went';
        }
        const step = this.run.state()?.step;
        return step ? step.name || stepKindName(step.kind) : '';
    });

    /** The second line: the workout's name, after what it's doing if it isn't running. */
    protected readonly context = computed(() => {
        const before = this.finished()
            ? this.run.isComplete()
                ? 'Finished · '
                : ''
            : this.isPaused()
              ? 'Paused · '
              : this.waiting()
                ? 'Ready · '
                : '';
        return `${before}${this.workoutTitle()}`;
    });

    /** At the right: the time left ("00:23"), or the reps ("20" and "reps"). */
    protected readonly amount = computed((): { value: string; unit: string } | null => {
        const state = this.run.state();
        const step = state?.step;
        if (this.finished() || !state || !step) {
            return null;
        }
        return step.kind === 'reps'
            ? { value: `${step.reps}`, unit: 'reps' }
            : { value: formatSeconds(state.remainingSeconds), unit: '' };
    });

    protected readonly button = computed(() => {
        const mode: ButtonMode = this.isPaused()
            ? 'resume'
            : this.waiting()
              ? 'start'
              : this.run.state()?.phase === 'reps'
                ? 'done'
                : 'pause';
        return BUTTONS[mode];
    });

    /**
     * What screen readers hear, off the workout page whose own announcements stop with it: a
     * step as it starts, Paused and Finished. Not the time, so it doesn't speak every second.
     */
    protected readonly announcement = computed(() => {
        if (this.finished()) {
            return this.run.isComplete() ? 'Finished' : '';
        }
        if (this.isPaused()) {
            return 'Paused';
        }
        const step = this.run.state()?.step;
        if (!step) {
            return '';
        }
        const reps = step.kind === 'reps' ? `, ${step.reps} reps` : '';
        const ready = this.waiting() ? ', waiting: press Start when you are ready' : '';
        return `${this.step()}${reps}${ready}`;
    });

    /** Pause or Resume, Done on a rep step, or Start on a timed exercise waiting for it. */
    protected pressButton() {
        if (this.waiting()) {
            this.run.startExercise();
        } else if (!this.isPaused() && this.run.state()?.phase === 'reps') {
            this.run.finishReps();
        } else {
            this.run.togglePause();
        }
    }

    private readonly openLink = viewChild<ElementRef<HTMLElement>>('open');
    private readonly actionButton = viewChild<ElementRef<HTMLElement>>('action');

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
        // The button goes as the workout finishes, so focus on it moves to the rest of the
        // bar, which opens the summary, rather than being lost. Run before the view is
        // updated, while the button is still there to have focus.
        effect(() => {
            if (!this.finished()) {
                return;
            }
            const button = untracked(this.actionButton)?.nativeElement;
            if (button && button === document.activeElement) {
                afterNextRender(() => untracked(this.openLink)?.nativeElement.focus(), {
                    injector: this.injector,
                });
            }
        });
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
