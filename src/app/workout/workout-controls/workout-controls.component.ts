import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LaterListComponent } from '../later-list/later-list.component';
import { WorkoutView } from '../workout-view';

/**
 * The media-player controls under the ring (RUN-12): the big button in the middle, Pause (or
 * Start, while a timed exercise waits for it, RUN-14), Skip on its right, and Later, the
 * exercises skipped to do later, on its left (RUN-16). Not while paused, when Resume and End
 * workout are over the ring. The captions repeat the buttons' names for sighted users, so
 * screen readers skip them. Held over the foot of the page where it's taller than the screen.
 */
@Component({
    selector: 'app-workout-controls',
    imports: [LaterListComponent, MatIconModule],
    templateUrl: './workout-controls.component.html',
    styleUrl: './workout-controls.component.scss',
    host: { class: 'workout-controls', 'data-tour': 'controls' },
})
export class WorkoutControlsComponent {
    protected readonly view = inject(WorkoutView);
    /** The Up next card, which an exercise picked to do later flies down to. */
    readonly nextCard = input<() => HTMLElement | undefined>(() => undefined);
    /** The big button was pressed: Pause, or Start while waiting. */
    readonly main = output<void>();
    readonly skipped = output<void>();
    /** The last exercise put aside has been picked, so Later's gone: focus is the page's. */
    readonly emptied = output<void>();

    /** The big button, for the page to put focus on. */
    readonly mainButton = viewChild<ElementRef<HTMLButtonElement>>('mainButton');
    /** Later, for the page to fly a skipped exercise into. */
    readonly laterList = viewChild(LaterListComponent);
}
