import { computed, Signal } from '@angular/core';
import { WeightUnit } from '../models/weight';
import { isSkipped, StepModel, WorkoutSetupModel } from './step-model';
import {
    amountText,
    setRowText,
    stepNumbers,
    stepTitle,
    summaryName,
    supersetNameAt,
    toggleLabel,
} from './step-text';

/**
 * What Create's rows say, for the form's rows as they are (`step-text.ts`, given the rows,
 * their step numbers and the weight unit). The form keeps one as `text`.
 */
export class SetupText {
    /** Each row's step number (see `stepNumbers()`). */
    private readonly numbers = computed(() => stepNumbers(this.model().steps));

    constructor(
        private readonly model: Signal<WorkoutSetupModel>,
        private readonly unit: WeightUnit
    ) {}

    /** A step's number, counting steps only, as headings aren't steps. */
    stepNumber(index: number): number {
        return this.numbers()[index];
    }

    supersetName(index: number): string {
        return supersetNameAt(this.model().steps, index);
    }

    stepTitle(index: number): string {
        return stepTitle(this.model().steps, index, this.numbers());
    }

    toggleLabel(index: number): string {
        return toggleLabel(this.model().steps, index, this.numbers(), this.unit);
    }

    summaryName(index: number): string {
        return summaryName(this.model().steps, index);
    }

    amountText(step: StepModel): string {
        return amountText(step, this.unit);
    }

    /** Whether a step is left out of the workout as it is: see `isSkipped()`. */
    isSkipped(step: StepModel): boolean {
        return isSkipped(step);
    }

    setRowText(step: StepModel, set: number): string {
        return setRowText(step, set, this.unit);
    }
}
