import { copyPlan, isWeekPlan, WeekPlan } from '../models/plan';
import { Profile, readProfile } from '../models/profile';
import { isDeletion, isLibraryOrder, LibraryOrder, SyncedKind } from '../models/sync';
import { BACKUP_VERSION } from '../shared/backup/backup-file';
import { CopyToMerge } from '../shared/backup/backup.service';
import {
    readExerciseNote,
    readHiddenExercise,
    readOwnExercise,
} from '../shared/state/exercise-store.service';
import { readHistoryEntry } from '../shared/state/history-store.service';
import { readWorkout } from '../shared/state/workout-store.service';

/**
 * The kinds of record on the server: those that leave a deletion, the library's order, the
 * weekly plan and the profile.
 */
export type RecordKind = SyncedKind | 'library-order' | 'plan' | 'profile';

/** The library's order is one record, under this id. */
export const LIBRARY_ORDER_ID = 'library';

/** The weekly plan is one record, under this id. */
export const PLAN_ID = 'week';

/** The profile is one record, under this id. */
export const PROFILE_ID = 'me';

/** A record as the server keeps it (see supabase/schema.sql). A deletion has `deleted_at`. */
export interface ServerRecord {
    kind: RecordKind;
    id: string;
    /** When it last changed, in ms since the epoch; for a deletion, when it was deleted. */
    updated_at: number;
    deleted_at: number | null;
    /** The record itself, as it's saved here; null for a deletion. */
    data: unknown;
    /** The app's data version it was written in (`BACKUP_VERSION`). */
    version: number;
}

/** Everything on this device that syncs. */
export type CopyHere = Omit<
    CopyToMerge,
    'libraryOrder' | 'plan' | 'profile' | 'fromVersion1' | 'newWorkouts'
> & {
    libraryOrder: LibraryOrder;
    plan: WeekPlan;
    profile: Profile;
};

/** Everything on this device, as the server keeps it. */
export function recordsHere(copy: CopyHere): ServerRecord[] {
    const record = (kind: RecordKind, data: { id: string; updatedAt: number }): ServerRecord => ({
        kind,
        id: data.id,
        updated_at: data.updatedAt,
        deleted_at: null,
        data,
        version: BACKUP_VERSION,
    });
    return [
        ...copy.workouts.map((workout) => record('workout', workout)),
        ...copy.history.map((entry) => record('history', entry)),
        ...copy.exercises.map((exercise) => record('exercise', exercise)),
        ...copy.exerciseNotes.map((note) => record('exercise-note', note)),
        ...copy.hiddenExercises.map((hidden) => record('hidden-exercise', hidden)),
        // Never moved, so there's no order to give
        ...(copy.libraryOrder.updatedAt > 0
            ? [record('library-order', { id: LIBRARY_ORDER_ID, ...copy.libraryOrder })]
            : []),
        // Never planned, so there's no plan to give
        ...(copy.plan.updatedAt > 0 ? [record('plan', { id: PLAN_ID, ...copy.plan })] : []),
        // Not set up here, so there's no profile to give
        ...(copy.profile.updatedAt > 0
            ? [record('profile', { id: PROFILE_ID, ...copy.profile })]
            : []),
        ...copy.deleted.map(
            (deletion): ServerRecord => ({
                kind: deletion.kind,
                id: deletion.id,
                updated_at: deletion.deletedAt,
                deleted_at: deletion.deletedAt,
                data: null,
                version: BACKUP_VERSION,
            })
        ),
    ];
}

/** Which record it is, e.g. "workout:1f0e…". */
export function keyOf(record: Pick<ServerRecord, 'kind' | 'id'>): string {
    return `${record.kind}:${record.id}`;
}

/** Which change to it this is: a record and its deletion at the same time differ. */
export function markOf(record: Pick<ServerRecord, 'updated_at' | 'deleted_at'>): string {
    return record.deleted_at === null ? String(record.updated_at) : `d${record.deleted_at}`;
}

/**
 * The records that have changed since they were last sent or fetched: `seen` has the mark of
 * each as it was then, by key.
 */
export function changedSince(
    records: readonly ServerRecord[],
    seen: Readonly<Record<string, string>>
): ServerRecord[] {
    return records.filter((record) => seen[keyOf(record)] !== markOf(record));
}

