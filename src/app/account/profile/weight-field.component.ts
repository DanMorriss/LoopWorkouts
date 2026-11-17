import { Component, computed, inject, input } from '@angular/core';
import {
    bodyWeightIn,
    bodyWeightToKg,
    kettlebellToKg,
    weightIn,
    WeightUnit,
} from '../../models/weight';
import { SettingsStore } from '../../shared/state/settings-store.service';

/** What a weight field is for: your body weight (CAL-2), or your kettlebell's (PRG-14). */
export type WeightFieldKind = 'body' | 'kettlebell';

/** How each kind is read, shown, kept and found. */
const KINDS = {
    body: {
        id: 'body-weight',
        shown: bodyWeightIn,
        toKg: bodyWeightToKg,
        setting: 'bodyWeight',
    },
    kettlebell: {
        id: 'kettlebell-weight',
        shown: weightIn,
        toKg: kettlebellToKg,
        setting: 'kettlebellWeight',
    },
} as const satisfies Record<
    WeightFieldKind,
    {
        id: string;
        shown: (kg: number, unit: WeightUnit) => number;
        toKg: (value: number, unit: WeightUnit) => number | null;
        setting: 'bodyWeight' | 'kettlebellWeight';
    }
>;

/**
 * Profile's box for a weight, in the unit you lift in, which is shown after it: your body
 * weight (CAL-2) or your kettlebell's (PRG-14). Saved as it's left, or on Enter, as it's kept
 * (a body weight to one decimal place, a kettlebell's to the half), and emptied when it isn't
 * a weight. The label is what's put inside it. Focus it by its id, e.g. `body-weight`, as the
 * workout summary's Add your weight does.
 */
@Component({
    selector: 'app-weight-field',
    template: `
        <label class="picker-field">
            <span>
                <ng-content />
                <span class="sr-only"> in {{ unitWord() }}</span>
            </span>
            <span class="weight-field">
                <input
                    class="picker-field__input weight-field__input"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    [id]="id()"
                    [attr.aria-describedby]="describedBy()"
                    [value]="shown()"
                    (change)="save($event)"
                    (keydown.enter)="save($event)"
                />
                <span class="weight-field__unit" aria-hidden="true">{{ unit() }}</span>
            </span>
        </label>
    `,
    styles: `
        :host {
            display: block;
        }

        .weight-field {
            position: relative;
            display: block;
        }

        .weight-field__input {
            padding-right: 3rem;
        }

        // Inside the box, at its right, so the number reads with its unit
        .weight-field__unit {
            position: absolute;
            top: 50%;
            right: 0.9rem;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
        }
    `,
})
export class WeightFieldComponent {
    private readonly settings = inject(SettingsStore);

    readonly kind = input.required<WeightFieldKind>();
    /** The id of the hint under it, if any. */
    readonly describedBy = input<string>();

    protected readonly id = computed(() => KINDS[this.kind()].id);
    protected readonly unit = this.settings.weightUnit;
    protected readonly unitWord = computed(() => (this.unit() === 'kg' ? 'kilograms' : 'pounds'));
    private readonly kg = computed(() =>
        this.kind() === 'body' ? this.settings.bodyWeight() : this.settings.kettlebellWeight()
    );
    protected readonly shown = computed(() => {
        const kg = this.kg();
        return kg === null ? '' : String(KINDS[this.kind()].shown(kg, this.unit()));
    });

    protected save(event: Event) {
        const box = event.target as HTMLInputElement;
        const typed = box.value.trim().replace(',', '.');
        const { toKg, setting } = KINDS[this.kind()];
        this.settings.update({
            [setting]: typed === '' ? null : toKg(Number(typed), this.unit()),
        });
        // As it's kept, e.g. emptied if it wasn't a weight
        box.value = this.shown();
    }
}
