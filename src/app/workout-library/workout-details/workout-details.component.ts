import { DatePipe } from '@angular/common';
import { afterNextRender, Component, computed, ElementRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { describeRounds, formatDuration } from '../../history/history-format';
import { exerciseSlug } from '../../models/exercise';
import { isReadyMade, isReadyMadeId, Workout } from '../../models/workout';
import { ReadyMadeBadgeComponent } from '../../shared/components/ready-made-badge/ready-made-badge.component';
import { musclesWorked } from '../../models/workout-muscles';
import { BackLinkComponent } from '../../nav/back-link/back-link.component';
import { PageSlide } from '../../nav/page-slide';
import { SwipeBackDirective } from '../../nav/swipe-back.directive';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { WorkoutOutlineComponent } from '../../shared/components/workout-outline/workout-outline.component';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { MakeCopy } from '../../shared/state/make-copy.service';
import { ReadyMadeChanges } from '../../shared/state/ready-made-changes.service';
import { UndoService } from '../../shared/undo/undo.service';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { FavouriteButtonComponent } from '../favourite-button/favourite-button.component';

/** How many of its latest runs it lists. */
const RECENT_RUNS = 5;

/**
 * A workout's details (LIB-4), at /library/<its id>, from its card in the library: the
 * muscles its exercises work, on the body map; its history, with its latest runs linking to them
 * on the Progress page; a heart to make it a favourite; and what's in it, each step and its sets, so it can be read without
 * opening Edit, each exercise sliding in its page. It slides in over Workouts, and back off with
 * ‹ Workouts or a swipe right, with focus back on the card (`?details=<its id>`).
 */
@Component({
    selector: 'app-workout-details',
    imports: [
        BackLinkComponent,
        BodyMapComponent,
        DatePipe,
        FavouriteButtonComponent,
        MatIconModule,
        ReadyMadeBadgeComponent,
        RouterLink,
        SwipeBackDirective,
        WorkoutOutlineComponent,
    ],
    templateUrl: './workout-details.component.html',
    styleUrl: './workout-details.component.scss',
})
export class WorkoutDetailsComponent {
    private readonly exercises = inject(ExerciseStore);
    private readonly history = inject(HistoryStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly slide = inject(PageSlide);
    private readonly makeCopy = inject(MakeCopy);
    private readonly readyMadeChanges = inject(ReadyMadeChanges);
    private readonly undo = inject(UndoService);
    private readonly focusAfterRender = injectFocusAfterRender();
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly id = toSignal(
        this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
        { initialValue: '' }
    );

    protected readonly back = `/library?details=${this.route.snapshot.paramMap.get('id') ?? ''}`;
    /** What screen readers hear arriving from Save in Create: "Saved Legs day". */
    protected readonly announcement = signal('');

    constructor() {
        // Just saved in Create (BLD-15), and say so. Focus goes to Edit, where it was left, if
        // the page came back scrolled there; otherwise, new to it, to its title at the top
        if (this.route.snapshot.queryParamMap.has('saved')) {
            // A frame on, as the page slide scrolls it back to where it was just after rendering
            afterNextRender(() =>
                requestAnimationFrame(() => {
                    const page = this.host.nativeElement;
                    const edit = page.querySelector<HTMLElement>('.details__edit');
                    const inView =
                        edit && edit.getBoundingClientRect().bottom <= window.innerHeight;
                    (inView ? edit : page.querySelector<HTMLElement>('.details__title'))?.focus({
                        preventScroll: true,
                    });
                    this.announcement.set(`Saved ${this.name()}`);
                })
            );
        }
    }

    /** It, yours or ready-made, or null for a link to one there isn't, such as one deleted since. */
    protected readonly workout = computed(() => this.workouts.findAnyWorkout(this.id()));
    /** A ready-made one, which has its badge and description, and Make a copy for Edit. */
    protected readonly readyMade = computed(() => {
        const workout = this.workout();
        return workout && isReadyMade(workout) ? workout : null;
    });
    /** A ready-made one with your own reps and weights on it, which can be put back. */
    protected readonly changed = computed(() => this.readyMadeChanges.byId().has(this.id()));
    /** Not found yet only because the ready-made workouts are still loading. */
    protected readonly loading = computed(
        () => isReadyMadeId(this.id()) && this.workouts.readyMade().length === 0
    );

    protected readonly name = computed(() => this.workout()?.title.trim() || 'Untitled workout');
    protected readonly muscles = computed(() => {
        const workout = this.workout();
        return musclesWorked(workout ? [workout] : [], (id) => this.exercises.byId(id));
    });
    /** Its runs, newest first, as the history keeps them. */
    private readonly runs = computed(() =>
        this.history.entries().filter((entry) => entry.workoutId === this.id())
    );
    protected readonly timesDone = computed(() => {
        const count = this.runs().length;
        return count === 1 ? 'Done once' : `Done ${count} times`;
    });
    protected readonly recentRuns = computed(() =>
        this.runs()
            .slice(0, RECENT_RUNS)
            .map((entry) => ({
                id: entry.id,
                startedAt: entry.startedAt,
                text: `${describeRounds(entry)} · ${formatDuration(entry.activeSeconds)}`,
            }))
    );
    protected readonly moreRuns = computed(() => this.runs().length > RECENT_RUNS);

    /** An exercise's page, under this workout so it comes back here; none for one that's gone. */
    protected readonly exerciseUrl = (exerciseId: string) => {
        const exercise = this.exercises.byId(exerciseId);
        return exercise ? `/library/${this.id()}/${exerciseSlug(exercise)}` : null;
    };

    /** Make a copy of it, and open the copy in Create, coming back to the copy's details. */
    protected copy(workout: Workout) {
        const copy = this.makeCopy.of(workout.id);
        if (copy) {
            this.edit(copy);
        }
    }

    /**
     * Puts a ready-made workout's reps and weights back as it came, with Undo, which takes focus
     * as the button goes. Undo brings the button back with focus on it; closing the bar moves
     * focus to Make a copy.
     */
    protected resetAmounts(workout: Workout) {
        const was = this.readyMadeChanges.reset(workout.id);
        if (was) {
            this.undo.offerUndo({
                message: `Reset the reps and weights of "${this.name()}"`,
                undo: () => {
                    this.readyMadeChanges.restore(was);
                    this.focusAfterRender('workout-details-reset');
                },
                dismissed: () => this.focusAfterRender('workout-details-copy'),
            });
        }
    }

    protected edit(workout: Workout) {
        const url = this.router.serializeUrl(
            this.router.createUrlTree(['/setup'], {
                queryParams: { editId: workout.id, from: `/library/${workout.id}` },
            })
        );
        this.slide.navigate(url, 'in');
    }
}
