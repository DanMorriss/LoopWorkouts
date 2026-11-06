import { Component, computed, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { isReadyMade, Workout } from '../../../models/workout';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { MakeCopy } from '../../../shared/state/make-copy.service';

/**
 * On the summary of a ready-made workout (LIB-6), which stays as it is: in place of "Use these
 * settings next time?", Make a copy, to change it or keep changes like these. The summary
 * closes and the copy opens in Create.
 */
@Component({
    selector: 'app-summary-copy',
    imports: [MatIconModule],
    template: `
        @if (readyMade(); as workout) {
            <div class="summary-copy">
                <p>
                    {{ workout.title }} is a ready-made workout, so it stays as it is. Make a copy
                    to change it, or to keep changes like these for next time.
                </p>
                <button type="button" class="btn-pill summary-copy__make" (click)="copy(workout)">
                    <mat-icon aria-hidden="true">content_copy</mat-icon>
                    Make a copy
                </button>
            </div>
        }
    `,
    styles: `
        .summary-copy {
            display: grid;
            justify-items: start;
            gap: 0.5rem;
            margin-top: 1rem;

            p {
                margin: 0;
                color: var(--text-muted);
                font-size: 0.9rem;
                line-height: 1.45;
            }
        }
    `,
})
export class SummaryCopyComponent {
    private readonly run = inject(ActiveRunService);
    private readonly makeCopy = inject(MakeCopy);

    /** The copy just made, for the workout page to open. */
    readonly copied = output<Workout>();

    protected readonly readyMade = computed(() => {
        const workout = this.run.workout();
        return workout && isReadyMade(workout) ? workout : null;
    });

    protected copy(workout: Workout) {
        const copy = this.makeCopy.of(workout.id);
        if (copy) {
            this.copied.emit(copy);
        }
    }
}
