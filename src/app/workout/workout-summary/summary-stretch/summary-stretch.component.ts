import { Component, input } from '@angular/core';
import { ROUTINE_HOLD_SECONDS, StretchOffer } from '../../../models/stretch-routine';
import { WorkoutOutlineComponent } from '../../../shared/components/workout-outline/workout-outline.component';

/**
 * A few stretches for the muscles this workout worked hardest, on its summary (the summary's
 * `stretchOffer()`): what they are and how long they take. The summary's Stretch button, in
 * its bottom bar, starts them; until 2026-11-24 this had a Start of its own too.
 */
@Component({
    selector: 'app-summary-stretch',
    imports: [WorkoutOutlineComponent],
    template: `
        @let stretches = offer();
        <section class="stretch" aria-labelledby="summary-stretch">
            <h3 id="summary-stretch">Stretch what you worked</h3>
            <p class="stretch__hint">
                {{ stretches.time.text }} for your {{ stretches.muscles }}, each held
                {{ holdSeconds }} seconds.
            </p>
            <app-workout-outline class="stretch__outline" [workout]="stretches.workout" />
        </section>
    `,
    styleUrl: './summary-stretch.component.scss',
})
export class SummaryStretchComponent {
    readonly offer = input.required<StretchOffer>();

    protected readonly holdSeconds = ROUTINE_HOLD_SECONDS;
}
