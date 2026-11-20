import {
    computed,
    effect,
    ElementRef,
    inject,
    Injectable,
    Injector,
    signal,
    untracked,
} from '@angular/core';
import { form } from '@angular/forms/signals';
import { ParamMap } from '@angular/router';
import { isBuiltIn } from '../models/exercise';
import { weightIn, weightOptions } from '../models/weight';
import {
    MAX_HEADINGS,
    MAX_REPEATS,
    MAX_REPS,
    MAX_STEPS,
    UNTIL_STOPPED,
    Workout,
    WorkoutFields,
} from '../models/workout';
import { nextWait } from '../models/wait-to-start';
import { WheelPickerOption } from '../shared/components/wheel-picker/wheel-picker.component';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { setupChecks, setupErrors } from './setup-checks';
import { sharedKettlebell } from './setup-kettlebell';
import { SetupRows } from './setup-rows';
import { SetupText } from './setup-text';
import { SetupView } from './setup-view';
import {
    isStep,
    NAME_EXAMPLES,
    padded,
    pickerOptions,
    RepeatMode,
    StepModel,
    WorkoutSetupModel,
} from './step-model';
import { supersetSteps } from './step-text';

/**
 * Create's form: the workout being set up, as rows (see StepModel and SetupRows), checked by
 * `setupChecks()`, with which steps are open (`view`) and what its rows say (`text`). What's
 * done to its steps is SetupSteps, to its supersets SetupSupersets, and saving it SetupSave. One for each Create page, shared with the parts of it.
 */
@Injectable()
export class WorkoutSetupForm {
    private readonly workoutStore = inject(WorkoutStore);
    private readonly injector = inject(Injector);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly exercises = inject(ExerciseStore);

    private readonly settings = inject(SettingsStore);

    /** Weights are shown and picked in this, and saved in kg. */
    readonly weightUnit = this.settings.weightUnit();

    readonly maxSteps = MAX_STEPS;
    readonly maxHeadings = MAX_HEADINGS;
    /** In the order the kind menu lists them. */
    readonly editingWorkoutId = signal<string | null>(null);
    /**
     * The day a new workout goes on in the plan once saved, from the Plan page's Make a new
     * workout (`?planOn=<day>`), or null.
     */
    readonly planOn = signal<number | null>(null);
    readonly minuteOptions = pickerOptions(0, 99, padded);
    readonly secondOptions = pickerOptions(0, 59, padded);
    readonly repOptions = pickerOptions(0, MAX_REPS, String);
    readonly setOptions = pickerOptions(1, MAX_REPEATS, String);
    readonly weightOptions = weightOptions(this.weightUnit);
    readonly nameExamples = NAME_EXAMPLES;
    readonly isBuiltIn = isBuiltIn;
    // 1-30, then ∞ at the end of the wheel
    readonly repeatOptions: WheelPickerOption[] = [
        ...pickerOptions(1, MAX_REPEATS, String),
        { value: UNTIL_STOPPED, label: '∞', spokenLabel: 'until stopped' },
    ];

    /** Turns a saved workout into the form's rows, and back. */
    readonly rows = new SetupRows(this.weightUnit);
    readonly model = signal<WorkoutSetupModel>(this.rows.empty());
    /** Which steps are open, and the pop-ups. */
    readonly view = new SetupView(this.model, this.host, this.injector);
    /** What its rows say. */
    readonly text = new SetupText(this.model, this.weightUnit);

    readonly workoutForm = form(this.model, setupChecks(this.weightUnit));
    /** The checks' errors that the page shows. */
    readonly errors = setupErrors(this.workoutForm, this.model);

    /** Steps, which count towards MAX_STEPS; headings and supersets' own rows don't. */
    readonly stepCount = computed(() => this.model().steps.filter(isStep).length);
    readonly headingCount = computed(
        () => this.model().steps.filter((step) => step.kind === 'heading').length
    );
    readonly untilStopped = computed(() => this.model().repeats === UNTIL_STOPPED);
    readonly repeatMode = computed(() => this.model().repeatMode);
    readonly repeatModes: { value: RepeatMode; label: string }[] = [
        { value: 'rounds', label: 'Rounds' },
        { value: 'time', label: 'Time limit' },
    ];
    readonly chosenRepeatIndex = computed(() =>
        this.repeatModes.findIndex((mode) => mode.value === this.repeatMode())
    );
    // The last number of rounds picked, so turning the switch off goes back to it
    private lastRounds = 1;

