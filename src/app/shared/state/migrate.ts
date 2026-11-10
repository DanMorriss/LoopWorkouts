import { BuiltInExercise, Exercise, MeasuredBy, OwnExercise } from '../../models/exercise';
import { ExerciseFinder, findByName, linkSets, linkSteps } from '../../models/exercise-links';
import { isLoggedSet } from '../../models/history';
import { Deletion, newId } from '../../models/sync';
import { asOneGroup, Step } from '../../models/workout';
import { loadBuiltInExercises, loadedBuiltInExercises } from './built-in-exercises-loader';

/** Which shape the saved data is in. Missing means 1, from before this was saved. */
const VERSION_KEY = 'data-version';
export const DATA_VERSION = 5;

/** Each old workout id and the new one it was given, so a run in progress can still find it. */
export const LEGACY_WORKOUT_IDS_KEY = 'legacy-workout-ids';

/**
 * Whether bringing the saved data up to date needs the built-in exercises (version 3 links
 * saved steps and sets to them by name), which aren't in the first download: then
 * `prepareSavedData()` loads them first. Only on a device with workouts or history saved in
 * a shape older than version 3.
 */
export function needsBuiltInExercises(): boolean {
    const version = Number(localStorage.getItem(VERSION_KEY) ?? 1);
    return (
        version < 3 &&
        ['workouts', 'timers', 'history'].some((key) => localStorage.getItem(key) !== null)
    );
}

/**
 * Brings the saved data up to date before the app starts, loading the built-in exercises
 * first if that needs them. Run once, as the app starts; the stores' own calls to
 * `migrateSavedData()` then find nothing left to do.
 */
export async function prepareSavedData(): Promise<void> {
    if (needsBuiltInExercises()) {
        migrateSavedData(Date.now(), await loadBuiltInExercises());
    }
}

/**
 * Brings data saved by an older version of the app up to date, once, before anything reads
 * it, a version at a time (see docs/features/data.md). Anything unreadable is left as it is:
 * the stores drop what they can't use. Saved data from before version 3 needs `builtIn`, the
 * built-in exercises, to link to (`prepareSavedData()` loads them, and once loaded they're
 * used), and isn't touched without them, as linking it to your own exercises alone would
 * make a copy of each.
 */
export function migrateSavedData(
    now = Date.now(),
    builtIn: readonly BuiltInExercise[] = loadedBuiltInExercises()
) {
    const version = Number(localStorage.getItem(VERSION_KEY) ?? 1);
    if (version >= DATA_VERSION) {
        return;
    }
    if (builtIn.length === 0 && needsBuiltInExercises()) {
        throw new Error('Saved data from before version 3 needs the built-in exercises');
    }
    // Only names change in version 4, so it goes first and the other steps use the new ones
    if (version < 4) {
        toVersion4();
    }
    if (version < 2) {
        toVersion2(now);
    }
    if (version < 3) {
        toVersion3(now, builtIn);
    }
    if (version < 5) {
        toVersion5();
    }
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
}

/**
 * Version 4: timers are called workouts (EXR-5). The saved timers move to `workouts`, a
 * history entry's `timerId` becomes `workoutId`, and a timer's deletion is a workout's.
 */
function toVersion4() {
    for (const [from, to] of [
        ['timers', 'workouts'],
        ['legacy-timer-ids', LEGACY_WORKOUT_IDS_KEY],
    ]) {
        const saved = localStorage.getItem(from);
        if (saved !== null) {
            localStorage.setItem(to, saved);
            localStorage.removeItem(from);
        }
    }
    const history = readList('history');
    if (history) {
        localStorage.setItem('history', JSON.stringify(history.map(renameTimerId)));
    }
    const deleted = readList('deleted');
    if (deleted) {
        localStorage.setItem('deleted', JSON.stringify(deleted.map(renameTimerDeletion)));
    }
}

