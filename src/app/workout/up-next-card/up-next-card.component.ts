import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Exercise } from '../../models/exercise';
import { WorkoutView } from '../workout-view';

export type UpNext = NonNullable<ReturnType<WorkoutView['upNextCard']>>;

/**
 * What's next, under the ring: "Up next", its name big, and the set, reps and weight or time
 * under it, in the next step's colour, pulsing with the face as a timed step ends. On a rep
 * step the whole card is Done, on to it, marked ✓ Done at its end; when what's next is an
 * exercise, an (i) beside the card opens its details, to read before Done starts its clock.
 * Otherwise, when it's an exercise, the whole card is a button with an (i) for its details and
 * Swap (RUN-11), to get ready or swap it before it starts.
 */
@Component({
    selector: 'app-up-next-card',
    imports: [MatIconModule, NgTemplateOutlet],
    template: `
        @let up = next();
        @if (done()) {
            <div class="up-next__row">
                <div
                    #card
                    class="up-next up-next--done-card"
                    data-tour="next"
                    [attr.data-next]="up.kind"
                >
                    <button
                        #button
                        type="button"
                        class="up-next--done"
                        aria-keyshortcuts="Space"
                        [attr.aria-label]="'Done. Next: ' + said()"
                        (click)="pressed.emit()"
                    ></button>
                    <ng-container
                        [ngTemplateOutlet]="body"
                        [ngTemplateOutletContext]="{ eyebrow: 'Up next', quiet: true }"
                    />
                    <span class="up-next__done-mark" aria-hidden="true">
                        <mat-icon>check</mat-icon>
                        <span class="up-next__done-word">Done</span>
                    </span>
                </div>
                <!-- The next exercise's details, beside Done rather than on it, so the whole
                     card is Done to a hand slapping it -->
                @if (up.exercise; as exercise) {
                    <button
                        #info
                        type="button"
                        class="btn-icon up-next__about"
                        aria-haspopup="dialog"
                        [attr.aria-label]="up.name"
                        (click)="details.emit(exercise)"
                    >
                        <mat-icon aria-hidden="true">info</mat-icon>
                    </button>
                }
            </div>
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
        <ng-template #body let-eyebrow="eyebrow" let-quiet="quiet">
            <span class="up-next__kind" aria-hidden="true">
                <mat-icon>{{ up.icon }}</mat-icon>
            </span>
            <!-- On Done, its name says it all, so the card's text isn't read out again -->
            <span class="up-next__text">
                <span class="up-next__eyebrow" [attr.aria-hidden]="quiet || null"
                    >{{ eyebrow }}<span class="sr-only">: </span></span
                >
                <span class="up-next__name">
                    <span [attr.aria-hidden]="quiet || null"
                        ><ng-container *ngTemplateOutlet="words; context: { $implicit: up.name }"
                    /></span>
                    <span class="sr-only" [attr.aria-hidden]="quiet || null">{{
                        up.detail ? ', ' : ''
                    }}</span>
                </span>
                @if (up.detail) {
                    <span class="up-next__detail" [attr.aria-hidden]="quiet || null">{{
                        up.detail
                    }}</span>
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
    /** The (i) card, or the (i) beside Done, was pressed, for the next exercise's details. */
    readonly details = output<Exercise>();

    /** The card's button, if it's one, or Done, for focus. */
    readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');
    /** On a rep step, the card Done is on, for its swell. */
    readonly card = viewChild<ElementRef<HTMLElement>>('card');
    /** On Done, the (i) beside it, for focus back from the next exercise's details. */
    readonly info = viewChild<ElementRef<HTMLButtonElement>>('info');

    /** A name's words, each kept whole on its line (see `#words`). */
    protected wordsOf(name: string): string[] {
        return name.split(' ');
    }
}
