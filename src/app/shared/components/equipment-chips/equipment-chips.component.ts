import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import {
    Equipment,
    EQUIPMENT_CHOICES,
    equipmentLabel,
    hasNoEquipment,
    HOME_EQUIPMENT,
} from '../../../models/exercise';
import { SettingsStore } from '../../state/settings-store.service';
import { IconComponent } from '../icon/icon.component';

/** Everything else, mostly a gym's, in the order it's offered. */
const GYM_EQUIPMENT = EQUIPMENT_CHOICES.filter((e) => !HOME_EQUIPMENT.includes(e));

/**
 * A chip for each piece of equipment, pressed for what you have, saved with the settings, after
 * **No equipment** first, for having none (since 2026-11-06): picking it takes the pieces off,
 * and picking a piece takes it off. It has no name of its own: wrap it in a labelled group.
 *
 * With `homeFirst` (the setup, since 2026-11-24), what people have at home comes first, and the
 * rest wait behind **Gym equipment**, open from the start if any of it's picked.
 */
@Component({
    selector: 'app-equipment-chips',
    imports: [IconComponent, NgTemplateOutlet],
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
        @for (equipment of first(); track equipment) {
            <ng-container *ngTemplateOutlet="chip; context: { $implicit: equipment }" />
        }
        @if (homeFirst()) {
            <button
                type="button"
                class="equipment-chip equipment-chip--more"
                [attr.aria-expanded]="gymOpen()"
                (click)="gymOpen.set(!gymOpen())"
            >
                Gym equipment
                <app-icon class="equipment-chip__icon equipment-chip__chevron"
                    >expand_more</app-icon
                >
            </button>
            @if (gymOpen()) {
                @for (equipment of gym; track equipment) {
                    <ng-container *ngTemplateOutlet="chip; context: { $implicit: equipment }" />
                }
            }
        }

        <ng-template #chip let-equipment>
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
        </ng-template>
    `,
    styleUrl: './equipment-chips.component.scss',
})
export class EquipmentChipsComponent {
    private readonly settings = inject(SettingsStore);
    protected readonly label = equipmentLabel;
    protected readonly gym = GYM_EQUIPMENT;

    /** What's home kit first, and the rest behind Gym equipment, as the setup asks. */
    readonly homeFirst = input(false);

    /** The chips shown straight away, after No equipment. */
    protected readonly first = computed(() =>
        this.homeFirst() ? HOME_EQUIPMENT : EQUIPMENT_CHOICES
    );

    /** Gym equipment's chips showing: from the start if any of it's picked, then as pressed. */
    protected readonly gymOpen = signal(
        GYM_EQUIPMENT.some((e) => this.settings.myEquipment().includes(e))
    );

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
