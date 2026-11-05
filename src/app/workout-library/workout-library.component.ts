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
import {
    BUILT_IN_WORKOUTS,
    builtInWorkoutEquipment,
    copyOfBuiltIn,
} from '../models/built-in-workouts';
import { canDoWith } from '../models/exercise';
import { listMuscles, workoutToFillGaps } from '../models/fill-gaps';
import { SettingsStore } from '../shared/state/settings-store.service';
import { HOLD_MS } from './workout-card/card-gestures';
import { WorkoutCardComponent } from './workout-card/workout-card.component';
import { changeSmoothly } from '../shared/layout-change';
import { ActiveRunService } from '../shared/run/active-run.service';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { UndoService } from '../shared/undo/undo.service';

/**
 * The user's workouts. Arriving from Create's Save, `?saved=<id>` highlights that workout and
 * brings it into view (BLD-15); from adding a ready-made one, `?added=<id>` does the same.
 * Back from a workout's details, `?details=<id>` puts focus back on its card.
 */
@Component({
    selector: 'app-workout-library',
    templateUrl: './workout-library.component.html',
    styleUrl: './workout-library.component.scss',
    imports: [CdkDrag, CdkDropList, MatIconModule, RouterLink, WorkoutCardComponent],
})
export class WorkoutLibraryComponent {
    workoutStore = inject(WorkoutStore);
    router = inject(Router);
    private readonly run = inject(ActiveRunService);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private injector = inject(Injector);
    private readonly undo = inject(UndoService);
    protected readonly slide = inject(PageSlide);
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
            const name = workout.title.trim() || 'Untitled workout';
            this.highlightedId.set(workout.id);
            this.bringIntoView(workout.id, added ? `Added ${name}` : `Saved ${name}`);
        }
        const details = this.workoutStore.findWorkoutById(params.get('details') ?? '');
        if (details) {
            this.focusAfterRender(`[data-workout="${details.id}"] .workout-card__open`);
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

    /**
     * A ready-made workout to add for the muscles left out (LIB-7): of those not in the library
     * already (by title) and, with Only what I have on, doable with your equipment, the one that
     * does most for them. Null when there are no gaps, or no ready-made workout helps.
     */
    protected readonly gapFiller = computed(() => {
        const worked = musclesWorked(this.workoutStore.workouts(), (id) => this.exercises.byId(id));
        if (!worked.hasExercises) {
            return null;
        }
        const titles = new Set(
            this.workoutStore.workouts().map((workout) => workout.title.trim().toLowerCase())
        );
        const kit = this.settings.myEquipment();
        const onlyMine = this.settings.onlyMyEquipment();
        const candidates = BUILT_IN_WORKOUTS.filter(
            (workout) =>
                !titles.has(workout.title.toLowerCase()) &&
                (!onlyMine || canDoWith({ equipment: builtInWorkoutEquipment(workout) }, kit))
        );
        const best = workoutToFillGaps(candidates, musclesMissed(worked), worked.supporting, (id) =>
            this.exercises.byId(id)
        );
        return (
            best && {
                workout: best.workout,
                fills: `Adds ${listMuscles(best.fills.map((muscle) => MUSCLE_LABELS[muscle]))}.`,
            }
        );
    });

    /** Adds the suggested ready-made workout as a copy of your own, with Undo. */
    protected addGapFiller() {
        const suggestion = this.gapFiller();
        if (!suggestion) {
            return;
        }
        const added = this.workoutStore.addWorkout(copyOfBuiltIn(suggestion.workout));
        this.undo.offerUndo({
            message: `Added "${added.title}" to your workouts`,
            undo: () => this.workoutStore.deleteWorkout(added.id),
        });
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
