import { Component, computed, inject, linkedSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { REP_OPTIONS } from '../../models/workout';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { WheelPickerComponent } from '../../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { ownExerciseName } from '../own-exercise-name';

/**
 * Time ran out part-way through a rep step (RUN-8): how many reps of it were done? A card over
 * the finished workout, before the summary, with a Reps wheel starting at the step's reps.
 * Add set logs that many at the step's weight; Skip, ‹ Back, Escape or a click outside leave
 * it out. Either way the summary follows, as
 * the run no longer asks (ActiveRunService.askingLastSet). Focus starts on Add set. Where it's used, it has
 * animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-last-set-dialog',
    imports: [DialogComponent, MatIconModule, WheelPickerComponent],
    template: `
        @if (lastSet(); as last) {
            <app-dialog
                labelledBy="last-set-title"
                describedBy="last-set-question"
                [width]="380"
                (closed)="pass()"
            >
                <h2 id="last-set-title" class="last-set__title">How many reps?</h2>
                <p id="last-set-question" class="last-set__question">
                    Time ran out during {{ last.name }}.
                </p>
                <div class="last-set__wheel">
                    <app-wheel-picker
                        class="last-set__reps"
                        [value]="reps()"
                        (valueChange)="reps.set($event)"
                        [options]="repOptions"
                        labelledBy="last-set-title"
                    />
                    <span aria-hidden="true">reps</span>
                </div>
                <div class="last-set__actions">
                    <button type="button" class="btn-main" cdkFocusInitial (click)="add()">
                        <mat-icon aria-hidden="true">add</mat-icon>
                        Add set
                    </button>
                    <button type="button" class="btn-pill" (click)="pass()">Skip</button>
                </div>
            </app-dialog>
        }
    `,
    styleUrl: './last-set-dialog.component.scss',
})
export class LastSetDialogComponent {
    private readonly run = inject(ActiveRunService);
    private readonly exerciseName = ownExerciseName(inject(ExerciseStore));

    protected readonly repOptions = REP_OPTIONS;
    /** The rep step time ran out on: its name as it is now, and its reps. */
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
    protected readonly reps = linkedSignal(() => this.lastSet()?.reps ?? 1);

    protected add() {
        this.run.logLastSet(this.reps());
    }

    protected pass() {
        this.run.passLastSet();
    }
}
