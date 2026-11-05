import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { EquipmentChipsComponent } from '../equipment-chips/equipment-chips.component';
import { SettingsStore } from '../../state/settings-store.service';
import { ToggleSwitchComponent } from '../toggle-switch/toggle-switch.component';
import { counted } from '../../format-count';

/**
 * Only what I have, a switch, with the equipment you have under it, opening as chips to pick
 * from. Both are saved with the settings, so the Exercises list and the ready-made workouts
 * (and anywhere else filtered by them) are set once, together.
 */
@Component({
    selector: 'app-equipment-filter',
    imports: [EquipmentChipsComponent, MatIconModule, ToggleSwitchComponent],
    template: `
        <div class="kit__row">
            <div class="kit__text">
                <span [id]="idPrefix() + '-only-mine'" class="kit__label">Only what I have</span>
                <button
                    type="button"
                    class="kit__edit"
                    [attr.aria-controls]="idPrefix() + '-kit'"
                    [attr.aria-expanded]="open()"
                    (click)="open.set(!open())"
                >
                    My equipment: {{ summary() }}
                    <mat-icon aria-hidden="true">{{
                        open() ? 'expand_less' : 'expand_more'
                    }}</mat-icon>
                </button>
            </div>
            <app-toggle-switch
                [labelledBy]="idPrefix() + '-only-mine'"
                [checked]="settings.onlyMyEquipment()"
                (checkedChange)="setOnlyMine($event)"
            />
        </div>
        @if (open()) {
            <fieldset [id]="idPrefix() + '-kit'" class="kit__pick">
                <legend class="kit__legend">
                    What you have. {{ things() }} that need nothing always show.
                </legend>
                <app-equipment-chips />
            </fieldset>
        }
    `,
    styleUrl: './equipment-filter.component.scss',
})
export class EquipmentFilterComponent {
    /** Starts the ids of its label and chips, which must be unique on the page. */
    readonly idPrefix = input.required<string>();
    /** What it filters, for its hint: "Exercises", "Workouts". */
    readonly things = input.required<string>();

    protected readonly settings = inject(SettingsStore);
    protected readonly open = signal(false);

    protected readonly summary = computed(() => {
        const count = this.settings.myEquipment().length;
        if (count === 0) {
            return 'none';
        }
        return counted(count, 'piece');
    });

    protected setOnlyMine(only: boolean) {
        this.settings.update({ onlyMyEquipment: only });
    }
}
