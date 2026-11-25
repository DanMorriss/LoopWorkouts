import { afterNextRender, inject, Injectable, Injector } from '@angular/core';
import { MAX_HEADINGS, MAX_STEPS, StepKind, stepKindName } from '../models/workout';
import { injectFocusAfterRender } from '../shared/focus-after-render';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { UndoService } from '../shared/undo/undo.service';
import {
    hasAmount,
    isStep,
    lonelyStepsOut,
    moved,
    partEnd,
    rowOf,
    StepModel,
    varyOff,
    withSets,
} from './step-model';
import { WorkoutSetupForm } from './workout-setup-form';

/**
 * What's done to the steps in Create: adding a step, a heading or an exercise from its page,
 * changing a step's kind, its sets and whether they vary, moving and deleting, with where
 * focus goes and what screen readers hear after each. One for each Create page, working on
 * its WorkoutSetupForm, as SetupSupersets does for supersets.
 */
@Injectable()
export class SetupSteps {
    private readonly form = inject(WorkoutSetupForm);
    private readonly exercises = inject(ExerciseStore);
    private readonly undo = inject(UndoService);
    private readonly injector = inject(Injector);
    private readonly focusAfterRender = injectFocusAfterRender();

    /**
     * Adds an exercise from its page (EXR-12) at the end of the workout, as the one step open:
     * 3 sets of 10 reps (or of 0:30, for a timed one) with 1:00 rest, to change before saving.
     * A new workout's empty first step makes way for it. Nothing happens for an exercise
     * that isn't there, or a workout already at MAX_STEPS.
     */
    addExercise(exerciseId: string) {
        const exercise = this.exercises.byId(exerciseId);
        const fresh = this.form.editingWorkoutId() === null;
        if (!exercise || (!fresh && this.form.stepCount() >= MAX_STEPS)) {
            return;
        }
        const { name, id } = exercise;
        const step = this.form.rows.row(
            exercise.measuredBy === 'timed'
                ? { kind: 'work', seconds: 30, name, exerciseId: id }
                : { kind: 'reps', reps: 10, name, exerciseId: id },
            3
        );
        this.form.updateSteps((steps) => (fresh ? [step] : [...steps, step]));
        this.form.view.expandedKeys.set(new Set([step.key]));
        this.form.stepAnnouncement.set(`Added ${name}, step ${this.form.stepCount()}`);
        // In the middle of the screen, as at the end of a long workout it'd be under the tab bar
        afterNextRender(
            () => {
                const toggle = document.getElementById(`step-${step.key}-toggle`);
                toggle?.focus({ preventScroll: true });
                toggle?.closest('.step')?.scrollIntoView({ block: 'center', behavior: 'instant' });
            },
            { injector: this.injector }
        );
    }

    /**
     * The Sets wheel, or a superset's Rounds wheel, which are the sets of each of its steps.
     * With Vary each set on, a set added copies the last one's row, and one taken away goes
     * from the end; down to 1 set, there's nothing to vary, so it goes off.
     */
    setSets(index: number, sets: number) {
        const changed = this.form.model().steps[index];
        if (changed.sets === sets) {
            return;
        }
        const keys = [changed.key, ...this.form.supersetSteps(index).map((step) => step.key)];
        const change = () =>
            this.form.updateSteps((steps) =>
                steps.map((step) => (keys.includes(step.key) ? withSets(step, sets) : step))
            );
        const rowsChange = this.form
            .model()
            .steps.some((step) => keys.includes(step.key) && step.vary && sets > 1);
        if (rowsChange) {
            this.form.view.smoothChange(change);
        } else {
            change();
        }
    }

    /**
     * The Vary each set switch: on, every set starts as the step is, a row each; off, every
     * set goes back to set 1's.
     */
    setVary(index: number, on: boolean) {
        const changed = this.form.model().steps[index];
        this.form.view.openSetRow.set(null);
        this.form.view.smoothChange(() =>
            this.updateStep(changed.key, (step) =>
                on
                    ? {
                          ...step,
                          vary: true,
                          setRows: Array.from({ length: step.sets }, () => rowOf(step)),
                      }
                    : varyOff(step)
            )
        );
    }

    private updateStep(key: number, change: (step: StepModel) => StepModel) {
        this.form.updateSteps((steps) =>
            steps.map((step) => (step.key === key ? change(step) : step))
        );
    }

    /** Adds a rep step, the most common kind; its kind pill changes it. */
    addStep() {
        if (this.form.stepCount() >= MAX_STEPS) {
            return;
        }
        const step = this.form.rows.newStep();
        this.form.updateSteps((steps) => [...steps, step]);
        // Only the new step is opened, keeping the rest of the list short
        this.form.view.expandedKeys.set(new Set([step.key]));
        this.form.stepAnnouncement.set(`Added a rep step, step ${this.form.stepCount()}`);
        this.focusAfterRender(`step-${step.key}-name`);
    }

    /**
     * Adds a heading at the end, e.g. "Warmup", opened with the cursor in its box. Headings
     * aren't steps, so they have a limit of their own.
     */
    addHeading() {
        if (this.form.headingCount() >= MAX_HEADINGS) {
            return;
        }
        const heading: StepModel = { ...this.form.rows.newStep(), kind: 'heading' };
        this.form.updateSteps((steps) => [...steps, heading]);
        this.form.view.expandedKeys.set(new Set([heading.key]));
        this.form.stepAnnouncement.set('Added a heading');
        this.focusAfterRender(`step-${heading.key}-name`);
    }

