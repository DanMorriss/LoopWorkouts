import { Component, computed, inject } from '@angular/core';
import {
    Equipment,
    EQUIPMENT_CHOICES,
    equipmentLabel,
    hasNoEquipment,
} from '../../../models/exercise';
import { SettingsStore } from '../../state/settings-store.service';
import { IconComponent } from '../icon/icon.component';

/**
 * A chip for each piece of equipment, pressed for what you have, saved with the settings, after
 * **No equipment** first, for having none (since 2026-11-06): picking it takes the pieces off,
 * and picking a piece takes it off. It has no name of its own: wrap it in a labelled group.
 */
@Component({
    selector: 'app-equipment-chips',
    imports: [IconComponent],
    template: `
        <button
            type="button"
            class="equipment-chip"
            [attr.aria-pressed]="none()"
            (click)="toggleNone()"
        >
            @if (none()) {
                <app-icon class="equipment-chip__icon">check</app-icon>
            }
            No equipment
        </button>
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

    /** You've said you have none. */
    protected readonly none = computed(() => hasNoEquipment(this.settings.myEquipment()));

    protected toggleNone() {
        this.settings.update({ myEquipment: this.none() ? [] : ['none'] });
    }

    protected has(equipment: Equipment): boolean {
        return this.settings.myEquipment().includes(equipment);
    }

    protected toggle(equipment: Equipment) {
        // A piece picked, so it isn't No equipment any more
        const pieces = this.settings.myEquipment().filter((e) => e !== 'none');
        const mine = this.has(equipment)
            ? pieces.filter((e) => e !== equipment)
            : [...pieces, equipment];
        // In the order it's offered, as it's saved
        this.settings.update({ myEquipment: EQUIPMENT_CHOICES.filter((e) => mine.includes(e)) });
    }
}
