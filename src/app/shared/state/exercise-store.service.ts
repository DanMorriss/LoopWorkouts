import { computed, inject, Service, signal } from '@angular/core';
import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import {
    EquipmentNeed,
    Exercise,
    ExerciseNote,
    ExerciseText,
    HiddenExercise,
    isBuiltIn,
    MAX_EXERCISE_LINE_LENGTH,
    MAX_EXERCISE_NOTE_LENGTH,
    MAX_EXERCISE_STEPS,
    MAX_EXERCISE_TIPS,
    MeasuredBy,
    MUSCLE_LABELS,
    MuscleGroup,
    OwnExercise,
    OwnExerciseDetails,
} from '../../models/exercise';
import { ExerciseFinder, findByName } from '../../models/exercise-links';
import { ExerciseMotion } from '../../models/exercise-motion';
import { Deletion, mergeRecords, newId, readMark } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { SyncClock } from './sync-clock.service';
import { migrateSavedData } from './migrate';

export const EXERCISES_KEY = 'exercises';
export const EXERCISE_NOTES_KEY = 'exercise-notes';
export const HIDDEN_EXERCISES_KEY = 'hidden-exercises';

/**
 * Every exercise: the built-in ones (EXR-6) and your own (EXR-9), saved in the browser, your
 * notes on any of them (EXR-10), and which are hidden from the picker.
 */
@Service()
export class ExerciseStore {
    private readonly deletions = inject(DeletionStore);
    private readonly clock = inject(SyncClock);
    private readonly _own = signal<OwnExercise[]>(loadList(EXERCISES_KEY, readOwnExercise));
    private readonly _notes = signal<ExerciseNote[]>(
        loadList(EXERCISE_NOTES_KEY, readExerciseNote)
    );

    /** Your own exercises, oldest first. */
    readonly own = computed(() => this._own());
    /** The built-in exercises, then your own. */
    readonly exercises = computed<readonly Exercise[]>(() => [
        ...BUILT_IN_EXERCISES,
        ...this._own(),
    ]);
    readonly notes = computed(() => this._notes());
    private readonly _hidden = signal<HiddenExercise[]>(
        loadList(HIDDEN_EXERCISES_KEY, readHiddenExercise)
    );
    readonly hidden = computed(() => this._hidden());
    private readonly hiddenIds = computed(() => new Set(this._hidden().map((h) => h.id)));

    /** For linking steps and sets by name: finds an exercise, or makes one of your own. */
    readonly finder: ExerciseFinder = {
        find: (name) => findByName(name, this.exercises()),
        byId: (id) => this.byId(id),
        create: (name, measuredBy) => this.addOwn(name, measuredBy),
    };

    /** The built-in exercises' words, once `loadText()` has them. */
    private readonly builtInText = signal<Readonly<Record<string, ExerciseText>> | null>(null);
    private textLoading: Promise<void> | null = null;

    /**
     * Loads the built-in exercises' descriptions, steps and tips, which aren't in the first
     * download, if they aren't here yet. Call it before showing them; `textOf()` has them
     * once it settles. Failing (e.g. offline), it can be tried again.
     */
    loadText(): Promise<void> {
        this.textLoading ??= import('../../models/built-in-exercise-text').then(
            ({ BUILT_IN_EXERCISE_TEXT }) => this.builtInText.set(BUILT_IN_EXERCISE_TEXT),
            () => {
                this.textLoading = null;
            }
        );
        return this.textLoading;
    }

    /**
     * An exercise's description, steps and tips: your own exercise's, or a built-in one's
     * once `loadText()` has loaded them (undefined until then).
     */
    textOf(exercise: Exercise): ExerciseText | undefined {
        return isBuiltIn(exercise) ? this.builtInText()?.[exercise.id] : exercise;
    }

    /** How the built-in exercises move, once `loadMotion()` has it. */
    private readonly builtInMotion = signal<Readonly<
        Partial<Record<string, ExerciseMotion>>
    > | null>(null);
    private motionLoading: Promise<void> | null = null;

