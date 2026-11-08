import { computed, inject, Service, signal } from '@angular/core';
import {
    allSteps,
    asOneGroup,
    Block,
    copyOf,
    hasWork,
    isReadyMadeId,
    MAX_HEADING_LENGTH,
    MAX_HEADINGS,
    MAX_REPEATS,
    MAX_REPS,
    MAX_STEP_SECONDS,
    MAX_TIME_LIMIT_SECONDS,
    MAX_SWITCH_SECONDS,
    RunSides,
    DEFAULT_RUN_SIDES,
    RepSetAmount,
    RepStep,
    ReadyMadeWorkout,
    Step,
    TimedSetAmount,
    TimedStep,
    UNTIL_STOPPED,
    Workout,
    WorkoutFields,
    withSteps,
} from '../../models/workout';
import type { BuiltInWorkout } from '../../models/built-in-workouts';
import { MAX_WEIGHT_KG } from '../../models/weight';
import { isLoggedSet, isTimedSet, RepSet } from '../../models/history';
import { StepSwap } from '../../models/step-swap';
import { StepSkip } from '../../workout/workout-state';
import { Deletion, inOrder, LibraryOrder, mergeRecords, newId } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { ReadyMadeFavourites } from './ready-made-favourites.service';
import { ReadyMadeChanges } from './ready-made-changes.service';
import { withAmounts } from '../../models/ready-made-change';
import { SyncClock } from './sync-clock.service';
import { ExerciseStore } from './exercise-store.service';
import { linkSteps } from '../../models/exercise-links';
import { LEGACY_WORKOUT_IDS_KEY, migrateSavedData, renameActiveRunKeys } from './migrate';

@Service()
export class WorkoutStore {
    private readonly deletions = inject(DeletionStore);
    private readonly clock = inject(SyncClock);
    private readonly exercises = inject(ExerciseStore);
    private readonly favourites = inject(ReadyMadeFavourites);
    private readonly readyMadeChanges = inject(ReadyMadeChanges);
    private _workouts = signal<Workout[]>([]);
    private readonly _builtIns = signal<readonly BuiltInWorkout[]>([]);
    private _movedAt = signal(readMovedAt());
    private _activeWorkout = signal<Workout | null>(null);
    private _activeWorkoutStartedAt = signal<number | null>(null);
    private _activeWorkoutPausedAt = signal<number | null>(null);
    private _activeRunStartedAt = signal<number | null>(null);
    private _activeRepStepsDone = signal(0);
    private _activeRepMs = signal(0);
    private _activeSets = signal<RepSet[]>([]);
    private _activeSides = signal<RunSides>(DEFAULT_RUN_SIDES);
    private _activeSwaps = signal<StepSwap[]>([]);
    private _activeSkips = signal<StepSkip[]>([]);

    /** Your own workouts, which are your data: saved, backed up and synced. */
    readonly workouts = computed(() => this._workouts());

    /**
     * Resolves once the ready-made workouts (LIB-6) are here. They load on demand, a moment
     * after the app starts, so they're not in its first download.
     */
    readonly readyMadeLoaded: Promise<void> = import('../../models/built-in-workouts').then(
        ({ BUILT_IN_WORKOUTS }) => {
            this._builtIns.set(BUILT_IN_WORKOUTS);
            this.restoreReadyMadeRun();
        }
    );

    /**
     * The ready-made workouts, used as they are but with your own reps and weights on them,
     * each a favourite if it's been made one.
     */
    readonly readyMade = computed<ReadyMadeWorkout[]>(() => {
        const favourites = this.favourites.ids();
        const changes = this.readyMadeChanges.byId();
        return this._builtIns().map((workout) => ({
            ...withAmounts(workout, changes.get(workout.id)?.steps ?? []),
            updatedAt: 0,
            ...(favourites.has(workout.id) ? { favourite: true as const } : {}),
        }));
    });

