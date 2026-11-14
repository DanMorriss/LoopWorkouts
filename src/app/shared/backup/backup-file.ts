import { ExerciseNote, HiddenExercise, OwnExercise } from '../../models/exercise';
import { HistoryEntry } from '../../models/history';
import { copyPlan, isWeekPlan, WeekPlan } from '../../models/plan';
import { Deletion, isDeletion, isLibraryOrder, LibraryOrder, newId } from '../../models/sync';
import { Workout } from '../../models/workout';
import {
    readExerciseNote,
    readHiddenExercise,
    readOwnExercise,
} from '../state/exercise-store.service';
import { readHistoryEntry } from '../state/history-store.service';
import {
    renameTimerDeletion,
    renameTimerId,
    upgradeHistoryEntry,
    upgradeWorkout,
} from '../state/migrate';
import { Settings } from '../state/settings-store.service';
import { readWorkout } from '../state/workout-store.service';
import { ReadyMadeFavourite, readReadyMadeFavourite } from '../state/ready-made-favourites.service';
import { ReadyMadeChange, readReadyMadeChange } from '../../models/ready-made-change';

/**
 * Goes up when the file's shape changes; older files are converted when they're read.
 * 2: random timer ids, `updatedAt` on timers and history entries, and `deleted`.
 * 3: your own exercises and notes on exercises, and steps and sets linked to exercises.
 * 4: timers are called workouts: `workouts` in place of `timers`, and `workoutId` in place
 *    of `timerId` in the history and of the kind `timer` in `deleted`.
 * 5: `hiddenExercises`, the exercises hidden from the picker, and your equipment in
 *    `settings`.
 * 6: time limits, `timeLimitSeconds` on workouts and history entries (with
 *    `stepsIntoRound`). Nothing to convert; an older app turns the file down rather than
 *    running a time limit until stopped.
 * 7: `libraryOrder`, the library's order and when a workout was last moved in it.
 * 8: groups, `blocks` in place of a workout's `steps`, each a group of steps with its rounds
 *    and rest between them, or a heading; and `set` on logged sets, which round of its
 *    group a set was in. A workout from before is read as one group of its steps.
 * 9: exercises done each side: `eachSide` on steps, `side` on logged sets, and the side to
 *    start with and Switch sides' length in `settings`. Nothing to convert; an older app
 *    turns the file down rather than running both sides as one.
 * 10: `headings` on history entries, the workout's headings when it ran. Nothing to convert;
 *    an older app turns the file down rather than syncing entries back without them.
 * 11: sets that vary, `sets` on a step, each set's own reps and weight or time. Nothing to
 *    convert; an older app turns the file down rather than running every set as set 1.
 * 12: `supersets` on history entries, the workout's supersets and giant sets when it ran.
 *    Nothing to convert; an older app turns the file down rather than syncing entries back
 *    without them.
 * 13: `plan`, the weekly plan (PLN-1): the workouts planned on each day, and when it changed.
 * 14: `readyMadeFavourites`, the ready-made workouts made favourites (LIB-8), and ready-made
 *    workouts (`builtin:` ids) in the plan. Nothing to convert; an older app turns the file down
 *    rather than planning workouts it can't find.
 * 15: `readyMadeChanges`, your own reps and weights on ready-made workouts. Nothing to convert;
 *    an older app turns the file down rather than leaving them out.
 * 16: a timed exercise's time in `readyMadeChanges` (`seconds`, and each set's where they vary).
 *    Nothing to convert; an older app turns the file down, and leaves synced records this new
 *    alone, rather than dropping the times and writing the record back without them.
 */
export const BACKUP_VERSION = 16;

