import { inject, Injectable } from '@angular/core';
import { MAX_STEPS, StepKind, stepKindName } from '../models/workout';
import { injectFocusAfterRender } from '../shared/focus-after-render';
import {
    isExercise,
    lonelyStepsOut,
    ownExercise,
    partEnd,
    StepModel,
    withSets,
} from './step-model';
import { WorkoutSetupForm } from './workout-setup-form';

/**
 * Supersets in Create (BLD-12): joining an exercise with the next, taking a step out, and
 * adding a step to one. One for each Create page, working on its WorkoutSetupForm.
 */
@Injectable()
export class SetupSupersets {
    private readonly form = inject(WorkoutSetupForm);
    private readonly focusAfterRender = injectFocusAfterRender();

    /**
     * Whether Join with next can join this exercise, or superset, with the exercise straight
     * after it (BLD-12).
     */
    canJoin(index: number): boolean {
        const rows = this.form.model().steps;
        const row = rows[index];
        const next = rows[partEnd(rows, index)];
        return (
            row.group === 0 &&
            (row.kind === 'superset' || isExercise(row)) &&
            next !== undefined &&
            next.group === 0 &&
            isExercise(next)
        );
    }

    /**
     * Join with next: an exercise and the next become a superset, with the first's sets as its
     * rounds and its rest between sets as the rest between them; on a superset, the next
     * exercise joins it, making it a giant set.
     */
    joinWithNext(index: number) {
        if (!this.canJoin(index)) {
            return;
        }
        const rows = this.form.model().steps;
        const row = rows[index];
        const end = partEnd(rows, index);
        const next = rows[end];
        const head: StepModel =
            row.kind === 'superset'
                ? row
                : {
                      ...this.form.newStep(),
                      kind: 'superset',
                      sets: row.sets,
                      restMinutes: row.restMinutes,
                      restSeconds: row.restSeconds,
                  };
        const joined = { ...withSets(next, head.sets), group: head.key };
        const before = rows.slice(0, index);
        const after = rows.slice(end + 1);
        this.form.smoothChange(() => {
            this.form.updateSteps(() =>
                row.kind === 'superset'
                    ? [...before, ...rows.slice(index, end), joined, ...after]
                    : [...before, head, { ...row, group: head.key }, joined, ...after]
            );
            this.form.expandedKeys.update((keys) => new Set([...keys, head.key]));
        });
        const at = this.form.model().steps.indexOf(head);
        this.form.stepAnnouncement.set(
            `${this.form.stepTitle(at)}, ${this.form.amountText(head)}: ${this.form.summaryName(at)}`
        );
        this.focusAfterRender(`step-${head.key}-toggle`);
    }

    /**
     * Take out: a superset's step becomes an exercise of its own just after it, with its rounds
     * as its sets and its rest between them. A superset left with one step becomes that one's
     * exercise the same way.
     */
    takeOut(index: number) {
        const rows = this.form.model().steps;
        const step = rows[index];
        const head = rows.findIndex((row) => row.key === step.group);
        if (head === -1) {
            return;
        }
        const name = step.name.trim() || stepKindName(step.kind as StepKind).toLowerCase();
        const supersetName = this.form.supersetName(head).toLowerCase();
        const end = partEnd(rows, head);
        const out = ownExercise(step, rows[head]);
        this.form.smoothChange(() =>
            this.form.updateSteps(() =>
                lonelyStepsOut(
                    [
                        ...rows.slice(0, index),
                        ...rows.slice(index + 1, end),
                        out,
                        ...rows.slice(end),
                    ],
                    step.group
                )
            )
        );
        this.form.stepAnnouncement.set(
            `Took ${name} out of the ${supersetName}, now step ${this.form.stepNumber(this.form.model().steps.findIndex((row) => row.key === step.key))}`
        );
        this.focusAfterRender(`step-${step.key}-toggle`);
    }

    /** + Step in a superset: a rep step at its end, with its rounds. */
    addToSuperset(index: number) {
        if (this.form.stepCount() >= MAX_STEPS) {
            return;
        }
        const rows = this.form.model().steps;
        const head = rows[index];
        const end = partEnd(rows, index);
        const step: StepModel = { ...this.form.newStep(), group: head.key, sets: head.sets };
        this.form.updateSteps(() => [...rows.slice(0, end), step, ...rows.slice(end)]);
        this.form.expandedKeys.set(new Set([head.key, step.key]));
        this.form.stepAnnouncement.set(
            `Added a rep step to the ${this.form.supersetName(index).toLowerCase()}, step ${this.form.stepNumber(end)}`
        );
        this.focusAfterRender(`step-${step.key}-name`);
    }
}
