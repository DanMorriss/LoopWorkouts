import { weightIn, WeightUnit } from '../models/weight';
import { Step, stepForSet, UNTIL_STOPPED, Workout, WorkoutFields } from '../models/workout';
import {
    DEFAULT_TIME_LIMIT_MINUTES,
    rowOf,
    StepModel,
    timeLimitSeconds,
    toBlocks,
    WorkoutSetupModel,
} from './step-model';

/**
 * Turns a saved workout into the rows Create's form holds (see StepModel), and back. Each row
 * made gets a key of its own, so one of these for each form. Weights are shown in `unit`, and
 * saved in kg.
 */
export class SetupRows {
    private nextKey = 1;

    constructor(private readonly unit: WeightUnit) {}

    /** A new workout: one rep step, ready to fill in or change to another kind. */
    empty(): WorkoutSetupModel {
        return {
            title: '',
            steps: [this.newStep()],
            repeats: 1,
            repeatMode: 'rounds',
            limitMinutes: DEFAULT_TIME_LIMIT_MINUTES,
            limitSeconds: 0,
            carryOn: false,
        };
    }

    /** A saved workout, as the form holds it to edit. */
    fromWorkout(workout: Workout): WorkoutSetupModel {
        const limit = workout.timeLimitSeconds;
        return {
            title: workout.title,
            steps: this.stepRows(workout),
            // A time limit is saved with UNTIL_STOPPED, which Rounds shouldn't start on
            repeats: limit === undefined ? workout.repeats : 1,
            repeatMode: limit === undefined ? 'rounds' : 'time',
            limitMinutes: limit === undefined ? DEFAULT_TIME_LIMIT_MINUTES : Math.floor(limit / 60),
            limitSeconds: limit === undefined ? 0 : limit % 60,
            carryOn: !!workout.carryOn,
        };
    }

    /** The workout as it's set up, as Save saves it. */
    toFields(setup: WorkoutSetupModel): WorkoutFields {
        const { title, steps } = setup;
        const blocks = toBlocks(steps, this.unit);
        // A time limit runs as many rounds as fit, so its rounds are UNTIL_STOPPED
        return setup.repeatMode === 'time'
            ? { title, blocks, repeats: UNTIL_STOPPED, timeLimitSeconds: timeLimitSeconds(setup) }
            : {
                  title,
                  blocks,
                  repeats: setup.repeats,
                  // A time limit never waits anyway
                  ...(setup.carryOn ? { carryOn: true as const } : {}),
              };
    }

    /** A new rep step's row, ready to fill in. */
    newStep(): StepModel {
        return this.row({ kind: 'reps', reps: 0, name: '' });
    }

    /** A step's row, with its group's sets and the rest after each. */
    row(step: Step, sets = 1, rest = 60): StepModel {
        const seconds = step.kind === 'reps' ? 0 : step.seconds;
        return {
            sets: step.kind === 'rest' ? 1 : sets,
            eachSide: step.kind !== 'rest' && step.eachSide === true,
            restMinutes: Math.floor(rest / 60),
            restSeconds: rest % 60,
            key: this.nextKey++,
            kind: step.kind,
            name: step.name,
            minutes: Math.floor(seconds / 60),
            seconds: seconds % 60,
            reps: step.kind === 'reps' ? step.reps : 0,
            weight: step.kind === 'reps' && step.weight ? weightIn(step.weight, this.unit) : 0,
            savedWeight: (step.kind === 'reps' && step.weight) || null,
            exerciseId: step.exerciseId ?? '',
            vary: false,
            setRows: [],
            group: 0,
        };
    }

    /**
     * A saved workout's steps and headings as rows, each step with its group's sets and rest.
     * A group of one step is an exercise and its sets; one of several is a superset, a row of
     * its own with its rounds and rest, and then its steps. One of several that runs once is
     * each of its steps in turn, as workouts from before groups are, so it opens as them.
     */
    private stepRows(workout: Workout): StepModel[] {
        return workout.blocks.flatMap((block): StepModel[] => {
            if (block.kind === 'heading') {
                return [{ ...this.newStep(), kind: 'heading', name: block.text }];
            }
            const rest = block.rounds > 1 ? block.restSeconds : 60;
            const steps = block.steps.map((step) => ({
                ...this.row(step, block.rounds, rest),
                ...this.setRows(step),
            }));
            if (steps.length === 1 || block.rounds === 1) {
                return steps;
            }
            const head: StepModel = {
                ...this.row({ kind: 'reps', reps: 0, name: '' }, block.rounds, rest),
                kind: 'superset',
            };
            // Even a rest step has the rounds, in case it's changed to another kind
            return [
                head,
                ...steps.map((step) => ({ ...step, sets: block.rounds, group: head.key })),
            ];
        });
    }

    /** A step's sets as rows, where they vary (BLD-11). */
    private setRows(step: Step): Pick<StepModel, 'vary' | 'setRows'> {
        if (step.kind === 'rest' || !step.sets) {
            return { vary: false, setRows: [] };
        }
        return {
            vary: true,
            setRows: step.sets.map((_, set) => rowOf(this.row(stepForSet(step, set)))),
        };
    }
}
