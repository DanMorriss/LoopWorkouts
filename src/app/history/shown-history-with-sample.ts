import { computed, inject } from '@angular/core';
import { HistoryStore } from '../shared/state/history-store.service';
import { sampleHistory } from '../tour/sample-history';
import { TourService } from '../tour/tour.service';
import { ShownHistory } from './shown-history';

/**
 * On Progress: example workouts in place of an empty history while the tour's showing the
 * page (NAV-8), so there's something to see. Only shown, never saved: they're not in the
 * history, and go as the tour moves on.
 */
export function provideShownHistoryWithSample() {
    return {
        provide: ShownHistory,
        useFactory: (): ShownHistory => {
            const history = inject(HistoryStore);
            const tour = inject(TourService);
            const examples = sampleHistory(Date.now());
            const sample = computed(() => tour.sampleHistory() && history.entries().length === 0);
            return {
                sample,
                entries: computed(() => (sample() ? examples : history.entries())),
            };
        },
    };
}
