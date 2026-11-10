import { Component, input } from '@angular/core';
import { RoundDotsComponent } from '../round-dots/round-dots.component';
import { StepStripComponent } from '../step-strip/step-strip.component';
import { setText } from '../round-progress';
import { RoundSlide } from '../workout-view';

/**
 * What the workout's line above the ring says: which set and round, the time left, the rounds
 * as dots, and the round's steps as a strip.
 */
@Component({
    selector: 'app-workout-round-line',
    imports: [RoundDotsComponent, StepStripComponent],
    templateUrl: './workout-round-line.component.html',
    styleUrl: './workout-round-line.component.scss',
})
export class WorkoutRoundLineComponent {
    readonly slide = input.required<RoundSlide>();
    protected readonly setText = setText;
}
