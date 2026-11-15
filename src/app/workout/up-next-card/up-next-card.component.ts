import { Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Exercise } from '../../models/exercise';
import { WorkoutView } from '../workout-view';

export type RestUpNext = NonNullable<ReturnType<WorkoutView['restUpNext']>>;

/**
 * What's after a rest, under the ring: "Up next", its name big, and the set, reps and weight or
 * time under it, in the next step's colour, pulsing with the face as the rest ends. When it's
 * an exercise, the whole card is a button for its details and Swap (RUN-11).
 */
@Component({
    selector: 'app-up-next-card',
    imports: [MatIconModule, NgTemplateOutlet],
    template: `
        @let up = next();
        @if (up.exercise; as exercise) {
            <button
                type="button"
                class="up-next"
                data-tour="next"
                aria-haspopup="dialog"
                [attr.data-next]="up.kind"
                [class.up-next--soon]="soon()"
                [class.up-next--muted]="muted()"
                [style.--pulse-delay]="pulseDelay()"
                (click)="details.emit(exercise)"
            >
                <ng-container [ngTemplateOutlet]="body" />
                <mat-icon class="up-next__more" aria-hidden="true">chevron_right</mat-icon>
            </button>
        } @else {
            <p
                class="up-next"
                data-tour="next"
                [attr.data-next]="up.kind"
                [class.up-next--soon]="soon()"
                [class.up-next--muted]="muted()"
                [style.--pulse-delay]="pulseDelay()"
            >
                <ng-container [ngTemplateOutlet]="body" />
            </p>
        }
        <ng-template #body>
            <span class="up-next__kind" aria-hidden="true">
                <mat-icon>{{ up.icon }}</mat-icon>
            </span>
            <span class="up-next__text">
                <span class="up-next__eyebrow">Up next<span class="sr-only">: </span></span>
                <span class="up-next__name">{{ up.name }}<span class="sr-only">, </span></span>
                <span class="up-next__detail">{{ up.detail }}</span>
            </span>
        </ng-template>
    `,
    styleUrl: './up-next-card.component.scss',
})
export class UpNextCardComponent {
    readonly next = input.required<RestUpNext>();
    /** The rest's last seconds: it pulses, on the beat of the countdown (WorkoutView.nextSoon). */
    readonly soon = input(false);
    readonly pulseDelay = input<string | null>(null);
    /** Paused: it steps back with the rest of the page. */
    readonly muted = input(false);
    /** The card was pressed, for the next exercise's details. */
    readonly details = output<Exercise>();
}
