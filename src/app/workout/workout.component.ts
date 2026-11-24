import {
    afterNextRender,
    Component,
    DOCUMENT,
    effect,
    ElementRef,
    inject,
    Injector,
    untracked,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ExerciseDetailsDialogComponent } from '../shared/components/exercise-details-dialog/exercise-details-dialog.component';
import { SwapExerciseDialogComponent } from '../shared/components/swap-exercise-dialog/swap-exercise-dialog.component';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { ActiveRunService } from '../shared/run/active-run.service';
import { criticallyDampedSpring } from '../shared/spring';
import { fitName } from './fit-name';
import { WorkoutRolls } from './workout-rolls';
import { WorkoutFaceSlideComponent } from './workout-face-slide/workout-face-slide.component';
import { WorkoutNoteComponent } from './workout-note/workout-note.component';
import { WorkoutRingComponent } from './workout-ring/workout-ring.component';
import { WorkoutRoundLineComponent } from './workout-round-line/workout-round-line.component';
import { WorkoutSummaryComponent } from './workout-summary/workout-summary.component';
import { SummaryExits } from './summary-exits';
import { LastSetDialogComponent } from './last-set-dialog/last-set-dialog.component';
import { WorkoutSwap } from './workout-swap';
import { SoundPromptComponent } from './sound-prompt/sound-prompt.component';
import { UpNextCardComponent } from './up-next-card/up-next-card.component';
import { WorkoutControlsComponent } from './workout-controls/workout-controls.component';
import { FinishLaterDialogComponent } from './finish-later-dialog/finish-later-dialog.component';
import { LaterPicks } from './later-picks';
import { tourWorkoutPage } from './workout-tour';
import { WorkoutView } from './workout-view';
import { Exercise } from '../models/exercise';

/** What opened an exercise's details: its name on the face, or paused, or the Up next card. */
type DetailsFrom = 'face' | 'paused' | 'card';

// Space on one of these already does something, e.g. presses the focused button
const SPACE_HANDLED_BY =
    'button, a, input, textarea, select, [contenteditable], [role="button"], [role="spinbutton"]';

/**
 * Shows the workout in progress and takes the user's presses. The run itself (its clock,
 * alarms and history) lives in ActiveRunService, so it carries on on any page of the app;
 * what's shown of it is worked out in WorkoutView.
 */
