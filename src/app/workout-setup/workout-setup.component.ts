import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    DOCUMENT,
    effect,
    ElementRef,
    inject,
    Injector,
    signal,
} from '@angular/core';
import {
    applyEach,
    form,
    FormField,
    FormRoot,
    maxLength,
    submit,
    validate,
} from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import {
    CdkDrag,
    CdkDragDrop,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { StepDragPreviewComponent } from './step-drag-preview/step-drag-preview.component';
import { StepKindMenuComponent } from './step-kind-menu/step-kind-menu.component';
import {
    hasWork,
    MAX_REPEATS,
    allSteps,
    Block,
    MAX_HEADING_LENGTH,
    MAX_HEADINGS,
    MAX_REPS,
    MAX_STEPS,
    RepStep,
    Step,
    stepForSet,
    StepGroup,
    StepKind,
    supersetName,
    TimedStep,
    stepKindName,
    Workout,
    WorkoutFields,
    UNTIL_STOPPED,
} from '../models/workout';
import { WeightUnit, weightIn, weightOptions, weightToKg } from '../models/weight';
import { Exercise, isBuiltIn, MAX_EXERCISE_NAME_LENGTH, MeasuredBy } from '../models/exercise';
import { HistoryStore } from '../shared/state/history-store.service';
import { findByName } from '../models/exercise-links';
import { ExerciseEditorComponent } from '../shared/components/exercise-editor/exercise-editor.component';
import { ExerciseDetailsDialogComponent } from '../shared/components/exercise-details-dialog/exercise-details-dialog.component';
import { SwapExerciseDialogComponent } from '../shared/components/swap-exercise-dialog/swap-exercise-dialog.component';
import { BrowseExercisesDialogComponent } from './browse-exercises-dialog/browse-exercises-dialog.component';
import { lastRepSets } from '../history/last-sets';
import { lastWeight } from '../models/step-swap';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { ExercisePickerComponent } from './exercise-picker/exercise-picker.component';
import { InfinitySwitchComponent } from '../shared/components/infinity-switch/infinity-switch.component';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import { BackLinkComponent } from '../nav/back-link/back-link.component';
import { LeaveCheck, LeaveQuestion } from '../nav/leave-check';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog/unsaved-changes-dialog.component';
import { UndoService } from '../shared/undo/undo.service';
import { DropSpring } from '../shared/drop-spring';
import { changeSmoothly } from '../shared/layout-change';
import {
    WheelPickerComponent,
    WheelPickerOption,
} from '../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../shared/run/active-run.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { injectFocusAfterRender } from '../shared/focus-after-render';
import { counted } from '../shared/format-count';

/**
 * What a row in Create is: a kind of step, a heading (BLD-13), or a superset's own row, with
 * its rounds and rest, which its steps follow (BLD-12).
 */
type ItemKind = StepKind | 'heading' | 'superset';

/**
 * One step as the form holds it: minutes and seconds for a timed step's two wheels, or
 * reps and weight for a rep step's. A step keeps them all, and only uses those for its kind.
 * A heading is a row of its own kind, with its text as its name and nothing else used; so is
 * a superset, with its rounds as its `sets` and its rest between rounds as its rest.
 */
interface StepModel {
    /** Stays with the step as it moves, for tracking and element ids. */
    key: number;
    kind: ItemKind;
    name: string;
    minutes: number;
    seconds: number;
    reps: number;
    /** In the unit chosen in settings, to the nearest half; 0 for none. */
    weight: number;
    /**
     * The exercise picked for a work or rep step, or '' if none has been: it then goes by
     * its name when saved (see `linkSteps()`).
     */
    exerciseId: string;
    /**
     * The weight as saved, in kg, kept as it was unless the wheel moves, so rounding it
     * for the wheel doesn't change it. Null for a new step.
     */
    savedWeight: number | null;
    /** How many times a work or rep step runs, 1 to MAX_REPEATS. A rest step runs once. */
    sets: number;
    /**
     * The rest between sets, for its two wheels: used once there's more than one set, and
     * 1:00 until it's set, so it starts there the first time Sets goes above 1.
     */
    restMinutes: number;
    restSeconds: number;
    /** Done one side at a time, each set running both sides (BLD-10). Not for a rest step. */
    eachSide: boolean;
    /**
     * Vary each set (BLD-11): each set has its own row of reps and weight, or time, in
     * `setRows`, set 1's being the step's. Only with more than one set, and not for rest.
     */
    vary: boolean;
    /** A row for each set while `vary` is on, as many as `sets`; empty while it's off. */
    setRows: SetRowModel[];
    /**
     * The key of the superset it's in, whose row it follows with the superset's other steps,
     * or 0 for none. Its `sets` are the superset's rounds, kept the same as they change.
     */
    group: number;
}

/** One set's own amount, as a step holds its own: reps and weight, or minutes and seconds. */
interface SetRowModel {
    reps: number;
    /** In the unit chosen in settings, to the nearest half; 0 for none. */
    weight: number;
    /** As a step's `savedWeight`: the weight as saved, in kg, or null for a new row. */
    savedWeight: number | null;
    minutes: number;
    seconds: number;
}

/** How a workout goes on: a number of rounds (or until stopped), or a time limit. */
export type RepeatMode = 'rounds' | 'time';

/** The form's values. */
interface WorkoutSetupModel {
    title: string;
    steps: StepModel[];
    repeats: number;
    repeatMode: RepeatMode;
    /** The time limit, kept while Rounds is picked, so going back to Time limit finds it. */
    limitMinutes: number;
    limitSeconds: number;
}

/** A new time limit, until one's picked: a common length for as many rounds as possible. */
const DEFAULT_TIME_LIMIT_MINUTES = 20;

function pickerOptions(
    from: number,
    to: number,
    label: (n: number) => string
): WheelPickerOption[] {
    return Array.from({ length: to - from + 1 }, (_, i) => ({
        value: from + i,
        label: label(from + i),
    }));
}

const padded = (n: number) => n.toString().padStart(2, '0');

/**
 * A page Create can go back to, with a workout's id captured for its details: /library/<id>, or
 * an exercise's page, /library/<id>/<name>, /ready-made-plans/<workout>/<name> or
 * /exercises/<name> (with the list's filter or where it goes back to).
 */
const BACK_PAGE =
    /^(?:\/library\/([^/?#]+)|\/library\/[^/?#]+\/[^/?#]+|(?:\/exercises|\/ready-made-plans\/[^/?#]+)\/[^/?#]+(?:\?[^#]*)?)$/;

/** What the name box suggests for each kind of step. */
const NAME_EXAMPLES: Record<StepKind, string> = {
    work: 'e.g. Squats',
    rest: 'e.g. Catch your breath',
    reps: 'e.g. Push-ups',
};

@Component({
    selector: 'app-workout-setup',
    templateUrl: './workout-setup.component.html',
    styleUrls: [
        './workout-setup.component.scss',
        './workout-setup-exercise.scss',
        './workout-setup-supersets.scss',
    ],
    host: {
        '(window:beforeunload)': 'warnBeforeUnload($event)',
        '(document:click)': 'closePopups($event)',
    },
    imports: [
        BackLinkComponent,
        UnsavedChangesDialogComponent,
        CdkDropList,
        CdkDrag,
        CdkDragHandle,
        CdkDragPreview,
        CdkDragPlaceholder,
        FormRoot,
        FormField,
        WheelPickerComponent,
        InfinitySwitchComponent,
        ToggleSwitchComponent,
        ExercisePickerComponent,
        ExerciseEditorComponent,
        ExerciseDetailsDialogComponent,
        SwapExerciseDialogComponent,
        BrowseExercisesDialogComponent,
        StepDragPreviewComponent,
        StepKindMenuComponent,
        MatFormFieldModule,
        MatIconModule,
    ],
})
export class WorkoutSetupComponent {
    private readonly workoutStore = inject(WorkoutStore);
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly injector = inject(Injector);
    private readonly focusAfterRender = injectFocusAfterRender();
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly exercises = inject(ExerciseStore);
    private readonly history = inject(HistoryStore);
    /** Weights are shown and picked in this, and saved in kg. */
    protected readonly weightUnit = inject(SettingsStore).weightUnit();

    protected readonly maxSteps = MAX_STEPS;
    protected readonly maxHeadings = MAX_HEADINGS;
    /** In the order the kind menu lists them. */
    protected readonly editingWorkoutId = signal<string | null>(null);
    protected readonly minuteOptions = pickerOptions(0, 99, padded);
    protected readonly secondOptions = pickerOptions(0, 59, padded);
    protected readonly repOptions = pickerOptions(0, MAX_REPS, String);
    protected readonly setOptions = pickerOptions(1, MAX_REPEATS, String);
    protected readonly weightOptions = weightOptions(this.weightUnit);
    protected readonly nameExamples = NAME_EXAMPLES;
    protected readonly isBuiltIn = isBuiltIn;
    // 1-30, then ∞ at the end of the wheel
    protected readonly repeatOptions: WheelPickerOption[] = [
        ...pickerOptions(1, MAX_REPEATS, String),
        { value: UNTIL_STOPPED, label: '∞', spokenLabel: 'until stopped' },
    ];

    private nextKey = 1;
    private readonly model = signal<WorkoutSetupModel>(this.emptySetup());
    /** Keys of the steps showing their name box and wheels; the rest show a one-line summary. */
    private readonly expandedKeys = signal<ReadonlySet<number>>(this.allKeys());

    protected readonly workoutForm = form(
        this.model,
        (setup) => {
            // Long enough for a name (or a heading), short enough to fit on the workout
            applyEach(setup.steps, (step) =>
                maxLength(step.name, ({ valueOf }) =>
                    valueOf(step.kind) === 'heading' ? MAX_HEADING_LENGTH : MAX_EXERCISE_NAME_LENGTH
                )
            );
            // The wheels only offer valid times, so the one rule is that there's some work
            validate(setup, ({ value }) =>
                hasWork(allSteps({ blocks: toBlocks(value().steps, this.weightUnit) }))
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
        },
        {
            submission: {
                action: async () => {
                    await this.saveAndStart();
                    return undefined;
                },
            },
        }
    );

    /** Steps, which count towards MAX_STEPS; headings and supersets' own rows don't. */
    protected readonly stepCount = computed(() => this.model().steps.filter(isStep).length);
    protected readonly headingCount = computed(
        () => this.model().steps.filter((step) => step.kind === 'heading').length
    );
    protected readonly anyExpanded = computed(() => {
        const expanded = this.expandedKeys();
        return this.model().steps.some((step) => expanded.has(step.key));
    });
    protected readonly untilStopped = computed(() => this.model().repeats === UNTIL_STOPPED);
    protected readonly repeatMode = computed(() => this.model().repeatMode);
    protected readonly repeatModes: { value: RepeatMode; label: string }[] = [
        { value: 'rounds', label: 'Rounds' },
        { value: 'time', label: 'Time limit' },
    ];
    protected readonly chosenRepeatIndex = computed(() =>
        this.repeatModes.findIndex((mode) => mode.value === this.repeatMode())
    );
    // The last number of rounds picked, so turning the switch off goes back to it
    private lastRounds = 1;

    /** Whether the tooltip by the Steps heading is showing. */
    protected readonly infoOpen = signal(false);

    /** The set row open on its wheels (BLD-11), as `key-set`, if one is: one at a time. */
    protected readonly openSetRow = signal<string | null>(null);

    /** The key of the step whose kind menu is open, if one is. */
    protected readonly kindMenuFor = signal<number | null>(null);

    /** Read out by screen readers after a step is added, moved, changed or deleted. */
    protected readonly stepAnnouncement = signal('');
    /**
     * Why a step's kind just changed, shown under its name box: its exercise is measured the
     * other way. Only while the step is still that exercise and that kind.
     */
    private readonly kindNote = signal<{
        stepKey: number;
        exerciseId: string;
        kind: StepKind;
        text: string;
    } | null>(null);
    private readonly undo = inject(UndoService);
    private readonly document = inject(DOCUMENT);

    /** The exercise open in the editor, and the step it was opened from. */
    /** The exercise whose details are showing, and the step they were opened from. */
    /** The step whose exercise is being browsed for (BLD-16), while its dialog is open. */
    protected readonly browsing = signal<{ stepKey: number; stepNumber: number } | null>(null);
    /** The step whose exercise is being swapped (BLD-14), while its dialog is open. */
    protected readonly swapping = signal<{
        exercise: Exercise;
        stepKey: number;
        measuredBy: MeasuredBy;
    } | null>(null);
    protected readonly exerciseInDetails = signal<{ exercise: Exercise; stepKey: number } | null>(
        null
    );
    protected readonly exerciseInEditor = signal<{ exercise: Exercise; stepKey: number } | null>(
        null
    );

    protected readonly noSetAmountError = computed(() =>
        this.workoutForm()
            .errors()
            .find((error) => error.kind === 'noSetAmount')
    );

    protected readonly noTimeLimitError = computed(() =>
        this.workoutForm()
            .errors()
            .find((error) => error.kind === 'noTimeLimit')
    );

    // Not until something's been put in a step: a new workout opens with an empty one
    protected readonly noTimeError = computed(() =>
        this.model()
            .steps.filter(isStep)
            .every((step) => !step.name.trim() && !hasAmount(step))
            ? undefined
            : this.workoutForm()
                  .errors()
                  .find((error) => error.kind === 'noTime')
    );

    protected readonly back = signal({ url: '/library', label: 'Workouts' });

    /** The form as it opened or was last saved, to tell if it's been changed since. */
    private readonly savedState = signal('');
    private readonly hasChanges = computed(
        () => JSON.stringify(this.model()) !== this.savedState()
    );
    /** The warning about leaving with unsaved changes is open. */
    protected readonly leaveAsked = signal(false);
    private leaving: { answer: Promise<boolean>; give: (leave: boolean) => void } | null = null;
    protected readonly unsavedHint = computed(() => {
        const name = this.model().title.trim();
        if (!this.editingWorkoutId()) {
            return "This workout hasn't been saved.";
        }
        return name
            ? `Your changes to ${name} haven't been saved.`
            : "Your changes haven't been saved.";
    });
    /** For LeaveCheck: nothing to ask with no changes; otherwise opens the warning. */
    private readonly askToLeave: LeaveQuestion = () => {
        if (!this.hasChanges()) {
            return null;
        }
        if (!this.leaving) {
            let give!: (leave: boolean) => void;
            const answer = new Promise<boolean>((resolve) => (give = resolve));
            this.leaving = { answer, give };
            this.leaveAsked.set(true);
        }
        return this.leaving.answer;
    };

    constructor() {
        const leaveCheck = inject(LeaveCheck);
        leaveCheck.set(this.askToLeave);
        inject(DestroyRef).onDestroy(() => leaveCheck.clear(this.askToLeave));

        // An effect rather than a derived signal, so the number is caught even when nothing
        // reads it before the wheel moves on to ∞
        effect(() => {
            const repeats = this.model().repeats;
            if (repeats !== UNTIL_STOPPED) {
                this.lastRounds = repeats;
            }
        });

        // Not just the snapshot: the page stays open when only the query changes, e.g. Create
        // from the menu while editing, which goes from ?editId=1 to a new workout
        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            this.back.set(this.backFrom(params.get('from')));
            if (this.addedExercise) {
                // Only ?add= taken off the address, after adding it: the form stays as it is
                this.addedExercise = false;
                return;
            }
            this.load(this.findWorkoutToEdit(params));
            const add = params.get('add');
            if (add !== null) {
                this.addExercise(add);
                this.addedExercise = true;
                // Off the address, so going back to it or reloading doesn't add it again
                void this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: { add: null },
                    queryParamsHandling: 'merge',
                    replaceUrl: true,
                });
            }
        });
    }

    /**
     * Where ‹ goes: the page it was opened from (`?from=`), if that's a workout's details or an
     * exercise's page, otherwise Workouts. With unsaved changes, LeaveCheck asks first.
     */
    private backFrom(from: string | null): { url: string; label: string } {
        const page = from?.match(BACK_PAGE);
        if (!from || !page) {
            return { url: '/library', label: 'Workouts' };
        }
        const workoutId = page[1];
        const label = workoutId
            ? this.workoutStore.findWorkoutById(workoutId)?.title.trim() || 'Workout'
            : 'Exercise';
        return { url: from, label };
    }

    /** The answer to the warning: discarding counts the form as unchanged, so it isn't asked again. */
    protected answerLeaving(leave: boolean) {
        this.leaveAsked.set(false);
        if (leave) {
            this.savedState.set(JSON.stringify(this.model()));
        }
        this.leaving?.give(leave);
        this.leaving = null;
    }

    /** Closing or reloading the tab: the browser's own question, if there are changes. */
    protected warnBeforeUnload(event: BeforeUnloadEvent) {
        if (this.hasChanges()) {
            event.preventDefault();
        }
    }

    /** An exercise was just added from ?add=, which is being taken off the address. */
    private addedExercise = false;

    /**
     * Adds an exercise from its page (EXR-12) at the end of the workout, as the one step open:
     * 3 sets of 10 reps (or of 0:30, for a timed one) with 1:00 rest, to change before saving.
     * A new workout's empty first step makes way for it. Nothing happens for an exercise
     * that isn't there, or a workout already at MAX_STEPS.
     */
    private addExercise(exerciseId: string) {
        const exercise = this.exercises.byId(exerciseId);
        const fresh = this.editingWorkoutId() === null;
        if (!exercise || (!fresh && this.stepCount() >= MAX_STEPS)) {
            return;
        }
        const { name, id } = exercise;
        const step = this.stepModel(
            exercise.measuredBy === 'timed'
                ? { kind: 'work', seconds: 30, name, exerciseId: id }
                : { kind: 'reps', reps: 10, name, exerciseId: id },
            3
        );
        this.updateSteps((steps) => (fresh ? [step] : [...steps, step]));
        this.expandedKeys.set(new Set([step.key]));
        this.stepAnnouncement.set(`Added ${name}, step ${this.stepCount()}`);
        // In the middle of the screen, as at the end of a long workout it'd be under the tab bar
        afterNextRender(
            () => {
                const toggle = document.getElementById(`step-${step.key}-toggle`);
                toggle?.focus({ preventScroll: true });
                toggle?.closest('.step')?.scrollIntoView({ block: 'center', behavior: 'instant' });
            },
            { injector: this.injector }
        );
    }

    /** Fills the form from a saved workout, or empties it for a new one. */
    private load(workoutToEdit: Workout | null) {
        this.editingWorkoutId.set(workoutToEdit?.id ?? null);
        this.kindMenuFor.set(null);
        if (workoutToEdit) {
            const limit = workoutToEdit.timeLimitSeconds;
            this.model.set({
                title: workoutToEdit.title,
                steps: this.stepModels(workoutToEdit),
                // A time limit is saved with UNTIL_STOPPED, which Rounds shouldn't start on
                repeats: limit === undefined ? workoutToEdit.repeats : 1,
                repeatMode: limit === undefined ? 'rounds' : 'time',
                limitMinutes:
                    limit === undefined ? DEFAULT_TIME_LIMIT_MINUTES : Math.floor(limit / 60),
                limitSeconds: limit === undefined ? 0 : limit % 60,
            });
            // A saved workout opens as a list of summaries, so the whole workout fits on screen
            this.expandedKeys.set(new Set());
        } else {
            this.model.set(this.emptySetup());
            this.expandedKeys.set(this.allKeys());
        }
        this.savedState.set(JSON.stringify(this.model()));
    }

    protected setRepeatMode(repeatMode: RepeatMode) {
        this.model.update((setup) => ({ ...setup, repeatMode }));
    }

    protected setUntilStopped(on: boolean) {
        const repeats = on ? UNTIL_STOPPED : this.lastRounds;
        this.model.update((setup) => ({ ...setup, repeats }));
    }

    /** A step's number, counting steps only, as headings aren't steps. */
    protected stepNumber(index: number): number {
        return this.stepNumbers()[index];
    }

    /**
     * Each row's step number, a heading or a superset's own row having the number of the step
     * before it.
     */
    private readonly stepNumbers = computed(() => {
        let count = 0;
        return this.model().steps.map((step) => (isStep(step) ? ++count : count));
    });

    /** The steps of the superset whose own row is at `index`, in order. */
    private supersetSteps(index: number): StepModel[] {
        const key = this.model().steps[index].key;
        return this.model().steps.filter((step) => step.group === key);
    }

    /** "Superset" or "Giant set", by how many exercises the one at `index` has (BLD-12). */
    protected supersetName(index: number): string {
        return supersetName(this.supersetSteps(index).filter(isStep));
    }

    /**
     * How a step is named to screen readers, e.g. "Step 2, rest" or "Step 1, Squats"; a
     * heading is "Heading, Warmup", and a superset "Superset, steps 2 to 3".
     */
    protected stepTitle(index: number): string {
        const step = this.model().steps[index];
        if (step.kind === 'heading') {
            return step.name.trim() ? `Heading, ${step.name.trim()}` : 'Heading';
        }
        if (step.kind === 'superset') {
            const first = this.stepNumber(index) + 1;
            const last = first + this.supersetSteps(index).length - 1;
            return `${this.supersetName(index)}, steps ${first} to ${last}`;
        }
        return `Step ${this.stepNumber(index)}, ${step.name.trim() || stepKindName(step.kind).toLowerCase()}`;
    }

    /** What a row's open button says: its title and amount, and the superset it's in. */
    protected toggleLabel(index: number): string {
        const step = this.model().steps[index];
        const time = this.amountText(step);
        const head = this.model().steps.findIndex((row) => row.key === step.group);
        const inSuperset = head === -1 ? '' : `, in the ${this.supersetName(head).toLowerCase()}`;
        return `${this.stepTitle(index)}${inSuperset}${time ? `, ${time}` : ''}`;
    }

    /** What a collapsed row shows as its name: a superset's is its steps', e.g. "Bench, Row". */
    protected summaryName(index: number): string {
        const step = this.model().steps[index];
        if (step.kind !== 'superset') {
            return step.name.trim();
        }
        return this.supersetSteps(index)
            .map((member) => member.name.trim() || stepKindName(member.kind as StepKind))
            .join(', ');
    }

    /**
     * How much of a step there is, as its wheels show it: e.g. "02:15", "20 reps", or
     * "10 reps @ 60 kg", and "each side" for one done each side. A superset's is its rounds and
     * rest, e.g. "3 rounds · rest 01:00"; a step in one has its own amount, its rounds being
     * the superset's.
     */
    protected amountText(step: StepModel): string {
        if (step.kind === 'heading') {
            return '';
        }
        const rest = step.restMinutes * 60 + step.restSeconds;
        const restText =
            rest > 0 ? ` · rest ${padded(step.restMinutes)}:${padded(step.restSeconds)}` : '';
        if (step.kind === 'superset') {
            return step.sets === 1 ? '1 round' : `${step.sets} rounds${restText}`;
        }
        const sets = step.kind !== 'rest' && step.sets > 1 && !step.group;
        const eachSide = step.kind !== 'rest' && step.eachSide ? ' each side' : '';
        const weight = step.weight > 0 ? ` @ ${step.weight} ${this.weightUnit}` : '';
        const time = `${padded(step.minutes)}:${padded(step.seconds)}`;
        if (!sets && varies(step)) {
            return `${this.variedText(step)}${eachSide}`;
        }
        if (!sets) {
            if (step.kind === 'reps') {
                return `${counted(step.reps, 'rep')}${weight}${eachSide}`;
            }
            return `${time}${eachSide}`;
        }
        // As the history says sets, e.g. "3 × 10 @ 60 kg", or each set's where they vary, e.g.
        // "12, 10, 8 @ 40–50 kg", with the rest between them
        const amount = varies(step)
            ? this.variedText(step)
            : `${step.sets} × ${step.kind === 'reps' ? `${step.reps}${weight}` : time}`;
        return `${amount}${eachSide}${restText}`;
    }

    /** Sets that vary, e.g. "12, 10, 8 @ 40–50 kg", or "00:30, 00:45, 01:00". */
    private variedText(step: StepModel): string {
        const rows = step.setRows;
        if (step.kind !== 'reps') {
            return rows.map(rowTime).join(', ');
        }
        const weights = rows.map((row) => row.weight).filter((weight) => weight > 0);
        const low = Math.min(...weights);
        const high = Math.max(...weights);
        const weight =
            weights.length === 0
                ? ''
                : ` @ ${low === high ? low : `${low}–${high}`} ${this.weightUnit}`;
        return `${rows.map((row) => row.reps).join(', ')}${weight}`;
    }

    /**
     * A set's row, e.g. "Set 2 · 10 × 45 kg", "Set 2 · 10 reps" or "Set 2 · 00:45"; in a
     * superset, a round's, e.g. "Round 2 · 10 reps".
     */
    protected setRowText(step: StepModel, set: number): string {
        const row = step.setRows[set];
        const name = `${step.group ? 'Round' : 'Set'} ${set + 1}`;
        if (step.kind !== 'reps') {
            return `${name} · ${rowTime(row)}`;
        }
        if (row.weight > 0) {
            return `${name} · ${row.reps} × ${row.weight} ${this.weightUnit}`;
        }
        return `${name} · ${counted(row.reps, 'rep')}`;
    }

    /**
     * The Sets wheel, or a superset's Rounds wheel, which are the sets of each of its steps.
     * With Vary each set on, a set added copies the last one's row, and one taken away goes
     * from the end; down to 1 set, there's nothing to vary, so it goes off.
     */
    protected setSets(index: number, sets: number) {
        const changed = this.model().steps[index];
        if (changed.sets === sets) {
            return;
        }
        const keys = [changed.key, ...this.supersetSteps(index).map((step) => step.key)];
        const change = () =>
            this.updateSteps((steps) =>
                steps.map((step) => (keys.includes(step.key) ? withSets(step, sets) : step))
            );
        const rowsChange = this.model().steps.some(
            (step) => keys.includes(step.key) && step.vary && sets > 1
        );
        if (rowsChange) {
            this.smoothChange(change);
        } else {
            change();
        }
    }

    /**
     * Whether Join with next can join this exercise, or superset, with the exercise straight
     * after it (BLD-12).
     */
    protected canJoin(index: number): boolean {
        const rows = this.model().steps;
        const row = rows[index];
        const next = rows[partEnd(rows, index)];
        return (
            row.group === 0 &&
            (row.kind === 'superset' || isExercise(row)) &&
            next !== undefined &&
            next.group === 0 &&
            isExercise(next)
        );
    }

    /**
     * Join with next: an exercise and the next become a superset, with the first's sets as its
     * rounds and its rest between sets as the rest between them; on a superset, the next
     * exercise joins it, making it a giant set.
     */
    protected joinWithNext(index: number) {
        if (!this.canJoin(index)) {
            return;
        }
        const rows = this.model().steps;
        const row = rows[index];
        const end = partEnd(rows, index);
        const next = rows[end];
        const head: StepModel =
            row.kind === 'superset'
                ? row
                : {
                      ...this.newStep(),
                      kind: 'superset',
                      sets: row.sets,
                      restMinutes: row.restMinutes,
                      restSeconds: row.restSeconds,
                  };
        const joined = { ...withSets(next, head.sets), group: head.key };
        const before = rows.slice(0, index);
        const after = rows.slice(end + 1);
        this.smoothChange(() => {
            this.updateSteps(() =>
                row.kind === 'superset'
                    ? [...before, ...rows.slice(index, end), joined, ...after]
                    : [...before, head, { ...row, group: head.key }, joined, ...after]
            );
            this.expandedKeys.update((keys) => new Set([...keys, head.key]));
        });
        const at = this.model().steps.indexOf(head);
        this.stepAnnouncement.set(
            `${this.stepTitle(at)}, ${this.amountText(head)}: ${this.summaryName(at)}`
        );
        this.focusAfterRender(`step-${head.key}-toggle`);
    }

    /**
     * Take out: a superset's step becomes an exercise of its own just after it, with its rounds
     * as its sets and its rest between them. A superset left with one step becomes that one's
     * exercise the same way.
     */
    protected takeOut(index: number) {
        const rows = this.model().steps;
        const step = rows[index];
        const head = rows.findIndex((row) => row.key === step.group);
        if (head === -1) {
            return;
        }
        const name = step.name.trim() || stepKindName(step.kind as StepKind).toLowerCase();
        const supersetName = this.supersetName(head).toLowerCase();
        const end = partEnd(rows, head);
        const out = ownExercise(step, rows[head]);
        this.smoothChange(() =>
            this.updateSteps(() =>
                lonelyStepsOut(
                    [
                        ...rows.slice(0, index),
                        ...rows.slice(index + 1, end),
                        out,
                        ...rows.slice(end),
                    ],
                    step.group
                )
            )
        );
        this.stepAnnouncement.set(
            `Took ${name} out of the ${supersetName}, now step ${this.stepNumber(this.model().steps.findIndex((row) => row.key === step.key))}`
        );
        this.focusAfterRender(`step-${step.key}-toggle`);
    }

    /** + Step in a superset: a rep step at its end, with its rounds. */
    protected addToSuperset(index: number) {
        if (this.stepCount() >= MAX_STEPS) {
            return;
        }
        const rows = this.model().steps;
        const head = rows[index];
        const end = partEnd(rows, index);
        const step: StepModel = { ...this.newStep(), group: head.key, sets: head.sets };
        this.updateSteps(() => [...rows.slice(0, end), step, ...rows.slice(end)]);
        this.expandedKeys.set(new Set([head.key, step.key]));
        this.stepAnnouncement.set(
            `Added a rep step to the ${this.supersetName(index).toLowerCase()}, step ${this.stepNumber(end)}`
        );
        this.focusAfterRender(`step-${step.key}-name`);
    }

    /** Whether a row's in a superset that's collapsed, which shows as one line. */
    protected isHidden(step: StepModel): boolean {
        return (
            step.group !== 0 && (!this.isExpanded(step.group) || step.group === this.heldSuperset())
        );
    }

    /**
     * The Vary each set switch: on, every set starts as the step is, a row each; off, every
     * set goes back to set 1's.
     */
    protected setVary(index: number, on: boolean) {
        const changed = this.model().steps[index];
        this.openSetRow.set(null);
        this.smoothChange(() =>
            this.updateStep(changed.key, (step) =>
                on
                    ? {
                          ...step,
                          vary: true,
                          setRows: Array.from({ length: step.sets }, () => rowOf(step)),
                      }
                    : varyOff(step)
            )
        );
    }

    protected isSetRowOpen(key: number, set: number): boolean {
        return this.openSetRow() === `${key}-${set}`;
    }

    /** Opens a set's row on its wheels, closing any other; or closes it. Rows slide to fit. */
    protected toggleSetRow(key: number, set: number) {
        const id = `${key}-${set}`;
        this.smoothChange(() => this.openSetRow.update((open) => (open === id ? null : id)));
    }

    private updateStep(key: number, change: (step: StepModel) => StepModel) {
        this.updateSteps((steps) => steps.map((step) => (step.key === key ? change(step) : step)));
    }

    /**
     * The exercise a work or rep step is: the one picked for it, or else the one its name
     * means, as it would be linked when saved. Undefined for a rest step, an unnamed one, or
     * a name no exercise has yet.
     */
    protected exerciseFor(step: StepModel): Exercise | undefined {
        if (!isExercise(step)) {
            return undefined;
        }
        return (
            (step.exerciseId ? this.exercises.byId(step.exerciseId) : undefined) ??
            findByName(step.name, this.exercises.exercises())
        );
    }

    protected noteFor(exercise: Exercise): string | undefined {
        return this.exercises.noteFor(exercise.id);
    }

    protected showDetails(exercise: Exercise, stepKey: number) {
        this.exerciseInDetails.set({ exercise, stepKey });
    }

    protected closeDetails() {
        const opened = this.exerciseInDetails();
        this.exerciseInDetails.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-details`);
        }
    }

    /** Back to the step's name box with its name selected, so typing replaces it. */
    protected pickAnother() {
        const opened = this.exerciseInDetails();
        this.exerciseInDetails.set(null);
        if (opened) {
            afterNextRender(
                () => {
                    const box = document.getElementById(`step-${opened.stepKey}-name`);
                    if (box instanceof HTMLInputElement) {
                        box.focus();
                        box.select();
                    }
                },
                { injector: this.injector }
            );
        }
    }

    /** The step's name box picked an exercise, or was left with one's name typed in it. */
    protected exerciseChanged(stepKey: number, exercise: Exercise) {
        const why = this.measureAs(stepKey, exercise);
        if (why) {
            this.stepAnnouncement.set(why);
        }
    }

    /**
     * A step that's just become `exercise` becomes the kind it's measured by: timed for a timed
     * one, reps for one measured in reps, at the amounts adding it from its page gives (0:30,
     * or 10 reps), each set's too where they vary. Its sets, rest and sides stay, and its kind
     * can be changed back from its menu. Says why, or gives null if its kind was right.
     */
    private measureAs(stepKey: number, exercise: Exercise): string | null {
        const step = this.model().steps.find((each) => each.key === stepKey);
        const kind = exercise.measuredBy === 'timed' ? 'work' : 'reps';
        if (!step || !isExercise(step) || step.kind === kind) {
            return null;
        }
        const amount = kind === 'work' ? { minutes: 0, seconds: 30 } : { reps: 10 };
        this.replaceStep({
            ...step,
            ...amount,
            kind,
            setRows: step.setRows.map((row) => ({ ...row, ...amount })),
        });
        const measured = kind === 'work' ? 'is timed' : 'is done in reps';
        const what = step.vary ? 'each set' : 'this step';
        const now = kind === 'work' ? '00:30' : '10 reps';
        const text = `${exercise.name} ${measured}, so ${what} is now ${now}`;
        this.kindNote.set({ stepKey, exerciseId: exercise.id, kind, text });
        return text;
    }

    /** Why the step's kind just changed, while it's still that exercise and kind. */
    protected kindNoteFor(step: StepModel): string | null {
        const note = this.kindNote();
        return note?.stepKey === step.key &&
            note.kind === step.kind &&
            this.exerciseFor(step)?.id === note.exerciseId
            ? note.text
            : null;
    }

    /** Browse: the exercises as the Exercises page lists them, to pick the step's from (BLD-16). */
    protected startBrowse(stepKey: number, stepNumber: number) {
        this.browsing.set({ stepKey, stepNumber });
    }

    /**
     * The step becomes `picked`, its name and link, as picking it in the name box does; the
     * rest of the step stays as it is. Focus goes back to Browse.
     */
    protected browsedTo(picked: Exercise) {
        const opened = this.browsing();
        this.browsing.set(null);
        const step = opened && this.model().steps.find((each) => each.key === opened.stepKey);
        if (!opened || !step) {
            return;
        }
        this.replaceStep({ ...step, name: picked.name, exerciseId: picked.id });
        const why = this.measureAs(step.key, picked);
        this.stepAnnouncement.set(
            [`Step ${opened.stepNumber} is now ${picked.name}`, why].filter(Boolean).join('. ')
        );
        this.focusAfterRender(`step-${opened.stepKey}-browse`);
    }

    protected closeBrowse() {
        const opened = this.browsing();
        this.browsing.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-browse`);
        }
    }

    /** Swap: another exercise for the same muscles (BLD-14), for a step measured as this one is. */
    protected startSwap(exercise: Exercise, stepKey: number, kind: ItemKind) {
        if (kind === 'reps' || kind === 'work') {
            this.swapping.set({
                exercise,
                stepKey,
                measuredBy: kind === 'reps' ? 'reps' : 'timed',
            });
        }
    }

    /**
     * The step becomes `replacement`: its name and link, keeping its reps or time, sets and
     * sides, at the weight it was done at last time (each set's own where they vary), or
     * none. Undo puts the step back as it was. Focus goes back to Swap.
     */
    protected swapFor(replacement: Exercise) {
        const opened = this.swapping();
        this.swapping.set(null);
        const before = opened && this.model().steps.find((step) => step.key === opened.stepKey);
        if (!opened || !before) {
            return;
        }
        const lastSets = lastRepSets(this.history.entries(), replacement.id, null);
        const weighed = <T extends { weight: number; savedWeight: number | null }>(
            amount: T,
            set: number
        ): T => {
            const kg = before.kind === 'reps' ? lastWeight(lastSets, set) : undefined;
            return kg === undefined
                ? { ...amount, weight: 0, savedWeight: null }
                : { ...amount, weight: weightIn(kg, this.weightUnit), savedWeight: kg };
        };
        const swapped: StepModel = {
            ...(before.kind === 'reps' ? weighed(before, 0) : before),
            name: replacement.name,
            exerciseId: replacement.id,
            setRows:
                before.kind === 'reps'
                    ? before.setRows.map((row, set) => weighed(row, set))
                    : before.setRows,
        };
        this.replaceStep(swapped);
        this.undo.offerUndo({
            message: `Swapped to ${replacement.name}`,
            undo: () => {
                this.replaceStep(before);
                this.focusAfterRender(`step-${before.key}-swap`);
            },
        });
        this.focusAfterRender(`step-${opened.stepKey}-swap`);
    }

    protected closeSwap() {
        const opened = this.swapping();
        this.swapping.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-swap`);
        }
    }

    /** Puts `step` in place of the step with its key, if it's still there. */
    private replaceStep(step: StepModel) {
        this.updateSteps((steps) => steps.map((each) => (each.key === step.key ? step : each)));
    }

    protected openExercise(exercise: Exercise, stepKey: number) {
        this.exerciseInEditor.set({ exercise, stepKey });
    }

    /**
     * The editor saved: the step it was opened from is linked to the exercise, and every step
     * that is the exercise takes its name, in case it was renamed (EXR-3). Saved workouts have
     * been renamed by then; this does the same for the one being set up.
     */
    protected exerciseSaved(saved: Exercise) {
        const opened = this.exerciseInEditor();
        if (!opened) {
            return;
        }
        this.updateSteps((steps) =>
            steps.map((step) => {
                const isIt =
                    step.key === opened.stepKey ||
                    step.exerciseId === saved.id ||
                    (isExercise(step) &&
                        !step.exerciseId &&
                        findByName(step.name, [opened.exercise]) !== undefined);
                return isIt ? { ...step, name: saved.name, exerciseId: saved.id } : step;
            })
        );
        this.closeExercise();
    }

    protected closeExercise() {
        const opened = this.exerciseInEditor();
        this.exerciseInEditor.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-exercise`);
        }
    }

    protected isExpanded(key: number): boolean {
        return this.expandedKeys().has(key);
    }

    /** Opens or closes one step. Its button stays in place, so focus stays on it. */
    protected toggleStep(key: number) {
        this.smoothChange(() =>
            this.expandedKeys.update((keys) => {
                const next = new Set(keys);
                if (!next.delete(key)) {
                    next.add(key);
                }
                return next;
            })
        );
    }

    protected setAllExpanded(expanded: boolean) {
        this.smoothChange(() => this.expandedKeys.set(expanded ? this.allKeys() : new Set()));
    }

    /**
     * Opens or closes steps with the steps and everything under them sliding to their new
     * places, rather than the page jumping (and rather than animating a step's height, which
     * would lay the page out again every frame).
     */
    private smoothChange(change: () => void) {
        changeSmoothly(
            this.host.nativeElement,
            'form > *, .step, .wheel-row',
            this.injector,
            change
        );
    }

    /** Adds a rep step, the most common kind; its kind pill changes it. */
    protected addStep() {
        if (this.stepCount() >= MAX_STEPS) {
            return;
        }
        const step = this.newStep();
        this.updateSteps((steps) => [...steps, step]);
        // Only the new step is opened, keeping the rest of the list short
        this.expandedKeys.set(new Set([step.key]));
        this.stepAnnouncement.set(`Added a rep step, step ${this.stepCount()}`);
        this.focusAfterRender(`step-${step.key}-name`);
    }

    /**
     * Adds a heading at the end, e.g. "Warmup", opened with the cursor in its box. Headings
     * aren't steps, so they have a limit of their own.
     */
    protected addHeading() {
        if (this.headingCount() >= MAX_HEADINGS) {
            return;
        }
        const heading: StepModel = { ...this.newStep(), kind: 'heading' };
        this.updateSteps((steps) => [...steps, heading]);
        this.expandedKeys.set(new Set([heading.key]));
        this.stepAnnouncement.set('Added a heading');
        this.focusAfterRender(`step-${heading.key}-name`);
    }

    protected toggleKindMenu(key: number) {
        this.kindMenuFor.update((open) => (open === key ? null : key));
    }

    /**
     * Changes a step's kind. Its name, exercise and numbers stay, so changing it back
     * finds them again; only those for its new kind are used.
     */
    protected setStepKind(index: number, kind: StepKind) {
        const changed = this.model().steps[index];
        this.kindMenuFor.set(null);
        this.focusAfterRender(`step-${changed.key}-kind`);
        if (changed.kind === kind) {
            return;
        }
        this.updateSteps((steps) =>
            steps.map((step) => (step.key === changed.key ? { ...step, kind } : step))
        );
        this.stepAnnouncement.set(
            `Step ${this.stepNumber(index)} is now ${stepKindName(kind).toLowerCase()}`
        );
    }

    /** A click anywhere outside the open kind menu or the tooltip closes it. */
    protected closePopups(event: MouseEvent) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target?.closest('app-step-kind-menu')) {
            this.kindMenuFor.set(null);
        }
        if (!target?.closest('.info')) {
            this.infoOpen.set(false);
        }
    }

    /** Whether a row's up or down button can move it: see `moved()`. */
    protected canMove(index: number, by: -1 | 1): boolean {
        return moved(this.model().steps, index, by) !== null;
    }

    /**
     * The up and down buttons, for keyboard and screen reader users (and anyone else). A
     * superset moves with its steps, past the row or superset beside it, and its steps move
     * within it.
     */
    protected moveStep(index: number, by: -1 | 1) {
        const rows = moved(this.model().steps, index, by);
        if (!rows) {
            return;
        }
        const key = this.model().steps[index].key;
        this.placeRows(rows, key);
        // Focus follows the step to its new place: the same button, or the other move
        // button if that one has just been disabled (at the top or bottom)
        const to = rows.findIndex((row) => row.key === key);
        const stuck = moved(rows, to, by) === null;
        const button = by === -1 ? (stuck ? 'down' : 'up') : stuck ? 'up' : 'down';
        this.focusAfterRender(`step-${key}-${button}`);
    }

    /**
     * Where a step's handle was grabbed, from the step's top left (px). The CDK puts a custom
     * preview's top left corner at the pointer, so the preview is moved back by this much,
     * keeping the pointer where it took hold rather than jumping to the corner. No wider than
     * the step, so it stays on screen.
     */
    protected readonly grabbedAt = signal({ x: 0, y: 0, width: 0 });
    /** A step let go settles into its place at the finger's speed. */
    protected readonly drop = new DropSpring();

    /**
     * The superset whose handle is held: its steps hide from then until it's dropped, so it
     * drags as one row, its steps following it (`dropStep`). 0 for none.
     */
    protected readonly heldSuperset = signal(0);
    private supersetDragging = false;

    protected grabStep(event: PointerEvent, key: number) {
        const step = (event.currentTarget as Element).closest('.step')?.getBoundingClientRect();
        if (step) {
            this.grabbedAt.set({
                x: event.clientX - step.left,
                y: event.clientY - step.top,
                width: step.width,
            });
        }
        const row = this.model().steps.find((other) => other.key === key);
        if (row?.kind !== 'superset') {
            return;
        }
        // Hidden before the drag starts, so the list measures itself without them
        this.heldSuperset.set(key);
        this.supersetDragging = false;
        // Let go without dragging, its steps come back
        this.document.defaultView?.addEventListener(
            'pointerup',
            () => {
                if (!this.supersetDragging) {
                    this.heldSuperset.set(0);
                }
            },
            { once: true }
        );
    }

    protected dragStarted() {
        this.supersetDragging = this.heldSuperset() !== 0;
    }

    /**
     * Where a dragged row can go: anywhere that keeps each superset's steps together under its
     * row, so a step in one stays in it, and others go round it. Straight after a collapsed
     * superset's row is let through too, as that's after the superset on screen (`dropStep`).
     */
    protected readonly canDropAt = (index: number, drag: CdkDrag<number>): boolean => {
        const from = this.model().steps.findIndex((row) => row.key === drag.data);
        const rows = movedRow(this.model().steps, from, index);
        const at = rows.findIndex((row) => row.key === drag.data);
        const before = rows[at - 1];
        return (
            wellFormed(rows) ||
            (rows[at].group === 0 && before?.kind === 'superset' && !this.isExpanded(before.key))
        );
    };

    /** A step dragged by its handle and dropped in a new place. */
    protected dropStep(event: CdkDragDrop<unknown>) {
        this.heldSuperset.set(0);
        this.supersetDragging = false;
        if (event.previousIndex === event.currentIndex) {
            return;
        }
        const key = this.model().steps[event.previousIndex].key;
        let rows = movedRow(this.model().steps, event.previousIndex, event.currentIndex);
        if (!wellFormed(rows)) {
            // Dropped just after a collapsed superset's row: it goes after its steps
            const at = rows.findIndex((row) => row.key === key);
            const part = rows.slice(at, partEnd(rows, at));
            rows = rows.filter((row) => !part.includes(row));
            rows.splice(partEnd(rows, at - 1), 0, ...part);
        }
        this.placeRows(rows, key);
    }

    /** Puts the rows in their new order, and says where the one that moved is now. */
    private placeRows(rows: StepModel[], key: number) {
        this.updateSteps(() => rows);
        const to = rows.findIndex((row) => row.key === key);
        const moved = rows[to];
        if (moved.kind === 'heading' || moved.kind === 'superset') {
            // Said by what's after it now, as neither is numbered
            const end = partEnd(rows, to);
            const after = rows.slice(end).findIndex(isStep);
            const place = after === -1 ? 'the end' : `before step ${this.stepNumber(end + after)}`;
            const title = moved.kind === 'heading' ? this.stepTitle(to) : this.supersetName(to);
            this.stepAnnouncement.set(`Moved ${title.toLowerCase()} to ${place}`);
            return;
        }
        this.stepAnnouncement.set(
            `Moved ${moved.name.trim() || stepKindName(moved.kind).toLowerCase()} to step ${this.stepNumber(to)}`
        );
    }

    /**
     * The X button: deletes the step straight away. One with anything in it can be put back:
     * the Undo bar offers it (UndoService), rather than a question first. A superset goes
     * with its steps.
     */
    protected deleteStep(index: number) {
        const before = this.model().steps;
        const step = before[index];
        const isSet = hasAmount(step);
        const title = this.stepTitle(index);
        if (!step.name.trim() && !isSet && step.kind !== 'superset') {
            this.removeStep(index);
            this.focusAfterDelete(index);
            return;
        }
        this.removeStep(index);
        const time = isSet ? `, ${this.amountText(step)}` : '';
        this.undo.offerUndo({
            message: `Deleted ${title}${time}`,
            undo: () => {
                // A superset, or a step of one (which may have taken the superset with it), comes
                // back as the list was
                this.updateSteps((all) =>
                    step.kind === 'superset' || step.group
                        ? before
                        : [...all.slice(0, index), step, ...all.slice(index)]
                );
                this.stepAnnouncement.set(
                    step.kind === 'heading' || step.kind === 'superset'
                        ? `${this.stepTitle(index)} is back`
                        : `Step ${this.stepNumber(index)} is back`
                );
                this.focusAfterRender(
                    `step-${step.key}-${this.isExpanded(step.key) ? 'delete' : 'toggle'}`
                );
            },
            dismissed: () => this.focusAfterDelete(index),
        });
    }

    private removeStep(index: number) {
        const deleted = this.model().steps[index];
        const said =
            deleted.kind === 'heading'
                ? 'Deleted a heading'
                : deleted.kind === 'superset'
                  ? `Deleted a ${this.supersetName(index).toLowerCase()}`
                  : `Deleted step ${this.stepNumber(index)}`;
        this.updateSteps((all) =>
            lonelyStepsOut(
                all.filter((step) => step.key !== deleted.key && step.group !== deleted.key),
                deleted.group
            )
        );
        this.stepAnnouncement.set(said);
    }

    /**
     * After step `index` goes, focus the step that took its place, or the one before if it was
     * last: its delete button, or its open button if it's collapsed (and so has no delete
     * button). With none left, the Add button.
     */
    private focusAfterDelete(index: number) {
        const remaining = this.model().steps;
        const next = remaining[Math.min(index, remaining.length - 1)];
        if (!next) {
            this.focusAfterRender('add-step');
            return;
        }
        this.focusAfterRender(
            `step-${next.key}-${this.isExpanded(next.key) ? 'delete' : 'toggle'}`
        );
    }

    private updateSteps(change: (steps: StepModel[]) => StepModel[]) {
        this.model.update((setup) => ({ ...setup, steps: change(setup.steps) }));
    }

    private allKeys(): Set<number> {
        return new Set(this.model().steps.map((step) => step.key));
    }

    /**
     * A saved workout's steps and headings as the form holds them, each step with its group's
     * sets and rest. A group of one step is an exercise and its sets; one of several is a
     * superset, a row of its own with its rounds and rest, and then its steps. One of several
     * that runs once is each of its steps in turn, as workouts from before groups are, so it
     * opens as them.
     */
    private stepModels(workout: Workout): StepModel[] {
        return workout.blocks.flatMap((block): StepModel[] => {
            if (block.kind === 'heading') {
                return [{ ...this.newStep(), kind: 'heading', name: block.text }];
            }
            const rest = block.rounds > 1 ? block.restSeconds : 60;
            const steps = block.steps.map((step) => ({
                ...this.stepModel(step, block.rounds, rest),
                ...this.setRowModels(step),
            }));
            if (steps.length === 1 || block.rounds === 1) {
                return steps;
            }
            const head: StepModel = {
                ...this.stepModel({ kind: 'reps', reps: 0, name: '' }, block.rounds, rest),
                kind: 'superset',
            };
            // Even a rest step has the rounds, in case it's changed to another kind
            return [
                head,
                ...steps.map((step) => ({ ...step, sets: block.rounds, group: head.key })),
            ];
        });
    }

    private stepModel(step: Step, sets = 1, rest = 60): StepModel {
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
            weight:
                step.kind === 'reps' && step.weight ? weightIn(step.weight, this.weightUnit) : 0,
            savedWeight: (step.kind === 'reps' && step.weight) || null,
            exerciseId: step.exerciseId ?? '',
            vary: false,
            setRows: [],
            group: 0,
        };
    }

    /** A step's sets as rows, where they vary (BLD-11). */
    private setRowModels(step: Step): Pick<StepModel, 'vary' | 'setRows'> {
        if (step.kind === 'rest' || !step.sets) {
            return { vary: false, setRows: [] };
        }
        return {
            vary: true,
            setRows: step.sets.map((_, set) => rowOf(this.stepModel(stepForSet(step, set)))),
        };
    }

    private newStep(): StepModel {
        return this.stepModel({ kind: 'reps', reps: 0, name: '' });
    }

    // A new workout starts with one rep step, ready to fill in or change to another kind
    private emptySetup(): WorkoutSetupModel {
        return {
            title: '',
            steps: [this.newStep()],
            repeats: 1,
            repeatMode: 'rounds',
            limitMinutes: DEFAULT_TIME_LIMIT_MINUTES,
            limitSeconds: 0,
        };
    }

    private findWorkoutToEdit(params: ParamMap): Workout | null {
        const editId = params.get('editId');
        return editId ? this.workoutStore.findWorkoutById(editId) : null;
    }

    /** Start (the form's submit): saves the workout, starts it and opens the workout page. */
    private async saveAndStart(): Promise<void> {
        const savedWorkout = this.save();
        this.load(null);
        this.run.start(savedWorkout);
        await this.router.navigate(['/workout']);
    }

    /**
     * Save (BLD-15), checked as Start is: saves the workout without starting it, and goes back
     * to the library with it highlighted.
     */
    protected async saveOnly(): Promise<void> {
        await submit(this.workoutForm, async () => {
            const savedWorkout = this.save();
            this.load(null);
            await this.router.navigate(['/library'], { queryParams: { saved: savedWorkout.id } });
            return undefined;
        });
    }

    /** Saves the form to the library, as a new workout or over the one being edited. */
    private save(): Workout {
        const setup = this.model();
        const { title, steps } = setup;
        // A time limit runs as many rounds as fit, so its rounds are UNTIL_STOPPED
        const workout: WorkoutFields =
            setup.repeatMode === 'time'
                ? {
                      title,
                      blocks: toBlocks(steps, this.weightUnit),
                      repeats: UNTIL_STOPPED,
                      timeLimitSeconds: timeLimitSeconds(setup),
                  }
                : {
                      title,
                      blocks: toBlocks(steps, this.weightUnit),
                      repeats: setup.repeats,
                  };

        const editingId = this.editingWorkoutId();
        return editingId
            ? (this.workoutStore.updateWorkout(editingId, workout) ??
                  this.workoutStore.addWorkout(workout))
            : this.workoutStore.addWorkout(workout);
    }
}