    /** Every workout there is to start or plan: yours, then the ready-made ones. */
    readonly allWorkouts = computed<Workout[]>(() => [...this._workouts(), ...this.readyMade()]);
    /** The library's order, to sync with other copies (see `mergeLibraryOrder()`). */
    readonly libraryOrder = computed<LibraryOrder>(() => ({
        ids: this._workouts().map((workout) => workout.id),
        updatedAt: this._movedAt(),
    }));
    readonly activeWorkout = computed(() => this._activeWorkout());
    /** When the active workout was started, in ms since the epoch. Moves forward on resume. */
    readonly activeWorkoutStartedAt = computed(() => this._activeWorkoutStartedAt());
    /** When the active workout was paused, in ms since the epoch, or null while it runs. */
    readonly activeWorkoutPausedAt = computed(() => this._activeWorkoutPausedAt());
    readonly isPaused = computed(() => this._activeWorkoutPausedAt() !== null);
    /**
     * When the current run really began, in ms since the epoch. Unlike `activeWorkoutStartedAt`
     * it doesn't move on resume, so it identifies the run and dates it in the history.
     */
    readonly activeRunStartedAt = computed(() => this._activeRunStartedAt());
    /** How many rep steps of the current run have been done, across all its rounds. */
    readonly activeRepStepsDone = computed(() => this._activeRepStepsDone());
    /**
     * Time spent on rep steps done so far, in ms. Done takes it off the countdown's clock
     * (see `finishRepStep()`), so the history adds it back to the time spent.
     */
    readonly activeRepMs = computed(() => this._activeRepMs());
    /** Timed steps and rests skipped part-way in the current run (RUN-12), in order. */
    readonly activeSkips = computed(() => this._activeSkips());
    /**
     * The run's real time less its clock, in ms: the time on rep steps done, which Done takes
     * off the clock, less the time skipped, which Skip adds to it. Negative when more was
     * skipped. A time limit counts the clock plus this, so the time a skip saves is more
     * rounds.
     */
    readonly activeOffClockMs = computed(
        () =>
            this._activeRepMs() -
            this._activeSkips().reduce((total, skip) => total + skip.skippedMs, 0)
    );
    /**
     * The sets of rep steps done so far in the current run, in order. Its timed sets are
     * worked out from the clock (see `ActiveRunService.sets`).
     */
    readonly activeSets = computed(() => this._activeSets());
    /**
     * Exercises swapped for others in the current run (RUN-11), in the order they were
     * swapped. The saved workout keeps its own (see `ActiveRunService.running`).
     */
    readonly activeSwaps = computed(() => this._activeSwaps());
    /**
     * How the current run does exercises each side, from the settings when it started: kept
     * with the run, so changing them mid-workout can't move its clock.
     */
    readonly activeSides = computed(() => this._activeSides());

    constructor() {
        renameActiveRunKeys();
        this._workouts.set(this.loadWorkouts());
        const active = this.loadActiveWorkout();
        if (active) {
            this.restoreRun(active);
        }
    }

    /** A run of a ready-made workout carries on after a reload once they've loaded. */
    private restoreReadyMadeRun() {
        const savedId = sessionStorage.getItem('activeWorkoutId') ?? '';
        const workout = isReadyMadeId(savedId) ? this.findAnyWorkout(savedId) : null;
        if (workout && !this._activeWorkout()) {
            this.restoreRun(workout);
        }
    }

    /** Takes up the run of `workout` this tab had going, from where it was saved. */
    private restoreRun(workout: Workout) {
        this._activeWorkout.set(workout);
        const startedAt = this.loadActiveWorkoutStartedAt();
        this._activeWorkoutStartedAt.set(startedAt);
        this._activeWorkoutPausedAt.set(this.loadActiveWorkoutPausedAt(startedAt));
        // Runs from before this was saved fall back to the (possibly resumed) start time
        const runStart = Number(sessionStorage.getItem('activeRunStartedAt'));
        this._activeRunStartedAt.set(
            Number.isFinite(runStart) && runStart > 0 && runStart <= startedAt
                ? runStart
                : startedAt
        );
        this._activeRepStepsDone.set(readCount(sessionStorage.getItem('activeRepStepsDone')));
        this._activeRepMs.set(readCount(sessionStorage.getItem('activeRepMs')));
        this._activeSets.set(readSets(sessionStorage.getItem('activeSets')));
        this._activeSides.set(readSides(sessionStorage.getItem('activeSides')));
        this._activeSwaps.set(readSwaps(sessionStorage.getItem('activeSwaps')));
        this._activeSkips.set(readSkips(sessionStorage.getItem('activeSkips')));
    }

    private loadWorkouts(): Workout[] {
        migrateSavedData();
        const savedWorkouts = localStorage.getItem('workouts');
        if (!savedWorkouts) {
            return [];
        }

        // Corrupted or unexpected data shouldn't stop the app from starting,
        // so drop anything that isn't a usable workout
        try {
            const parsed: unknown = JSON.parse(savedWorkouts);
            return Array.isArray(parsed)
                ? parsed.map((item) => readWorkout(item)).filter((workout) => workout !== null)
                : [];
        } catch {
            return [];
        }
    }

    // The active workout and its start time are remembered per tab, so refreshing
    // the workout page carries on where it was
    private loadActiveWorkout(): Workout | null {
        const savedId = sessionStorage.getItem('activeWorkoutId');
        if (!savedId) {
            return null;
        }
        // A run started before workouts had random ids still has its old number
        return (
            this.findWorkoutById(savedId) ?? this.findWorkoutById(legacyWorkoutId(savedId) ?? '')
        );
    }

