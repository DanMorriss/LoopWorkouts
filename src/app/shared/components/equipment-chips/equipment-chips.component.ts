import { Component, inject } from '@angular/core';
import { Equipment, EQUIPMENT_CHOICES, equipmentLabel } from '../../../models/exercise';
import { SettingsStore } from '../../state/settings-store.service';
import { IconComponent } from '../icon/icon.component';

/**
 * A chip for each piece of equipment, pressed for what you have, saved with the settings. It
 * has no name of its own: wrap it in a labelled group.
 */
@Component({
    selector: 'app-equipment-chips',
    imports: [IconComponent],
    template: `
        @for (equipment of choices; track equipment) {
            <button
                type="button"
                class="equipment-chip"
                [attr.aria-pressed]="has(equipment)"
                (click)="toggle(equipment)"
            >
                @if (has(equipment)) {
                    <app-icon class="equipment-chip__icon">check</app-icon>
                }
                {{ label(equipment) }}
            </button>
        }
    `,
    styleUrl: './equipment-chips.component.scss',
})
export class EquipmentChipsComponent {
    private readonly settings = inject(SettingsStore);
    protected readonly choices = EQUIPMENT_CHOICES;
    protected readonly label = equipmentLabel;

    protected has(equipment: Equipment): boolean {
        return this.settings.myEquipment().includes(equipment);
    }

    protected toggle(equipment: Equipment) {
        const mine = this.has(equipment)
            ? this.settings.myEquipment().filter((e) => e !== equipment)
            : [...this.settings.myEquipment(), equipment];
        // In the order it's offered, as it's saved
        this.settings.update({ myEquipment: EQUIPMENT_CHOICES.filter((e) => mine.includes(e)) });
    }
}
