import { CdkDrag, CdkDragPlaceholder, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, FormRoot } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { WEEKDAYS } from '../models/plan';
import { BackLinkComponent } from '../nav/back-link/back-link.component';
import { LeaveCheck, LeaveQuestion } from '../nav/leave-check';
import { ExerciseDetailsDialogComponent } from '../shared/components/exercise-details-dialog/exercise-details-dialog.component';
import { ExerciseEditorComponent } from '../shared/components/exercise-editor/exercise-editor.component';
import { InfinitySwitchComponent } from '../shared/components/infinity-switch/infinity-switch.component';
import { SwapExerciseDialogComponent } from '../shared/components/swap-exercise-dialog/swap-exercise-dialog.component';
import { LabelledWheelComponent } from '../shared/components/wheel-picker/labelled-wheel.component';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { TourService } from '../tour/tour.service';
import { BrowseExercisesDialogComponent } from './browse-exercises-dialog/browse-exercises-dialog.component';
import { SetupDrag } from './setup-drag';
import { SetupExercises } from './setup-exercises';
import { SetupSupersets } from './setup-supersets';
import { StepDragPreviewComponent } from './step-drag-preview/step-drag-preview.component';
import { BACK_PAGE } from './step-model';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog/unsaved-changes-dialog.component';
import { SetupStepBodyComponent } from './setup-step-body/setup-step-body.component';
import { SetupStepHeaderComponent } from './setup-step-header/setup-step-header.component';
import { WorkoutSetupForm } from './workout-setup-form';

/**
 * Create: making a workout, or changing one. The form is WorkoutSetupForm; this is the page
 * around it, opening what the address asks for, and asking before leaving with changes.
 */
@Component({
    selector: 'app-workout-setup',
    templateUrl: './workout-setup.component.html',
    styleUrls: ['./workout-setup.component.scss', './workout-setup-supersets.scss'],
    providers: [WorkoutSetupForm, SetupExercises, SetupDrag, SetupSupersets],
    host: {
        '(window:beforeunload)': 'warnBeforeUnload($event)',
        '(document:click)': 'setup.closePopups($event)',
    },
    imports: [
        BackLinkComponent,
        UnsavedChangesDialogComponent,
        CdkDropList,
        CdkDrag,
        CdkDragPreview,
        CdkDragPlaceholder,
        FormRoot,
        FormField,
        LabelledWheelComponent,
        InfinitySwitchComponent,
        ExerciseEditorComponent,
        ExerciseDetailsDialogComponent,
        SwapExerciseDialogComponent,
        BrowseExercisesDialogComponent,
        StepDragPreviewComponent,
        SetupStepHeaderComponent,
        SetupStepBodyComponent,
        MatFormFieldModule,
        MatIconModule,
    ],
})
export class WorkoutSetupComponent {
    private readonly workoutStore = inject(WorkoutStore);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    protected readonly setup = inject(WorkoutSetupForm);
    protected readonly exercises = inject(SetupExercises);
    protected readonly drag = inject(SetupDrag);

    protected readonly back = signal({ url: '/library', label: 'Workouts' });
    /** The warning about leaving with unsaved changes is open. */
    protected readonly leaveAsked = signal(false);
    private leaving: { answer: Promise<boolean>; give: (leave: boolean) => void } | null = null;
    protected readonly unsavedHint = computed(() => {
        const name = this.setup.model().title.trim();
        if (!this.setup.editingWorkoutId()) {
            return "This workout hasn't been saved.";
        }
        return name
            ? `Your changes to ${name} haven't been saved.`
            : "Your changes haven't been saved.";
    });
    /** For LeaveCheck: nothing to ask with no changes; otherwise opens the warning. */
    private readonly askToLeave: LeaveQuestion = () => {
        if (!this.setup.hasChanges()) {
            return null;
        }
        if (!this.leaving) {
            let give!: (leave: boolean) => void;
            const answer = new Promise<boolean>((resolve) => (give = resolve));
            this.leaving = { answer, give };
            this.leaveAsked.set(true);
        }
        return this.leaving.answer;
    };

    constructor() {
        const leaveCheck = inject(LeaveCheck);
        const tour = inject(TourService);
        leaveCheck.set(this.askToLeave);
        inject(DestroyRef).onDestroy(() => leaveCheck.clear(this.askToLeave));

        // Not just the snapshot: the page stays open when only the query changes, e.g. Create
        // from the menu while editing, which goes from ?editId=1 to a new workout
        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            this.back.set(this.backFrom(params.get('from')));
            if (this.addedExercise) {
                // Only ?add= taken off the address, after adding it: the form stays as it is
                this.addedExercise = false;
                return;
            }
            this.setup.load(this.setup.findWorkoutToEdit(params));
            this.setup.planOn.set(planDay(params.get('planOn')));
            // The first time it opens for a new workout on this device, a tour of it (BLD-17)
            if (this.setup.editingWorkoutId() === null) {
                tour.startOnce('create');
            }
            const add = params.get('add');
            if (add !== null) {
                this.setup.addExercise(add);
                this.addedExercise = true;
                // Off the address, so going back to it or reloading doesn't add it again
                void this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: { add: null },
                    queryParamsHandling: 'merge',
                    replaceUrl: true,
                });
            }
        });
    }
    /**
     * Where ‹ goes: the page it was opened from (`?from=`), if that's a workout's details, an
     * exercise's page or the Plan page, otherwise Workouts. With unsaved changes, LeaveCheck asks first.
     */
    private backFrom(from: string | null): { url: string; label: string } {
        if (from === '/plan') {
            return { url: from, label: 'Plan' };
        }
        const page = from?.match(BACK_PAGE);
        if (!from || !page) {
            return { url: '/library', label: 'Workouts' };
        }
        const workoutId = page[1];
        const label = workoutId
            ? this.workoutStore.findWorkoutById(workoutId)?.title.trim() || 'Workout'
            : 'Exercise';
        return { url: from, label };
    }

    /** The answer to the warning: discarding counts the form as unchanged, so it isn't asked again. */
    protected answerLeaving(leave: boolean) {
        this.leaveAsked.set(false);
        if (leave) {
            this.setup.savedState.set(JSON.stringify(this.setup.model()));
        }
        this.leaving?.give(leave);
        this.leaving = null;
    }
    /** Closing or reloading the tab: the browser's own question, if there are changes. */
    protected warnBeforeUnload(event: BeforeUnloadEvent) {
        if (this.setup.hasChanges()) {
            event.preventDefault();
        }
    }
    /** An exercise was just added from ?add=, which is being taken off the address. */
    private addedExercise = false;
}

/** A day of the week from the address's `?planOn=` (0 for Monday), or null if it isn't one. */
function planDay(param: string | null): number | null {
    const day = Number(param);
    return param !== null && /^\d$/.test(param) && day < WEEKDAYS.length ? day : null;
}
