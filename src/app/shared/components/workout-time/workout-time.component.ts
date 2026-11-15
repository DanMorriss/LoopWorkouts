import { Component, computed, inject, input } from '@angular/core';
import { Workout } from '../../../models/workout';
import { EstimateBasis } from '../../../models/workout-estimate';
import { WorkoutEstimates } from '../../state/workout-estimates.service';
import { WorkoutWatchComponent } from '../workout-watch/workout-watch.component';

/** What a workout's estimate is from; nothing to add for one that's all timed. */
const HINTS: Record<EstimateBasis, string> = {
    clock: '',
    guess: "A first guess at the rep steps. Once you've done them, it's from your own pace.",
    yours: 'At your pace, from your last runs of it.',
    limit: 'Its time limit.',
};

/**
 * How long a workout takes, as a stopwatch (`WorkoutWatchComponent`) with what that's from
 * beside it, on a ready-made plan's workout and Create. Details has its stopwatch by its
 * heart, so shows only what it's from here (`watch` false). Nothing for one that runs until
 * stopped.
 */
@Component({
    selector: 'app-workout-time',
    imports: [WorkoutWatchComponent],
    template: `
        @if (watch()) {
            <app-workout-watch [workout]="workout()" />
        }
        @if (hint(); as hint) {
            <p class="workout-time__hint">{{ hint }}</p>
        }
    `,
    styles: `
        :host {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .workout-time__hint {
            margin: 0;
            color: var(--text-muted);
            font-size: 0.9rem;
            text-align: start;
        }
    `,
})
export class WorkoutTimeComponent {
    readonly workout =
        input.required<Pick<Workout, 'id' | 'blocks' | 'repeats' | 'timeLimitSeconds'>>();
    /** Whether to draw the stopwatch, or only say what it's from. */
    readonly watch = input(true);

    private readonly estimates = inject(WorkoutEstimates);

    protected readonly hint = computed(() => {
        const time = this.estimates.of(this.workout());
        return time && HINTS[time.basis];
    });
}
