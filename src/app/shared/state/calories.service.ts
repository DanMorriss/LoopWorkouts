import { inject, LOCALE_ID, Service } from '@angular/core';
import { BurningRun, caloriesBurnt, CaloriesText, describeCalories } from '../../models/calories';
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
}
