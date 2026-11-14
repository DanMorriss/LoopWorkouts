import { computed, inject, Service } from '@angular/core';
import { HistoryEntry } from '../../models/history';
import { RunSides, Workout } from '../../models/workout';
import { EstimateBasis, estimateText, estimateWorkout } from '../../models/workout-estimate';
import { HistoryStore } from './history-store.service';
import { SettingsStore } from './settings-store.service';

/**
 * How long each workout will take (see `estimateWorkout()`): a guess from its steps until
 * it's been finished, then from your own pace on its rep steps. Read in a `computed()`, it
 * follows the workout, its runs and the Switch sides setting.
 */
@Service()
export class WorkoutEstimates {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);

    /** Each workout's runs, newest first, as the history keeps them. */
    private readonly runsById = computed(() => {
        const runs = new Map<string, HistoryEntry[]>();
        for (const entry of this.history.entries()) {
            const list = runs.get(entry.workoutId);
            if (list) {
                list.push(entry);
            } else {
                runs.set(entry.workoutId, [entry]);
            }
        }
        return runs;
    });
    private readonly sides = computed(
        (): RunSides => ({
            first: this.settings.eachSideFirst(),
            switchSeconds: this.settings.switchSidesSeconds(),
        })
    );

    /**
     * How long `workout` will take, as it's shown and heard ("About 25 min"), and what it's
     * from; null for one that runs until stopped.
     */
    of(
        workout: Pick<Workout, 'id' | 'blocks' | 'repeats' | 'timeLimitSeconds'>
    ): { text: string; spoken: string; basis: EstimateBasis } | null {
        const estimate = estimateWorkout(
            { ...workout, sides: this.sides() },
            this.runsById().get(workout.id) ?? []
        );
        return estimate && { ...estimateText(estimate), basis: estimate.basis };
    }
}