/** A row that's a step, rather than a heading or a superset's own row. */
function isStep(row: StepModel): row is StepModel & { kind: StepKind } {
    return row.kind !== 'heading' && row.kind !== 'superset';
}

/** A row that's an exercise: a rep or timed step, which can be linked to one and joined. */
function isExercise(row: StepModel): boolean {
    return row.kind === 'reps' || row.kind === 'work';
}

/** Just after the end of the row at `index`: after its steps, for a superset's row. */
function partEnd(rows: readonly StepModel[], index: number): number {
    const row = rows[index];
    let end = index + 1;
    while (row?.kind === 'superset' && rows[end]?.group === row.key) {
        end++;
    }
    return end;
}

/**
 * The rows with the one at `index` moved up or down one place, or null if it can't go: a
 * superset goes with its steps, past the row or the whole superset beside it, and a step in a
 * superset moves within it.
 */
function moved(rows: readonly StepModel[], index: number, by: -1 | 1): StepModel[] | null {
    const row = rows[index];
    if (row.group) {
        const target = index + by;
        if (rows[target]?.group !== row.group) {
            return null;
        }
        const next = [...rows];
        moveItemInArray(next, index, target);
        return next;
    }
    const end = partEnd(rows, index);
    if (by === 1) {
        if (end >= rows.length) {
            return null;
        }
        const nextEnd = partEnd(rows, end);
        return [
            ...rows.slice(0, index),
            ...rows.slice(end, nextEnd),
            ...rows.slice(index, end),
            ...rows.slice(nextEnd),
        ];
    }
    if (index === 0) {
        return null;
    }
    // The row before, or the superset whose last step it is
    const above = rows[index - 1].group;
    const start = above ? rows.findIndex((other) => other.key === above) : index - 1;
    return [
        ...rows.slice(0, start),
        ...rows.slice(index, end),
        ...rows.slice(start, index),
        ...rows.slice(end),
    ];
}