    /**
     * Changes a step's kind. Its name, exercise and numbers stay, so changing it back
     * finds them again; only those for its new kind are used.
     */
    setStepKind(index: number, kind: StepKind) {
        const changed = this.form.model().steps[index];
        this.form.view.kindMenuFor.set(null);
        this.focusAfterRender(`step-${changed.key}-kind`);
        if (changed.kind === kind) {
            return;
        }
        this.form.updateSteps((steps) =>
            steps.map((step) => (step.key === changed.key ? { ...step, kind } : step))
        );
        this.form.stepAnnouncement.set(
            `Step ${this.form.text.stepNumber(index)} is now ${stepKindName(kind).toLowerCase()}`
        );
    }

    /** Whether a row's up or down button can move it: see `moved()`. */
    canMove(index: number, by: -1 | 1): boolean {
        return moved(this.form.model().steps, index, by) !== null;
    }

    /**
     * The up and down buttons, for keyboard and screen reader users (and anyone else). A
     * superset moves with its steps, past the row or superset beside it, and its steps move
     * within it.
     */
    moveStep(index: number, by: -1 | 1) {
        const rows = moved(this.form.model().steps, index, by);
        if (!rows) {
            return;
        }
        const key = this.form.model().steps[index].key;
        this.placeRows(rows, key);
        // Focus follows the step to its new place: the same button, or the other move
        // button if that one has just been disabled (at the top or bottom)
        const to = rows.findIndex((row) => row.key === key);
        const stuck = moved(rows, to, by) === null;
        const button = by === -1 ? (stuck ? 'down' : 'up') : stuck ? 'up' : 'down';
        this.focusAfterRender(`step-${key}-${button}`);
    }

    /** Puts the rows in their new order, and says where the one that moved is now. */
    placeRows(rows: StepModel[], key: number) {
        this.form.updateSteps(() => rows);
        const to = rows.findIndex((row) => row.key === key);
        const moved = rows[to];
        if (moved.kind === 'heading' || moved.kind === 'superset') {
            // Said by what's after it now, as neither is numbered
            const end = partEnd(rows, to);
            const after = rows.slice(end).findIndex(isStep);
            const place =
                after === -1 ? 'the end' : `before step ${this.form.text.stepNumber(end + after)}`;
            const title =
                moved.kind === 'heading'
                    ? this.form.text.stepTitle(to)
                    : this.form.text.supersetName(to);
            this.form.stepAnnouncement.set(`Moved ${title.toLowerCase()} to ${place}`);
            return;
        }
        this.form.stepAnnouncement.set(
            `Moved ${moved.name.trim() || stepKindName(moved.kind).toLowerCase()} to step ${this.form.text.stepNumber(to)}`
        );
    }

    /**
     * The X button: deletes the step straight away. One with anything in it can be put back:
     * the Undo bar offers it (UndoService), rather than a question first. A superset goes
     * with its steps.
     */
    deleteStep(index: number) {
        const before = this.form.model().steps;
        const step = before[index];
        const isSet = hasAmount(step);
        const title = this.form.text.stepTitle(index);
        if (!step.name.trim() && !isSet && step.kind !== 'superset') {
            this.removeStep(index);
            this.focusAfterDelete(index);
            return;
        }
        this.removeStep(index);
        const time = isSet ? `, ${this.form.text.amountText(step)}` : '';
        this.undo.offerUndo({
            message: `Deleted ${title}${time}`,
            undo: () => {
                // A superset, or a step of one (which may have taken the superset with it), comes
                // back as the list was
                this.form.updateSteps((all) =>
                    step.kind === 'superset' || step.group
                        ? before
                        : [...all.slice(0, index), step, ...all.slice(index)]
                );
                this.form.stepAnnouncement.set(
                    step.kind === 'heading' || step.kind === 'superset'
                        ? `${this.form.text.stepTitle(index)} is back`
                        : `Step ${this.form.text.stepNumber(index)} is back`
                );
                this.focusAfterRender(
                    `step-${step.key}-${this.form.view.isExpanded(step.key) ? 'menu' : 'toggle'}`
                );
            },
            dismissed: () => this.focusAfterDelete(index),
        });
    }

    private removeStep(index: number) {
        const deleted = this.form.model().steps[index];
        const said =
            deleted.kind === 'heading'
                ? 'Deleted a heading'
                : deleted.kind === 'superset'
                  ? `Deleted a ${this.form.text.supersetName(index).toLowerCase()}`
                  : `Deleted step ${this.form.text.stepNumber(index)}`;
        this.form.updateSteps((all) =>
            lonelyStepsOut(
                all.filter((step) => step.key !== deleted.key && step.group !== deleted.key),
                deleted.group
            )
        );
        this.form.stepAnnouncement.set(said);
    }

    /**
     * After step `index` goes, focus the step that took its place, or the one before if it was
     * last: its ⋮, or its open button if it's collapsed (and so has no ⋮). With none left,
     * the Add button.
     */
    private focusAfterDelete(index: number) {
        const remaining = this.form.model().steps;
        const next = remaining[Math.min(index, remaining.length - 1)];
        if (!next) {
            this.focusAfterRender('add-step');
            return;
        }
        this.focusAfterRender(
            `step-${next.key}-${this.form.view.isExpanded(next.key) ? 'menu' : 'toggle'}`
        );
    }
}
