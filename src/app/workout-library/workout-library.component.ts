import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { DropSpring } from '../shared/drop-spring';
import { PageSlide } from '../nav/page-slide';
import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MUSCLE_LABELS, MuscleGroup } from '../models/exercise';
import { Workout } from '../models/workout';
import { musclesMissed, musclesWorked } from '../models/workout-muscles';
import { HOLD_MS, WorkoutCardComponent } from './workout-card/workout-card.component';
import { WorkoutDetailsDialogComponent } from './workout-details/workout-details-dialog.component';
import { changeSmoothly } from '../shared/layout-change';
import { ActiveRunService } from '../shared/run/active-run.service';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { UndoService } from '../shared/undo/undo.service';

/**
 * The user's workouts. Arriving from Create's Save, `?saved=<id>` highlights that workout and
 * brings it into view (BLD-15).
 */
@Component({
    selector: 'app-workout-library',
    templateUrl: './workout-library.component.html',
    styleUrl: './workout-library.component.scss',
    imports: [
        CdkDrag,
        CdkDropList,
        MatIconModule,
        RouterLink,
        WorkoutCardComponent,
        WorkoutDetailsDialogComponent,
    ],
})
export class WorkoutLibraryComponent {
    workoutStore = inject(WorkoutStore);
    router = inject(Router);
    private readonly run = inject(ActiveRunService);
    private readonly exercises = inject(ExerciseStore);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private injector = inject(Injector);
    private readonly undo = inject(UndoService);
    protected readonly slide = inject(PageSlide);
    protected openWorkoutMenuId = signal<string | null>(null);
    /** The workout whose details are open, if any. */
    private readonly detailsId = signal<string | null>(null);
    protected readonly detailsWorkout = computed(() => {
        const id = this.detailsId();
        return id ? this.workoutStore.findWorkoutById(id) : null;
    });
    /** What screen readers hear once a workout has moved. */
    protected readonly announcement = signal('');
    protected readonly holdMs = HOLD_MS;
    /** A card let go settles into its place at the finger's speed. */
    protected readonly drop = new DropSpring();
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** The workout just saved in Create, if arriving from there. */
    protected readonly highlightedId = signal<string | null>(null);

    constructor() {
        const saved = inject(ActivatedRoute).snapshot.queryParamMap.get('saved');
        const workout = saved ? this.workoutStore.findWorkoutById(saved) : null;
        if (workout) {
            this.highlightedId.set(workout.id);
            this.bringIntoView(workout.id, `Saved ${workout.title.trim() || 'Untitled workout'}`);
        }
    }

    protected isExistingWorkouts = computed(() => this.workoutStore.workouts().length > 0);

    /**
     * The muscle groups the library's workouts don't work at all (missed), and those they only
     * work as a supporting muscle (light), each linking to the Exercises list cut down to it.
     */
    protected readonly libraryMuscles = computed(() => {
        const worked = musclesWorked(this.workoutStore.workouts(), (id) => this.exercises.byId(id));
        const named = (muscles: MuscleGroup[]) =>
            muscles.map((id) => ({ id, label: MUSCLE_LABELS[id] }));
        return {
            hasExercises: worked.hasExercises,
            missed: named(musclesMissed(worked)),
            light: named(worked.supporting),
        };
    });

    protected openDetails(workoutId: string) {
        this.openWorkoutMenuId.set(null);
        this.detailsId.set(workoutId);
    }

    /** Back to the card's ⋮ button, where the details were opened from. */
    protected closeDetails() {
        const id = this.detailsId();
        this.detailsId.set(null);
        if (id) {
            this.focusAfterRender(`[data-menu-for="${id}"]`);
        }
    }

    /**
     * Move up or Move down, from a card's options, which stay open with focus on the same
     * item, or on the other one once it can't move any further that way.
     */
    protected moveWorkout(workout: Workout, by: -1 | 1) {
        const from = this.workoutStore.workouts().findIndex((w) => w.id === workout.id);
        this.smoothChange(() => this.moveTo(from, from + by));
        const to = from + by;
        const atEnd = to === 0 || to === this.workoutStore.workouts().length - 1;
        const item = (by === -1) === atEnd ? 'down' : 'up';
        this.focusAfterRender(`[data-workout="${workout.id}"] .workout-card__menu-item--${item}`);
    }