/**
 * The rows with the one at `from` dragged to `to`, as the drag list counts places; a
 * superset's row takes its steps with it, straight after it.
 */
function movedRow(rows: readonly StepModel[], from: number, to: number): StepModel[] {
    const next = [...rows];
    moveItemInArray(next, from, to);
    const row = rows[from];
    if (row.kind !== 'superset') {
        return next;
    }
    const steps = next.filter((other) => other.group === row.key);
    const others = next.filter((other) => other.group !== row.key);
    const at = others.indexOf(row) + 1;
    return [...others.slice(0, at), ...steps, ...others.slice(at)];
}

/** Whether each superset's steps follow its row, together. */
function wellFormed(rows: readonly StepModel[]): boolean {
    return rows.every((row, i) => {
        const before = rows[i - 1];
        return !row.group || before?.key === row.group || before?.group === row.group;
    });
}

/** A superset's step taken out of it: an exercise of its own, with its rounds and rest. */
function ownExercise(step: StepModel, superset: StepModel): StepModel {
    return {
        ...step,
        group: 0,
        sets: superset.sets,
        restMinutes: superset.restMinutes,
        restSeconds: superset.restSeconds,
    };
}

/**
 * The rows with superset `key` gone if it's been left with one step (which becomes an
 * exercise of its own, in its place) or none. As they are if it hasn't, or for no superset.
 */
