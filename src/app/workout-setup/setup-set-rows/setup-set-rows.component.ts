import { Component, inject, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { LabelledWheelComponent } from '../../shared/components/wheel-picker/labelled-wheel.component';
import { StepModel } from '../step-model';
import { WorkoutSetupForm } from '../workout-setup-form';

/**
 * A row for each set of a step whose sets vary (BLD-11), or each round in a superset, opened
 * onto its wheels one at a time; the rows slide as they open and shut.
 */
@Component({
    selector: 'app-setup-set-rows',
    imports: [LabelledWheelComponent, MatIconModule],
    templateUrl: './setup-set-rows.component.html',
    // In the step's own layout, as if its list were directly on it
    styles: `
        :host {
            display: contents;
        }
    `,
})
export class SetupSetRowsComponent {
    readonly field = input.required<FieldTree<StepModel, number>>();
    /** A superset's step, whose rows are rounds rather than sets. */
    readonly inSuperset = input.required<boolean>();

    protected readonly setup = inject(WorkoutSetupForm);
}
