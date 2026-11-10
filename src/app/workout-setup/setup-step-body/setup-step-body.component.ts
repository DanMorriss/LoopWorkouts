import { Component, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { LabelledWheelComponent } from '../../shared/components/wheel-picker/labelled-wheel.component';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch/toggle-switch.component';
import { WheelPickerComponent } from '../../shared/components/wheel-picker/wheel-picker.component';
import { SetupSetRowsComponent } from '../setup-set-rows/setup-set-rows.component';
import { SetupStepExerciseComponent } from '../setup-step-exercise/setup-step-exercise.component';
import { StepModel } from '../step-model';
import { SetupSupersets } from '../setup-supersets';
import { WorkoutSetupForm } from '../workout-setup-form';

/** What an open step's for: its name or exercise, its amount, sets and rest, and its superset. */
@Component({
    selector: 'app-setup-step-body',
    imports: [
        FormField,
        MatIconModule,
        LabelledWheelComponent,
        SetupSetRowsComponent,
        SetupStepExerciseComponent,
        ToggleSwitchComponent,
        WheelPickerComponent,
    ],
    templateUrl: './setup-step-body.component.html',
    styleUrl: './setup-step-body.component.scss',
    host: { class: 'step__body-inner' },
})
export class SetupStepBodyComponent {
    readonly field = input.required<FieldTree<StepModel, number>>();
    /** Which row it is. */
    readonly index = input.required<number>();

    protected readonly setup = inject(WorkoutSetupForm);
    protected readonly supersets = inject(SetupSupersets);
}