    /** A card held and dragged to a new place. */
    protected dropWorkout(event: CdkDragDrop<unknown>) {
        this.moveTo(event.previousIndex, event.currentIndex);
    }

    private moveTo(from: number, to: number) {
        const workouts = this.workoutStore.workouts();
        const workout = workouts[from];
        if (!workout || from === to || to < 0 || to >= workouts.length) {
            return;
        }
        this.workoutStore.moveWorkout(from, to);
        const name = workout.title.trim() || 'Untitled workout';
        this.announcement.set(`Moved ${name} to ${to + 1} of ${workouts.length}`);
    }

    /**
     * Deletes a workout straight away, and offers to put it back (UndoService) rather than
     * asking first. Undo puts it back where it was, with focus on its menu.
     */
    deleteWorkout(workout: Workout) {
        const index = this.workoutStore.workouts().findIndex((w) => w.id === workout.id);
        // The cards after it close up the gap, and open it again on Undo, rather than jumping
        this.smoothChange(() => this.workoutStore.deleteWorkout(workout.id));
        this.openWorkoutMenuId.set(null);
        const name = workout.title.trim();
        this.undo.offerUndo({
            message: name ? `Deleted "${name}"` : 'Deleted a workout',
            undo: () => {
                this.smoothChange(() => this.workoutStore.restoreWorkout(workout, index));
                this.focusAfterRender(`[data-menu-for="${workout.id}"]`);
            },
            // "Add workout" goes once the library is empty, and "Create a workout" takes its place
            dismissed: () =>
                this.focusAfterRender(
                    this.workoutStore.workouts().length
                        ? '.library-add-button'
                        : '.library-create-button'
                ),
        });
    }

    /** A click anywhere else on the page closes an open card's options. */
    closeWorkoutMenus() {
        this.openWorkoutMenuId.set(null);
    }

    toggleWorkoutMenu(workoutId: string) {
        this.openWorkoutMenuId.update((currentMenuId) =>
            currentMenuId === workoutId ? null : workoutId
        );
    }

    closeWorkoutMenu(workoutId: string) {
        if (this.openWorkoutMenuId() !== workoutId) {
            return;
        }
        this.openWorkoutMenuId.set(null);
        this.focusAfterRender(`[data-menu-for="${workoutId}"]`);
    }

    /** Makes a change to the list, with the cards sliding to their new places. */
    private smoothChange(change: () => void) {
        changeSmoothly(this.host.nativeElement, '.workout-card', this.injector, change);
    }

    /**
     * Scrolls a workout to the middle of the screen, with focus on its card to start it, and
     * says so: once the live region is on the page, as one filled before it isn't heard.
     */
    private bringIntoView(id: string, announcement: string) {
        afterNextRender(
            () => {
                const card = this.host.nativeElement.querySelector<HTMLElement>(
                    `[data-workout="${id}"]`
                );
                card?.scrollIntoView({
                    block: 'center',
                    behavior: this.reducedMotion() ? 'auto' : 'smooth',
                });
                card?.querySelector<HTMLElement>('.workout-card__start')?.focus({
                    preventScroll: true,
                });
                this.announcement.set(announcement);
            },
            { injector: this.injector }
        );
    }

    // The element that had focus is removed when a menu or dialog closes,
    // so move focus somewhere sensible instead of losing it to the page
    private focusAfterRender(selector: string) {
        afterNextRender(
            () => {
                this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
            },
            { injector: this.injector }
        );
    }

    startWorkout(workout: Workout) {
        this.run.start(workout);
        this.router.navigate(['/workout']);
    }

    navigateToCreateWorkout() {
        this.router.navigate(['/setup']);
    }

    navigateToEditWorkout(workoutId: string) {
        this.openWorkoutMenuId.set(null);
        this.detailsId.set(null);
        this.router.navigate(['/setup'], { queryParams: { editId: workoutId } });
    }
}
