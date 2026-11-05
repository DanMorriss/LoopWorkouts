import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogComponent } from '../dialog/dialog.component';
import { ExerciseDetailsComponent } from '../exercise-details/exercise-details.component';
import { Exercise } from '../../../models/exercise';

/**
 * An exercise in full: what its page shows, without leaving the workout. In Create it's the
 * exercise picked for a step, so you can see it's the one you want (EXR-11), and Pick another
 * takes you back to the name box to choose again; in a workout it's the step's exercise, to
 * check how it's done (RUN-9), and Swap exercise picks something to do instead (RUN-11).
 * Focus starts on its name and is trapped inside while it's open.
 * ‹ Back at its top, Escape or a click outside close it.
 */
@Component({
    selector: 'app-exercise-details-dialog',
    imports: [DialogComponent, MatIconModule, ExerciseDetailsComponent],
    template: `
        <app-dialog labelledBy="exercise-details-title" (closed)="closed.emit()">
            <!-- Focus starts here, so it opens at the top rather than at the buttons -->
            <h2 id="exercise-details-title" class="details__title" tabindex="-1" cdkFocusInitial>
                {{ exercise().name }}
            </h2>
            <app-exercise-details [exercise]="exercise()" />
            @if (canPickAnother()) {
                <div class="details__actions">
                    <button
                        type="button"
                        class="btn-pill details__pick-another"
                        (click)="pickAnother.emit()"
                    >
                        <mat-icon aria-hidden="true">swap_horiz</mat-icon>
                        {{ pickAnotherLabel() }}
                    </button>
                </div>
            }
        </app-dialog>
    `,
    styleUrl: './exercise-details-dialog.component.scss',
})
export class ExerciseDetailsDialogComponent {
    readonly exercise = input.required<Exercise>();
    /** Offers Pick another, for a step being set up. */
    readonly canPickAnother = input(false);
    /** What Pick another says, e.g. "Swap exercise" mid-workout (RUN-11). */
    readonly pickAnotherLabel = input('Pick another');
    readonly closed = output<void>();
    /** Back to the step's name box, to choose a different exercise. */
    readonly pickAnother = output<void>();
}
