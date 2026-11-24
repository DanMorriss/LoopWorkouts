import { Component, computed, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { isReadyMade, Workout } from '../../../models/workout';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { MakeCopy } from '../../../shared/state/make-copy.service';

/**
 * On the summary of a ready-made workout (LIB-6) with a swap made (RUN-11), whose exercises
 * can't be changed: Make a copy, to keep the swap for next time. The
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

    /**
     * Only with a swap to keep: without one, its exercises are as wanted, so there's nothing to
     * copy for (shown on every ready-made workout until 2026-11-24). Make a copy stays on its
     * Details for that.
     */
    protected readonly readyMade = computed(() => {
        const workout = this.run.workout();
        return workout && isReadyMade(workout) && this.run.swaps().length > 0 ? workout : null;
    });

    /** Why to make a copy: its exercises stay as they are, so a swap is only for this time. */
    protected readonly message = computed(() => {
        const title = this.readyMade()?.title ?? '';
        const which = this.run.swaps().length === 1 ? 'your swap' : 'your swaps';
        return `${title} is ready-made, so its exercises stay as they are. To use ${which} next time, make a copy.`;
    });

    protected copy(workout: Workout) {
        const copy = this.makeCopy.of(workout.id);
        if (copy) {
            this.copied.emit(copy);
        }
    }
}
