import { Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LaterListComponent } from '../later-list/later-list.component';
import { WorkoutView } from '../workout-view';

/**
 * The media-player controls under the ring (RUN-12): the big button in the middle, the one
 * thing to press now (Pause; Done on a rep step, with a smaller Pause on its left; Start, while
 * a timed exercise waits for it, RUN-14), Skip on its right, and Later, the exercises skipped to
 * do later, on its left (RUN-16). Not while paused, when Resume and End workout are over the
 * ring. The captions repeat the buttons' names for sighted users, so
 * screen readers skip them. Held over the foot of the page where it's taller than the screen.
 */
const ICONS = { start: 'play_arrow', done: 'check', pause: 'pause' } as const;
const CAPTIONS = { start: 'Start', done: 'Done', pause: 'Pause' } as const;

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
    /** The big button was pressed: Pause, Done on a rep step, or Start while waiting. */
    readonly main = output<void>();
    /** The smaller Pause beside Done, on a rep step. */
    readonly paused = output<void>();
    readonly skipped = output<void>();
    /** The last exercise put aside has been picked, so Later's gone: focus is the page's. */
    readonly emptied = output<void>();

    /** What the big button is now (Done since 2026-11-24, when it was the Up next card). */
    protected readonly mode = computed(() =>
        this.view.isWaiting() ? 'start' : this.view.isRepsActive() ? 'done' : 'pause'
    );
    protected readonly name = computed(() => {
        const mode = this.mode();
        return mode === 'start'
            ? 'Start'
            : mode === 'done'
              ? `Done. Next: ${this.view.upNext()}`
              : 'Pause';
    });
    protected readonly icon = computed(() => ICONS[this.mode()]);
    protected readonly caption = computed(() => CAPTIONS[this.mode()]);

    /** The big button, for the page to put focus on. */
    readonly mainButton = viewChild<ElementRef<HTMLButtonElement>>('mainButton');
    /** Later, for the page to fly a skipped exercise into. */
    readonly laterList = viewChild(LaterListComponent);
}