@Component({
    selector: 'app-workout',
    imports: [
        RouterLink,
        MatIconModule,
        SoundPromptComponent,
        WorkoutSummaryComponent,
        LastSetDialogComponent,
        ExerciseDetailsDialogComponent,
        WorkoutFaceSlideComponent,
        WorkoutNoteComponent,
        WorkoutRingComponent,
        WorkoutRoundLineComponent,
        SwapExerciseDialogComponent,
        UpNextCardComponent,
        WorkoutControlsComponent,
        FinishLaterDialogComponent,
    ],
    providers: [WorkoutView],
    templateUrl: './workout.component.html',
    styleUrls: [
        './workout.component.scss',
        './workout-motion.scss',
        './workout-steps.scss',
        './workout-type.scss',
    ],
    host: {
        '(document:keydown.space)': 'onSpace($event)',
        '(document:keyup.space)': 'spaceLetGo()',
        '(document:keydown.escape)': 'onEscape($event)',
        // A phone turned round gives the face a new width to fit the name to
        '(window:resize)': 'fitName(view.stepKey())',
    },
})
export class WorkoutComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    protected readonly run = inject(ActiveRunService);
    protected readonly view = inject(WorkoutView);
    protected readonly swap = new WorkoutSwap(() => this.focusInfo());
    /** How the face's text and the round line roll between steps. */
    protected readonly rolls = new WorkoutRolls();
    /** Skip puts an exercise aside to do later (RUN-16). */
    private readonly later = new LaterPicks();

    private readonly controls = viewChild(WorkoutControlsComponent);
    private readonly mainButton = () => this.controls()?.mainButton();
    private readonly upNextCard = viewChild(UpNextCardComponent);
    /** On a rep step, the big button is Done (until 2026-11-24 it was the Up next card). */
    private doneButton() {
        return this.view.isRepsActive() && !this.view.isPaused() ? this.mainButton() : undefined;
    }
    /** The Up next card, which an exercise picked to do later flies down to (RUN-16). */
    private readonly upNextHost = viewChild(UpNextCardComponent, { read: ElementRef });
    protected readonly nextCard = (): HTMLElement | undefined =>
        this.upNextHost()?.nativeElement.querySelector('.up-next') ?? undefined;
    private readonly resumeButton = viewChild<ElementRef<HTMLButtonElement>>('resumeButton');
    /** Where the summary's buttons go, and focus with them. */
    protected readonly exits = new SummaryExits({
        resume: () => this.resumeButton()?.nativeElement,
        main: () => this.mainButton()?.nativeElement,
    });
    private readonly ring = viewChild(WorkoutRingComponent);
    private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
    private readonly laterList = () => this.controls()?.laterList();
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** Apple's spring for moving something about: no bounce, a 0.4s response. */
    private readonly glide = criticallyDampedSpring(0.4);

    constructor() {
        tourWorkoutPage();

        // A rep step has come round: Done swells once, as it's the user's move now
        effect(() => {
            if (this.view.currentSet() === null || untracked(this.reducedMotion)) {
                return;
            }
            afterNextRender(
                () =>
                    this.doneButton()?.nativeElement.animate(
                        [
                            { transform: 'none' },
                            { transform: 'scale(1.15)' },
                            { transform: 'none' },
                        ],
                        { duration: 600, easing: 'ease-in-out' }
                    ),
                { injector: this.injector }
            );
        });

        // Each new step's name is fitted to the face once it's there
        effect(() => {
            const key = this.view.stepKey();
            afterNextRender(() => this.fitName(key), { injector: this.injector });
        });

        // The display face may arrive after the first fitting, and its letters are wider
        inject(DOCUMENT).fonts?.ready.then(() => this.fitName(this.view.stepKey()));
    }

    /** The name of step `key` on the face, if it has one. */
    private faceLabel(key: string): HTMLElement | null {
        return this.host.nativeElement.querySelector<HTMLElement>(
            `.workout-face [data-step="${key}"] .workout-face__label`
        );
    }

    /** Fits step `key`'s name to the face: see fitName(). */
    protected fitName(key: string) {
        const label = this.faceLabel(key);
        if (label) {
            fitName(label);
        }
    }

    /**
     * Pausing swaps the controls for Resume and End workout over the ring, and resuming swaps
     * them back, so the button just pressed is gone: focus moves to the one that took its
     * place, and that one glides there from where the pressed one was.
     */
    togglePause() {
        // Where it is on screen now, mid-glide included, so a press mid-glide turns it round
        const pressed = (this.view.isPaused() ? this.resumeButton() : this.mainButton())
            ?.nativeElement;
        const from = pressed?.getBoundingClientRect();
        this.run.togglePause();
        afterNextRender(
            () => {
                const arrived = (this.view.isPaused() ? this.resumeButton() : this.mainButton())
                    ?.nativeElement;
                arrived?.focus();
                if (from && arrived) {
                    this.glideFrom(arrived, from);
                }
            },
            { injector: this.injector }
        );
    }

    /**
     * Moves a button that has just appeared from where `from` was to its own place: Pause
     * carries on up into the ring as Resume, and Resume back down as Pause, along the same
     * path. A spring rather than a set curve, and the button is real throughout, so it can be
     * pressed while it moves. With reduced motion it's just there.
     */
    private glideFrom(button: HTMLElement, from: DOMRect) {
        if (this.reducedMotion()) {
            return;
        }
        const to = button.getBoundingClientRect();
        const x = from.left + from.width / 2 - (to.left + to.width / 2);
        const y = from.top + from.height / 2 - (to.top + to.height / 2);
        const scale = to.width ? from.width / to.width : 1;
        button.animate(
            [{ transform: `translate(${x}px, ${y}px) scale(${scale})` }, { transform: 'none' }],
            { duration: this.glide.duration, easing: this.glide.easing }
        );
    }

    /**
     * Escape resumes, as it would close a menu or dialog; not when it's closing a dialog over
     * the workout, e.g. the exercise's details opened while paused, which has already gone by
     * the time it gets here.
     */
    onEscape(event: Event) {
        const target = event.target as Element | null;
        if (
            !target?.closest?.('[role="dialog"]') &&
            this.view.isPaused() &&
            !this.view.isComplete() &&
            !this.view.summaryOpen() &&
            !this.swap.exerciseInDetails() &&
            !this.swap.swapping()
        ) {
            this.togglePause();
        }
    }

    /**
     * Done on a rep step: on to the next step, from its full time. Done stays put for another
     * rep step; otherwise it's gone, so focus moves to Pause rather than being lost.
     *
     * The ring shows the set finished in the same task as the press, so in the same frame as
     * the next step's beep and vibration, which the run books as it moves on.
     */
    finishReps() {
        const hadFocus = this.doneButton()?.nativeElement === document.activeElement;
        if (this.view.isRepsActive() && !this.reducedMotion()) {
            this.ring()?.finish();
        }
        this.run.finishReps();
        if (hadFocus) {
            afterNextRender(
                () => {
                    if (!this.doneButton()) {
                        this.mainButton()?.nativeElement.focus();
                    }
                },
                { injector: this.injector }
            );
        }
    }

    /**
     * Skip: on to the next step, from its full time (RUN-12). A skipped rep step isn't logged,
     * so unlike Done, its ring doesn't fill. An exercise skipped flies up from the ring to the
     * button for doing it later (RUN-16).
     */
    protected skip() {
        if (this.later.skip()) {
            this.laterList()?.flyIn(this.stage()?.nativeElement);
        }
    }

    /**
     * Whether the Space being held down paused, resumed or pressed Done: its repeats are then
     * swallowed till it's let go, even on the button focus moved to (Resume), which would
     * otherwise be pressed as it's let go.
     */
    private spaceHeld = false;

    /**
     * Space let go. A method, not `spaceHeld = false` in the binding: a handler that comes to
     * false stops the key's default, which is how a focused button is pressed by Space.
     */
    protected spaceLetGo() {
        this.spaceHeld = false;
    }

    /**
     * Space pauses and resumes, like most media players, presses Done on a rep step, or Start
     * on a timed exercise waiting for it.
     */
    onSpace(event: Event) {
        if ((event as KeyboardEvent).repeat && this.spaceHeld) {
            event.preventDefault();
            return;
        }
        const target = event.target as Element | null;
        if (
            !this.view.workout() ||
            this.view.summaryOpen() ||
            this.swap.exerciseInDetails() ||
            this.swap.swapping() ||
            this.view.isComplete() ||
            (event as KeyboardEvent).repeat ||
            target?.closest?.(SPACE_HANDLED_BY)
        ) {
            return;
        }
        // Otherwise Space would also scroll the page
        event.preventDefault();
        this.spaceHeld = true;
        if (this.view.isRepsActive()) {
            this.finishReps();
        } else if (this.view.isWaiting()) {
            this.run.startExercise();
        } else {
            this.togglePause();
        }
    }

    /** The big button: Start on a timed exercise waiting for it, Done on a rep step, otherwise Pause. */
    protected pressMain() {
        if (this.view.isWaiting()) {
            this.run.startExercise();
        } else if (this.view.isRepsActive()) {
            this.finishReps();
        } else {
            this.togglePause();
        }
    }

    /** Where the open details were opened from, for focus to go back there as they close. */
    private detailsFrom: DetailsFrom = 'face';

    /**
     * An exercise's details over the workout (RUN-9): from its name on the face or while
     * paused, or, for the next step's, from the Up next card's (i).
     */
    protected openDetails(exercise: Exercise, next: boolean, from: DetailsFrom) {
        this.detailsFrom = from;
        this.swap.showExercise(exercise, next);
    }

    /**
     * Focus back on what opened the details: the exercise's name, on the face or, while
     * paused, over it, or the Up next card. If the workout has moved on meanwhile, so that's
     * gone, on Done or Pause (or Resume), so it isn't lost.
     */
    private focusInfo() {
        afterNextRender(
            () => {
                const name = this.view.isPaused()
                    ? '.workout-paused__link'
                    : `.workout-face [data-step="${this.view.stepKey()}"] .workout-face__link`;
                const opener =
                    this.detailsFrom === 'card'
                        ? this.upNextCard()?.button()?.nativeElement
                        : this.host.nativeElement.querySelector<HTMLElement>(name);
                (
                    opener ??
                    (this.view.isPaused() ? this.resumeButton() : undefined)?.nativeElement ??
                    this.doneButton()?.nativeElement ??
                    this.mainButton()?.nativeElement
                )?.focus();
            },
            { injector: this.injector }
        );
    }

    /** The last exercise put aside was picked to do next, so its button's gone: on to Done or Pause. */
    protected focusControls() {
        (
            this.doneButton() ?? (this.view.isPaused() ? this.resumeButton() : this.mainButton())
        )?.nativeElement.focus();
    }

    /** An exercise put aside was picked at the finish, and runs now: focus on its controls. */
    protected pickedAtFinish() {
        afterNextRender(() => this.focusControls(), { injector: this.injector });
    }

    /** End workout: the summary opens over the run, which waits, paused, in case of Back. */
    end() {
        this.run.end();
    }
}