function lonelyStepsOut(rows: StepModel[], key: number): StepModel[] {
    const superset = rows.find((row) => row.key === key);
    if (!key || !superset || rows.filter((row) => row.group === key).length > 1) {
        return rows;
    }
    return rows.flatMap((row) =>
        row.key === key ? [] : row.group === key ? [ownExercise(row, superset)] : [row]
    );
}

/**
 * A step with a number of sets, e.g. its superset's rounds. With Vary each set on, a set
 * added copies the last one's row, and one taken away goes from the end; down to 1 set,
 * there's nothing to vary, so it goes off.
 */
function withSets(step: StepModel, sets: number): StepModel {
    if (step.sets === sets) {
        return step;
    }
    if (!step.vary) {
        return { ...step, sets };
    }
    if (sets < 2) {
        return { ...varyOff(step), sets };
    }
    return {
        ...step,
        sets,
        setRows: Array.from(
            { length: sets },
            // A copy of its fields, not a spread: the form tracks a row by the object
            (_, i) => step.setRows[i] ?? rowOf(step.setRows.at(-1)!)
        ),
    };
}

/** Whether a step has a time, reps or a weight, as its kind uses. Other rows have none. */
function hasAmount(step: StepModel): boolean {
    if (!isStep(step)) {
        return false;
    }
    // Where its sets vary, its rows have them, and its own are left as they were
    return (varies(step) ? step.setRows : [step]).some((row) =>
        step.kind === 'reps' ? row.reps > 0 || row.weight > 0 : row.minutes > 0 || row.seconds > 0
    );
}

