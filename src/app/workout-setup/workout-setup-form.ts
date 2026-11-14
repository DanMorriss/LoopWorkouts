import {
    afterNextRender,
    computed,
    effect,
    ElementRef,
    inject,
    Injectable,
    Injector,
    signal,
} from '@angular/core';
import { applyEach, form, maxLength, submit, validate } from '@angular/forms/signals';
import { ParamMap, Router } from '@angular/router';
import { isBuiltIn, MAX_EXERCISE_NAME_LENGTH } from '../models/exercise';
import { weightIn, weightOptions } from '../models/weight';
import {
    allSteps,
    hasWork,
    MAX_HEADING_LENGTH,
    MAX_HEADINGS,
    MAX_REPEATS,
    MAX_REPS,
    MAX_STEPS,
    Step,
    stepForSet,
    StepKind,
    stepKindName,
    UNTIL_STOPPED,
    Workout,
    WorkoutFields,
} from '../models/workout';
import { PageSlide } from '../shared/navigation/page-slide';
import { WheelPickerOption } from '../shared/components/wheel-picker/wheel-picker.component';
import { injectFocusAfterRender } from '../shared/focus-after-render';
import { changeSmoothly } from '../shared/layout-change';
import { ActiveRunService } from '../shared/run/active-run.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { UndoService } from '../shared/undo/undo.service';
import {
    DEFAULT_TIME_LIMIT_MINUTES,
    hasAmount,
    isStep,
    lonelyStepsOut,
    moved,
    NAME_EXAMPLES,
    padded,
    partEnd,
    pickerOptions,
    RepeatMode,
    rowHasAmount,
    rowOf,
    StepModel,
    timeLimitSeconds,
    toBlocks,
    varies,
    varyOff,
    withSets,
    WorkoutSetupModel,
} from './step-model';
import {
    amountText,
    setRowText,
    stepNumbers,
    stepTitle,
    summaryName,
    supersetNameAt,
    supersetSteps,
    toggleLabel,
} from './step-text';

/**
 * Create's form: the workout being set up, as rows (see StepModel), its checks, and what can be
 * done to its rows. One for each Create page, shared with the parts of it.
 */
@Injectable()
export class WorkoutSetupForm {
    private readonly workoutStore = inject(WorkoutStore);
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly slide = inject(PageSlide);
    private readonly injector = inject(Injector);
    private readonly focusAfterRender = injectFocusAfterRender();
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly exercises = inject(ExerciseStore);
    private readonly plan = inject(PlanStore);

    /** Weights are shown and picked in this, and saved in kg. */
    readonly weightUnit = inject(SettingsStore).weightUnit();

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

    private nextKey = 1;
    readonly model = signal<WorkoutSetupModel>(this.emptySetup());
    /** Keys of the steps showing their name box and wheels; the rest show a one-line summary. */
    readonly expandedKeys = signal<ReadonlySet<number>>(this.allKeys());

    readonly workoutForm = form(
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
    readonly stepCount = computed(() => this.model().steps.filter(isStep).length);
    readonly headingCount = computed(
        () => this.model().steps.filter((step) => step.kind === 'heading').length
    );
    readonly anyExpanded = computed(() => {
        const expanded = this.expandedKeys();
        return this.model().steps.some((step) => expanded.has(step.key));
    });
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
    }

    /** Whether the tooltip by the Steps heading is showing. */
    readonly infoOpen = signal(false);

    /** The set row open on its wheels (BLD-11), as `key-set`, if one is: one at a time. */
    readonly openSetRow = signal<string | null>(null);

    /** The key of the step whose kind menu is open, if one is. */
    readonly kindMenuFor = signal<number | null>(null);

    /** Read out by screen readers after a step is added, moved, changed or deleted. */
    readonly stepAnnouncement = signal('');

    private readonly undo = inject(UndoService);

    readonly noSetAmountError = computed(() =>
        this.workoutForm()
            .errors()
            .find((error) => error.kind === 'noSetAmount')
    );

    readonly noTimeLimitError = computed(() =>
        this.workoutForm()
            .errors()
            .find((error) => error.kind === 'noTimeLimit')
    );