    private loadActiveWorkoutStartedAt(): number {
        const savedStart = Number(sessionStorage.getItem('activeWorkoutStartedAt'));
        const now = Date.now();
        // Fall back to starting now if the saved time is missing or impossible
        return Number.isFinite(savedStart) && savedStart > 0 && savedStart <= now
            ? savedStart
            : now;
    }

    // A saved pause only counts if it falls between the start and now; otherwise the workout runs
    private loadActiveWorkoutPausedAt(startedAt: number): number | null {
        const saved = sessionStorage.getItem('activeWorkoutPausedAt');
        const pausedAt = Number(saved);
        return saved !== null && pausedAt >= startedAt && pausedAt <= Date.now() ? pausedAt : null;
    }

    /** Saves a new workout, its named steps linked to exercises (see `linkSteps()`). */
    addWorkout(workout: WorkoutFields): Workout {
        const newWorkout: Workout = {
            ...workout,
            blocks: this.linked(workout.blocks),
            id: newId(),
            updatedAt: this.clock.now(),
        };
        this._workouts.update((workouts) => [...workouts, newWorkout]);
        this.saveWorkouts();
        return newWorkout;
    }

    /**
     * Adds workouts from a version 1 backup, whose ids were only unique on their device, so a
     * workout is matched on what it is instead: one the same as a workout already here (title,
     * steps and rounds) is skipped, and any other is added. Their ids are new ones given when
     * the backup was read (see `upgradeWorkout()`). Returns how many were added.
     */
    importWorkouts(imported: readonly Workout[]): number {
        let added = 0;
        for (const workout of imported) {
            if (this._workouts().some((existing) => sameWorkout(existing, workout))) {
                continue;
            }
            this._workouts.update((workouts) => [...workouts, workout]);
            added++;
        }
        if (added > 0) {
            this.saveWorkouts();
        }
        return added;
    }

