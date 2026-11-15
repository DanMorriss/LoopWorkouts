import { Component, computed, inject, input } from '@angular/core';
import { Workout } from '../../../models/workout';
import { EstimateBasis } from '../../../models/workout-estimate';
import { WorkoutEstimates } from '../../state/workout-estimates.service';

/** What a workout's estimate is from, beside it; nothing to add for one that's all timed. */
const HINTS: Record<EstimateBasis, string> = {
    clock: '',
    guess: "A first guess at the rep steps. Once you've done them, it's from your own pace.",
    yours: 'At your pace, from your last runs of it.',
    limit: 'Its time limit.',
};

/**
 * How long a workout takes, drawn as a stopwatch with "10 mins" in it and "About" over it,
 * with what that's from beside it, on a workout's own page: its Details, a ready-made plan's
 * workout and Create. One picture to screen readers, "Takes about 10 minutes". Nothing for one
 * that runs until stopped.
 */
@Component({
    selector: 'app-workout-time',
    template: `
        @if (time(); as time) {
            <div class="workout-time__watch" role="img" [attr.aria-label]="time.label">
                @if (time.face.over) {
                    <span class="workout-time__over" aria-hidden="true">{{ time.face.over }}</span>
                }
                <span class="workout-time__body" aria-hidden="true">
                    <svg class="workout-time__outline" viewBox="0 0 100 112">
                        <rect x="40" y="3" width="20" height="8" rx="3" />
                        <path d="M50 11v9M83 31l6-6" />
                        <circle cx="50" cy="65" r="42" />
                    </svg>
                    <span class="workout-time__face">
                        @for (line of time.face.lines; track $index) {
                            <span>{{ line }}</span>
                        }
                    </span>
                </span>
            </div>
            @if (time.hint) {
                <p class="workout-time__hint">{{ time.hint }}</p>
            }
        }
    `,
    styles: `
        @use 'type' as *;

        :host {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .workout-time__watch {
            display: grid;
            flex: none;
            justify-items: center;
            gap: 0.1rem;
        }

        .workout-time__over {
            @include small-type(0.75rem);
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
        }

        .workout-time__body {
            position: relative;
            display: block;
            width: 6.25rem;
            aspect-ratio: 100 / 112;
        }

        .workout-time__outline {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            fill: none;
            stroke: var(--accent);
            stroke-width: 4;
            stroke-linecap: round;
        }

        // In the dial, the circle's middle: 65 of the 112 down
        .workout-time__face {
            position: absolute;
            inset: 21% 8% 4%;
            display: grid;
            place-content: center;
            text-align: center;
            color: var(--text-strong);
            font-weight: 600;
            font-size: 1rem;
            line-height: 1.15;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
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

    private readonly estimates = inject(WorkoutEstimates);

    protected readonly time = computed(() => {
        const time = this.estimates.of(this.workout());
        return (
            time && {
                face: time.face,
                label: `Takes ${time.spoken}`,
                hint: HINTS[time.basis],
            }
        );
    });
}
