import { Component, computed, inject } from '@angular/core';
import { MAX_WEEKLY_SETS, MIN_WEEKLY_SETS, smallAim } from '../../../models/muscle-balance';
import { SettingsStore } from '../../state/settings-store.service';
import { WheelPickerComponent, WheelPickerOption } from '../wheel-picker/wheel-picker.component';

/** MIN_WEEKLY_SETS to MAX_WEEKLY_SETS, as the wheel offers them. */
const OPTIONS: readonly WheelPickerOption[] = Array.from(
    { length: MAX_WEEKLY_SETS - MIN_WEEKLY_SETS + 1 },
    (_, i) => ({ value: MIN_WEEKLY_SETS + i, label: `${MIN_WEEKLY_SETS + i}` })
);

/**
 * The sets a week each muscle aims at on the muscle bars (PRG-8), on a wheel, with what the
 * small muscles aim at under its name: on Profile, and in the setup (NAV-4). Saved as it's
 * turned.
 */
@Component({
    selector: 'app-weekly-sets-field',
    imports: [WheelPickerComponent],
    template: `
        <div class="weekly-sets__text">
            <span class="weekly-sets__name" id="weekly-sets-label">Sets a week per muscle</span>
            <span class="weekly-sets__hint" id="weekly-sets-hint">{{ hint() }}</span>
        </div>
        <app-wheel-picker
            class="weekly-sets__wheel"
            [value]="settings.weeklySets()"
            (valueChange)="settings.update({ weeklySets: $event })"
            [options]="options"
            labelledBy="weekly-sets-label weekly-sets-hint"
        />
    `,
    styleUrl: './weekly-sets-field.component.scss',
})
export class WeeklySetsFieldComponent {
    protected readonly settings = inject(SettingsStore);
    protected readonly options = OPTIONS;

    protected readonly hint = computed(
        () => `Small muscles, like the forearms, aim for ${smallAim(this.settings.weeklySets())}`
    );
}
