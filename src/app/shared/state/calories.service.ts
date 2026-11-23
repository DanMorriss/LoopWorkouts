import { inject, LOCALE_ID, Service } from '@angular/core';
import {
    afterburn,
    BurningRun,
    caloriesBurnt,
    CaloriesText,
    describeCalories,
} from '../../models/calories';
import { SettingsStore } from './settings-store.service';

/**
 * About how many calories a run burnt (CAL-1), as shown, from the body weight saved on this
 * device; null with none given, or under 5.
 */
@Service()
export class CaloriesService {
    private readonly settings = inject(SettingsStore);
    private readonly locale = inject(LOCALE_ID);

    describe(run: BurningRun): CaloriesText | null {
        const kg = this.settings.bodyWeight();
        return kg === null ? null : describeCalories(caloriesBurnt(run, kg), this.locale);
    }

    /**
     * What works out a run's kcal, not rounded, for adding up (CAL-3); null with no body
     * weight given, when no calories are shown.
     */
    burning(): ((run: BurningRun) => number) | null {
        const kg = this.settings.bodyWeight();
        return kg === null ? null : (run) => caloriesBurnt(run, kg);
    }

    /** A total of kcal, as shown: to the nearest 5, or null under 5. */
    describeTotal(kcal: number): CaloriesText | null {
        return describeCalories(kcal, this.locale);
    }

    /** About how many more it burns over the next day, as the body recovers; null as above. */
    describeAfterburn(run: BurningRun): CaloriesText | null {
        const kg = this.settings.bodyWeight();
        return kg === null ? null : describeCalories(afterburn(run, kg), this.locale);
    }
}