    /**
     * Loads how the built-in exercises move, for their animated demos (EXR-13), which isn't in
     * the first download, as `loadText()` does their words.
     */
    loadMotion(): Promise<void> {
        this.motionLoading ??= import('../../models/built-in-exercise-motion').then(
            ({ BUILT_IN_EXERCISE_MOTION }) => this.builtInMotion.set(BUILT_IN_EXERCISE_MOTION),
            () => {
                this.motionLoading = null;
            }
        );
        return this.motionLoading;
    }

    /**
     * How an exercise moves, once `loadMotion()` has loaded it: only built-in ones, and not
     * all of them yet.
     */
    motionOf(exercise: Exercise): ExerciseMotion | undefined {
        return isBuiltIn(exercise) ? this.builtInMotion()?.[exercise.id] : undefined;
    }

    byId(id: string): Exercise | undefined {
        return this.exercises().find((exercise) => exercise.id === id);
    }

    /**
     * What a search for `typed` can offer of `among`: the hidden ones are left out, unless
     * their whole name is what's typed.
     */
    shownFor(typed: string, among: readonly Exercise[] = this.exercises()): Exercise[] {
        const named = findByName(typed, among);
        return among.filter((exercise) => !this.isHidden(exercise.id) || exercise === named);
    }

    /**
     * Whether `name` is already another exercise's, as names are matched (see `findByName()`),
     * other names of built-in ones included. `exceptId` is the exercise being renamed.
     */
    nameTaken(name: string, exceptId?: string): boolean {
        const found = findByName(name, this.exercises());
        return found !== undefined && found.id !== exceptId;
    }

    /**
     * Changes the details of an exercise of your own (EXR-3, EXR-9), tidied: the name's
     * spaces, the description trimmed, and a muscle in both lists kept as main only. Returns
     * the exercise as saved, or null if it isn't one of yours or its new name is taken.
     */
    updateOwn(id: string, details: OwnExerciseDetails): OwnExercise | null {
        const existing = this._own().find((exercise) => exercise.id === id);
        const name = tidyName(details.name);
        if (!existing || name === '' || this.nameTaken(name, id)) {
            return null;
        }
        const updated: OwnExercise = {
            ...existing,
            ...tidied(details),
            updatedAt: this.clock.now(existing.updatedAt),
        };
        this._own.update((own) => own.map((exercise) => (exercise.id === id ? updated : exercise)));
        this.saveOwn();
        return updated;
    }

    /** Makes an exercise of your own with just a name and how it's measured, and saves it. */
    addOwn(name: string, measuredBy: MeasuredBy): OwnExercise {
        const exercise: OwnExercise = {
            ...blankOwnExercise(tidyName(name), measuredBy),
            id: newId(),
            updatedAt: this.clock.now(),
        };
        this._own.update((own) => [...own, exercise]);
        this.saveOwn();
        return exercise;
    }

    /**
     * Makes an exercise of your own with all its details, tidied as `updateOwn()` does, e.g.
     * from the Exercises page. Returns null if its name is empty or taken.
     */
    createOwn(details: OwnExerciseDetails): OwnExercise | null {
        const name = tidyName(details.name);
        if (name === '' || this.nameTaken(name)) {
            return null;
        }
        const exercise: OwnExercise = {
            ...blankOwnExercise(name, details.measuredBy),
            ...tidied(details),
            id: newId(),
            updatedAt: this.clock.now(),
        };
        this._own.update((own) => [...own, exercise]);
        this.saveOwn();
        return exercise;
    }

    /**
     * Deletes an exercise of your own, with your note on it and its place in the hidden
     * list, leaving deletions so they reach other copies too. Whether it may be deleted (no
     * workout uses it, and it has no history) is for the caller to check: see
     * `exerciseUsage()`.
     */
    deleteOwn(id: string) {
        const deleted = this._own().find((exercise) => exercise.id === id);
        if (!deleted) {
            return;
        }
        this._own.update((own) => own.filter((exercise) => exercise.id !== id));
        this.deletions.add({ kind: 'exercise', id, deletedAt: this.clock.now(deleted.updatedAt) });
        this.saveOwn();
        this.setNote(id, '');
        this.setHidden(id, false);
    }

