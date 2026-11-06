import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { ExerciseDetailsComponent } from '../../shared/components/exercise-details/exercise-details.component';
import { ExerciseEditorComponent } from '../../shared/components/exercise-editor/exercise-editor.component';
import { ExerciseProgressComponent } from './exercise-progress/exercise-progress.component';
import {
    WorkoutChoice,
    WorkoutChoiceDialogComponent,
} from '../../shared/components/workout-choice-dialog/workout-choice-dialog.component';
import { BackLinkComponent } from '../../nav/back-link/back-link.component';
import { listBackLink } from '../list-from';
import { PageSlide } from '../../nav/page-slide';
import { SwipeBackDirective } from '../../nav/swipe-back.directive';
import { BUILT_IN_WORKOUTS } from '../../models/built-in-workouts';
import { Exercise, exercisePath, isBuiltIn } from '../../models/exercise';
import { exerciseUsage } from '../../models/exercise-links';
import { allSteps, MAX_STEPS } from '../../models/workout';
import { parseMusclesParam, serialiseMusclesParam } from '../muscle-filter-query';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { counted } from '../../shared/format-count';

/**
 * One exercise (EXR-7, EXR-8): what it needs, its description and your note on it, the
 * muscles it works on the body map, then how to do it and tips. It can be added to a workout,
 * new or in the library, which opens in Create with it at the end (EXR-12). A built-in one takes a note;
 * your own can be edited. Either can be hidden from the picker, and your own deleted unless a
 * workout uses it (one with history is hidden instead, so its history keeps its name).
 *
 * Built-in exercises are at /exercises/<name>, e.g. /exercises/back-squat, and your own at
 * /exercises/<id>. It slides in over the list, and back off with ‹ Exercises or a swipe right.
 * From a workout's details it's at /library/<workout>/<name>, and goes back to them instead; from a ready-made plan's workout, at
 * /ready-made-plans/<workout>/<name>, back to that.
 */
