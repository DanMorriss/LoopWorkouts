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
import { ActivatedRoute, Router } from '@angular/router';
import { Workout } from '../models/workout';
import { HOLD_MS } from './workout-card/card-gestures';
import { WorkoutCardComponent } from './workout-card/workout-card.component';
import { LibraryFilters } from './library-filters.service';
import { LibraryFiltersComponent } from './library-filters/library-filters.component';
import { LibraryReadyMadeComponent } from './library-ready-made/library-ready-made.component';
import { changeSmoothly } from '../shared/layout-change';
import { ActiveRunService } from '../shared/run/active-run.service';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { UndoService } from '../shared/undo/undo.service';

/**
 * The user's workouts. Arriving from Create's Save, `?saved=<id>` highlights that workout and
 * brings it into view (BLD-15); from adding a ready-made one, `?added=<id>` does the same.
 * Back from a workout's details, `?details=<id>` puts focus back on its card, and back from
 * a ready-made workout's page, `?ready-made=<its name>` on its. The ready-made workouts not
 * added yet are listed under your own (LIB-6).
 */
@Component({
    selector: 'app-workout-library',
    templateUrl: './workout-library.component.html',
    styleUrl: './workout-library.component.scss',
    imports: [
        CdkDrag,
        CdkDropList,
        LibraryFiltersComponent,
        LibraryReadyMadeComponent,
        MatIconModule,
        WorkoutCardComponent,
    ],
})
export class WorkoutLibraryComponent {
    workoutStore = inject(WorkoutStore);
    router = inject(Router);
    private readonly run = inject(ActiveRunService);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private injector = inject(Injector);
    private readonly undo = inject(UndoService);
    protected readonly slide = inject(PageSlide);
    protected readonly filters = inject(LibraryFilters);
    protected openWorkoutMenuId = signal<string | null>(null);
    /** What screen readers hear once a workout has moved. */
    protected readonly announcement = signal('');
    protected readonly holdMs = HOLD_MS;
    /** A card let go settles into its place at the finger's speed. */
    protected readonly drop = new DropSpring();
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** The workout just saved in Create, if arriving from there. */
    protected readonly highlightedId = signal<string | null>(null);

    constructor() {
        const params = inject(ActivatedRoute).snapshot.queryParamMap;
        const added = params.get('added');
        const id = params.get('saved') ?? added;
        const workout = id ? this.workoutStore.findWorkoutById(id) : null;
        if (workout) {
            // Just saved or added, it's shown, whatever the list was cut down to
            if (!this.filters.shown().includes(workout)) {
                this.filters.clear();
            }
            const name = workout.title.trim() || 'Untitled workout';
            this.highlightedId.set(workout.id);
            this.bringIntoView(workout.id, added ? `Added ${name}` : `Saved ${name}`);
        }
        // Back from a ready-made workout's page, focus goes back on its card
        const readyMade = params.get('ready-made');
        if (readyMade) {
            this.focusAfterRender(`[data-ready-made="builtin:${CSS.escape(readyMade)}"]`);
        }
        const details = this.workoutStore.findWorkoutById(params.get('details') ?? '');
        if (details) {
            this.focusAfterRender(`[data-workout="${details.id}"] .workout-card__open`);
        }
    }

    protected isExistingWorkouts = computed(() => this.workoutStore.workouts().length > 0);

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

    // The element that had focus is removed when a menu closes or a page changes,
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
        this.slide.navigate('/setup', 'in');
    }

    navigateToEditWorkout(workoutId: string) {
        this.openWorkoutMenuId.set(null);
        this.slide.navigate(`/setup?editId=${workoutId}`, 'in');
    }
}
