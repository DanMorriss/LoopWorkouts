import { CdkTrapFocus } from '@angular/cdk/a11y';
import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogBackComponent } from '../dialog-back/dialog-back.component';
import { ExerciseDetailsComponent } from '../exercise-details/exercise-details.component';
import { Exercise } from '../../../models/exercise';
import { growFromClick } from '../../dialog-origin';

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
    imports: [CdkTrapFocus, DialogBackComponent, MatIconModule, ExerciseDetailsComponent],
    template: `
        <div
            class="details-overlay dialog-overlay"
            role="presentation"
            (click)="closed.emit()"
            (keydown.escape)="closed.emit()"
        >
            <div
                #card
                class="details dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby="exercise-details-title"
                (click)="$event.stopPropagation()"
            >
                <app-dialog-back (back)="closed.emit()" />
                <!-- Focus starts here, so it opens at the top rather than at the buttons -->
                <h2
                    id="exercise-details-title"
                    class="details__title"
                    tabindex="-1"
                    cdkFocusInitial
                >
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
            </div>
        </div>
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

    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

    constructor() {
        // Grows out of the Details button that opened it, and shrinks back into it
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }
}