/** Far more than years of workouts take (about 1 KB each), so a bigger file isn't a backup. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

/** Everything the app saves, as one file (see docs/features/backup-and-sync.md). */
export interface BackupFile {
    app: 'Loop Workouts';
    version: number;
    /** When it was made, in ms since the epoch. */
    exportedAt: number;
    workouts: Workout[];
    history: HistoryEntry[];
    /** Your own exercises (the built-in ones come with the app). */
    exercises: OwnExercise[];
    exerciseNotes: ExerciseNote[];
    /** Exercises hidden from the picker, built-in or your own. */
    hiddenExercises: HiddenExercise[];
    /** Ready-made workouts made favourites. */
    readyMadeFavourites: ReadyMadeFavourite[];
    /** Your own reps and weights on ready-made workouts. */
    readyMadeChanges: ReadyMadeChange[];
    /** The library's order, taken by an import if a workout was moved there more recently. */
    libraryOrder: LibraryOrder;
    /** The weekly plan, taken by an import if it changed there more recently. */
    plan: WeekPlan;
    /** Records deleted on the device it came from, so importing deletes them here too. */
    deleted: Deletion[];
    /** This device's settings, its profile included, but not when the profile changed. */
    settings: Omit<Settings, 'profileUpdatedAt' | 'bodyWeightUpdatedAt'>;
}

export type BackupProblem = 'unreadable' | 'not-a-backup' | 'too-new';

export type ReadBackup =
    | {
          ok: true;
          workouts: Workout[];
          history: HistoryEntry[];
          /** None before version 3. */
          exercises: OwnExercise[];
          exerciseNotes: ExerciseNote[];
          /** None before version 5. */
          hiddenExercises: HiddenExercise[];
          /** None before version 14. */
          readyMadeFavourites: ReadyMadeFavourite[];
          /** None before version 15. */
          readyMadeChanges: ReadyMadeChange[];
          /** None before version 7, or in a file written by hand. */
          libraryOrder: LibraryOrder | null;
          /** None before version 13, or in a file written by hand. */
          plan: WeekPlan | null;
          deleted: Deletion[];
          /**
           * From version 1, whose workout ids were only unique on their device: its workouts have
           * been given new ids, so they're matched on what they are rather than by id.
           */
          fromVersion1: boolean;
          /**
           * Workouts with no id, as in a file written by hand (e.g. by an AI from a plan): given
           * new ids and dated now, and matched on what they are, like version 1's.
           */
          newWorkouts: Workout[];
          /** Workouts, history entries and exercises in the file that weren't usable, and were left out. */
          skipped: number;
      }
    | { ok: false; problem: BackupProblem };

export function makeBackup(
    contents: Pick<
        BackupFile,
        | 'workouts'
        | 'history'
        | 'exercises'
        | 'exerciseNotes'
        | 'hiddenExercises'
        | 'readyMadeFavourites'
        | 'readyMadeChanges'
        | 'libraryOrder'
        | 'plan'
        | 'deleted'
        | 'settings'
    >,
    exportedAt: number
): BackupFile {
    return { app: 'Loop Workouts', version: BACKUP_VERSION, exportedAt, ...contents };
}

