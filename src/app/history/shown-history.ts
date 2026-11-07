import { computed, inject, Service, Signal } from '@angular/core';
import { HistoryEntry } from '../models/history';
import { HistoryStore } from '../shared/state/history-store.service';

/**
 * The history as Progress and Today show it: the real one, which is all there is everywhere
 * but Progress, which swaps in examples while the tour shows it (`provideShownHistoryWithSample()`).
 */
@Service()
export class ShownHistory {
    readonly entries: Signal<readonly HistoryEntry[]> = inject(HistoryStore).entries;
    /** Whether the entries are examples, not the user's own. */
    readonly sample: Signal<boolean> = computed(() => false);
}
