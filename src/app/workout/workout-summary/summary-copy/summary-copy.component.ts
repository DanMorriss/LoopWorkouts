import { Component, computed, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { isReadyMade, Workout } from '../../../models/workout';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { MakeCopy } from '../../../shared/state/make-copy.service';

/**
 * On the summary of a ready-made workout (LIB-6), whose reps and weights can be changed but not
 * its exercises: Make a copy, to change those, or to keep a swap (RUN-11) for next time. The
 * summary closes and the copy opens in Create.
 */
@Component({
    selector: 'app-summary-copy',
    imports: [MatIconModule],
    template: `
        @if (readyMade(); as workout) {
            <div class="summary-copy">
                <p>{{ message() }}</p>
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

    /** Why to make a copy: its exercises stay as they are, so a swap is only for this time. */
    protected readonly message = computed(() => {
        const title = this.readyMade()?.title ?? '';
        const swaps = this.run.swaps().length;
        if (swaps > 0) {
            const which = swaps === 1 ? 'your swap' : 'your swaps';
            return `${title} is ready-made, so its exercises stay as they are. To use ${which} next time, make a copy.`;
        }
        return `${title} is ready-made: its reps and weights can change, but to change its exercises, make a copy.`;
    });

    protected copy(workout: Workout) {
        const copy = this.makeCopy.of(workout.id);
        if (copy) {
            this.copied.emit(copy);
        }
    }
}
