import { Component, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { isBuiltIn } from '../../models/exercise';
import { ExercisePickerComponent } from '../exercise-picker/exercise-picker.component';
import { SetupExercises } from '../setup-exercises';
import { StepModel } from '../step-model';
import { WorkoutSetupForm } from '../workout-setup-form';

/** A timed or rep step's exercise: its name box, with Browse (BLD-16), and which exercise it is. */
@Component({
    selector: 'app-setup-step-exercise',
    imports: [ExercisePickerComponent, FormField, MatIconModule],
    templateUrl: './setup-step-exercise.component.html',
    styleUrl: './setup-step-exercise.component.scss',
})
export class SetupStepExerciseComponent {
    readonly field = input.required<FieldTree<StepModel, number>>();
    /** Which row it is. */
    readonly index = input.required<number>();

    protected readonly setup = inject(WorkoutSetupForm);
    protected readonly exercises = inject(SetupExercises);
    protected readonly isBuiltIn = isBuiltIn;
}
