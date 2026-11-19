import { Service } from '@angular/core';
import { Deletion, isDeletion, mergeRecords, Synced, SyncedKind } from '../../models/sync';
import { migrateSavedData } from './migrate';

const STORAGE_KEY = 'deleted';

/** What a merge did to one kind of record. */
export interface MergeCounts {
    added: number;
    updated: number;
    removed: number;
}

/**
 * Plenty to carry deletions to another copy, without letting storage grow forever: years of
 * deleting, at about 100 bytes each. Once a deletion drops off, an old backup can bring back
 * what it deleted.
 */
export const MAX_DELETIONS = 5000;

/**
 * Records that were deleted, saved in the browser, so a deletion reaches other copies of the
 * data (a backup now, other devices later) and a deleted record can't come back by itself.
 */
@Service()
export class DeletionStore {
    /** Oldest first. */
    private deletions = loadDeletions();

    /** When a record was deleted, or undefined if it hasn't been. */
    deletedAt(kind: SyncedKind, id: string): number | undefined {
        return this.deletions.find((d) => d.kind === kind && d.id === id)?.deletedAt;
    }

    all(): readonly Deletion[] {
        return this.deletions;
    }

    /** Remembers a deletion, replacing any older one of the same record. */
    add(deletion: Deletion) {
        const others = this.deletions.filter(
            (d) => !(d.kind === deletion.kind && d.id === deletion.id)
        );
        this.save([...others, deletion].slice(-MAX_DELETIONS));
    }

    /**
     * Merges another copy's records of one kind into these (`mergeRecords`), keeping here the
     * other copy's deletions that applied. Calls `keep` with the merged records only if
     * anything changed, and gives how many were added, updated and removed.
     */
    merge<T extends Synced>(
        kind: SyncedKind,
        here: readonly T[],
        there: readonly T[],
        deletedThere: readonly Deletion[],
        keep: (records: T[]) => void
    ): MergeCounts {
        const { records, deletions, ...counts } = mergeRecords(
            kind,
            here,
            there,
            (id) => this.deletedAt(kind, id),
            deletedThere
        );
        deletions.forEach((deletion) => this.add(deletion));
        if (counts.added + counts.updated + counts.removed > 0) {
            keep(records);
        }
        return counts;
    }

    /** Forgets a deletion, e.g. on Undo. */
    remove(kind: SyncedKind, id: string) {
        this.save(this.deletions.filter((d) => !(d.kind === kind && d.id === id)));
    }

    private save(deletions: Deletion[]) {
        this.deletions = deletions;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deletions));
    }
}

function loadDeletions(): Deletion[] {
    migrateSavedData();
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter(isDeletion) : [];
    } catch {
        return [];
    }
}
