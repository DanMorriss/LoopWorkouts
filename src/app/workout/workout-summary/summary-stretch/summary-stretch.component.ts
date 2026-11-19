import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ROUTINE_HOLD_SECONDS, StretchOffer } from '../../../models/stretch-routine';
import { Workout } from '../../../models/workout';
import { WorkoutOutlineComponent } from '../../../shared/components/workout-outline/workout-outline.component';

/**
 * A few stretches for the muscles this workout worked hardest, on its summary (the summary's
 * `stretchOffer()`): what they are, how long they take, and Start, which ends this run and
 * starts them. The summary's bottom bar has the same Start, as Stretch what you worked.
 */
@Component({
    selector: 'app-summary-stretch',
    imports: [MatIconModule, WorkoutOutlineComponent],
    template: `
        @let stretches = offer();
        <section class="stretch" aria-labelledby="summary-stretch">
            <h3 id="summary-stretch">Stretch what you worked</h3>
            <p class="stretch__hint">
                {{ stretches.time.text }} for your {{ stretches.muscles }}, each held
                {{ holdSeconds }} seconds.
            </p>
            <app-workout-outline class="stretch__outline" [workout]="stretches.workout" />
            <button
                type="button"
                class="btn-pill stretch__start"
                [attr.aria-label]="'Start stretches, ' + stretches.time.spoken"
                (click)="start.emit(stretches.workout)"
            >
                <mat-icon aria-hidden="true">play_arrow</mat-icon>
                Start stretches
            </button>
        </section>
    `,
    styleUrl: './summary-stretch.component.scss',
})
export class SummaryStretchComponent {
    readonly offer = input.required<StretchOffer>();
    /** Start stretches: the routine, to run in this one's place. */
    readonly start = output<Workout>();

    protected readonly holdSeconds = ROUTINE_HOLD_SECONDS;
}
