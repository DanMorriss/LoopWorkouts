import { Component, computed, inject, input } from '@angular/core';
import { Workout } from '../../../models/workout';
import { WorkoutEstimates } from '../../state/workout-estimates.service';

/**
 * How long a workout takes, drawn: a stopwatch as tall as an icon button (44px, its top
 * button and all), "10" over "mins" in it. One picture to screen readers, "Takes about 10 minutes". Nothing for one that runs until stopped.
 */
@Component({
    selector: 'app-workout-watch',
    template: `
        @if (time(); as time) {
            <div class="workout-watch" role="img" [attr.aria-label]="time.label">
                <span class="workout-watch__body" aria-hidden="true">
                    <svg class="workout-watch__outline" viewBox="0 0 100 112">
                        <rect x="40" y="3" width="20" height="8" rx="3" />
                        <path d="M50 11v9M83 31l6-6" />
                        <circle cx="50" cy="65" r="42" />
                    </svg>
                    <span class="workout-watch__face">
                        <span class="workout-watch__value">{{ time.face.value }}</span>
                        <span class="workout-watch__unit">{{ time.face.unit }}</span>
                    </span>
                </span>
            </div>
        }
    `,
    styles: `
        @use 'type' as *;

        :host {
            display: block;
            flex: none;
        }

        // 100 by 112 units: 44px tall, as an icon button, at the standard text size; larger
        // with larger text, so the time inside it still fits
        .workout-watch__body {
            position: relative;
            display: block;
            width: calc(2.75rem * 100 / 112);
            aspect-ratio: 100 / 112;
        }

        .workout-watch__outline {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            fill: none;
            stroke: var(--accent);
            stroke-width: 4.5;
            stroke-linecap: round;
        }

        // In the dial: its middle is 65 of the 112 down
        .workout-watch__face {
            position: absolute;
            inset: 20% 4% 3%;
            display: grid;
            place-content: center;
            justify-items: center;
            color: var(--text-strong);
            line-height: 1;
            white-space: nowrap;
        }

        .workout-watch__value {
            font-size: 0.8rem;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }

        .workout-watch__unit {
            @include small-type(0.55rem);
            font-weight: 600;
        }
    `,
})
export class WorkoutWatchComponent {
    readonly workout =
        input.required<Pick<Workout, 'id' | 'blocks' | 'repeats' | 'timeLimitSeconds'>>();

    private readonly estimates = inject(WorkoutEstimates);

    protected readonly time = computed(() => {
        const time = this.estimates.of(this.workout());
        return time && { face: time.face, label: `Takes ${time.spoken}` };
    });
}
