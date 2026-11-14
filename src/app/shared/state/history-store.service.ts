import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { HistoryEntry, isLoggedSet, MAX_NOTE_LENGTH } from '../../models/history';
import { MAX_TIME_LIMIT_SECONDS, PlacedHeading, PlacedSuperset } from '../../models/workout';
import { Deletion, mergeRecords } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { SyncClock } from './sync-clock.service';
import { openDatabase, readAll, write } from './history-database';
import { migrateSavedData } from './migrate';

/** Where the history was saved before it moved to IndexedDB; moved in on load. */
const LEGACY_KEY = 'history';

/**
 * Changes not yet confirmed saved in IndexedDB. A write started as the page closes may never
 * finish, so each change is kept here too until it's done, and saved on the next load if not.
 * If IndexedDB can't be used at all, the history stays here.
 */
const PENDING_KEY = 'history-pending';

/**
 * Completed and stopped workouts, newest first, saved in the browser (IndexedDB). They load
 * in the background: `ready` settles once they're in, and until then `entries` only has
 * workouts recorded since the app opened.
 */
@Service()
export class HistoryStore {
    private readonly deletions = inject(DeletionStore);
    private readonly clock = inject(SyncClock);
    private readonly _entries = signal<HistoryEntry[]>([]);
    private db: IDBDatabase | null = null;

    /** Newest first. */
    readonly entries = computed(() => this._entries());

    /** Settles once the saved history has loaded. Never fails: what can't be read is left out. */
    readonly ready: Promise<void>;

    constructor() {
        migrateSavedData();
        let destroyed = false;
        inject(DestroyRef).onDestroy(() => {
            destroyed = true;
            this.db?.close();
        });
        this.ready = this.load(() => destroyed);
    }

    /**
     * Adds a workout, or updates it if this run is already in the history. A run is logged
     * as stopped when its page closes, so if it's picked up again and later stopped or
     * finished, that replaces the earlier entry, keeping any note added to it meanwhile.
     * A deleted entry isn't recorded again (its run may still be going when it's deleted);
     * restore() puts one back. It's dated now, or just `after` if that's later (see
     * `SyncClock.now()`).
     */
    record(entry: Omit<HistoryEntry, 'updatedAt'>, after = 0) {
        if (this.deletions.deletedAt('history', entry.id) !== undefined) {
            return;
        }
        const before = this._entries().find((existing) => existing.id === entry.id);
        const note = entry.note ?? before?.note;
        const updated: HistoryEntry = {
            ...entry,
            ...(note === undefined ? {} : { note }),
            updatedAt: this.clock.now(Math.max(before?.updatedAt ?? 0, after)),
        };
        this._entries.update((entries) =>
            sorted([updated, ...entries.filter((existing) => existing.id !== entry.id)])
        );
        this.save([updated]);
    }

    /**
     * Sets a workout's note, trimmed and cut to MAX_NOTE_LENGTH. An empty note removes it.
     */
    setNote(id: string, note: string) {
        const entry = this._entries().find((existing) => existing.id === id);
        if (!entry) {
            return;
        }
        const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
        const { note: _old, ...rest } = entry;
        const changed: HistoryEntry = { ...rest, updatedAt: this.clock.now(entry.updatedAt) };
        const updated = trimmed ? { ...changed, note: trimmed } : changed;
        this._entries.update((entries) =>
            entries.map((existing) => (existing.id === id ? updated : existing))
        );
        this.save([updated]);
    }

    delete(id: string) {
        const deleted = this._entries().find((entry) => entry.id === id);
        this._entries.update((entries) => entries.filter((entry) => entry.id !== id));
        this.deletions.add({ kind: 'history', id, deletedAt: this.clock.now(deleted?.updatedAt) });
        this.save([], [id]);
    }