/** Whether a step's sets each have their own row (BLD-11): only with more than one set. */
function varies(step: StepModel): boolean {
    return step.vary && step.sets > 1 && (step.kind === 'reps' || step.kind === 'work');
}

/**
 * A row for a set as the step (or another row) has it. Its fields only: a spread would copy
 * the hidden key the form tracks an array's rows by, and two rows can't share one.
 */
function rowOf({ reps, weight, savedWeight, minutes, seconds }: SetRowModel): SetRowModel {
    return { reps, weight, savedWeight, minutes, seconds };
}

/** Vary each set off: every set back to set 1's, which is the step's own again. */
function varyOff(step: StepModel): StepModel {
    const [first] = step.setRows;
    return { ...step, ...(first ? rowOf(first) : {}), vary: false, setRows: [] };
}

/** Whether a set's row has reps, or a time, as its step's kind uses. */
function rowHasAmount(step: StepModel, row: SetRowModel): boolean {
    return step.kind === 'reps' ? row.reps > 0 : row.minutes > 0 || row.seconds > 0;
}

function rowTime(row: SetRowModel): string {
    return `${padded(row.minutes)}:${padded(row.seconds)}`;
}

function timeLimitSeconds(setup: WorkoutSetupModel): number {
    return setup.limitMinutes * 60 + setup.limitSeconds;
}