/** A history entry from before version 4 with `workoutId` in place of `timerId`. */
export function renameTimerId(value: unknown): unknown {
    if (typeof value !== 'object' || value === null || !('timerId' in value)) {
        return value;
    }
    const { timerId, ...entry } = value as Record<string, unknown>;
    return { ...entry, workoutId: timerId };
}

/** A deletion from before version 4, a timer's becoming a workout's. */
export function renameTimerDeletion(value: unknown): unknown {
    return typeof value === 'object' &&
        value !== null &&
        (value as Record<string, unknown>)['kind'] === 'timer'
        ? { ...value, kind: 'workout' }
        : value;
}

/**
 * The run in progress in this tab, saved before version 4 under the timer's names, moved to
 * the workout's. Kept per tab, so it's done whenever a tab loads, not once with the rest.
 */
export function renameActiveRunKeys() {
    for (const name of ['Id', 'StartedAt', 'PausedAt']) {
        const saved = sessionStorage.getItem(`activeTimer${name}`);
        if (saved !== null) {
            sessionStorage.setItem(`activeWorkout${name}`, saved);
            sessionStorage.removeItem(`activeTimer${name}`);
        }
    }
}

/**
 * Version 3: exercises (EXR-4). Each named work step in a workout, and each named set in the
 * history, is linked to the exercise its name means, built-in where one matches and
 * otherwise a new one of your own, one per name.
 */
function toVersion3(now: number, builtIn: readonly BuiltInExercise[]) {
    const own = (readList('exercises') ?? []).filter(isOwnExercise);
    const finder = listFinder(builtIn, own, now);
    const workouts = readList('workouts');
    if (workouts) {
        localStorage.setItem(
            'workouts',
            JSON.stringify(workouts.map((workout) => withLinkedSteps(workout, finder)))
        );
    }
    const history = readList('history');
    if (history) {
        localStorage.setItem(
            'history',
            JSON.stringify(history.map((entry) => withLinkedSets(entry, finder)))
        );
    }
    if (own.length > 0) {
        localStorage.setItem('exercises', JSON.stringify(own));
    }
}

/**
 * Finds exercises among the built-in ones and `own`, and makes new ones of your own into
 * `own`, for linking saved data before the exercise store is there to do it.
 */
export function listFinder(
    builtIn: readonly BuiltInExercise[],
    own: OwnExercise[],
    now: number
): ExerciseFinder {
    const all = () => [...builtIn, ...own] as Exercise[];
    return {
        find: (name) => findByName(name, all()),
        byId: (id) => all().find((exercise) => exercise.id === id),
        create: (name: string, measuredBy: MeasuredBy) => {
            const exercise: OwnExercise = {
                id: newId(),
                updatedAt: now,
                name: name.trim().replace(/\s+/g, ' '),
                otherNames: [],
                equipment: [],
                measuredBy,
                mainMuscles: [],
                supportingMuscles: [],
                description: '',
                steps: [],
                tips: [],
            };
            own.push(exercise);
            return exercise;
        },
    };
}

// Only enough to find by name; the exercise store reads them properly
function isOwnExercise(value: unknown): value is OwnExercise {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const exercise = value as Record<string, unknown>;
    return (
        typeof exercise['id'] === 'string' &&
        typeof exercise['name'] === 'string' &&
        Array.isArray(exercise['otherNames'])
    );
}

const isNamedStep = (value: unknown): value is Step =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['name'] === 'string' &&
    typeof (value as Record<string, unknown>)['kind'] === 'string';

/** A workout with its steps linked to exercises; a broken step is left for the store to drop. */
export function withLinkedSteps(value: unknown, finder: ExerciseFinder) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const workout = value as Record<string, unknown>;
    const steps = workout['steps'];
    if (!Array.isArray(steps) || !steps.every(isNamedStep)) {
        return value;
    }
    return { ...workout, steps: linkSteps(steps, finder) };
}