    // Not until something's been put in a step: a new workout opens with an empty one
    readonly noTimeError = computed(() =>
        this.model()
            .steps.filter(isStep)
            .every((step) => !step.name.trim() && !hasAmount(step))
            ? undefined
            : this.workoutForm()
                  .errors()
                  .find((error) => error.kind === 'noTime')
    );

    /** The form as it opened or was last saved, to tell if it's been changed since. */
    readonly savedState = signal('');
    readonly hasChanges = computed(() => JSON.stringify(this.model()) !== this.savedState());

    /**
     * Adds an exercise from its page (EXR-12) at the end of the workout, as the one step open:
     * 3 sets of 10 reps (or of 0:30, for a timed one) with 1:00 rest, to change before saving.
     * A new workout's empty first step makes way for it. Nothing happens for an exercise
     * that isn't there, or a workout already at MAX_STEPS.
     */
    addExercise(exerciseId: string) {
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
    load(workoutToEdit: Workout | null) {
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

    setRepeatMode(repeatMode: RepeatMode) {
        this.model.update((setup) => ({ ...setup, repeatMode }));
    }

    setUntilStopped(on: boolean) {
        const repeats = on ? UNTIL_STOPPED : this.lastRounds;
        this.model.update((setup) => ({ ...setup, repeats }));
    }

    /** A step's number, counting steps only, as headings aren't steps. */
    stepNumber(index: number): number {
        return this.stepNumbers()[index];
    }

    /** Each row's step number (see `stepNumbers()`). */
    private readonly stepNumbers = computed(() => stepNumbers(this.model().steps));

    /** The steps of the superset whose own row is at `index`, in order. */
    supersetSteps(index: number): StepModel[] {
        return supersetSteps(this.model().steps, index);
    }

    // What a row says (step-text.ts)
    supersetName(index: number): string {
        return supersetNameAt(this.model().steps, index);
    }
    stepTitle(index: number): string {
        return stepTitle(this.model().steps, index, this.stepNumbers());
    }
    toggleLabel(index: number): string {
        return toggleLabel(this.model().steps, index, this.stepNumbers(), this.weightUnit);
    }
    summaryName(index: number): string {
        return summaryName(this.model().steps, index);
    }
    amountText(step: StepModel): string {
        return amountText(step, this.weightUnit);
    }
    setRowText(step: StepModel, set: number): string {
        return setRowText(step, set, this.weightUnit);
    }

    /**
     * The Sets wheel, or a superset's Rounds wheel, which are the sets of each of its steps.
     * With Vary each set on, a set added copies the last one's row, and one taken away goes
     * from the end; down to 1 set, there's nothing to vary, so it goes off.
     */
    setSets(index: number, sets: number) {
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
     * The Vary each set switch: on, every set starts as the step is, a row each; off, every
     * set goes back to set 1's.
     */
    setVary(index: number, on: boolean) {
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

    isSetRowOpen(key: number, set: number): boolean {
        return this.openSetRow() === `${key}-${set}`;
    }

    /** Opens a set's row on its wheels, closing any other; or closes it. Rows slide to fit. */
    toggleSetRow(key: number, set: number) {
        const id = `${key}-${set}`;
        this.smoothChange(() => this.openSetRow.update((open) => (open === id ? null : id)));
    }

    private updateStep(key: number, change: (step: StepModel) => StepModel) {
        this.updateSteps((steps) => steps.map((step) => (step.key === key ? change(step) : step)));
    }

    /** Puts `step` in place of the step with its key, if it's still there. */
    replaceStep(step: StepModel) {
        this.updateSteps((steps) => steps.map((each) => (each.key === step.key ? step : each)));
    }

    isExpanded(key: number): boolean {
        return this.expandedKeys().has(key);
    }

    /** Opens or closes one step. Its button stays in place, so focus stays on it. */
    toggleStep(key: number) {
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

    setAllExpanded(expanded: boolean) {
        this.smoothChange(() => this.expandedKeys.set(expanded ? this.allKeys() : new Set()));
    }

    /**
     * Opens or closes steps with the steps and everything under them sliding to their new
     * places, rather than the page jumping (and rather than animating a step's height, which
     * would lay the page out again every frame).
     */
    smoothChange(change: () => void) {
        changeSmoothly(
            this.host.nativeElement,
            'form > *, .step, .wheel-row',
            this.injector,
            change
        );
    }

    /** Adds a rep step, the most common kind; its kind pill changes it. */
    addStep() {
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
    addHeading() {
        if (this.headingCount() >= MAX_HEADINGS) {
            return;
        }
        const heading: StepModel = { ...this.newStep(), kind: 'heading' };
        this.updateSteps((steps) => [...steps, heading]);
        this.expandedKeys.set(new Set([heading.key]));
        this.stepAnnouncement.set('Added a heading');
        this.focusAfterRender(`step-${heading.key}-name`);
    }

    toggleKindMenu(key: number) {
        this.kindMenuFor.update((open) => (open === key ? null : key));
    }

    /**
     * Changes a step's kind. Its name, exercise and numbers stay, so changing it back
     * finds them again; only those for its new kind are used.
     */
    setStepKind(index: number, kind: StepKind) {
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
    closePopups(event: MouseEvent) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target?.closest('app-step-kind-menu')) {
            this.kindMenuFor.set(null);
        }
        if (!target?.closest('.info')) {
            this.infoOpen.set(false);
        }
    }

    /** Whether a row's up or down button can move it: see `moved()`. */
    canMove(index: number, by: -1 | 1): boolean {
        return moved(this.model().steps, index, by) !== null;
    }

    /**
     * The up and down buttons, for keyboard and screen reader users (and anyone else). A
     * superset moves with its steps, past the row or superset beside it, and its steps move
     * within it.
     */
    moveStep(index: number, by: -1 | 1) {
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

    /** Puts the rows in their new order, and says where the one that moved is now. */
    placeRows(rows: StepModel[], key: number) {
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
    deleteStep(index: number) {
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

    updateSteps(change: (steps: StepModel[]) => StepModel[]) {
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

    /** A new rep step's row, ready to fill in. */
    newStep(): StepModel {
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

    findWorkoutToEdit(params: ParamMap): Workout | null {
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
     * Save (BLD-15), checked as Start is: saves the workout without starting it, and slides back
     * out, as ‹ does: an edited one to its details, where the change shows, a new one to
     * Workouts, with it highlighted, or, made for a day of the plan, to the Plan page, with it
     * highlighted on that day. All say it was saved.
     */
    async saveOnly(): Promise<void> {
        await submit(this.workoutForm, async () => {
            const editing = this.editingWorkoutId() !== null;
            const planned = !editing && this.planOn() !== null;
            const savedWorkout = this.save();
            // Kept as it is, so the page slides out showing what was saved; only marked saved,
            // so leaving doesn't ask about changes
            this.savedState.set(JSON.stringify(this.model()));
            this.slide.navigate(
                editing
                    ? `/library/${savedWorkout.id}?saved=1`
                    : planned
                      ? `/plan?saved=${savedWorkout.id}`
                      : `/library?saved=${savedWorkout.id}`,
                'out'
            );
            return undefined;
        });
    }

    /**
     * The workout as it's set up, as Save saves it: what the page's estimate of how long it
     * takes is worked out from, as it changes (LIB-9).
     */
    readonly fields = computed((): WorkoutFields => {
        const setup = this.model();
        const { title, steps } = setup;
        const blocks = toBlocks(steps, this.weightUnit);
        // A time limit runs as many rounds as fit, so its rounds are UNTIL_STOPPED
        return setup.repeatMode === 'time'
            ? { title, blocks, repeats: UNTIL_STOPPED, timeLimitSeconds: timeLimitSeconds(setup) }
            : { title, blocks, repeats: setup.repeats };
    });

    /** As `fields()`, with the id of the workout being edited, so its runs give your pace. */
    readonly estimated = computed(() => ({ id: this.editingWorkoutId() ?? '', ...this.fields() }));

    /** Saves the form to the library, as a new workout or over the one being edited. */
    private save(): Workout {
        const workout = this.fields();

        const editingId = this.editingWorkoutId();
        if (editingId) {
            return (
                this.workoutStore.updateWorkout(editingId, workout) ??
                this.workoutStore.addWorkout(workout)
            );
        }
        const added = this.workoutStore.addWorkout(workout);
        // Made for a day of the plan: it goes on that day, by Save or Start
        const day = this.planOn();
        if (day !== null) {
            this.plan.add(day, added.id);
        }
        return added;
    }
}
