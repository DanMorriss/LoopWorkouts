import { computed, inject, Service, signal } from '@angular/core';
import { Deletion, mergeRecords, readMark, Synced } from '../../models/sync';
import { isReadyMadeId } from '../../models/workout';
import { DeletionStore } from './deletion-store.service';
import { SyncClock } from './sync-clock.service';

export const READY_MADE_FAVOURITES_KEY = 'ready-made-favourites';

/** A ready-made workout made a favourite (LIB-8), by its id, e.g. `builtin:gym-legs`. */
export type ReadyMadeFavourite = Synced;

/**
 * Which ready-made workouts are favourites. Yours are marked on the workout itself, but a
 * ready-made one isn't your data, so each favourite is a record of its own: there while it's
 * a favourite, and deleted, leaving a deletion, when it's taken off, as hidden exercises are.
 */
@Service()
export class ReadyMadeFavourites {
    private readonly deletions = inject(DeletionStore);
    private readonly clock = inject(SyncClock);
    private readonly _list = signal<ReadyMadeFavourite[]>(load());

    readonly list = this._list.asReadonly();
    readonly ids = computed(() => new Set(this._list().map((favourite) => favourite.id)));

    /** Makes a ready-made workout a favourite, or not. */
    set(id: string, favourite: boolean) {
        if (favourite === this.ids().has(id)) {
            return;
        }
        if (favourite) {
            const updatedAt = this.clock.now(this.deletions.deletedAt('ready-made-favourite', id));
            this._list.update((list) => [...list, { id, updatedAt }]);
            this.deletions.remove('ready-made-favourite', id);
        } else {
            const was = this._list().find((f) => f.id === id);
            this._list.update((list) => list.filter((f) => f.id !== id));
            this.deletions.add({
                kind: 'ready-made-favourite',
                id,
                deletedAt: this.clock.now(was?.updatedAt),
            });
        }
        this.save();
    }

    /** Merges another copy's favourites in, as hidden exercises merge. */
    merge(favourites: readonly ReadyMadeFavourite[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'ready-made-favourite',
            this._list(),
            favourites,
            (id) => this.deletions.deletedAt('ready-made-favourite', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._list.set(result.records);
            this.save();
        }
    }

    private save() {
        localStorage.setItem(READY_MADE_FAVOURITES_KEY, JSON.stringify(this._list()));
    }
}

/** A saved favourite, or null if it isn't usable: one for a ready-made workout's id. */
export function readReadyMadeFavourite(value: unknown): ReadyMadeFavourite | null {
    const mark = readMark(value);
    return mark && isReadyMadeId(mark.id) ? mark : null;
}

function load(): ReadyMadeFavourite[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(READY_MADE_FAVOURITES_KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.map(readReadyMadeFavourite).filter((favourite) => favourite !== null)
            : [];
    } catch {
        return [];
    }
}
