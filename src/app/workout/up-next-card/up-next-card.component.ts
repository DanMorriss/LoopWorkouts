import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Exercise } from '../../models/exercise';
import { WorkoutView } from '../workout-view';

export type UpNext = NonNullable<ReturnType<WorkoutView['upNextCard']>>;

/**
 * What's next, under the ring: "Up next", its name big, and the set, reps and weight or time
 * under it, in the next step's colour, pulsing with the face as a timed step ends. On a rep
 * step it's Done, on to it, and when what's next is an exercise its name, with an (i) by it, is
 * a button of its own for its details, to read before Done starts its clock. Otherwise, when it's an exercise, the whole card is
 * a button with an (i) for its details and Swap (RUN-11), to get ready or swap it before it
 * starts.
 */
@Component({
    selector: 'app-up-next-card',
    imports: [MatIconModule, NgTemplateOutlet],
    template: `
        @let up = next();
        @if (done()) {
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
                    [ngTemplateOutletContext]="{
                        eyebrow: 'Done · up next',
                        about: up.exercise,
                        quiet: true,
                    }"
                />
                <mat-icon class="up-next__end" aria-hidden="true">arrow_forward</mat-icon>
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
        <ng-template #body let-eyebrow="eyebrow" let-about="about" let-quiet="quiet">
            <span class="up-next__kind" aria-hidden="true">
                <mat-icon>{{ up.icon }}</mat-icon>
            </span>
            <!-- On Done, its name says it all, so only the next exercise's button is read out -->
            <span class="up-next__text">
                <span class="up-next__eyebrow" [attr.aria-hidden]="quiet || null"
                    >{{ eyebrow }}<span class="sr-only">: </span></span
                >
                <span class="up-next__name">
                    @if (about) {
                        <button
                            #info
                            type="button"
                            class="up-next__about"
                            aria-haspopup="dialog"
                            (click)="details.emit(about)"
                        >
                            {{ up.name
                            }}<mat-icon class="up-next__about-icon" aria-hidden="true"
                                >info</mat-icon
                            >
                        </button>
                    } @else {
                        <span [attr.aria-hidden]="quiet || null">{{ up.name }}</span>
                    }
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
    /** The (i) card, or the name on Done, was pressed, for the next exercise's details. */
    readonly details = output<Exercise>();

    /** The card's button, if it's one, or Done, for focus. */
    readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');
    /** On a rep step, the card Done is on, for its swell. */
    readonly card = viewChild<ElementRef<HTMLElement>>('card');
    /** On Done, the next exercise's name, for focus back from its details. */
    readonly info = viewChild<ElementRef<HTMLButtonElement>>('info');
}