/** A history entry with its sets linked to exercises; a broken set is left for the store. */
export function withLinkedSets(value: unknown, finder: ExerciseFinder) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const entry = value as Record<string, unknown>;
    const sets = entry['sets'];
    if (!Array.isArray(sets)) {
        return value;
    }
    const linked = linkSets(sets.filter(isLoggedSet), finder);
    let next = 0;
    return { ...entry, sets: sets.map((set) => (isLoggedSet(set) ? linked[next++] : set)) };
}

/**
 * Version 2: ready for sync.
 *
 * - workouts get random string ids in place of 1, 2, 3…, and an `updatedAt`
 * - history entries point to the new ids, and get an `updatedAt` (when they ended)
 * - `history-deleted` becomes deletion markers in `deleted`
 */
function toVersion2(now: number) {
    const newIds: Record<string, string> = {};
    const workouts = readList('workouts');
    if (workouts) {
        const upgraded = workouts.map((workout) => upgradeWorkout(workout, newIds, now));
        localStorage.setItem('workouts', JSON.stringify(upgraded));
        localStorage.setItem(LEGACY_WORKOUT_IDS_KEY, JSON.stringify(newIds));
    }
    const history = readList('history');
    if (history) {
        localStorage.setItem(
            'history',
            JSON.stringify(history.map((entry) => upgradeHistoryEntry(entry, newIds)))
        );
    }
    const deletedIds = readList('history-deleted');
    if (deletedIds) {
        const deletions: Deletion[] = deletedIds
            .filter((id): id is string => typeof id === 'string' && id !== '')
            .map((id) => ({ kind: 'history', id, deletedAt: now }));
        const existing = readList('deleted') ?? [];
        localStorage.setItem('deleted', JSON.stringify([...existing, ...deletions]));
        localStorage.removeItem('history-deleted');
    }
}

/**
 * A workout from version 1 (saved, or in a backup) in version 2's shape: a number id gets a new
 * random one, noted in `newIds` against the old, and it gets an `updatedAt` if it has none.
 * Anything else about it is left for the store to check.
 */
export function upgradeWorkout(value: unknown, newIds: Record<string, string>, now: number) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const workout = value as Record<string, unknown>;
    const upgraded = { ...workout };
    if (typeof workout['id'] === 'number') {
        const id = newIds[String(workout['id'])] ?? newId();
        newIds[String(workout['id'])] = id;
        upgraded['id'] = id;
    }
    if (typeof workout['updatedAt'] !== 'number') {
        upgraded['updatedAt'] = now;
    }
    return upgraded;
}

/**
 * A history entry from version 1 in version 2's shape: its workout's id becomes the workout's new
 * one (or, for a workout since deleted, the old number as text), and it's dated by when it
 * ended. Its own id stays, so the same run still matches across copies.
 */
export function upgradeHistoryEntry(value: unknown, newIds: Readonly<Record<string, string>>) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const entry = value as Record<string, unknown>;
    const upgraded = { ...entry };
    if (typeof entry['workoutId'] === 'number') {
        upgraded['workoutId'] = newIds[String(entry['workoutId'])] ?? String(entry['workoutId']);
    }
    if (typeof entry['updatedAt'] !== 'number' && typeof entry['endedAt'] === 'number') {
        upgraded['updatedAt'] = entry['endedAt'];
    }
    return upgraded;
}

function readList(key: string): unknown[] | null {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Version 5: groups (see docs/features/sets-and-supersets.md). Each workout's `steps` become
 * one group of them, run once a round, so it runs exactly as before. The history needs no
 * change: a set's step is its place in the workout's steps, which is the same as it was.
 */
function toVersion5() {
    const workouts = readList('workouts');
    if (workouts) {
        localStorage.setItem('workouts', JSON.stringify(workouts.map(withBlocks)));
    }
}

/** A workout saved before groups, with its steps as one; anything else is left as it is. */
function withBlocks(value: unknown): unknown {
    if (typeof value !== 'object' || value === null || !('steps' in value)) {
        return value;
    }
    const { steps, ...workout } = value as Record<string, unknown>;
    return Array.isArray(steps) ? { ...workout, blocks: asOneGroup(steps as Step[]) } : value;
}