    /**
     * Merges workouts from another copy (a backup), by run id: the most recent change to each
     * wins, e.g. a note added there. A deletion there removes a workout here that hasn't
     * changed since, and one deleted here doesn't come back unless it changed there after.
     * Wait for `ready` first, so it merges with the whole history.
     */
    mergeEntries(entries: readonly HistoryEntry[], deletedThere: readonly Deletion[]) {
        const before = new Map(this._entries().map((entry) => [entry.id, entry]));
        const result = mergeRecords(
            'history',
            this._entries(),
            entries,
            (id) => this.deletions.deletedAt('history', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            const kept = new Set(result.records.map((entry) => entry.id));
            this._entries.set(sorted(result.records));
            this.save(
                result.records.filter((entry) => before.get(entry.id) !== entry),
                [...before.keys()].filter((id) => !kept.has(id))
            );
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    /**
     * Puts a deleted entry back, e.g. on Undo, dated after its deletion, which may have
     * reached other devices already.
     */
    restore(entry: HistoryEntry) {
        const deletedAt = this.deletions.deletedAt('history', entry.id) ?? 0;
        this.deletions.remove('history', entry.id);
        this.record(entry, Math.max(entry.updatedAt, deletedAt));
    }

    /**
     * Loads the history from IndexedDB, along with anything still in localStorage: from before
     * the move, or changes that weren't confirmed saved. Then saves those in IndexedDB.
     */
    private async load(destroyed: () => boolean) {
        const db = await openDatabase();
        if (destroyed()) {
            db?.close();
            return;
        }
        this.db = db;
        const stored = readEntries(db ? await readAll(db) : []);
        const latest = new Map(stored.map((entry) => [entry.id, entry]));

        // Where there's more than one copy of an entry, the most recent change wins
        const unsaved = new Map<string, HistoryEntry>();
        for (const entry of [
            ...readEntries(readList(LEGACY_KEY)),
            ...readEntries(readList(PENDING_KEY)),
            ...this._entries(),
        ]) {
            const other = latest.get(entry.id);
            if (!other || entry.updatedAt >= other.updatedAt) {
                latest.set(entry.id, entry);
                unsaved.set(entry.id, entry);
            }
        }
        // A deletion may not have reached IndexedDB; it wins if made after the last change
        const deleted = [...latest.values()]
            .filter(
                (entry) => (this.deletions.deletedAt('history', entry.id) ?? -1) >= entry.updatedAt
            )
            .map((entry) => entry.id);
        deleted.forEach((id) => {
            latest.delete(id);
            unsaved.delete(id);
        });
        this._entries.set(sorted([...latest.values()]));

        if (db && (await write(db, [...unsaved.values()], deleted))) {
            localStorage.removeItem(LEGACY_KEY);
            confirmSaved([...unsaved.values()]);
        }
    }

    /**
     * Saves changed entries and removes deleted ones. Each change is kept in localStorage too
     * until IndexedDB has it, so closing the page mid-write can't lose it.
     */
    private save(changed: readonly HistoryEntry[], removed: readonly string[] = []) {
        const replaced = new Set([...changed.map((entry) => entry.id), ...removed]);
        savePending([
            ...readList(PENDING_KEY).filter((item) => !replaced.has(field(item, 'id') as string)),
            ...changed,
        ]);
        if (!this.db) {
            // Saved once it's open, or left in localStorage if it can't be
            return;
        }
        void write(this.db, changed, removed).then((done) => {
            if (done) {
                confirmSaved(changed);
            }
        });
    }
}

function sorted(entries: HistoryEntry[]): HistoryEntry[] {
    return [...entries].sort((a, b) => b.startedAt - a.startedAt);
}

// Corrupted data shouldn't stop the app from starting, so anything unreadable is left out
function readList(key: string): unknown[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function readEntries(items: readonly unknown[]): HistoryEntry[] {
    return items.map((item) => readHistoryEntry(item)).filter((entry) => entry !== null);
}

/** Lets go of pending changes now in IndexedDB, unless they've changed again since. */
function confirmSaved(saved: readonly HistoryEntry[]) {
    const savedAt = new Map(saved.map((entry) => [entry.id, entry.updatedAt]));
    savePending(
        readList(PENDING_KEY).filter(
            (item) => savedAt.get(field(item, 'id') as string) !== field(item, 'updatedAt')
        )
    );
}

function savePending(items: readonly unknown[]) {
    try {
        if (items.length > 0) {
            localStorage.setItem(PENDING_KEY, JSON.stringify(items));
        } else {
            localStorage.removeItem(PENDING_KEY);
        }
    } catch {
        // Full: the change is still on its way to IndexedDB
    }
}

function field(item: unknown, key: string): unknown {
    return typeof item === 'object' && item !== null
        ? (item as Record<string, unknown>)[key]
        : undefined;
}

/**
 * Reads one saved workout, from this device or a backup, or returns null if it isn't usable.
 * A broken set is dropped, keeping the rest of the workout. One with no `updatedAt` is dated
 * by when it ended.
 */
export function readHistoryEntry(value: unknown): HistoryEntry | null {
    if (!isHistoryEntry(value)) {
        return null;
    }
    const entry = withUsableExpected(
        withUsableSupersets(withUsableHeadings(withUsableTimeLimit(withUsableSets(value))))
    );
    return isWholeNumber(entry.updatedAt) ? entry : { ...entry, updatedAt: entry.endedAt };
}

// A broken time limit or score is dropped, leaving the rounds as the record of it
function withUsableTimeLimit(entry: HistoryEntry): HistoryEntry {
    const { timeLimitSeconds, stepsIntoRound, ...rest } = entry;
    if (!isWholeNumber(timeLimitSeconds, 1) || timeLimitSeconds > MAX_TIME_LIMIT_SECONDS) {
        return rest;
    }
    return isWholeNumber(stepsIntoRound)
        ? { ...rest, timeLimitSeconds, stepsIntoRound }
        : { ...rest, timeLimitSeconds };
}

// A broken set is dropped rather than the whole workout; with none left, so are the sets
function withUsableSets(entry: HistoryEntry): HistoryEntry {
    const { sets, ...rest } = entry;
    const usable = Array.isArray(sets) ? sets.filter(isLoggedSet) : [];
    return usable.length > 0 ? { ...rest, sets: usable } : rest;
}

// A broken heading is only a label, so it's dropped; with none left, so are the headings
function withUsableHeadings(entry: HistoryEntry): HistoryEntry {
    const { headings, ...rest } = entry;
    const usable = Array.isArray(headings)
        ? headings.filter(
              (heading: unknown) =>
                  typeof heading === 'object' &&
                  heading !== null &&
                  typeof (heading as PlacedHeading).text === 'string' &&
                  (heading as PlacedHeading).text.trim() !== '' &&
                  isWholeNumber((heading as PlacedHeading).step)
          )
        : [];
    return usable.length > 0
        ? { ...rest, headings: usable.map(({ text, step }) => ({ text: text.trim(), step })) }
        : rest;
}

// A broken superset only groups lines, so it's dropped; with none left, so are the supersets
function withUsableSupersets(entry: HistoryEntry): HistoryEntry {
    const { supersets, ...rest } = entry;
    const usable = Array.isArray(supersets)
        ? supersets.filter(
              (superset: unknown) =>
                  typeof superset === 'object' &&
                  superset !== null &&
                  ((superset as PlacedSuperset).kind === 'superset' ||
                      (superset as PlacedSuperset).kind === 'giant set') &&
                  isWholeNumber((superset as PlacedSuperset).step) &&
                  isWholeNumber((superset as PlacedSuperset).steps, 1)
          )
        : [];
    return usable.length > 0
        ? { ...rest, supersets: usable.map(({ kind, step, steps }) => ({ kind, step, steps })) }
        : rest;
}

// A broken expected time only refines an estimate, so it's dropped
function withUsableExpected(entry: HistoryEntry): HistoryEntry {
    const { expected, ...rest } = entry;
    const usable =
        typeof expected === 'object' &&
        expected !== null &&
        isWholeNumber(expected.timedSeconds) &&
        isWholeNumber(expected.repSeconds);
    return usable
        ? {
              ...rest,
              expected: { timedSeconds: expected.timedSeconds, repSeconds: expected.repSeconds },
          }
        : rest;
}

function isWholeNumber(value: unknown, min = 0): value is number {
    return Number.isInteger(value) && (value as number) >= min;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const entry = value as Record<string, unknown>;
    return (
        typeof entry['id'] === 'string' &&
        typeof entry['workoutId'] === 'string' &&
        entry['workoutId'] !== '' &&
        typeof entry['title'] === 'string' &&
        isWholeNumber(entry['startedAt'], 1) &&
        isWholeNumber(entry['endedAt'], 1) &&
        (entry['endedAt'] as number) >= (entry['startedAt'] as number) &&
        isWholeNumber(entry['activeSeconds']) &&
        isWholeNumber(entry['roundsCompleted']) &&
        isWholeNumber(entry['totalRounds']) &&
        (entry['outcome'] === 'finished' || entry['outcome'] === 'stopped') &&
        (entry['note'] === undefined || typeof entry['note'] === 'string')
    );
}
