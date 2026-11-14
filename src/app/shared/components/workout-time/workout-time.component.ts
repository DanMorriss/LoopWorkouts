import { Component, computed, inject, input } from '@angular/core';
import { Workout } from '../../../models/workout';
import { EstimateBasis } from '../../../models/workout-estimate';
import { WorkoutEstimates } from '../../state/workout-estimates.service';

/** What a workout's estimate is from, under it; nothing to add for one that's all timed. */
const HINTS: Record<EstimateBasis, string> = {
    clock: '',
    guess: "A first guess at the rep steps. Once you've finished it, it's from your own pace.",
    yours: 'At your pace, from your last runs of it.',
    limit: 'Its time limit.',
};

/**
 * How long a workout takes, "About 25 min", with what that's from, on a workout's own page:
 * its Details, and a ready-made plan's workout. Nothing for one that runs until stopped.
 */
@Component({
    selector: 'app-workout-time',
    template: `
        @if (time(); as time) {
            <p class="workout-time__length">{{ time.text }}</p>
            @if (time.hint) {
                <p class="workout-time__hint">{{ time.hint }}</p>
            }
        }
    `,
    styles: `
        :host {
            display: grid;
            gap: 0.15rem;
        }

        .workout-time__length {
            margin: 0;
            color: var(--text-strong);
            font-weight: 600;
        }

        .workout-time__hint {
            margin: 0;
            color: var(--text-muted);
            font-size: 0.9rem;
        }
    `,
})
export class WorkoutTimeComponent {
    readonly workout =
        input.required<Pick<Workout, 'id' | 'blocks' | 'repeats' | 'timeLimitSeconds'>>();

    private readonly estimates = inject(WorkoutEstimates);

    protected readonly time = computed(() => {
        const time = this.estimates.of(this.workout());
        return time && { text: time.text, hint: HINTS[time.basis] };
    });
}
