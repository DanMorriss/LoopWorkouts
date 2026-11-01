import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    Component,
    computed,
    ElementRef,
    inject,
    linkedSignal,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { MAX_NOTE_LENGTH } from '../../models/history';
import {
    exerciseBests,
    isMostRounds,
    roundsScore,
    sessionsByExercise,
} from '../../models/progress';
import { musclesInSets } from '../../models/workout-muscles';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { WheelPickerComponent } from '../../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import {
    describeRounds,
    describeScore,
    entryName,
    formatDuration,
} from '../../history/history-format';
import { SuggestedWorkoutComponent } from '../../history/suggested-workout/suggested-workout.component';
import { bestLines } from '../../exercises/progress-format';
import { project, rubberband, VelocityTracker } from '../../shared/gesture';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { spring } from '../../shared/spring';
import {
    ownExerciseName,
    REP_OPTIONS,
    SummarySetsComponent,
} from './summary-sets/summary-sets.component';
import { SummaryStepUpsComponent } from './summary-step-ups/summary-step-ups.component';
import { SummarySwapsComponent } from './summary-swaps/summary-swaps.component';

/** px/s: let go faster than this, the sheet was thrown rather than set down. */
const THROWN = 300;

/** px a finger moves on the content before it's taken as a drag or a scroll. */
const TOUCH_SLOP = 8;

/** The touch with this id among those that changed, if it's one of them. */
function touchById(event: TouchEvent, id: number | undefined): Touch | undefined {
    return id === undefined
        ? undefined
        : Array.from(event.changedTouches).find((touch) => touch.identifier === id);
}

/**
 * Whether something between `target` and `container` is scrolled down, e.g. a wheel picker:
 * a finger moving down there scrolls that back, rather than dragging the sheet.
 */
function scrolledWithin(target: Element, container: Element): boolean {
    for (let el: Element | null = target; el && el !== container; el = el.parentElement) {
        if (el.scrollTop > 0) {
            return true;
        }
    }
    return false;
}

/**
 * How the workout went, once it's finished or ended with End workout: the time, rounds and
 * sets, which can be corrected, what to step up next time, the muscles worked, a note, and
 * the suggested next workout. A workout ended early (or one that runs until stopped) can be
 * taken up again with Back to workout; the run waits, paused, until then. Focus starts on
 * the heading and is trapped inside while it's open.
 */
