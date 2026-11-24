import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Exercise } from '../../models/exercise';
import { WorkoutView } from '../workout-view';

export type UpNext = NonNullable<ReturnType<WorkoutView['upNextCard']>>;

/**
 * What's next, under the ring: "Up next", its name big, and the set, reps and weight or time
 * under it, in the next step's colour, pulsing with the face as a timed step ends. When it's an
 * exercise, the whole card is a button with an (i) for its details and Swap (RUN-11), to get
 * ready or swap it before it starts. Done on a rep step is the big button under it, not this
 * card (since 2026-11-24).
 */
@Component({
    selector: 'app-up-next-card',
    imports: [MatIconModule, NgTemplateOutlet],
    template: `
        @let up = next();
        @if (up.exercise; as exercise) {
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
                <span class="up-next__name">
                    <span
                        ><ng-container *ngTemplateOutlet="words; context: { $implicit: up.name }"
                    /></span>
                    <span class="sr-only">{{ up.detail ? ', ' : '' }}</span>
                </span>
                @if (up.detail) {
                    <span class="up-next__detail">{{ up.detail }}</span>
                }
            </span>
        </ng-template>
        <!-- A name, broken only between its words: "Push-up" isn't split at its hyphen unless
             it's too long for a line on its own -->
        <ng-template #words let-name>
            @for (word of wordsOf(name); track $index) {
                {{ $first ? '' : ' ' }}<span class="up-next__word">{{ word }}</span>
            }
        </ng-template>
    `,
    styleUrl: './up-next-card.component.scss',
})
export class UpNextCardComponent {
    readonly next = input.required<UpNext>();
    /** A timed step's last seconds: it pulses, on the beat of the countdown (WorkoutView.nextSoon). */
    readonly soon = input(false);
    readonly pulseDelay = input<string | null>(null);
    /** Paused: it steps back with the rest of the page. */
    readonly muted = input(false);
    /** The (i) card was pressed, for the next exercise's details. */
    readonly details = output<Exercise>();

    /** The card's button, if it's one, for focus. */
    readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');

    /** A name's words, each kept whole on its line (see `#words`). */
    protected wordsOf(name: string): string[] {
        return name.split(' ');
    }
}
