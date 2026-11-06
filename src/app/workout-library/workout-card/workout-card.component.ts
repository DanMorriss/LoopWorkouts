import {
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { workoutEquipment } from '../../models/built-in-workouts';
import { capitalise, equipmentPhrases, MUSCLE_LABELS } from '../../models/exercise';
import { MUSCLES_ON_A_CARD, musclesWorked } from '../../models/workout-muscles';
import {
    allSteps,
    isReadyMade,
    repStepsPerRound,
    roundSeconds,
    runsUntilStopped,
    Workout,
} from '../../models/workout';
import { PageSlide } from '../../nav/page-slide';
import { formatSeconds } from '../../shared/format-time';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { counted } from '../../shared/format-count';
import { CardGestures } from './card-gestures';
import { FavouriteButtonComponent } from '../favourite-button/favourite-button.component';
import { ReadyMadeBadgeComponent } from '../../shared/components/ready-made-badge/ready-made-badge.component';
import { ShowcaseCountComponent } from '../../shared/components/showcase/showcase-count.component';
import { ShowcaseKitComponent } from '../../shared/components/showcase/showcase-kit.component';
import { ShowcaseMusclesComponent } from '../../shared/components/showcase/showcase-muscles.component';

/**
 * One workout in the list, yours or ready-made (with its badge): its title and what's in it,
 * how many exercises, the muscles it mainly works and what it needs. Pressing it slides in its
 * details, its play button starts it, and its heart makes it a favourite. One of yours can be
 * swiped to the left to delete it. Held still, it lifts, and let go of, its options open, as
 * on an iPhone; a right-click opens them too, and so does the ⋮ button, for keyboards, screen
 * readers and anyone who doesn't know the gestures: Edit, Make a copy and Delete, or only
 * Make a copy for a ready-made one. The library decides which card's options are open (one at a time); the card
 * shows that and reports what the user does.
 */
@Component({
    selector: 'li[appWorkoutCard]',
    imports: [
        FavouriteButtonComponent,
        MatIconModule,
        ReadyMadeBadgeComponent,
        ShowcaseCountComponent,
        ShowcaseKitComponent,
        ShowcaseMusclesComponent,
    ],
    templateUrl: './workout-card.component.html',
    styleUrl: './workout-card.component.scss',
    host: {
        class: 'workout-card',
        '[class.workout-card--menu-open]': 'menuOpen()',
        '[class.workout-card--lifted]': 'gestures.lifted()',
        '[class.workout-card--highlighted]': 'highlighted()',
    },
})
export class WorkoutCardComponent {
    readonly workout = input.required<Workout>();
    /** Whether this card's options are open. */
    readonly menuOpen = input(false);
    /** Whether it's the workout just saved in Create, which the library points out. */
    readonly highlighted = input(false);

    readonly started = output<void>();
    readonly menuToggled = output<void>();
    readonly menuClosed = output<void>();
    readonly editRequested = output<void>();
    /** Make a copy, to change while keeping this one. */
    readonly copyRequested = output<void>();
    readonly deleteRequested = output<void>();

    private readonly exercises = inject(ExerciseStore);
    private readonly slide = inject(PageSlide);

    protected readonly detailsUrl = computed(() => `/library/${this.workout().id}`);
    /** A ready-made workout (LIB-6), which can't be changed or deleted, only copied. */
    protected readonly readyMade = computed(() => isReadyMade(this.workout()));
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

    private readonly face = viewChild.required<ElementRef<HTMLElement>>('face');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    protected readonly gestures = new CardGestures({
        face: () => this.face().nativeElement,
        host: this.host.nativeElement,
        reducedMotion: injectPrefersReducedMotion(),
        menuOpen: () => this.menuOpen(),
        canDelete: () => !this.readyMade(),
        toggleMenu: () => this.menuToggled.emit(),
        requestDelete: () => this.deleteRequested.emit(),
    });

    constructor() {
        inject(DestroyRef).onDestroy(() => this.gestures.stop());
    }

    protected start(event: Event) {
        if (!this.gestures.swallowed(event)) {
            this.started.emit();
        }
    }

    /** Slides in its details, unless the press was a swipe or a hold. */
    protected open(event: MouseEvent) {
        if (this.gestures.swallowed(event)) {
            return;
        }
        this.slide.follow(event, this.detailsUrl(), 'in');
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
}