/**
 * The workout to save, a group for each step with its sets and the rest between them, one for
 * each superset with its rounds and rest, and its headings, trimmed, in their places. Steps left
 * at 0:00 or 0 reps are left out, and so are headings left empty and supersets left with no
 * steps. A run of steps of one set runs as a circuit's round always has, each straight after
 * the last.
 */
function toBlocks(rows: readonly StepModel[], unit: WeightUnit): Block[] {
    const blocks: Block[] = [];
    // The superset whose steps are being added to it, if the rows are in one
    let superset: StepGroup | null = null;
    for (const model of rows) {
        if (model.kind === 'heading') {
            const text = model.name.trim();
            if (text) {
                blocks.push({ kind: 'heading', text });
            }
            continue;
        }
        if (model.kind === 'superset') {
            superset = { kind: 'group', ...setsAndRest(model), steps: [] };
            blocks.push(superset);
            continue;
        }
        const step = toStep({ ...model, kind: model.kind }, unit);
        if (step.kind === 'reps' ? step.reps === 0 : step.seconds === 0) {
            continue;
        }
        if (model.group && superset) {
            superset.steps.push(step);
            continue;
        }
        // A set row left at 0 reps or 00:00 is stopped by the form's check before saving
        blocks.push({
            kind: 'group',
            ...setsAndRest(step.kind === 'rest' ? { ...model, sets: 1 } : model),
            steps: [step],
        });
    }
    return blocks.filter((block) => block.kind === 'heading' || block.steps.length > 0);
}

