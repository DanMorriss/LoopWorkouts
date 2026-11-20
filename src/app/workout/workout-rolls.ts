import { AnimationCallbackEvent, inject } from '@angular/core';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { rollIn, rollOut, RollWay } from './step-roll';
import { WorkoutView } from './workout-view';

/**
 * How the workout page's text rolls between steps (see `step-roll.ts`): the face's up, or
 * sideways for a new round, or settling in for a rest; the round line above the ring always
 * sideways, with a new round. With reduced motion, a short cross-fade. Make it in an
 * injection context, beside the page's WorkoutView.
 */
export class WorkoutRolls {
    private readonly view = inject(WorkoutView);
    private readonly reducedMotion = injectPrefersReducedMotion();

    private faceRoll(): RollWay {
        if (this.reducedMotion()) {
            return 'fade';
        }
        if (this.view.newRound()) {
            return 'sideways';
        }
        return this.view.isRestActive() ? 'rest' : 'up';
    }

    private roundRoll(): RollWay {
        return this.reducedMotion() ? 'fade' : 'sideways';
    }

    faceIn(event: AnimationCallbackEvent) {
        rollIn(event, this.faceRoll());
    }

    faceOut(event: AnimationCallbackEvent) {
        rollOut(event, this.faceRoll());
    }

    roundIn(event: AnimationCallbackEvent) {
        rollIn(event, this.roundRoll());
    }

    roundOut(event: AnimationCallbackEvent) {
        rollOut(event, this.roundRoll());
    }
}