    /**
     * Puts an exercise of your own back as it was before deleteOwn(), e.g. on Undo: with your
     * note on it, and hidden from the picker if it was. It's dated now, as restoreWorkout()
     * dates a workout.
     */
    restoreOwn(exercise: OwnExercise, note: string | undefined, hidden: boolean) {
        if (this._own().some((own) => own.id === exercise.id)) {
            return;
        }
        const deletedAt = this.deletions.deletedAt('exercise', exercise.id) ?? 0;
        this.deletions.remove('exercise', exercise.id);
        const updatedAt = this.clock.now(Math.max(exercise.updatedAt, deletedAt));
        this._own.update((own) => [...own, { ...exercise, updatedAt }]);
        this.saveOwn();
        if (note) {
            this.setNote(exercise.id, note);
        }
        this.setHidden(exercise.id, hidden);
    }

    /** Whether an exercise is hidden from the picker in Create. */
    isHidden(exerciseId: string): boolean {
        return this.hiddenIds().has(exerciseId);
    }

    /**
     * Hides an exercise from the picker, or shows it again. Showing it removes it from the
     * list, leaving a deletion so that reaches other copies too.
     */
    setHidden(exerciseId: string, hidden: boolean) {
        if (hidden === this.isHidden(exerciseId)) {
            return;
        }
        if (hidden) {
            this._hidden.update((list) => [
                ...list,
                {
                    id: exerciseId,
                    updatedAt: this.clock.now(
                        this.deletions.deletedAt('hidden-exercise', exerciseId)
                    ),
                },
            ]);
            this.deletions.remove('hidden-exercise', exerciseId);
        } else {
            const shown = this._hidden().find((h) => h.id === exerciseId);
            this._hidden.update((list) => list.filter((h) => h.id !== exerciseId));
            this.deletions.add({
                kind: 'hidden-exercise',
                id: exerciseId,
                deletedAt: this.clock.now(shown?.updatedAt),
            });
        }
        localStorage.setItem(HIDDEN_EXERCISES_KEY, JSON.stringify(this._hidden()));
    }

    /** Your note on an exercise, or undefined if there isn't one. */
    noteFor(exerciseId: string): string | undefined {
        return this._notes().find((note) => note.id === exerciseId)?.text;
    }

    /**
     * Sets your note on an exercise, trimmed and cut to MAX_EXERCISE_NOTE_LENGTH. An empty
     * note removes it, leaving a deletion so that reaches other copies too.
     */
    setNote(exerciseId: string, text: string) {
        const trimmed = text.trim().slice(0, MAX_EXERCISE_NOTE_LENGTH);
        const others = this._notes().filter((note) => note.id !== exerciseId);
        const before =
            this._notes().find((note) => note.id === exerciseId)?.updatedAt ??
            this.deletions.deletedAt('exercise-note', exerciseId);
        if (trimmed) {
            this._notes.set([
                ...others,
                { id: exerciseId, text: trimmed, updatedAt: this.clock.now(before) },
            ]);
            this.deletions.remove('exercise-note', exerciseId);
        } else if (others.length < this._notes().length) {
            this._notes.set(others);
            this.deletions.add({
                kind: 'exercise-note',
                id: exerciseId,
                deletedAt: this.clock.now(before),
            });
        }
        this.saveNotes();
    }

