import { afterNextRender, inject, Injectable, Injector, signal } from '@angular/core';
import { lastRepSets } from '../history/last-sets';
import { Exercise, MeasuredBy } from '../models/exercise';
import { findByName } from '../models/exercise-links';
import { lastWeight } from '../models/step-swap';
import { weightIn } from '../models/weight';
import { StepKind } from '../models/workout';
import { injectFocusAfterRender } from '../shared/focus-after-render';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { isExercise, ItemKind, StepModel } from './step-model';
import { WorkoutSetupForm } from './workout-setup-form';

/**
 * A step's exercise in Create: its details, the editor, browsing for one and swapping it, and a
 * step taking the kind its exercise is measured by. One for each Create page.
 */
@Injectable()
export class SetupExercises {
    private readonly form = inject(WorkoutSetupForm);
    private readonly exercises = inject(ExerciseStore);
    private readonly history = inject(HistoryStore);
    private readonly undo = inject(UndoService);
    private readonly injector = inject(Injector);
    private readonly focusAfterRender = injectFocusAfterRender();

    /**
     * Why a step's kind just changed, shown under its name box: its exercise is measured the
     * other way. Only while the step is still that exercise and that kind.
     */
    private readonly kindNote = signal<{
        stepKey: number;
        exerciseId: string;
        kind: StepKind;
        text: string;
    } | null>(null);

    /** The exercise open in the editor, and the step it was opened from. */
    /** The exercise whose details are showing, and the step they were opened from. */
    /** The step whose exercise is being browsed for (BLD-16), while its dialog is open. */
    readonly browsing = signal<{ stepKey: number; stepNumber: number } | null>(null);
    /** The step whose exercise is being swapped (BLD-14), while its dialog is open. */
    readonly swapping = signal<{
        exercise: Exercise;
        stepKey: number;
        measuredBy: MeasuredBy;
    } | null>(null);
    readonly exerciseInDetails = signal<{ exercise: Exercise; stepKey: number } | null>(null);
    readonly exerciseInEditor = signal<{ exercise: Exercise; stepKey: number } | null>(null);

    /**
     * The exercise a work or rep step is: the one picked for it, or else the one its name
     * means, as it would be linked when saved. Undefined for a rest step, an unnamed one, or
     * a name no exercise has yet.
     */
    exerciseFor(step: StepModel): Exercise | undefined {
        if (!isExercise(step)) {
            return undefined;
        }
        return (
            (step.exerciseId ? this.exercises.byId(step.exerciseId) : undefined) ??
            findByName(step.name, this.exercises.exercises())
        );
    }

    noteFor(exercise: Exercise): string | undefined {
        return this.exercises.noteFor(exercise.id);
    }

    showDetails(exercise: Exercise, stepKey: number) {
        this.exerciseInDetails.set({ exercise, stepKey });
    }