/** A group's rounds, and the rest between them: none for one round. */
function setsAndRest(model: StepModel): Pick<StepGroup, 'rounds' | 'restSeconds'> {
    return {
        rounds: model.sets,
        restSeconds: model.sets > 1 ? model.restMinutes * 60 + model.restSeconds : 0,
    };
}

/**
 * A step to save: whole seconds, a trimmed name, a weight in kg, any exercise picked, and
 * each side if it's done each side.
 */
function toStep(model: StepModel & { kind: StepKind }, unit: WeightUnit): Step {
    if (varies(model)) {
        // Set 1's is the step's own, so it reads as a whole step
        const rows = model.setRows.map((row) => toStep({ ...model, ...row, vary: false }, unit));
        const first = rows[0];
        return first.kind === 'reps'
            ? {
                  ...first,
                  sets: rows.map((row) => {
                      const { reps, weight } = row as RepStep;
                      return { reps, ...(weight === undefined ? {} : { weight }) };
                  }),
              }
            : { ...first, sets: rows.map((row) => ({ seconds: (row as TimedStep).seconds })) };
    }
    const step = model;
    const eachSide = step.kind !== 'rest' && step.eachSide ? { eachSide: true as const } : {};
    return step.kind === 'reps'
        ? {
              kind: 'reps',
              reps: step.reps,
              name: step.name.trim(),
              ...(step.weight > 0 ? { weight: savedWeight(step, unit) } : {}),
              ...(step.exerciseId ? { exerciseId: step.exerciseId } : {}),
              ...eachSide,
          }
        : {
              kind: step.kind,
              seconds: step.minutes * 60 + step.seconds,
              name: step.name.trim(),
              ...(step.kind === 'work' && step.exerciseId ? { exerciseId: step.exerciseId } : {}),
              ...eachSide,
          };
}

/** A rep step's weight in kg: as it was saved, if the wheel hasn't moved, so it isn't rounded. */
function savedWeight(step: StepModel, unit: WeightUnit): number {
    return step.savedWeight !== null && weightIn(step.savedWeight, unit) === step.weight
        ? step.savedWeight
        : weightToKg(step.weight, unit);
}