/** e.g. "loop-workouts-2026-10-21.json", dated by the device's own calendar. */
export function backupFileName(exportedAt: number): string {
    const date = new Date(exportedAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `loop-workouts-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/**
 * Reads a backup file's text. Workouts and history entries that aren't usable are left out and
 * counted, as when the app loads its own data; the rest are read the same way, so older
 * workout formats convert, and a version 1 file is brought up to version 2 as saved data is.
 * A file written by hand needs less: `history` can be left out, and a workout or exercise of
 * your own with no id is new, given an id and dated now.
 */
export function readBackup(text: string, now = Date.now()): ReadBackup {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { ok: false, problem: 'unreadable' };
    }
    if (typeof parsed !== 'object' || parsed === null) {
        return { ok: false, problem: 'not-a-backup' };
    }
    const version = (parsed as Record<string, unknown>)['version'];
    const file =
        (version as number) < 4 ? withWorkoutNames(parsed) : (parsed as Record<string, unknown>);
    if (
        file['app'] !== 'Loop Workouts' ||
        !Number.isInteger(version) ||
        (version as number) < 1 ||
        !Array.isArray(file['workouts']) ||
        (file['history'] !== undefined && !Array.isArray(file['history']))
    ) {
        return { ok: false, problem: 'not-a-backup' };
    }
    if ((version as number) > BACKUP_VERSION) {
        return { ok: false, problem: 'too-new' };
    }
    const fromVersion1 = version === 1;
    const newIds: Record<string, string> = {};
    const fileHistory: unknown[] = Array.isArray(file['history']) ? file['history'] : [];
    const savedWorkouts: unknown[] = fromVersion1
        ? file['workouts'].map((workout) => upgradeWorkout(workout, newIds, now))
        : file['workouts'];
    const savedHistory: unknown[] = fromVersion1
        ? fileHistory.map((entry) => upgradeHistoryEntry(entry, newIds))
        : fileHistory;

    const workouts = savedWorkouts
        .filter((item) => !isNew(item))
        .map((item) => readWorkout(item))
        .filter((t) => t !== null);
    const newWorkouts = savedWorkouts
        .filter(isNew)
        .map((item) => readWorkout(madeNew(item, now)))
        .filter((t) => t !== null);
    const history = savedHistory
        .map((item) => readHistoryEntry(item))
        .filter((entry) => entry !== null);
    const deleted = Array.isArray(file['deleted']) ? file['deleted'].filter(isDeletion) : [];
    const savedExercises: unknown[] = Array.isArray(file['exercises']) ? file['exercises'] : [];
    const exercises = savedExercises
        .map((item) => readOwnExercise(isNew(item) ? madeNew(item, now) : item))
        .filter((exercise) => exercise !== null);
    const exerciseNotes = (Array.isArray(file['exerciseNotes']) ? file['exerciseNotes'] : [])
        .map((item) => readExerciseNote(item))
        .filter((note) => note !== null);
    const hiddenExercises = (Array.isArray(file['hiddenExercises']) ? file['hiddenExercises'] : [])
        .map((item) => readHiddenExercise(item))
        .filter((hidden) => hidden !== null);
    const readyMadeFavourites = (
        Array.isArray(file['readyMadeFavourites']) ? file['readyMadeFavourites'] : []
    )
        .map((item) => readReadyMadeFavourite(item))
        .filter((favourite) => favourite !== null);
    const readyMadeChanges = (
        Array.isArray(file['readyMadeChanges']) ? file['readyMadeChanges'] : []
    )
        .map((item) => readReadyMadeChange(item))
        .filter((change) => change !== null);
    const libraryOrder = isLibraryOrder(file['libraryOrder'])
        ? { ids: [...file['libraryOrder'].ids], updatedAt: file['libraryOrder'].updatedAt }
        : null;
    const plan = isWeekPlan(file['plan']) ? copyPlan(file['plan']) : null;
    const skipped =
        savedWorkouts.length -
        workouts.length -
        newWorkouts.length +
        (savedHistory.length - history.length) +
        (savedExercises.length - exercises.length);
    return {
        ok: true,
        workouts,
        history,
        exercises,
        exerciseNotes,
        hiddenExercises,
        readyMadeFavourites,
        readyMadeChanges,
        libraryOrder,
        plan,
        deleted,
        fromVersion1,
        newWorkouts,
        skipped,
    };
}

/** Whether a workout or exercise in the file has no id, as one written by hand may not. */
function isNew(item: unknown): item is Record<string, unknown> {
    if (typeof item !== 'object' || item === null) {
        return false;
    }
    const id = (item as Record<string, unknown>)['id'];
    return id === undefined || id === '';
}

/** A record with no id given a new one, and dated now. */
function madeNew(item: Record<string, unknown>, now: number): Record<string, unknown> {
    return { ...item, id: newId(), updatedAt: now };
}

/** A file from before version 4 with the names it has now: workouts, not timers. */
function withWorkoutNames(parsed: object): Record<string, unknown> {
    const { timers, ...file } = parsed as Record<string, unknown>;
    const renamed = (list: unknown, rename: (value: unknown) => unknown) =>
        Array.isArray(list) ? list.map(rename) : list;
    return {
        ...file,
        workouts: timers,
        history: renamed(file['history'], renameTimerId),
        deleted: renamed(file['deleted'], renameTimerDeletion),
    };
}