    constructor() {
        // An effect rather than a derived signal, so the number is caught even when nothing
        // reads it before the wheel moves on to ∞
        effect(() => {
            const repeats = this.model().repeats;
            if (repeats !== UNTIL_STOPPED) {
                this.lastRounds = repeats;
            }
        });
        // One kettlebell for a kettlebell workout (PRG-14): an effect, as the weight wheels
        // change the form's fields directly
        effect(() => {
            const steps = this.model().steps;
            const shared = untracked(() => this.shareKettlebell(steps));
            this.stepsBefore = shared ?? steps;
            if (shared) {
                this.model.update((setup) => ({ ...setup, steps: shared }));
            }
        });
    }

    /** The steps as they were last time the kettlebell was shared, to see what's changed. */
    private stepsBefore: readonly StepModel[] = [];

    private shareKettlebell(steps: readonly StepModel[]): StepModel[] | null {
        const kg = this.settings.kettlebellWeight();
        return sharedKettlebell(
            this.stepsBefore,
            steps,
            (id) => this.exercises.byId(id),
            kg === null ? null : weightIn(kg, this.weightUnit)
        );
    }

    /** Read out by screen readers after a step is added, moved, changed or deleted. */
    readonly stepAnnouncement = signal('');

    /** The form as it opened or was last saved, to tell if it's been changed since. */
    readonly savedState = signal('');
    readonly hasChanges = computed(() => JSON.stringify(this.model()) !== this.savedState());

    /** Fills the form from a saved workout, or empties it for a new one. */
    load(workoutToEdit: Workout | null) {
        this.editingWorkoutId.set(workoutToEdit?.id ?? null);
        this.model.set(workoutToEdit ? this.rows.fromWorkout(workoutToEdit) : this.rows.empty());
        this.view.reset(!workoutToEdit);
        // As it's saved, so nothing loaded counts as a weight just turned to
        this.stepsBefore = this.model().steps;
        this.savedState.set(JSON.stringify(this.model()));
    }

    setRepeatMode(repeatMode: RepeatMode) {
        this.model.update((setup) => ({ ...setup, repeatMode }));
    }

    setCarryOn(carryOn: boolean) {
        this.model.update((setup) => ({ ...setup, carryOn }));
    }

    setUntilStopped(on: boolean) {
        const repeats = on ? UNTIL_STOPPED : this.lastRounds;
        this.model.update((setup) => ({ ...setup, repeats }));
    }

    /** The steps of the superset whose own row is at `index`, in order. */
    supersetSteps(index: number): StepModel[] {
        return supersetSteps(this.model().steps, index);
    }

    /** Puts `step` in place of the step with its key, if it's still there. */
    replaceStep(step: StepModel) {
        this.updateSteps((steps) => steps.map((each) => (each.key === step.key ? step : each)));
    }

    updateSteps(change: (steps: StepModel[]) => StepModel[]) {
        this.model.update((setup) => ({ ...setup, steps: change(setup.steps) }));
    }

    findWorkoutToEdit(params: ParamMap): Workout | null {
        const editId = params.get('editId');
        return editId ? this.workoutStore.findWorkoutById(editId) : null;
    }

    /**
     * The workout as it's set up, as Save saves it: what the page's estimate of how long it
     * takes is worked out from, as it changes (LIB-9).
     */
    readonly fields = computed((): WorkoutFields => this.rows.toFields(this.model()));

    /**
     * Whether a timed exercise in it would wait for Start after a long rest (RUN-14), so
     * whether Carry straight on after rests does anything, and shows.
     */
    readonly couldWait = computed(() => {
        const { carryOn: _carryOn, ...fields } = this.fields();
        return nextWait({ id: '', updatedAt: 0, ...fields }, -1) !== null;
    });

    /** As `fields()`, with the id of the workout being edited, so its runs give your pace. */
    readonly estimated = computed(() => ({ id: this.editingWorkoutId() ?? '', ...this.fields() }));
}
