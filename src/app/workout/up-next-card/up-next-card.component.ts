import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Exercise } from '../../models/exercise';
import { WorkoutView } from '../workout-view';

export type UpNext = NonNullable<ReturnType<WorkoutView['upNextCard']>>;

/**
 * What's next, under the ring: "Up next", its name big, and the set, reps and weight or time
 * under it, in the next step's colour, pulsing with the face as a timed step ends. On a rep
 * step it's Done, on to it. Otherwise, when it's an exercise, it's a button with an (i) for its
 * details and Swap (RUN-11), to get ready or swap it before it starts.
 */
@Component({
    selector: 'app-up-next-card',
    imports: [MatIconModule, NgTemplateOutlet],
    template: `
        @let up = next();
        @if (done()) {
            <button
                #button
                type="button"
                class="up-next up-next--done"
                data-tour="next"
                aria-keyshortcuts="Space"
                [attr.aria-label]="'Done. Next: ' + said()"
                [attr.data-next]="up.kind"
                (click)="pressed.emit()"
            >
                <ng-container
                    [ngTemplateOutlet]="body"
                    [ngTemplateOutletContext]="{ eyebrow: 'Done · up next' }"
                />
                <mat-icon class="up-next__end" aria-hidden="true">arrow_forward</mat-icon>
            </button>
        } @else if (up.exercise; as exercise) {
            <button
                #button
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
                <ng-container
                    [ngTemplateOutlet]="body"
                    [ngTemplateOutletContext]="{ eyebrow: 'Up next' }"
                />
                <mat-icon class="up-next__end" aria-hidden="true">info</mat-icon>
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
                <ng-container
                    [ngTemplateOutlet]="body"
                    [ngTemplateOutletContext]="{ eyebrow: 'Up next' }"
                />
            </p>
        }
        <ng-template #body let-eyebrow="eyebrow">
            <span class="up-next__kind" aria-hidden="true">
                <mat-icon>{{ up.icon }}</mat-icon>
            </span>
            <span class="up-next__text">
                <span class="up-next__eyebrow">{{ eyebrow }}<span class="sr-only">: </span></span>
                <span class="up-next__name"
                    >{{ up.name }}<span class="sr-only">{{ up.detail ? ', ' : '' }}</span></span
                >
                @if (up.detail) {
                    <span class="up-next__detail">{{ up.detail }}</span>
                }
            </span>
        </ng-template>
    `,
    styleUrl: './up-next-card.component.scss',
})
export class UpNextCardComponent {
    readonly next = input.required<UpNext>();
    /** What's next in a line, for Done's name: "Rest · 01:00" (WorkoutView.upNext). */
    readonly said = input('');
    /** A rep step, not paused: the card is Done, on to what's next. */
    readonly done = input(false);
    /** A timed step's last seconds: it pulses, on the beat of the countdown (WorkoutView.nextSoon). */
    readonly soon = input(false);
    readonly pulseDelay = input<string | null>(null);
    /** Paused: it steps back with the rest of the page. */
    readonly muted = input(false);
    /** Done was pressed. */
    readonly pressed = output();
    /** The (i) card was pressed, for the next exercise's details. */
    readonly details = output<Exercise>();

    /** The card's button, if it's one, for focus and Done's swell. */
    readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');
}