@Component({
    selector: 'app-workout-summary',
    imports: [
        BodyMapComponent,
        CdkTrapFocus,
        FormField,
        MatIconModule,
        SuggestedWorkoutComponent,
        SummarySetsComponent,
        SummaryStepUpsComponent,
        SummarySwapsComponent,
        WheelPickerComponent,
    ],
    templateUrl: './workout-summary.component.html',
    styleUrl: './workout-summary.component.scss',
    host: { '[class.summary--dragged-away]': 'draggedAway()' },
})
export class WorkoutSummaryComponent {
    private readonly run = inject(ActiveRunService);
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);

    /** Back to workout: the run carries on from where it was ended. */
    readonly back = output<void>();
    /** Done: the run is over, on to it in the history. */
    readonly done = output<void>();

    protected readonly finished = this.run.isComplete;
    protected readonly heading = computed(() => {
        if (!this.finished()) {
            return 'Workout ended';
        }
        return this.run.workout()?.timeLimitSeconds === undefined
            ? 'Workout finished'
            : "Time's up";
    });
    /** The rep step time ran out on, to log how much of it was done; null otherwise. */
    protected readonly lastSet = computed(() => {
        const last = this.run.unloggedLastSet();
        if (!last) {
            return null;
        }
        const { exerciseId, name } = last.step;
        const current = exerciseId === undefined ? undefined : this.exerciseName(exerciseId);
        return { name: current || name.trim() || 'the reps', reps: last.step.reps };
    });
    /** Starts at the step's reps, as most of a set is likely done by then. */
    protected readonly lastSetReps = linkedSignal(() => this.lastSet()?.reps ?? 1);
    /** This run in the history; missing when it ended before its first step was done. */
    protected readonly entry = computed(() => {
        const id = this.run.runId();
        return this.history.entries().find((entry) => entry.id === id);
    });
    protected readonly title = computed(() => {
        const entry = this.entry();
        return entry ? entryName(entry) : (this.run.workout()?.title.trim() ?? '');
    });
    protected readonly duration = computed(() => formatDuration(this.entry()?.activeSeconds ?? 0));
    protected readonly rounds = computed(() => {
        const entry = this.entry();
        return entry ? describeRounds(entry) : '';
    });

    protected readonly weightUnit = this.settings.weightUnit;
    private readonly exerciseName = ownExerciseName(this.exercises);
    /**
     * The bests this run set (PRG-2), e.g. "Heaviest: 80 kg × 5", and "Most rounds" for a
     * time limit (PRG-7). Equalling a best isn't one, and nor is doing it for the first time.
     */
    protected readonly personalBests = computed(() => {
        const entry = this.entry();
        if (!entry) {
            return [];
        }
        const before = sessionsByExercise(
            this.history.entries().filter((other) => other.id !== entry.id)
        );
        const lines: string[] = [];
        const score = roundsScore(entry);
        if (score && isMostRounds(entry, this.history.entries())) {
            lines.push(`Most rounds: ${describeScore(score)}`);
        }
        for (const [exerciseId, [session]] of sessionsByExercise([entry])) {
            const earlier = before.get(exerciseId);
            if (!earlier) {
                continue;
            }
            // Newest first, as the history is, so on a tie the earlier best stands
            const bests = exerciseBests([session, ...earlier]);
            for (const line of bestLines(bests, this.weightUnit())) {
                if (line.entryId === entry.id) {
                    lines.push(`${line.label}: ${line.text}`);
                }
            }
        }
        return lines;
    });

    /** The muscles this workout's sets worked, main and supporting, for the body map. */
    protected readonly muscles = computed(() =>
        musclesInSets(this.run.sets(), (id) => this.exercises.byId(id))
    );

    protected logLastSet() {
        this.run.logLastSet(this.lastSetReps());
    }

    protected readonly repOptions = REP_OPTIONS;

    // The note box starts from the saved note
    private readonly noteModel = linkedSignal(() => ({ note: this.entry()?.note ?? '' }));
    protected readonly noteForm = form(this.noteModel, (note) =>
        maxLength(note.note, MAX_NOTE_LENGTH)
    );

    /** Saves the note as it is, e.g. on leaving the box or the summary. */
    protected saveNote() {
        const id = this.entry()?.id;
        const note = this.noteModel().note;
        if (id && !this.noteForm().invalid() && note.trim() !== (this.entry()?.note ?? '')) {
            this.history.setNote(id, note);
        }
    }

    protected leave(to: 'back' | 'done') {
        this.saveNote();
        this[to].emit();
    }

    /** Escape goes back to the workout, where there's one to go back to. */
    protected onEscape(event: Event) {
        event.stopPropagation();
        if (!this.finished()) {
            this.leave('back');
        }
    }

    // Dragging the sheet down by its grabber, on a phone, to go back to the workout. It follows
    // the finger 1:1 from where it was grabbed, resists being pulled up (rubber-banding), and
    // on letting go the flick decides: projected past halfway, it carries on down at the
    // finger's speed and goes back; otherwise it springs home, also from the finger's speed.
    // It can be grabbed again mid-spring, from wherever it is.

    private readonly sheet = viewChild.required<ElementRef<HTMLElement>>('sheet');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** Gone by dragging, so it doesn't play its closing animation on top. */
    protected readonly draggedAway = signal(false);
    private dragging: {
        /** The pointer's id, or the touch's if it's dragged by the content (`byTouch`). */
        pointerId: number;
        byTouch: boolean;
        startY: number;
        startOffset: number;
        offset: number;
        tracker: VelocityTracker;
    } | null = null;
    /** Counts grabs, so a spring knows if a new grab caught the sheet mid-way. */
    private grabs = 0;
    /** The sheet's content is scrolled to the top, so its heading can drag it too. */
    private readonly atTop = signal(true);
    /** On a phone, the sheet's heading and title drag it while it's scrolled to the top. */
    protected readonly headDraggable = computed(() => !this.finished() && this.atTop());

    protected onBodyScroll(event: Event) {
        this.atTop.set((event.target as HTMLElement).scrollTop <= 0);
    }

    /** A press on the heading or title: a grab, where the grabber would take one. */
    protected grabByHead(event: PointerEvent) {
        // Only where the styles hand the finger to the sheet (on a phone: a card on a wider
        // screen isn't dragged, as it has no grabber), so the breakpoint lives in one place
        const head = event.currentTarget as Element;
        if (this.headDraggable() && getComputedStyle(head).touchAction === 'none') {
            this.grab(event);
        }
    }

    protected grab(event: PointerEvent) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
        this.startDrag(event.pointerId, event.clientY, event.timeStamp);
    }

    protected drag(event: PointerEvent) {
        if (!this.dragging?.byTouch) {
            this.moveDrag(event.pointerId, event.clientY, event.timeStamp);
        }
    }

    protected letGo(event: PointerEvent) {
        if (!this.dragging?.byTouch) {
            this.endDrag(event.pointerId, event.timeStamp);
        }
    }

    // Anywhere in the content drags the sheet too while it's scrolled to the top, as an iOS
    // sheet does. Which way a finger goes isn't known until it moves, so the content can't
    // hand it over with touch-action (and Safari has no pan-down): its first move decides.
    // Down, and the sheet takes it, stopping the scroll; any other way, and the content
    // scrolls. Touch only, as the sheet only drags on a phone.

    /** A touch on the content that hasn't moved far enough yet to tell a drag from a scroll. */
    private touch: { id: number; x: number; y: number } | null = null;
    private readonly grabber = viewChild<ElementRef<HTMLElement>>('grabber');

    protected onBodyTouchStart(event: TouchEvent) {
        const finger = event.changedTouches[0];
        // Not a second finger, or one on the heading or title, which drag the sheet themselves
        this.touch =
            event.touches.length === 1 && !this.dragging
                ? { id: finger.identifier, x: finger.clientX, y: finger.clientY }
                : null;
    }

    protected onBodyTouchMove(event: TouchEvent) {
        const finger = touchById(event, this.touchDragId() ?? this.touch?.id);
        if (!finger) {
            return;
        }
        if (this.touchDragId() !== undefined) {
            event.preventDefault();
            this.moveDrag(finger.identifier, finger.clientY, event.timeStamp);
            return;
        }
        const touch = this.touch!;
        const dx = finger.clientX - touch.x;
        const dy = finger.clientY - touch.y;
        if (Math.hypot(dx, dy) < TOUCH_SLOP) {
            return;
        }
        this.touch = null;
        const body = event.currentTarget as HTMLElement;
        if (
            dy > Math.abs(dx) &&
            event.cancelable &&
            this.sheetDrags() &&
            body.scrollTop <= 0 &&
            !scrolledWithin(event.target as Element, body)
        ) {
            event.preventDefault();
            // From where the finger went down, so the sheet catches up with it
            this.startDrag(finger.identifier, touch.y, event.timeStamp, true);
            this.moveDrag(finger.identifier, finger.clientY, event.timeStamp);
        }
    }

    protected onBodyTouchEnd(event: TouchEvent) {
        this.touch = null;
        const finger = touchById(event, this.touchDragId());
        if (finger) {
            // No click on whatever the drag started on
            event.preventDefault();
            this.endDrag(finger.identifier, event.timeStamp);
        }
    }

    /** The touch dragging the sheet, if it's dragged by the content. */
    private touchDragId(): number | undefined {
        return this.dragging?.byTouch ? this.dragging.pointerId : undefined;
    }

    /** Whether the sheet drags here: on a phone, where it has a grabber. */
    private sheetDrags(): boolean {
        const grabber = this.grabber()?.nativeElement;
        return !!grabber && getComputedStyle(grabber).display !== 'none';
    }

    private startDrag(id: number, y: number, time: number, byTouch = false) {
        this.grabs++;
        const sheet = this.sheet().nativeElement;
        // Where it is on screen now, mid-spring included, and stop it there
        const offset = new DOMMatrix(getComputedStyle(sheet).transform).m42;
        this.host.nativeElement
            .getAnimations({ subtree: true })
            .forEach((animation) => animation.cancel());
        this.moveTo(offset);
        const tracker = new VelocityTracker();
        tracker.add(offset, time);
        this.dragging = { pointerId: id, byTouch, startY: y, startOffset: offset, offset, tracker };
    }

    private moveDrag(id: number, y: number, time: number) {
        const dragging = this.dragging;
        if (!dragging || id !== dragging.pointerId) {
            return;
        }
        const pulled = dragging.startOffset + y - dragging.startY;
        // Down follows the finger; up, past where it sits, resists more the further it goes
        const offset = pulled < 0 ? rubberband(pulled, this.height()) : pulled;
        dragging.offset = offset;
        dragging.tracker.add(offset, time);
        this.moveTo(offset);
    }

    private async endDrag(id: number, time: number) {
        const dragging = this.dragging;
        if (!dragging || id !== dragging.pointerId) {
            return;
        }
        this.dragging = null;
        const velocity = dragging.tracker.velocity(time);
        const height = this.height();
        // Where the flick would come to rest decides, not where the finger let go
        const away = dragging.offset + project(velocity) > height / 2;
        const grab = this.grabs;
        // Flicked back up, it settles home with a little bounce, as something thrown does
        const thrown = !away && velocity < -THROWN;
        await this.springTo(away ? height : 0, dragging.offset, velocity, thrown ? 0.8 : 1);
        // Caught again on its way down: it follows the finger instead of going
        if (away && grab === this.grabs) {
            this.draggedAway.set(true);
            this.leave('back');
        }
    }

    private height(): number {
        return this.sheet().nativeElement.offsetHeight || window.innerHeight;
    }

    /** Puts the sheet `offset` px down, and fades the dimming behind to match. */
    private moveTo(offset: number) {
        this.sheet().nativeElement.style.transform = `translateY(${offset}px)`;
        this.host.nativeElement.style.setProperty('--dim', String(this.dim(offset)));
    }

    /** How dimmed the page behind is with the sheet `offset` px down: fully at the top, not at all off the bottom. */
    private dim(offset: number): number {
        return 1 - Math.min(1, Math.max(0, offset / this.height()));
    }

    /**
     * Springs the sheet from `from` to `to` px down, setting off at the finger's `velocity`
     * (px/s), so there's no seam where the drag lets go. With reduced motion it's just there.
     */
    private async springTo(to: number, from: number, velocity: number, dampingRatio = 1) {
        const distance = to - from;
        this.moveTo(to);
        if (this.reducedMotion() || Math.abs(distance) < 1) {
            return;
        }
        // The spring wants speed as a share of the distance left per second
        const { easing, duration } = spring(0.3, {
            velocity: velocity / distance,
            dampingRatio,
        });
        const timing = { duration, easing };
        // The dimming behind, on the host's ::before, fades with it
        this.host.nativeElement.animate([{ opacity: this.dim(from) }, { opacity: this.dim(to) }], {
            ...timing,
            pseudoElement: '::before',
        });
        await this.sheet()
            .nativeElement.animate(
                [{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }],
                timing
            )
            .finished.catch(() => undefined);
    }
}
