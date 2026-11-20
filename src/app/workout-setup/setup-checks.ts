import { computed, Signal } from '@angular/core';
import {
    applyEach,
    FieldTree,
    maxLength,
    SchemaFn,
    validate,
    ValidationError,
} from '@angular/forms/signals';
import { MAX_EXERCISE_NAME_LENGTH } from '../models/exercise';
import { WeightUnit } from '../models/weight';
import { allSteps, hasWork, MAX_HEADING_LENGTH } from '../models/workout';
import {
    hasAmount,
    isStep,
    rowHasAmount,
    timeLimitSeconds,
    toBlocks,
    varies,
    WorkoutSetupModel,
} from './step-model';

/**
 * Create's checks, as the form's schema: names short enough to fit on the workout, some work
 * in it, some reps or time in each set of a step whose sets vary, and some time in a time
 * limit. Weights are shown in `unit`.
 */
export function setupChecks(unit: WeightUnit): SchemaFn<WorkoutSetupModel> {
    return (setup) => {
        // Long enough for a name (or a heading), short enough to fit on the workout
        applyEach(setup.steps, (step) =>
            maxLength(step.name, ({ valueOf }) =>
                valueOf(step.kind) === 'heading' ? MAX_HEADING_LENGTH : MAX_EXERCISE_NAME_LENGTH
            )
        );
        // The wheels only offer valid times, so the one rule is that there's some work
        validate(setup, ({ value }) =>
            hasWork(allSteps({ blocks: toBlocks(value().steps, unit) }))
                ? undefined
                : { kind: 'noTime', message: 'Workout needs a timed step or some reps' }
        );
        // ...that each set of a step whose sets vary has some, if the step's to be kept
        validate(setup, ({ value }) =>
            value().steps.some(
                (step) =>
                    varies(step) &&
                    step.setRows.some((row) => !rowHasAmount(step, row)) &&
                    step.setRows.some((row) => rowHasAmount(step, row))
            )
                ? { kind: 'noSetAmount', message: 'Each set needs some reps or time' }
                : undefined
        );
        // ...and that a time limit has some time in it
        validate(setup, ({ value }) =>
            value().repeatMode === 'time' && timeLimitSeconds(value()) === 0
                ? { kind: 'noTimeLimit', message: 'Time limit needs to be longer than 00:00' }
                : undefined
        );
    };
}

/** The checks' errors that Create shows, each under what it's about. */
export interface SetupErrors {
    noTime: Signal<ValidationError | undefined>;
    noSetAmount: Signal<ValidationError | undefined>;
    noTimeLimit: Signal<ValidationError | undefined>;
}

/** Each of the checks' errors, as the form's checks find them. */
export function setupErrors(
    form: FieldTree<WorkoutSetupModel>,
    model: Signal<WorkoutSetupModel>
): SetupErrors {
    const error = (kind: string) =>
        computed(() =>
            form()
                .errors()
                .find((each) => each.kind === kind)
        );
    const noTime = error('noTime');
    return {
        // Not until something's been put in a step: a new workout opens with an empty one
        noTime: computed(() =>
            model()
                .steps.filter(isStep)
                .every((step) => !step.name.trim() && !hasAmount(step))
                ? undefined
                : noTime()
        ),
        noSetAmount: error('noSetAmount'),
        noTimeLimit: error('noTimeLimit'),
    };
}