    /**
     * Merges workouts from another copy (a version 2 backup), by id: the most recent change to
     * each wins, and a deletion there removes a workout here that hasn't changed since. A workout
     * deleted here doesn't come back unless it changed there after.
     */
    mergeWorkouts(workouts: readonly Workout[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'workout',
            this._workouts(),
            workouts,
            (id) => this.deletions.deletedAt('workout', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._workouts.set(result.records);
            this.saveWorkouts();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    deleteWorkout(workoutId: string) {
        const deleted = this.findWorkoutById(workoutId);
        const updatedWorkoutList = this._workouts().filter((workout) => workout.id !== workoutId);
        this._workouts.set(updatedWorkoutList);
        this.saveWorkouts();
        this.deletions.add({
            kind: 'workout',
            id: workoutId,
            deletedAt: this.clock.now(deleted?.updatedAt),
        });
    }

    /**
     * Puts a deleted workout back where it was in the library, e.g. on Undo. It's dated now,
     * as putting it back is a change made after the deletion, which may have reached other
     * devices already.
     */
    restoreWorkout(workout: Workout, index: number) {
        if (this.findWorkoutById(workout.id)) {
            return;
        }
        const deletedAt = this.deletions.deletedAt('workout', workout.id);
        this.deletions.remove('workout', workout.id);
        this._workouts.update((workouts) => [
            ...workouts.slice(0, index),
            { ...workout, updatedAt: this.clock.now(Math.max(workout.updatedAt, deletedAt ?? 0)) },
            ...workouts.slice(index),
        ]);
        this.saveWorkouts();
    }

    /**
     * Marks a workout as a favourite, or not: one of yours as a change to it that syncs, and a
     * ready-made one by a record of its own (ReadyMadeFavourites).
     */
    setFavourite(workoutId: string, favourite: boolean) {
        if (isReadyMadeId(workoutId)) {
            this.favourites.set(workoutId, favourite);
            return;
        }
        const existing = this.findWorkoutById(workoutId);
        if (!existing || (existing.favourite === true) === favourite) {
            return;
        }
        const { favourite: _, ...rest } = existing;
        const changed: Workout = {
            ...rest,
            ...(favourite ? { favourite: true as const } : {}),
            updatedAt: this.clock.now(existing.updatedAt),
        };
        this._workouts.update((workouts) =>
            workouts.map((workout) => (workout.id === workoutId ? changed : workout))
        );
        this.saveWorkouts();
    }

    /**
     * Takes another copy's library order if a workout was moved there more recently than here:
     * the workouts it lists go in its order, and any others after them. Returns whether the
     * order here changed.
     */
    mergeLibraryOrder(order: LibraryOrder): boolean {
        if (order.updatedAt <= this._movedAt()) {
            return false;
        }
        this.saveMovedAt(order.updatedAt);
        const workouts = inOrder(this._workouts(), order.ids);
        if (workouts.every((workout, i) => workout === this._workouts()[i])) {
            return false;
        }
        this._workouts.set(workouts);
        this.saveWorkouts();
        return true;
    }

    /** One of your own workouts, which can be changed or deleted. */
    findWorkoutById(workoutId: string): Workout | null {
        return this._workouts().find((workout) => workout.id === workoutId) ?? null;
    }

    /** Any workout, yours or ready-made, to start, plan or show. */
    findAnyWorkout(workoutId: string): Workout | null {
        return this.allWorkouts().find((workout) => workout.id === workoutId) ?? null;
    }

    /**
     * Make a copy of a workout, yours or ready-made (LIB-2, LIB-6): a workout of your own, "Legs
     * day (copy)", to change, leaving the one it's a copy of as it is. Null if there's no such
     * workout.
     */
    copyWorkout(workoutId: string): Workout | null {
        const workout = this.findAnyWorkout(workoutId);
        if (!workout) {
            return null;
        }
        const title = workout.title.trim() || 'Untitled workout';
        return this.addWorkout({ ...copyOf(workout), title: `${title} (copy)` });
    }

    updateWorkout(workoutId: string, workoutUpdate: WorkoutFields): Workout | null {
        const existingWorkout = this.findWorkoutById(workoutId);
        if (!existingWorkout) {
            return null;
        }

        // A favourite stays one, as that's set on Workouts rather than in Create
        const { favourite } = existingWorkout;
        const updatedWorkout: Workout = {
            ...workoutUpdate,
            blocks: this.linked(workoutUpdate.blocks),
            id: workoutId,
            updatedAt: this.clock.now(existingWorkout.updatedAt),
            ...(favourite ? { favourite } : {}),
        };

        this._workouts.update((workouts) =>
            workouts.map((workout) => (workout.id === workoutId ? updatedWorkout : workout))
        );
        this.saveWorkouts();
        return updatedWorkout;
    }

    /**
     * An exercise of your own has been renamed (EXR-3): the steps linked to it take its new
     * name, in every saved workout and the one running.
     */
    renameExerciseSteps(exerciseId: string, name: string) {
        const renamed = (workout: Workout): Workout => {
            const steps = allSteps(workout);
            if (!steps.some((step) => step.exerciseId === exerciseId && step.name !== name)) {
                return workout;
            }
            const blocks = withSteps(
                workout.blocks,
                steps.map((step) => (step.exerciseId === exerciseId ? { ...step, name } : step))
            );
            return { ...workout, blocks, updatedAt: this.clock.now(workout.updatedAt) };
        };
        const workouts = this._workouts().map(renamed);
        if (workouts.some((workout, i) => workout !== this._workouts()[i])) {
            this._workouts.set(workouts);
            this.saveWorkouts();
        }
        const active = this._activeWorkout();
        if (active) {
            this._activeWorkout.set(renamed(active));
        }
    }

    /**
     * Makes `workout` the active workout and starts it from the beginning, doing exercises
     * each side as `sides` says (the settings, as they are now).
     */
    setActiveWorkout(workout: Workout, sides: RunSides = DEFAULT_RUN_SIDES) {
        const startedAt = Date.now();
        this._activeWorkout.set(workout);
        this._activeSides.set(sides);
        sessionStorage.setItem('activeSides', JSON.stringify(sides));
        this._activeWorkoutStartedAt.set(startedAt);
        sessionStorage.setItem('activeWorkoutId', String(workout.id));
        sessionStorage.setItem('activeWorkoutStartedAt', String(startedAt));
        this._activeWorkoutPausedAt.set(null);
        this._activeRunStartedAt.set(startedAt);
        sessionStorage.setItem('activeRunStartedAt', String(startedAt));
        sessionStorage.removeItem('activeWorkoutPausedAt');
        this.clearStepsDone();
        this.setSwaps([]);
    }

    /** Swaps a step's exercise for another, for the rest of this run (RUN-11). */
    swapActiveStep(swap: StepSwap) {
        this.setSwaps([...this._activeSwaps(), swap]);
    }

    /** The step's latest swap as it runs now, e.g. its reps or weight changed mid-workout. */
    updateActiveSwap(step: number, swapped: Step) {
        const swaps = this._activeSwaps();
        const last = swaps.map((swap) => swap.step).lastIndexOf(step);
        if (last >= 0) {
            this.setSwaps(swaps.map((swap, i) => (i === last ? { ...swap, swapped } : swap)));
        }
    }

    /** Takes back the latest swap, e.g. with Undo. */
    undoActiveSwap() {
        this.setSwaps(this._activeSwaps().slice(0, -1));
    }

    private setSwaps(swaps: StepSwap[]) {
        this._activeSwaps.set(swaps);
        if (swaps.length > 0) {
            sessionStorage.setItem('activeSwaps', JSON.stringify(swaps));
        } else {
            sessionStorage.removeItem('activeSwaps');
        }
    }

    /**
     * Done on a rep step: the workout moves on to the next step. `waitedMs` is how long the
     * clock ran on past the rep step while it was being done; the start time moves forward
     * by that much, so the countdown picks up exactly where the rep step began. `set` is
     * what was done, logged for the history; none for a rep step skipped (RUN-12).
     */
    finishRepStep(waitedMs: number, set?: RepSet) {
        const startedAt = this._activeWorkoutStartedAt();
        if (!this._activeWorkout() || startedAt === null) {
            return;
        }
        // Done straight from a pause carries on running
        this.resume();
        const waited = Math.max(0, Math.round(waitedMs));
        const movedStart = this._activeWorkoutStartedAt()! + waited;
        this._activeWorkoutStartedAt.set(movedStart);
        this._activeRepStepsDone.update((done) => done + 1);
        this._activeRepMs.update((ms) => ms + waited);
        sessionStorage.setItem('activeWorkoutStartedAt', String(movedStart));
        sessionStorage.setItem('activeRepStepsDone', String(this._activeRepStepsDone()));
        sessionStorage.setItem('activeRepMs', String(this._activeRepMs()));
        if (set) {
            this._activeSets.update((sets) => [...sets, set]);
            sessionStorage.setItem('activeSets', JSON.stringify(this._activeSets()));
        }
    }

    /**
     * Skip on a timed step or rest (RUN-12): the workout moves on to the next step. The start
     * time moves back by what was left of it, so the clock is at its end.
     */
    skipStep(skip: StepSkip) {
        const startedAt = this._activeWorkoutStartedAt();
        if (!this._activeWorkout() || startedAt === null || skip.skippedMs <= 0) {
            return;
        }
        this.resume();
        const movedStart = this._activeWorkoutStartedAt()! - skip.skippedMs;
        this._activeWorkoutStartedAt.set(movedStart);
        sessionStorage.setItem('activeWorkoutStartedAt', String(movedStart));
        this._activeSkips.update((skips) => [...skips, skip]);
        sessionStorage.setItem('activeSkips', JSON.stringify(this._activeSkips()));
    }

    /** Adds a set without moving the workout on, e.g. the one time ran out in. */
    addActiveSet(set: RepSet) {
        if (!this._activeWorkout()) {
            return;
        }
        this._activeSets.update((sets) => [...sets, set]);
        sessionStorage.setItem('activeSets', JSON.stringify(this._activeSets()));
    }

    /** Corrects a set already done, e.g. its reps or weight changed on the summary. */
    updateActiveSet(index: number, set: RepSet) {
        if (!this._activeSets()[index]) {
            return;
        }
        this._activeSets.update((sets) =>
            sets.map((existing, i) => (i === index ? set : existing))
        );
        sessionStorage.setItem('activeSets', JSON.stringify(this._activeSets()));
    }

    private clearStepsDone() {
        this._activeRepStepsDone.set(0);
        this._activeRepMs.set(0);
        this._activeSets.set([]);
        this._activeSkips.set([]);
        sessionStorage.removeItem('activeRepStepsDone');
        sessionStorage.removeItem('activeRepMs');
        sessionStorage.removeItem('activeSets');
        sessionStorage.removeItem('activeSkips');
    }

    /**
     * Replaces one step of the running workout, e.g. its reps or weight changed mid-workout,
     * and of the saved workout too, so it starts from there next time. `stepIndex` is its
     * place in `allSteps()`. Of a ready-made workout, only a rep step's reps and weight are
     * kept (ReadyMadeChanges); anything more, such as another exercise, takes a copy.
     */
    updateActiveStep(stepIndex: number, step: Step) {
        const workout = this._activeWorkout();
        const steps = workout ? allSteps(workout) : [];
        if (!workout || !steps[stepIndex]) {
            return;
        }
        const updated: Workout = {
            ...workout,
            blocks: withSteps(
                workout.blocks,
                steps.map((existing, i) => (i === stepIndex ? step : existing))
            ),
            updatedAt: this.clock.now(workout.updatedAt),
        };
        this._activeWorkout.set(updated);
        if (this.findWorkoutById(workout.id)) {
            this._workouts.update((workouts) =>
                workouts.map((t) => (t.id === workout.id ? updated : t))
            );
            this.saveWorkouts();
            return;
        }
        const original = this._builtIns().find((builtIn) => builtIn.id === workout.id);
        const originalStep = original && allSteps(original)[stepIndex];
        if (originalStep) {
            this.readyMadeChanges.setStep(workout.id, stepIndex, originalStep, step);
        }
    }

    /** Freezes the active workout where it is. Does nothing if it's already paused. */
    pause() {
        if (!this._activeWorkout() || this.isPaused()) {
            return;
        }
        const pausedAt = Date.now();
        this._activeWorkoutPausedAt.set(pausedAt);
        sessionStorage.setItem('activeWorkoutPausedAt', String(pausedAt));
    }

    /**
     * Carries on from where the workout was paused. The start time moves forward by the
     * time spent paused, so the elapsed time picks up exactly where it stopped.
     */
    resume() {
        const pausedAt = this._activeWorkoutPausedAt();
        const startedAt = this._activeWorkoutStartedAt();
        if (pausedAt === null || startedAt === null) {
            return;
        }
        const resumedStart = startedAt + (Date.now() - pausedAt);
        this._activeWorkoutStartedAt.set(resumedStart);
        this._activeWorkoutPausedAt.set(null);
        sessionStorage.setItem('activeWorkoutStartedAt', String(resumedStart));
        sessionStorage.removeItem('activeWorkoutPausedAt');
    }

    /** Ends the active workout, leaving no workout selected. */
    stop() {
        this._activeWorkout.set(null);
        this._activeWorkoutStartedAt.set(null);
        this._activeWorkoutPausedAt.set(null);
        this._activeRunStartedAt.set(null);
        sessionStorage.removeItem('activeWorkoutId');
        sessionStorage.removeItem('activeWorkoutStartedAt');
        sessionStorage.removeItem('activeWorkoutPausedAt');
        sessionStorage.removeItem('activeRunStartedAt');
        sessionStorage.removeItem('activeSides');
        this.clearStepsDone();
        this.setSwaps([]);
    }

    /** Blocks with their named steps linked to exercises (see `linkSteps()`). */
    private linked(blocks: readonly Block[]): Block[] {
        return withSteps(
            blocks,
            linkSteps(allSteps({ blocks: [...blocks] }), this.exercises.finder)
        );
    }

    private saveWorkouts() {
        localStorage.setItem('workouts', JSON.stringify(this._workouts()));
    }

    private saveMovedAt(movedAt: number) {
        this._movedAt.set(movedAt);
        localStorage.setItem('library-moved-at', String(movedAt));
    }
}

/** When a workout was last moved in the library, or 0 if none has been (or it's broken). */
function readMovedAt(): number {
    const movedAt = Number(localStorage.getItem('library-moved-at'));
    return isWholeNumber(movedAt, 0) ? movedAt : 0;
}

function isWholeNumber(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/** The saved sets of the run in progress; anything broken is dropped. */
function readSets(saved: string | null): RepSet[] {
    try {
        const parsed: unknown = JSON.parse(saved ?? '[]');
        return Array.isArray(parsed)
            ? parsed.filter((set): set is RepSet => isLoggedSet(set) && !isTimedSet(set))
            : [];
    } catch {
        return [];
    }
}

/** A saved count, e.g. rep steps done; anything missing or broken counts as 0. */
function readCount(saved: string | null): number {
    const count = Number(saved);
    return isWholeNumber(count, 0) ? count : 0;
}

function isStep(value: unknown): value is Step {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const step = value as Record<string, unknown>;
    if (
        typeof step['name'] !== 'string' ||
        (step['exerciseId'] !== undefined && typeof step['exerciseId'] !== 'string')
    ) {
        return false;
    }
    if (step['kind'] === 'reps') {
        return isRepAmount(step);
    }
    return (step['kind'] === 'work' || step['kind'] === 'rest') && isTimedAmount(step);
}

/** Reps, and any weight, as a rep step or one of its sets has them. */
function isRepAmount(value: Record<string, unknown>): boolean {
    const weight = value['weight'];
    return (
        isWholeNumber(value['reps'], 1, MAX_REPS) &&
        (weight === undefined ||
            (typeof weight === 'number' && weight > 0 && weight <= MAX_WEIGHT_KG))
    );
}

/** A time, as a timed step or one of its sets has it. */
function isTimedAmount(value: Record<string, unknown>): boolean {
    return isWholeNumber(value['seconds'], 1, MAX_STEP_SECONDS);
}

/**
 * A step's own reps and weight or time for each set (BLD-11), copied, or undefined if it has
 * none, or they aren't usable: one for each of its group's `rounds`, more than one, each
 * valid. Unusable ones are dropped, leaving every set the step's own.
 */
function copySets(step: Step, rounds: number): Pick<Step, 'sets'> {
    const sets: unknown = step.kind === 'rest' ? undefined : step.sets;
    if (
        !Array.isArray(sets) ||
        rounds < 2 ||
        sets.length !== rounds ||
        !sets.every(
            (set) =>
                typeof set === 'object' &&
                set !== null &&
                (step.kind === 'reps' ? isRepAmount(set) : isTimedAmount(set))
        )
    ) {
        return {};
    }
    return step.kind === 'reps'
        ? {
              sets: (sets as RepSetAmount[]).map(({ reps, weight }) => ({
                  reps,
                  ...(weight === undefined ? {} : { weight }),
              })),
          }
        : { sets: (sets as TimedSetAmount[]).map(({ seconds }) => ({ seconds })) };
}

/**
 * Just the step's own fields, leaving out anything else that was saved with it. Each side is
 * only `true`, and never on a rest step: anything else saved there is left out. Its sets are
 * kept where they're usable in a group of `rounds` (see `copySets()`).
 */
function copyStep(step: Step, rounds: number): Step {
    const link = step.exerciseId === undefined ? {} : { exerciseId: step.exerciseId };
    const eachSide =
        step.kind !== 'rest' && step.eachSide === true ? { eachSide: true as const } : {};
    return step.kind === 'reps'
        ? {
              kind: step.kind,
              reps: step.reps,
              name: step.name,
              ...(step.weight === undefined ? {} : { weight: step.weight }),
              ...link,
              ...eachSide,
              ...(copySets(step, rounds) as Pick<RepStep, 'sets'>),
          }
        : {
              kind: step.kind,
              seconds: step.seconds,
              name: step.name,
              ...link,
              ...eachSide,
              ...(copySets(step, rounds) as Pick<TimedStep, 'sets'>),
          };
}

/** Whether two workouts are the same apart from their ids. */
function sameWorkout(a: Workout, b: Workout): boolean {
    // By what the steps are, not the exercises they happen to be linked to
    const blocks = (workout: Workout) =>
        JSON.stringify(
            workout.blocks.map((block) =>
                block.kind === 'group'
                    ? {
                          ...block,
                          steps: block.steps.map((step) => ({
                              ...copyStep(step, block.rounds),
                              exerciseId: undefined,
                          })),
                      }
                    : block
            )
        );
    return (
        a.title === b.title &&
        a.repeats === b.repeats &&
        a.timeLimitSeconds === b.timeLimitSeconds &&
        blocks(a) === blocks(b)
    );
}

/**
 * A workout's saved blocks, or null if they aren't usable. A broken group makes the workout
 * unusable, as a broken step always has; a broken heading is only a label, so it's dropped,
 * as are any past MAX_HEADINGS.
 */
function readBlocks(saved: unknown): Block[] | null {
    if (!Array.isArray(saved)) {
        return null;
    }
    const blocks: Block[] = [];
    for (const value of saved) {
        if (typeof value !== 'object' || value === null) {
            return null;
        }
        const block = value as Record<string, unknown>;
        if (block['kind'] === 'heading') {
            const text = typeof block['text'] === 'string' ? block['text'].trim() : '';
            const headings = blocks.filter((kept) => kept.kind === 'heading').length;
            if (text && text.length <= MAX_HEADING_LENGTH && headings < MAX_HEADINGS) {
                blocks.push({ kind: 'heading', text });
            }
            continue;
        }
        const steps = block['steps'];
        if (
            block['kind'] !== 'group' ||
            !isWholeNumber(block['rounds'], 1, MAX_REPEATS) ||
            !isWholeNumber(block['restSeconds'], 0, MAX_STEP_SECONDS) ||
            !Array.isArray(steps) ||
            steps.length === 0 ||
            !steps.every((step) => isStep(step))
        ) {
            return null;
        }
        blocks.push({
            kind: 'group',
            rounds: block['rounds'] as number,
            restSeconds: block['restSeconds'] as number,
            steps: steps.map((step: Step) => copyStep(step, block['rounds'] as number)),
        });
    }
    return blocks;
}

/**
 * Reads one saved workout, from this device, a backup or another device, or returns null if it
 * isn't usable. Workouts saved before groups (data version 5) have a list of `steps`, which
 * become one group run once a round, and run exactly as before. Workouts saved before steps
 * existed (a single work and rest time) become a work step and,
 * if there was any rest, a rest step, which runs exactly as before.
 */
export function readWorkout(value: unknown): Workout | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const saved = value as Record<string, unknown>;
    // 0 is UNTIL_STOPPED
    if (
        typeof saved['id'] !== 'string' ||
        saved['id'] === '' ||
        typeof saved['title'] !== 'string' ||
        !isWholeNumber(saved['repeats'], 0)
    ) {
        return null;
    }
    const oldSteps = Array.isArray(saved['steps']) ? saved['steps'] : stepsFromWorkAndRest(saved);
    const blocks =
        saved['blocks'] !== undefined
            ? readBlocks(saved['blocks'])
            : oldSteps && readBlocks(asOneGroup(oldSteps));
    if (!blocks || !hasWork(allSteps({ blocks }))) {
        return null;
    }
    // A time limit runs as many rounds as fit, so it only goes with UNTIL_STOPPED
    const limit = saved['timeLimitSeconds'];
    const timeLimit =
        saved['repeats'] === UNTIL_STOPPED &&
        isWholeNumber(limit, 1) &&
        (limit as number) <= MAX_TIME_LIMIT_SECONDS
            ? { timeLimitSeconds: limit as number }
            : {};
    return {
        id: saved['id'],
        title: saved['title'],
        blocks,
        repeats: saved['repeats'] as number,
        ...timeLimit,
        ...(saved['favourite'] === true ? { favourite: true as const } : {}),
        // Missing only if saved oddly: older than any real change, so any other copy wins
        updatedAt: isWholeNumber(saved['updatedAt'], 0) ? (saved['updatedAt'] as number) : 0,
    };
}

/** The new id of a workout saved before ids were random, from its old number. */
function legacyWorkoutId(oldId: string): string | undefined {
    try {
        const ids: unknown = JSON.parse(localStorage.getItem(LEGACY_WORKOUT_IDS_KEY) ?? '{}');
        const id =
            typeof ids === 'object' && ids !== null
                ? (ids as Record<string, unknown>)[oldId]
                : undefined;
        return typeof id === 'string' ? id : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The steps for a workout saved in the old format, from when it was a timer of one work and one
 * rest time, or null if it isn't one.
 */
function stepsFromWorkAndRest(saved: Record<string, unknown>): Step[] | null {
    if (
        !isWholeNumber(saved['timerMinutes'], 0, 99) ||
        !isWholeNumber(saved['timerSeconds'], 0, 59) ||
        !isWholeNumber(saved['restMinutes'], 0, 99) ||
        !isWholeNumber(saved['restSeconds'], 0, 59)
    ) {
        return null;
    }
    const work = (saved['timerMinutes'] as number) * 60 + (saved['timerSeconds'] as number);
    const rest = (saved['restMinutes'] as number) * 60 + (saved['restSeconds'] as number);
    const steps: Step[] = [{ kind: 'work', seconds: work, name: '' }];
    if (rest > 0) {
        steps.push({ kind: 'rest', seconds: rest, name: '' });
    }
    return steps;
}

/** The saved sides of the run in progress; anything missing or broken is the defaults. */
/** The run's saved swaps; any that aren't usable are left out. */
function readSwaps(saved: string | null): StepSwap[] {
    try {
        const parsed: unknown = JSON.parse(saved ?? '[]');
        return Array.isArray(parsed) ? parsed.filter(isSwap) : [];
    } catch {
        return [];
    }
}

/** The saved skips of the run in progress; anything broken is dropped. */
function readSkips(saved: string | null): StepSkip[] {
    try {
        const parsed: unknown = JSON.parse(saved ?? '[]');
        return Array.isArray(parsed) ? parsed.filter(isSkip) : [];
    } catch {
        return [];
    }
}

function isSkip(value: unknown): value is StepSkip {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const skip = value as Record<string, unknown>;
    return (
        isWholeNumber(skip['round'], 0) &&
        isWholeNumber(skip['stepIndex'], 0) &&
        isWholeNumber(skip['skippedMs'], 1)
    );
}

function isSwap(value: unknown): value is StepSwap {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const swap = value as Record<string, unknown>;
    return (
        isWholeNumber(swap['step'], 0) &&
        isWholeNumber(swap['from'], 0) &&
        isStep(swap['original']) &&
        isStep(swap['swapped'])
    );
}

function readSides(saved: string | null): RunSides {
    try {
        const parsed: unknown = JSON.parse(saved ?? 'null');
        if (typeof parsed !== 'object' || parsed === null) {
            return DEFAULT_RUN_SIDES;
        }
        const { first, switchSeconds } = parsed as Record<string, unknown>;
        return (first === 'left' || first === 'right') &&
            isWholeNumber(switchSeconds, 0, MAX_SWITCH_SECONDS)
            ? { first, switchSeconds: switchSeconds as number }
            : DEFAULT_RUN_SIDES;
    } catch {
        return DEFAULT_RUN_SIDES;
    }
}
