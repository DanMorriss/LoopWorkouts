import { computed, inject, Service, signal } from '@angular/core';
import { Deletion, readMark, Synced } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { migrateSavedData } from './migrate';
import { SyncClock } from './sync-clock.service';

export const FAVOURITES_KEY = 'favourites';

/** A workout made a favourite (LIB-8), yours or ready-made, by its id. */
export type Favourite = Synced;

/**
 * Which workouts are favourites, yours and ready-made. Each favourite is a record of its own,
 * apart from its workout: there while it's a favourite, and deleted, leaving a deletion, when
 * it's taken off, as hidden exercises are. So a heart pressed on one device and an edit to the
 * workout on another both survive the sync. They sync as `ready-made-favourite` records, the
 * name from when only ready-made workouts' favourites were records of their own, as the server
 * and saved deletions know them by it.
 */
@Service()
export class Favourites {
    private readonly deletions = inject(DeletionStore);
    private readonly clock = inject(SyncClock);
    private readonly _list = signal<Favourite[]>(load());

    readonly list = this._list.asReadonly();
    readonly ids = computed(() => new Set(this._list().map((favourite) => favourite.id)));

    /** Makes a workout a favourite, or not. */
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
    merge(favourites: readonly Favourite[], deletedThere: readonly Deletion[]) {
        this.deletions.merge(
            'ready-made-favourite',
            this._list(),
            favourites,
            deletedThere,
            (records) => {
                this._list.set(records);
                this.save();
            }
        );
    }

    private save() {
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(this._list()));
    }
}

function load(): Favourite[] {
    migrateSavedData();
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.map(readMark).filter((favourite) => favourite !== null)
            : [];
    } catch {
        return [];
    }
}
