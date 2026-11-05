import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { WheelPickerComponent, WheelPickerOption } from './wheel-picker.component';

/**
 * A form's wheel with its label above it, bound to a Signal Forms field:
 *
 *     <app-labelled-wheel wheelId="rounds" label="Rounds" [field]="form.rounds" [options]="options" />
 *
 * Its label's id is the wheel's with `-label` on the end. `context` is the ids of what else names
 * it, read out before its label, e.g. the step it's on.
 */
@Component({
    selector: 'app-labelled-wheel',
    imports: [FormField, WheelPickerComponent],
    host: { class: 'picker-field' },
    template: `
        <span [class]="hideLabel() ? 'sr-only' : 'picker-field__label'" [id]="wheelId() + '-label'">
            {{ label() }}
        </span>
        <app-wheel-picker
            [id]="wheelId()"
            [formField]="field()"
            [options]="options()"
            [labelledBy]="labelledBy()"
        />
    `,
})
export class LabelledWheelComponent {
    readonly wheelId = input.required<string>();
    readonly label = input.required<string>();
    readonly field = input.required<FieldTree<number>>();
    readonly options = input.required<readonly WheelPickerOption[]>();
    readonly context = input('');
    /** For screen readers only, where a label over a group of wheels says it for the eye. */
    readonly hideLabel = input(false);

    protected readonly labelledBy = computed(() =>
        [this.context(), `${this.wheelId()}-label`].filter(Boolean).join(' ')
    );
}
