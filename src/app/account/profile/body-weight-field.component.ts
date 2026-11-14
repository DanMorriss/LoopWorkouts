import { Component, computed, inject, input } from '@angular/core';
import { bodyWeightIn, bodyWeightToKg } from '../../models/weight';
import { SettingsStore } from '../../shared/state/settings-store.service';

/**
 * Profile's box for your body weight (CAL-2), in the unit you lift in, which is shown after
 * it. Saved as it's left, or on Enter, as it's kept: to one decimal place, and emptied when
 * it isn't a weight. The label is what's put inside it. Focus it by its id, `body-weight`, as
 * the workout summary's Add your weight does.
 */
@Component({
    selector: 'app-body-weight-field',
    template: `
        <label class="picker-field">
            <span>
                <ng-content />
                <span class="sr-only"> in {{ unitWord() }}</span>
            </span>
            <span class="body-weight">
                <input
                    id="body-weight"
                    class="picker-field__input body-weight__input"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    [attr.aria-describedby]="describedBy()"
                    [value]="shown()"
                    (change)="save($event)"
                    (keydown.enter)="save($event)"
                />
                <span class="body-weight__unit" aria-hidden="true">{{ unit() }}</span>
            </span>
        </label>
    `,
    styles: `
        :host {
            display: block;
        }

        .body-weight {
            position: relative;
            display: block;
        }

        .body-weight__input {
            padding-right: 3rem;
        }

        // Inside the box, at its right, so the number reads with its unit
        .body-weight__unit {
            position: absolute;
            top: 50%;
            right: 0.9rem;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
        }
    `,
})
export class BodyWeightFieldComponent {
    private readonly settings = inject(SettingsStore);

    /** The id of the hint under it, if any. */
    readonly describedBy = input<string>();

    protected readonly unit = this.settings.weightUnit;
    protected readonly unitWord = computed(() => (this.unit() === 'kg' ? 'kilograms' : 'pounds'));
    protected readonly shown = computed(() => {
        const kg = this.settings.bodyWeight();
        return kg === null ? '' : String(bodyWeightIn(kg, this.unit()));
    });

    protected save(event: Event) {
        const box = event.target as HTMLInputElement;
        const typed = box.value.trim().replace(',', '.');
        this.settings.update({
            bodyWeight: typed === '' ? null : bodyWeightToKg(Number(typed), this.unit()),
        });
        // As it's kept, e.g. emptied if it wasn't a weight
        box.value = this.shown();
    }
}
