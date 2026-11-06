import { inject, Service } from '@angular/core';
import { Workout } from '../../models/workout';
import { UndoService } from '../undo/undo.service';
import { WorkoutStore } from './workout-store.service';

/**
 * Make a copy of a workout, yours or ready-made (LIB-2, LIB-6), from its options, its Details or
 * (for a ready-made one) the workout summary: "Gym legs (copy)", saved as a workout of your
 * own beside the one it's a copy of, with Undo to take it out again. Where it's made opens it
 * in Create, with its own page slide.
 */
@Service()
export class MakeCopy {
    private readonly workouts = inject(WorkoutStore);
    private readonly undo = inject(UndoService);

    /** The copy, or null if there's no such workout. */
    of(workoutId: string): Workout | null {
        const copy = this.workouts.copyWorkout(workoutId);
        if (copy) {
            const from = copy.title.replace(/ \(copy\)$/, '');
            this.undo.offerUndo({
                message: `Made a copy of "${from}"`,
                undo: () => this.workouts.deleteWorkout(copy.id),
            });
        }
        return copy;
    }
}

/** Where a copy opens: in Create, to change. */
export function editUrl(workout: Workout): string {
    return `/setup?editId=${workout.id}`;
}
