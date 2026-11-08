import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Workout } from '../../models/workout';
import { ActiveRunService } from './active-run.service';

/**
 * Gives what starts a workout from the beginning and opens the workout page on it, as a Start
 * button does wherever it is. Call it in an injection context.
 */
export function injectStartWorkout(): (workout: Workout) => void {
    const run = inject(ActiveRunService);
    const router = inject(Router);
    return (workout) => {
        run.start(workout);
        void router.navigate(['/workout']);
    };
}
