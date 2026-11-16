import { StepSwap } from './step-swap';
import { allSteps, runPlan, Step, Workout } from './workout';

/**
 * What a run's place is worked out from (see `workoutStateAt()`): its round as it runs (see
 * `runPlan()`), each step's kind and time and where it comes from in the workout, and the
 * rounds or time limit. However its steps are grouped, a workout that runs the same is the
 * same: Create saves each exercise as a group of its own. Headings take no time, and a rep
 * step's reps and weight none on the clock, so they're left out.
 */
function shapeOf(workout: Workout): string {
    const { steps, places } = runPlan(workout);
    const run = steps.map((step, i) => [
        step.kind,
        step.kind === 'reps' ? 0 : step.seconds,
        places[i],
    ]);
    return JSON.stringify([workout.repeats, workout.timeLimitSeconds ?? null, run]);
}

/**
 * Whether a workout running as `running` can take `edited` part-way: only when it runs to the
 * same clock, so the run stays where it is. Changing a step's exercise, name, reps or weight
 * keeps it; adding, removing or moving a step, or changing a time or the rounds, doesn't.
 */
export function canTakeEdit(running: Workout, edited: Workout): boolean {
    return shapeOf(running) === shapeOf(edited);
}

/**
 * The edit of a running workout, as swaps from `from` (where the run is, as `runPosition()`
 * counts): one for each step `edited` makes another exercise than `running` had it, so the sets
 * done before stay logged as the old one. Marked `edited`, as the saved workout has them
 * already: they're not offered on the summary to keep.
 */
export function editSwaps(running: Workout, edited: Workout, from: number): StepSwap[] {
    const was = allSteps(running);
    return allSteps(edited).flatMap((step, i): StepSwap[] =>
        sameExercise(was[i], step)
            ? []
            : [{ step: i, from, original: was[i], swapped: step, edited: true }]
    );
}

function sameExercise(a: Step, b: Step): boolean {
    return a.exerciseId === b.exerciseId && a.name === b.name;
}