@Component({
    selector: 'app-exercise-page',
    imports: [
        MatIconModule,
        WorkoutChoiceDialogComponent,
        BackLinkComponent,
        ExerciseDetailsComponent,
        ExerciseEditorComponent,
        ExerciseProgressComponent,
        SwipeBackDirective,
    ],
    templateUrl: './exercise-page.component.html',
    styleUrl: './exercise-page.component.scss',
})
export class ExercisePageComponent {
    private readonly exercises = inject(ExerciseStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    private readonly param = toSignal(
        this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
        { initialValue: '' }
    );
    /** The Exercises list's muscle filter, from the link here, to go back to. */
    private readonly musclesQuery = serialiseMusclesParam(
        parseMusclesParam(this.route.snapshot.queryParamMap.get('muscles'))
    );
    /** Where to go back to, and what it's called. */
    private readonly back = this.backLink();
    protected readonly backUrl = this.back.url;
    protected readonly backLabel = this.back.label;
    protected readonly slide = inject(PageSlide);

    /**
     * The workout it was opened from: your own's details (/library/<workout>/<exercise>), or a
     * ready-made plan's workout (/ready-made-plans/<workout>/<exercise>, which keeps where that
     * goes back to); otherwise the list, e.g. "/exercises?muscles=quads".
     */
    private backLink(): { url: string; label: string } {
        const { paramMap, queryParamMap, data } = this.route.snapshot;
        const workoutId = paramMap.get('workoutId');
        if (workoutId && data['inPlan']) {
            const from = queryParamMap.get('from');
            return {
                url: this.router.serializeUrl(
                    this.router.createUrlTree(['/ready-made-plans', workoutId], {
                        queryParams: from ? { from } : {},
                    })
                ),
                label:
                    BUILT_IN_WORKOUTS.find((w) => w.id === `builtin:${workoutId}`)?.title ||
                    'Workout',
            };
        }
        if (workoutId) {
            return {
                url: `/library/${workoutId}`,
                label: this.workouts.findAnyWorkout(workoutId)?.title.trim() || 'Workout',
            };
        }
        // Back to the list as it was: its muscles, and where it was opened from (`?from=plan`)
        const from = queryParamMap.get('from');
        return {
            url: this.router.serializeUrl(
                this.router.createUrlTree(['/exercises'], {
                    queryParams: {
                        ...(this.musclesQuery ? { muscles: this.musclesQuery } : {}),
                        ...(listBackLink(from) ? { from } : {}),
                    },
                })
            ),
            label: 'Exercises',
        };
    }

    protected readonly exercise = computed(
        () =>
            this.exercises.byId(`builtin:${this.param()}`) ??
            // Not a built-in one's own id, so a link can't skip the /exercises/<name> form
            (this.param().startsWith('builtin:') ? undefined : this.exercises.byId(this.param()))
    );
    protected readonly builtIn = computed(() => {
        const exercise = this.exercise();
        return exercise !== undefined && isBuiltIn(exercise);
    });
    protected readonly note = computed(() => {
        const exercise = this.exercise();
        return exercise ? this.exercises.noteFor(exercise.id) : undefined;
    });
    protected readonly hidden = computed(() => {
        const exercise = this.exercise();
        return exercise !== undefined && this.exercises.isHidden(exercise.id);
    });
    protected readonly usage = computed(() =>
        exerciseUsage(
            this.exercise()?.id ?? '',
            this.workouts.workouts(),
            this.history.entries(),
            this.workouts.activeWorkout()
        )
    );
    /** The workouts that use it, by name, e.g. "Leg day and an untitled workout". */
    protected readonly usedIn = computed(() => {
        const names = this.usage().workouts.map((w) => w.title.trim() || 'an untitled workout');
        return names.length <= 2
            ? names.join(' and ')
            : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    });

    protected readonly editing = signal(false);
    /** The dialog asking which workout to add it to is open. */
    protected readonly adding = signal(false);
    /** The library's workouts to add it to, in order; one already at MAX_STEPS can't be. */
    protected readonly workoutChoices = computed((): WorkoutChoice[] =>
        this.workouts.workouts().map((workout) => {
            const steps = allSteps(workout).length;
            const full = steps >= MAX_STEPS;
            return {
                id: workout.id,
                name: workout.title.trim() || 'Untitled workout',
                detail: full ? `Full, ${steps} steps` : counted(steps, 'step'),
                disabled: full,
            };
        })
    );
    /** Delete was pressed while a workout uses it, so it says why it can't be deleted. */
    protected readonly inUse = signal(false);
    private readonly undo = inject(UndoService);

    protected openEditor() {
        this.editing.set(true);
    }

    protected closeEditor() {
        this.editing.set(false);
        document.getElementById('exercise-page-edit')?.focus();
    }

    protected closeAdding() {
        this.adding.set(false);
        document.getElementById('exercise-page-add')?.focus();
    }

    /** Opens Create on the workout picked, or a new one, with the exercise added at the end. */
    protected addTo(workoutId: string | null) {
        const exercise = this.exercise();
        if (!exercise) {
            return;
        }
        this.adding.set(false);
        const queryParams = {
            ...(workoutId ? { editId: workoutId } : {}),
            add: exercise.id,
            from: this.router.url,
        };
        this.slide.navigate(
            this.router.serializeUrl(this.router.createUrlTree(['/setup'], { queryParams })),
            'in'
        );
    }

    protected toggleHidden() {
        const exercise = this.exercise();
        if (exercise) {
            this.exercises.setHidden(exercise.id, !this.hidden());
        }
    }

    /**
     * Deletes your own exercise straight away and offers to put it back (UndoService), rather
     * than asking first; or says why it can't be deleted, if a workout uses it. One with
     * history is hidden instead, so the history still has its name.
     */
    protected delete() {
        const exercise = this.exercise();
        if (!exercise || isBuiltIn(exercise)) {
            return;
        }
        const usage = this.usage();
        this.inUse.set(usage.workouts.length > 0);
        if (this.inUse()) {
            return;
        }
        if (usage.inHistory) {
            this.hideInstead(exercise);
            return;
        }
        // As it was, to put back on Undo: your note on it, and whether it was hidden
        const note = this.note();
        const hidden = this.hidden();
        this.exercises.deleteOwn(exercise.id);
        void this.router.navigateByUrl(this.backUrl).then(() =>
            this.undo.offerUndo({
                message: `Deleted ${exercise.name}`,
                // Back as it was, and back on its page, where it was deleted from
                undo: () => {
                    this.exercises.restoreOwn(exercise, note, hidden);
                    void this.router.navigateByUrl(exercisePath(exercise));
                },
            })
        );
    }

    /** It's in the history: hidden from the picker instead, with Undo. */
    private hideInstead(exercise: Exercise) {
        const wasHidden = this.hidden();
        this.exercises.setHidden(exercise.id, true);
        this.undo.offerUndo({
            message: `${exercise.name} is in your history, so it's hidden from the picker instead`,
            undo: () => {
                this.exercises.setHidden(exercise.id, wasHidden);
                document.getElementById('exercise-page-delete')?.focus();
            },
            dismissed: () => document.getElementById('exercise-page-hide')?.focus(),
        });
    }
}