export interface PulledPage {
    /** What was fetched that this app can read, to merge in. */
    copy: CopyToMerge;
    /** The records read, as fetched. */
    read: ServerRecord[];
    /** The highest seq fetched, or null if none was. */
    lastSeq: number | null;
    /**
     * The seq of the first record written by a newer version of the app, or null if there
     * wasn't one: it's left for when this one's updated, rather than read wrong.
     */
    tooNewAt: number | null;
}

/**
 * Reads records fetched from the server, as a backup's are read: each checked as the app checks
 * its own saved data, and what isn't usable left out. A record's dates are the server's, which
 * may have taken a date too far ahead as its own time.
 */
export function readPulled(fetched: readonly unknown[]): PulledPage {
    const copy: CopyToMerge = {
        workouts: [],
        history: [],
        exercises: [],
        exerciseNotes: [],
        hiddenExercises: [],
        libraryOrder: null,
        plan: null,
        profile: null,
        deleted: [],
    };
    const read: ServerRecord[] = [];
    let lastSeq: number | null = null;
    let tooNewAt: number | null = null;
    for (const item of fetched) {
        if (typeof item !== 'object' || item === null) {
            continue;
        }
        const row = item as Record<string, unknown>;
        const seq = row['seq'];
        if (!Number.isSafeInteger(seq)) {
            continue;
        }
        lastSeq = Math.max(lastSeq ?? 0, seq as number);
        const version = row['version'];
        if (Number.isInteger(version) && (version as number) > BACKUP_VERSION) {
            tooNewAt = Math.min(tooNewAt ?? Infinity, seq as number);
            continue;
        }
        const record = readRecord(row);
        if (record && addTo(copy, record)) {
            read.push(record);
        }
    }
    return { copy, read, lastSeq, tooNewAt };
}

function readRecord(row: Record<string, unknown>): ServerRecord | null {
    const { kind, id, updated_at, deleted_at, data } = row;
    if (
        !RECORD_KINDS.includes(kind as RecordKind) ||
        typeof id !== 'string' ||
        id === '' ||
        !Number.isSafeInteger(updated_at) ||
        (deleted_at !== null && !Number.isSafeInteger(deleted_at))
    ) {
        return null;
    }
    return {
        kind: kind as RecordKind,
        id,
        updated_at: updated_at as number,
        deleted_at: deleted_at as number | null,
        data,
        version: BACKUP_VERSION,
    };
}

const RECORD_KINDS: readonly RecordKind[] = [
    'workout',
    'history',
    'exercise',
    'exercise-note',
    'hidden-exercise',
    'library-order',
    'plan',
    'profile',
];

/** Adds a record to the copy to merge, if it's usable, and gives whether it was. */
function addTo(copy: CopyToMerge, record: ServerRecord): boolean {
    if (record.deleted_at !== null) {
        const deletion = { kind: record.kind, id: record.id, deletedAt: record.deleted_at };
        if (!isDeletion(deletion)) {
            return false;
        }
        copy.deleted.push(deletion);
        return true;
    }
    // Dated as the server has it
    const dated = (value: { id: string; updatedAt: number } | null) =>
        value !== null && value.id === record.id
            ? { ...value, updatedAt: record.updated_at }
            : null;
    switch (record.kind) {
        case 'workout':
            return push(copy.workouts, dated(readWorkout(record.data)));
        case 'history':
            return push(copy.history, dated(readHistoryEntry(record.data)));
        case 'exercise':
            return push(copy.exercises, dated(readOwnExercise(record.data)));
        case 'exercise-note':
            return push(copy.exerciseNotes, dated(readExerciseNote(record.data)));
        case 'hidden-exercise':
            return push(copy.hiddenExercises, dated(readHiddenExercise(record.data)));
        case 'library-order':
            if (record.id !== LIBRARY_ORDER_ID || !isLibraryOrder(record.data)) {
                return false;
            }
            copy.libraryOrder = { ids: [...record.data.ids], updatedAt: record.updated_at };
            return true;
        case 'plan':
            if (record.id !== PLAN_ID || !isWeekPlan(record.data)) {
                return false;
            }
            copy.plan = { ...copyPlan(record.data), updatedAt: record.updated_at };
            return true;
        case 'profile': {
            const profile = record.id === PROFILE_ID ? readProfile(record.data) : null;
            if (profile === null) {
                return false;
            }
            copy.profile = { ...profile, updatedAt: record.updated_at };
            return true;
        }
    }
}

function push<T>(list: T[], value: unknown): boolean {
    if (value === null) {
        return false;
    }
    list.push(value as T);
    return true;
}