    closeDetails() {
        const opened = this.exerciseInDetails();
        this.exerciseInDetails.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-details`);
        }
    }

    /** Back to the step's name box with its name selected, so typing replaces it. */
    pickAnother() {
        const opened = this.exerciseInDetails();
        this.exerciseInDetails.set(null);
        if (opened) {
            afterNextRender(
                () => {
                    const box = document.getElementById(`step-${opened.stepKey}-name`);
                    if (box instanceof HTMLInputElement) {
                        box.focus();
                        box.select();
                    }
                },
                { injector: this.injector }
            );
        }
    }

    /** The step's name box picked an exercise, or was left with one's name typed in it. */
    exerciseChanged(stepKey: number, exercise: Exercise) {
        const why = this.measureAs(stepKey, exercise);
        if (why) {
            this.form.stepAnnouncement.set(why);
        }
    }

    /**
     * A step that's just become `exercise` becomes the kind it's measured by: timed for a timed
     * one, reps for one measured in reps, at the amounts adding it from its page gives (0:30,
     * or 10 reps), each set's too where they vary. Its sets, rest and sides stay, and its kind
     * can be changed back from its menu. Says why, or gives null if its kind was right.
     */
    private measureAs(stepKey: number, exercise: Exercise): string | null {
        const step = this.form.model().steps.find((each) => each.key === stepKey);
        const kind = exercise.measuredBy === 'timed' ? 'work' : 'reps';
        if (!step || !isExercise(step) || step.kind === kind) {
            return null;
        }
        const amount = kind === 'work' ? { minutes: 0, seconds: 30 } : { reps: 10 };
        this.form.replaceStep({
            ...step,
            ...amount,
            kind,
            setRows: step.setRows.map((row) => ({ ...row, ...amount })),
        });
        const measured = kind === 'work' ? 'is timed' : 'is done in reps';
        const what = step.vary ? 'each set' : 'this step';
        const now = kind === 'work' ? '00:30' : '10 reps';
        const text = `${exercise.name} ${measured}, so ${what} is now ${now}`;
        this.kindNote.set({ stepKey, exerciseId: exercise.id, kind, text });
        return text;
    }

    /** Why the step's kind just changed, while it's still that exercise and kind. */
    kindNoteFor(step: StepModel): string | null {
        const note = this.kindNote();
        return note?.stepKey === step.key &&
            note.kind === step.kind &&
            this.exerciseFor(step)?.id === note.exerciseId
            ? note.text
            : null;
    }

    /** Browse: the exercises as the Exercises page lists them, to pick the step's from (BLD-16). */
    startBrowse(stepKey: number, stepNumber: number) {
        this.browsing.set({ stepKey, stepNumber });
    }

    /**
     * The step becomes `picked`, its name and link, as picking it in the name box does; the
     * rest of the step stays as it is. Focus goes back to Browse.
     */
    browsedTo(picked: Exercise) {
        const opened = this.browsing();
        this.browsing.set(null);
        const step = opened && this.form.model().steps.find((each) => each.key === opened.stepKey);
        if (!opened || !step) {
            return;
        }
        this.form.replaceStep({ ...step, name: picked.name, exerciseId: picked.id });
        const why = this.measureAs(step.key, picked);
        this.form.stepAnnouncement.set(
            [`Step ${opened.stepNumber} is now ${picked.name}`, why].filter(Boolean).join('. ')
        );
        this.focusAfterRender(`step-${opened.stepKey}-browse`);
    }

    closeBrowse() {
        const opened = this.browsing();
        this.browsing.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-browse`);
        }
    }

    /** Swap: another exercise for the same muscles (BLD-14), for a step measured as this one is. */
    startSwap(exercise: Exercise, stepKey: number, kind: ItemKind) {
        if (kind === 'reps' || kind === 'work') {
            this.swapping.set({
                exercise,
                stepKey,
                measuredBy: kind === 'reps' ? 'reps' : 'timed',
            });
        }
    }

    /**
     * The step becomes `replacement`: its name and link, keeping its reps or time, sets and
     * sides, at the weight it was done at last time (each set's own where they vary), or
     * none. Undo puts the step back as it was. Focus goes back to Swap.
     */
    swapFor(replacement: Exercise) {
        const opened = this.swapping();
        this.swapping.set(null);
        const before =
            opened && this.form.model().steps.find((step) => step.key === opened.stepKey);
        if (!opened || !before) {
            return;
        }
        const lastSets = lastRepSets(this.history.entries(), replacement.id, null);
        const weighed = <T extends { weight: number; savedWeight: number | null }>(
            amount: T,
            set: number
        ): T => {
            const kg = before.kind === 'reps' ? lastWeight(lastSets, set) : undefined;
            return kg === undefined
                ? { ...amount, weight: 0, savedWeight: null }
                : { ...amount, weight: weightIn(kg, this.form.weightUnit), savedWeight: kg };
        };
        const swapped: StepModel = {
            ...(before.kind === 'reps' ? weighed(before, 0) : before),
            name: replacement.name,
            exerciseId: replacement.id,
            setRows:
                before.kind === 'reps'
                    ? before.setRows.map((row, set) => weighed(row, set))
                    : before.setRows,
        };
        this.form.replaceStep(swapped);
        this.undo.offerUndo({
            message: `Swapped to ${replacement.name}`,
            undo: () => {
                this.form.replaceStep(before);
                this.focusAfterRender(`step-${before.key}-swap`);
            },
        });
        this.focusAfterRender(`step-${opened.stepKey}-swap`);
    }

    closeSwap() {
        const opened = this.swapping();
        this.swapping.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-swap`);
        }
    }

    openExercise(exercise: Exercise, stepKey: number) {
        this.exerciseInEditor.set({ exercise, stepKey });
    }

    /**
     * The editor saved: the step it was opened from is linked to the exercise, and every step
     * that is the exercise takes its name, in case it was renamed (EXR-3). Saved workouts have
     * been renamed by then; this does the same for the one being set up.
     */
    exerciseSaved(saved: Exercise) {
        const opened = this.exerciseInEditor();
        if (!opened) {
            return;
        }
        this.form.updateSteps((steps) =>
            steps.map((step) => {
                const isIt =
                    step.key === opened.stepKey ||
                    step.exerciseId === saved.id ||
                    (isExercise(step) &&
                        !step.exerciseId &&
                        findByName(step.name, [opened.exercise]) !== undefined);
                return isIt ? { ...step, name: saved.name, exerciseId: saved.id } : step;
            })
        );
        this.closeExercise();
    }

    closeExercise() {
        const opened = this.exerciseInEditor();
        this.exerciseInEditor.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-exercise`);
        }
    }
}
