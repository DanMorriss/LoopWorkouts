import { CdkDrag } from '@angular/cdk/drag-drop';
import {
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { workoutEquipment } from '../../models/built-in-workouts';
import { capitalise, equipmentPhrases, MUSCLE_LABELS } from '../../models/exercise';
import { MUSCLES_ON_A_CARD, musclesWorked } from '../../models/workout-muscles';
import {
    allSteps,
    repStepsPerRound,
    roundSeconds,
    runsUntilStopped,
    Workout,
} from '../../models/workout';
import { PageSlide } from '../../nav/page-slide';
import { formatSeconds } from '../../shared/format-time';
import { project, rubberband, VelocityTracker } from '../../shared/gesture';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { criticallyDampedSpring } from '../../shared/spring';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { counted } from '../../shared/format-count';
import { ShowcaseCountComponent } from '../../shared/components/showcase/showcase-count.component';
import { ShowcaseKitComponent } from '../../shared/components/showcase/showcase-kit.component';
import { ShowcaseMusclesComponent } from '../../shared/components/showcase/showcase-muscles.component';

/**
 * One workout in the library list, in the ready-made cards' look: its title and what's in it,
 * how many exercises, the muscles it mainly works and what it needs. Pressing it slides in its
 * details, and its play button starts it. It can also be swiped to the left to delete it, or held to pick it up: it lifts, and can then be dragged to another
 * place (the library's drop list does that), or let go of where it is for its options, as on
 * an iPhone. A right-click opens them too, and so does the ⋮ button, for keyboards, screen
 * readers and anyone who doesn't know the gestures; its menu has Move up and Move down as
 * well. The library decides which card's options are open (one at a time); the card shows
 * that and reports what the user does.
 */
@Component({
    selector: 'li[appWorkoutCard]',
    imports: [
        MatIconModule,
        ShowcaseCountComponent,
        ShowcaseKitComponent,
        ShowcaseMusclesComponent,
    ],
    templateUrl: './workout-card.component.html',
    styleUrl: './workout-card.component.scss',
    host: {
        class: 'workout-card',
        '[class.workout-card--menu-open]': 'menuOpen()',
        '[class.workout-card--lifted]': 'lifted()',
        '[class.workout-card--highlighted]': 'highlighted()',
    },
})
export class WorkoutCardComponent {
    readonly workout = input.required<Workout>();
    /** Whether this card's options are open. */
    readonly menuOpen = input(false);
    /** Whether it's the workout just saved in Create, which the library points out. */
    readonly highlighted = input(false);
    /** Whether it's first or last in the library, so it can't move up or down. */
    readonly first = input(false);
    readonly last = input(false);

    readonly started = output<void>();
    readonly menuToggled = output<void>();
    readonly menuClosed = output<void>();
    readonly editRequested = output<void>();
    /** Move up (-1) or down (1) a place. */
    readonly moveRequested = output<-1 | 1>();
    readonly deleteRequested = output<void>();

    private readonly exercises = inject(ExerciseStore);
    private readonly slide = inject(PageSlide);

    protected readonly detailsUrl = computed(() => `/library/${this.workout().id}`);
    protected readonly title = computed(() => this.workout().title.trim());
    /** Used in accessible names, e.g. "Start Sprints" or "Start workout". */
    protected readonly name = computed(() => this.title() || 'workout');
    /** Its work and rep steps' names in order, each once. */
    private readonly namedExercises = computed(() => [
        ...new Set(
            allSteps(this.workout())
                .filter((step) => step.kind !== 'rest')
                .map((step) => step.name.trim())
                .filter(Boolean)
        ),
    ]);
    /** The big number by its title: how many exercises, or steps if none is named. */
    protected readonly count = computed(() => {
        const exercises = this.namedExercises().length;
        const number = exercises || allSteps(this.workout()).length;
        const thing = exercises ? 'exercise' : 'step';
        return { number, label: number === 1 ? thing : `${thing}s` };
    });
    private readonly worked = computed(() =>
        musclesWorked([this.workout()], (id) => this.exercises.byId(id))
    );
    /** Its main muscles, the first few, then how many more; none with no exercise to go on. */
    protected readonly muscles = computed(() => {
        const { main } = this.worked();
        return {
            shown: main.slice(0, MUSCLES_ON_A_CARD).map((muscle) => MUSCLE_LABELS[muscle]),
            more: Math.max(0, main.length - MUSCLES_ON_A_CARD),
        };
    });
    /** What it needs: "Dumbbells", "Bench", or "No equipment"; none with no exercise to go on. */
    protected readonly equipment = computed(() =>
        this.worked().hasExercises
            ? equipmentPhrases(
                  workoutEquipment(this.workout(), (id) => this.exercises.byId(id))
              ).map(capitalise)
            : []
    );
    /** The muscles and equipment for screen readers, added to its summary. */
    protected readonly spokenWorks = computed(() => {
        const { shown, more } = this.muscles();
        const muscles = shown.length
            ? `. Works ${shown.join(', ')}${more ? ` and ${more} more` : ''}`
            : '';
        const needs = this.equipment().length ? `. Needs ${this.equipment().join(', ')}` : '';
        return muscles + needs;
    });
    /**
     * A one-line summary: its exercises, the steps' names in order, e.g. "Squats, Bench press
     * + 1 more". With no step named, "01:05 - 00:20" for one work step (and maybe one rest),
     * as workouts have always shown, or "5 steps · 02:15" with the length of a round. Rep steps
     * take as long as they take, so a round with some is "4 steps · 01:30 + reps", or
     * "2 steps · reps" with no timed steps at all.
     */
    protected readonly summary = computed(() => {
        const steps = allSteps(this.workout());
        const namedExercises = this.namedExercises();
        if (namedExercises.length > 0) {
            const preview = namedExercises.slice(0, 2);
            const remainder = namedExercises.length - preview.length;
            const text =
                remainder > 0 ? `${preview.join(', ')} + ${remainder} more` : preview.join(', ');
            return { text, spoken: text };
        }

        const [first, second] = steps;
        if (steps.length <= 2 && first.kind === 'work' && (!second || second.kind === 'rest')) {
            const work = formatSeconds(first.seconds);
            const rest = formatSeconds(second?.kind === 'rest' ? second.seconds : 0);
            return { text: `${work} - ${rest}`, spoken: `Timed ${work}, rest ${rest}` };
        }
        const count = counted(steps.length, 'step');
        const seconds = roundSeconds(this.workout());
        const round = formatSeconds(seconds);
        if (repStepsPerRound(this.workout()) === 0) {
            return { text: `${count} · ${round}`, spoken: `${count}, ${round} a round` };
        }
        return seconds > 0
            ? { text: `${count} · ${round} + reps`, spoken: `${count}, ${round} a round plus reps` }
            : { text: `${count} · reps`, spoken: `${count}, all reps` };
    });
    /** How long it goes on: "x 4" rounds, "x ∞" until stopped, or "in 20:00" for a time limit. */
    protected readonly rounds = computed(() => {
        const { repeats, timeLimitSeconds } = this.workout();
        if (timeLimitSeconds !== undefined) {
            return `in ${formatSeconds(timeLimitSeconds)}`;
        }
        return runsUntilStopped(this.workout()) ? 'x ∞' : `x ${repeats}`;
    });
    protected readonly spokenRounds = computed(() => {
        const { repeats, timeLimitSeconds } = this.workout();
        if (timeLimitSeconds !== undefined) {
            return `as many rounds as possible in ${formatSeconds(timeLimitSeconds)}`;
        }
        return runsUntilStopped(this.workout())
            ? 'repeated until stopped'
            : `repeated ${repeats} times`;
    });
    // Gestures on the card, as on an iPhone list. A tap opens its details. A swipe to the
    // left follows the finger, showing Delete behind; let go, and where the flick would carry
    // it decides: past halfway it carries on off the card and deletes (with Undo), otherwise
    // it springs back, from the finger's speed either way. Holding still on it lifts it: moved
    // then, the drop list drags it; let go of without moving, its options open. Up and down is
    // left to the page, which scrolls.

    private readonly face = viewChild.required<ElementRef<HTMLElement>>('face');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly reducedMotion = injectPrefersReducedMotion();
    private gesture: {
        pointerId: number;
        startX: number;
        startY: number;
        startOffset: number;
        offset: number;
        /** Which way it's going, once it has moved far enough to tell. */
        axis: 'x' | 'y' | null;
        tracker: VelocityTracker;
    } | null = null;
    private holdTimer: ReturnType<typeof setTimeout> | undefined;
    /** The press was a swipe or a hold, so the click that ends it does nothing. */
    private swallowClick = false;
    /** Counts presses, so a swipe's spring knows if a new press caught the card mid-way. */
    private presses = 0;
    /** Held still long enough to pick up: where the press was, until it moves or lets go. */
    private held: { pointerId: number; x: number; y: number } | null = null;
    protected readonly lifted = signal(false);

    constructor() {
        inject(DestroyRef).onDestroy(() => clearTimeout(this.holdTimer));
        // Picked up and dragged: the drag has it now, so letting go won't open the options
        inject(CdkDrag, { optional: true, self: true })
            ?.started.pipe(takeUntilDestroyed())
            .subscribe(() => this.putDown());
    }

    protected start(event: Event) {
        if (!this.swallowed(event)) {
            this.started.emit();
        }
    }

    /** Slides in its details, unless the press was a swipe or a hold. */
    protected open(event: MouseEvent) {
        if (this.swallowed(event)) {
            return;
        }
        this.slide.follow(event, this.detailsUrl(), 'in');
    }

    /** Whether this click only ends a swipe or a hold, so it's dropped. */
    private swallowed(event: Event): boolean {
        if (!this.swallowClick) {
            return false;
        }
        this.swallowClick = false;
        event.preventDefault();
        // Nor does it reach the library, which would close the options a hold just opened
        event.stopPropagation();
        return true;
    }

    /** A right-click opens the options, as the ⋮ button does. */
    protected openMenuFromRightClick(event: Event) {
        if ((event.target as Element).closest('.workout-card__menu-wrap')) {
            return;
        }
        event.preventDefault();
        // A long press on a touch screen (Android sends one) is a hold, which lifts the card
        if ((event as PointerEvent).pointerType === 'touch') {
            return;
        }
        if (!this.menuOpen()) {
            this.menuToggled.emit();
        }
    }

    protected press(event: PointerEvent) {
        const target = event.target as Element;
        if (
            (event.pointerType === 'mouse' && event.button !== 0) ||
            target.closest('.workout-card__menu-wrap')
        ) {
            return;
        }
        this.swallowClick = false;
        this.putDown();
        this.presses++;
        // Where it is on screen now, mid-spring included, and stop it there
        const offset = new DOMMatrix(getComputedStyle(this.face().nativeElement).transform).m41;
        this.host.nativeElement.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        this.moveTo(offset);
        const tracker = new VelocityTracker();
        tracker.add(offset, event.timeStamp);
        this.gesture = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startOffset: offset,
            offset,
            axis: null,
            tracker,
        };
        // Held still for as long as the drop list waits before a drag: it lifts
        clearTimeout(this.holdTimer);
        this.holdTimer = setTimeout(() => {
            const gesture = this.gesture;
            if (gesture && !gesture.axis) {
                this.held = { pointerId: gesture.pointerId, x: gesture.startX, y: gesture.startY };
                this.gesture = null;
                this.swallowClick = true;
                this.lifted.set(true);
                navigator.vibrate?.(10);
            }
        }, HOLD_MS);
    }

    protected move(event: PointerEvent) {
        const held = this.held;
        if (held?.pointerId === event.pointerId) {
            // Moving off with it: the drag takes over
            if (Math.hypot(event.clientX - held.x, event.clientY - held.y) >= DIRECTION_THRESHOLD) {
                this.held = null;
            }
            return;
        }
        const gesture = this.gesture;
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        if (!gesture.axis) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_THRESHOLD) {
                return;
            }
            clearTimeout(this.holdTimer);
            gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (gesture.axis === 'y') {
                // The page scrolls; nothing more for the card to do
                this.gesture = null;
                return;
            }
            this.swallowClick = true;
            (event.currentTarget as Element).setPointerCapture(event.pointerId);
        }
        const width = this.width();
        const pulled = gesture.startOffset + dx;
        // Left follows the finger; right, where there's nothing to show, resists
        const offset = pulled > 0 ? rubberband(pulled, width) : pulled;
        const wasPast = gesture.offset < -width / 2;
        gesture.offset = offset;
        gesture.tracker.add(offset, event.timeStamp);
        this.moveTo(offset);
        // A tick as it crosses the point where letting go would delete it
        if (wasPast !== offset < -width / 2) {
            navigator.vibrate?.(8);
        }
    }

    protected async release(event: PointerEvent) {
        const gesture = this.gesture;
        clearTimeout(this.holdTimer);
        // Picked up and let go of where it was: its options
        if (this.held?.pointerId === event.pointerId) {
            this.putDown();
            if (event.type === 'pointerup' && !this.menuOpen()) {
                this.menuToggled.emit();
            }
            return;
        }
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }
        this.gesture = null;
        if (gesture.axis !== 'x') {
            return;
        }
        const velocity = gesture.tracker.velocity(event.timeStamp);
        const width = this.width();
        // Where the flick would come to rest decides, not where the finger let go
        const away = gesture.offset + project(velocity) < -width / 2;
        const press = this.presses;
        await this.springTo(away ? -width : 0, gesture.offset, velocity);
        // Caught again on its way off: the new press has it now, so it isn't deleted
        if (away && press === this.presses) {
            this.deleteRequested.emit();
        }
    }

    private putDown() {
        this.held = null;
        this.lifted.set(false);
    }

    private width(): number {
        return this.host.nativeElement.offsetWidth || 1;
    }

    /** Slides the card `offset` px across, showing as much of Delete behind as it leaves. */
    private moveTo(offset: number) {
        this.face().nativeElement.style.transform = offset ? `translateX(${offset}px)` : '';
        const host = this.host.nativeElement;
        host.style.setProperty('--reveal', `${Math.max(0, -offset)}px`);
        host.classList.toggle('workout-card--past-delete', offset < -this.width() / 2);
    }

    /**
     * Springs the card from `from` to `to` px across, setting off at the finger's `velocity`
     * (px/s), so there's no seam where the swipe lets go. With reduced motion it's just there.
     */
    private async springTo(to: number, from: number, velocity: number) {
        const distance = to - from;
        this.moveTo(to);
        if (this.reducedMotion() || Math.abs(distance) < 1) {
            return;
        }
        // The spring wants speed as a share of the distance left per second
        const { easing, duration } = criticallyDampedSpring(0.3, {
            velocity: velocity / distance,
        });
        const timing = { duration, easing };
        // Delete behind shows as much as the card leaves, all the way along
        this.host.nativeElement
            .querySelector('.workout-card__delete')
            ?.animate([{ clipPath: revealClip(from) }, { clipPath: revealClip(to) }], timing);
        await this.face()
            .nativeElement.animate(
                [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
                timing
            )
            .finished.catch(() => undefined);
    }
}

/**
 * How long a press is held, still, before the card lifts. The library's drop list waits as
 * long before it lets a drag start, so a swipe or a scroll before then stays one.
 */
export const HOLD_MS = 500;

/** How far a press moves (px) before it counts as a swipe or a scroll, and which. */
const DIRECTION_THRESHOLD = 10;

/** The part of Delete behind that a card slid `offset` px across leaves showing. */
function revealClip(offset: number): string {
    return `inset(0 0 0 calc(100% - ${Math.max(0, -offset)}px) round 0.9rem)`;
}
