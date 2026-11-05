import { Component, inject, input } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { FieldTree } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { SetupDrag } from '../setup-drag';
import { StepKindMenuComponent } from '../step-kind-menu/step-kind-menu.component';
import { StepModel } from '../step-model';
import { WorkoutSetupForm } from '../workout-setup-form';

/** A step's row: its handle, kind, number and summary, what opens it, and its move and delete. */
@Component({
    selector: 'app-setup-step-header',
    imports: [CdkDragHandle, MatIconModule, StepKindMenuComponent],
    templateUrl: './setup-step-header.component.html',
    styleUrl: './setup-step-header.component.scss',
    host: { class: 'step__header' },
})
export class SetupStepHeaderComponent {
    readonly field = input.required<FieldTree<StepModel, number>>();
    /** Which row it is. */
    readonly index = input.required<number>();

    protected readonly setup = inject(WorkoutSetupForm);
    protected readonly drag = inject(SetupDrag);
}
