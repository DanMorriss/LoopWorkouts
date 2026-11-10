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
import { WorkoutCardComponent } from './workout-card/workout-card.component';
import { LibraryFilters } from './library-filters.service';
import { LibraryFiltersComponent } from './library-filters/library-filters.component';
import { AddToPlanDialogComponent } from '../shared/components/add-to-plan-dialog/add-to-plan-dialog.component';
import { changeSmoothly } from '../shared/layout-change';
import { injectPlanOnDays } from '../shared/plan-on-days';
import { injectStartWorkout } from '../shared/run/start-workout';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { editUrl, MakeCopy } from '../shared/state/make-copy.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { UndoService } from '../shared/undo/undo.service';

/**
 * Every workout, yours and the ready-made ones (LIB-6), in one list, A to Z. Arriving from
 * Create's Save, `?saved=<id>` highlights that workout and brings it into view (BLD-15). Back
 * from a workout's details, `?details=<id>` puts focus back on its card.
 */
@Component({
    selector: 'app-workout-library',
    templateUrl: './workout-library.component.html',
    styleUrl: './workout-library.component.scss',
    imports: [
        AddToPlanDialogComponent,
        LibraryFiltersComponent,
        MatIconModule,
        WorkoutCardComponent,
    ],
})
export class WorkoutLibraryComponent {
    workoutStore = inject(WorkoutStore);
    router = inject(Router);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private injector = inject(Injector);
    private readonly undo = inject(UndoService);
    private readonly makeCopy = inject(MakeCopy);
    protected readonly slide = inject(PageSlide);
    protected readonly filters = inject(LibraryFilters);
    protected openWorkoutMenuId = signal<string | null>(null);
    /** What screen readers hear once a workout's saved. */
    protected readonly announcement = signal('');
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** The workout just saved in Create, if arriving from there. */
    protected readonly highlightedId = signal<string | null>(null);

    constructor() {
        const params = inject(ActivatedRoute).snapshot.queryParamMap;
        const id = params.get('saved');
        const workout = id ? this.workoutStore.findWorkoutById(id) : null;
        if (workout) {
            // Just saved, it's shown, whatever the list was cut down to
            if (!this.filters.shown().includes(workout)) {
                this.filters.clear();
            }
            const name = workout.title.trim() || 'Untitled workout';
            this.highlightedId.set(workout.id);
            this.bringIntoView(workout.id, `Saved ${name}`);
        }
        // A ready-made one's card is there once they've loaded, which they may not have yet
        const details = params.get('details');
        if (details) {
            const focusCard = () =>
                this.focusAfterRender(
                    `[data-workout="${CSS.escape(details)}"] .workout-card__open`
                );
            if (this.workoutStore.findAnyWorkout(details)) {
                focusCard();
            } else {
                void this.workoutStore.readyMadeLoaded.then(focusCard);
            }
        }
    }

    /** Whether you've any of your own, or only the ready-made ones yet. */
    protected readonly hasOwn = computed(() => this.workoutStore.workouts().length > 0);

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
            dismissed: () => this.focusAfterRender('.library-add-button'),
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

    readonly startWorkout = injectStartWorkout();

    navigateToCreateWorkout() {
        this.slide.navigate('/setup', 'in');
    }

    navigateToEditWorkout(workout: Workout) {
        this.openWorkoutMenuId.set(null);
        this.slide.navigate(editUrl(workout), 'in');
    }

    /** The workout whose Add to plan dialog is open, from its card's options. */
    protected readonly planning = signal<Workout | null>(null);
    private readonly planOnDays = injectPlanOnDays();

    planWorkout(workout: Workout) {
        this.openWorkoutMenuId.set(null);
        this.planning.set(workout);
    }

    /** Plans it on the days chosen, with Undo, focus coming back to its card's ⋮. */
    planOn(workout: Workout, days: number[]) {
        this.planning.set(null);
        this.planOnDays(workout, days, `workout-menu-${workout.id}`);
    }

    closePlanning(workout: Workout) {
        this.planning.set(null);
        this.focusAfterRender(`[data-menu-for="${CSS.escape(workout.id)}"]`);
    }

    /** Make a copy of a workout, yours or ready-made, and open the copy in Create. */
    copyWorkout(workout: Workout) {
        const copy = this.makeCopy.of(workout.id);
        if (copy) {
            this.navigateToEditWorkout(copy);
        }
    }
}
