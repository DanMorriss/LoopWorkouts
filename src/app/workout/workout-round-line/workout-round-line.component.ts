import { Component, input } from '@angular/core';
import { RoundDotsComponent } from '../round-dots/round-dots.component';
import { StepStripComponent } from '../step-strip/step-strip.component';
import { capitalise } from '../../models/exercise';
import { GroupSet } from '../../models/workout';
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
    /**
     * Which set it is, starting the line: "Set 2 of 3", "Superset round 2 of 3", or "Round 2 of
     * 3" where the workout is that one superset (`sole`).
     */
    protected setLine(set: GroupSet, sole: boolean): string {
        return sole ? `Round ${set.set + 1} of ${set.of}` : capitalise(setText(set));
    }
}