    /** Merges your own exercises from another copy (a backup), as workouts merge. */
    mergeOwn(exercises: readonly OwnExercise[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'exercise',
            this._own(),
            exercises,
            (id) => this.deletions.deletedAt('exercise', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._own.set(result.records);
            this.saveOwn();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    /** Merges which exercises are hidden from another copy, as notes merge. */
    mergeHidden(hidden: readonly HiddenExercise[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'hidden-exercise',
            this._hidden(),
            hidden,
            (id) => this.deletions.deletedAt('hidden-exercise', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._hidden.set(result.records);
            localStorage.setItem(HIDDEN_EXERCISES_KEY, JSON.stringify(this._hidden()));
        }
    }

    /** Merges notes from another copy, by exercise: the most recent change to each wins. */
    mergeNotes(notes: readonly ExerciseNote[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'exercise-note',
            this._notes(),
            notes,
            (id) => this.deletions.deletedAt('exercise-note', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._notes.set(result.records);
            this.saveNotes();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    private saveOwn() {
        localStorage.setItem(EXERCISES_KEY, JSON.stringify(this._own()));
    }

    private saveNotes() {
        localStorage.setItem(EXERCISE_NOTES_KEY, JSON.stringify(this._notes()));
    }
}

const tidyName = (name: string) => name.trim().replace(/\s+/g, ' ');

/** An exercise of your own with nothing but a name and how it's measured, not yet saved. */
export function blankOwnExercise(name = '', measuredBy: MeasuredBy = 'reps'): OwnExercise {
    return {
        id: '',
        updatedAt: 0,
        name,
        otherNames: [],
        equipment: [],
        measuredBy,
        mainMuscles: [],
        supportingMuscles: [],
        description: '',
        steps: [],
        tips: [],
    };
}

/**
 * Details as they're saved: the name's spaces and the text trimmed, empty lines of steps and
 * tips dropped and their counts and lengths capped, and a muscle in both lists kept as main
 * only.
 */
function tidied(details: OwnExerciseDetails): OwnExerciseDetails {
    const lines = (list: readonly string[], max: number) =>
        list
            .map((line) => line.trim())
            .filter((line) => line !== '')
            .slice(0, max)
            .map((line) => line.slice(0, MAX_EXERCISE_LINE_LENGTH));
    return {
        name: tidyName(details.name),
        measuredBy: details.measuredBy,
        equipment: [...details.equipment],
        mainMuscles: [...details.mainMuscles],
        supportingMuscles: details.supportingMuscles.filter(
            (muscle) => !details.mainMuscles.includes(muscle)
        ),
        description: details.description.trim(),
        steps: lines(details.steps, MAX_EXERCISE_STEPS),
        tips: lines(details.tips, MAX_EXERCISE_TIPS),
    };
}

// Corrupted or unexpected data shouldn't stop the app from starting, so drop what isn't usable
function loadList<T>(key: string, read: (value: unknown) => T | null): T[] {
    migrateSavedData();
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.map((item) => read(item)).filter((item) => item !== null)
            : [];
    } catch {
        return [];
    }
}

const isText = (value: unknown): value is string => typeof value === 'string';
const textList = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isText) : []);
const muscles = (value: unknown): MuscleGroup[] =>
    Array.isArray(value)
        ? value.filter((m): m is MuscleGroup => isText(m) && m in MUSCLE_LABELS)
        : [];
const equipment = (value: unknown): EquipmentNeed[] =>
    Array.isArray(value)
        ? value.filter(
              (need): need is EquipmentNeed =>
                  isText(need) || (Array.isArray(need) && need.every(isText))
          )
        : [];

/**
 * Reads one of your own exercises, from this device or a backup, or returns null if it isn't
 * usable: it needs an id (not a built-in one), a name, how it's measured and a date. Lists
 * that are missing or broken are read as empty, and unknown muscles are dropped.
 */
export function readOwnExercise(value: unknown): OwnExercise | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const saved = value as Record<string, unknown>;
    const { id, name, measuredBy, updatedAt } = saved;
    if (
        !isText(id) ||
        id === '' ||
        id.startsWith('builtin:') ||
        !isText(name) ||
        name.trim() === '' ||
        (measuredBy !== 'reps' && measuredBy !== 'timed') ||
        !Number.isInteger(updatedAt) ||
        (updatedAt as number) < 0
    ) {
        return null;
    }
    return {
        id,
        updatedAt: updatedAt as number,
        name,
        otherNames: textList(saved['otherNames']),
        equipment: equipment(saved['equipment']),
        measuredBy,
        mainMuscles: muscles(saved['mainMuscles']),
        supportingMuscles: muscles(saved['supportingMuscles']),
        description: isText(saved['description']) ? saved['description'] : '',
        steps: textList(saved['steps']),
        tips: textList(saved['tips']),
    };
}

/** Reads one note on an exercise, or returns null if it isn't usable. */
export function readExerciseNote(value: unknown): ExerciseNote | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const { id, text, updatedAt } = value as Record<string, unknown>;
    return isText(id) &&
        id !== '' &&
        isText(text) &&
        text.trim() !== '' &&
        Number.isInteger(updatedAt)
        ? { id, text: text.slice(0, MAX_EXERCISE_NOTE_LENGTH), updatedAt: updatedAt as number }
        : null;
}

/** Reads one exercise's place in the hidden list, or returns null if it isn't usable. */
export const readHiddenExercise: (value: unknown) => HiddenExercise | null = readMark;
