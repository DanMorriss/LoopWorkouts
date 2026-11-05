import { effect, inject, signal, untracked } from '@angular/core';
import { lastRepSets } from '../history/last-sets';
import { Exercise, MeasuredBy } from '../models/exercise';
import { ActiveRunService } from '../shared/run/active-run.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { WorkoutView } from './workout-view';

/**
 * An exercise's details over the workout (RUN-9), and swapping it for another (RUN-11). Make it
 * in an injection context, with what puts focus back on the step's (i).
 */
export class WorkoutSwap {
    private readonly run = inject(ActiveRunService);
    private readonly view = inject(WorkoutView);
    private readonly history = inject(HistoryStore);
    private readonly undo = inject(UndoService);

    constructor(private readonly focusInfo: () => void) {
        // A swap's Undo goes as its step ends, rather than sitting over Pause all workout
        effect(() => {
            const step = this.view.stepKey();
            const offer = untracked(this.undo.offer);
            if (this.swapOffer && !this.swapOffer.steps.includes(step)) {
                if (offer?.id === this.swapOffer.id) {
                    untracked(() => this.undo.dismiss());
                }
                this.swapOffer = null;
            }
        });
    }

    /** The exercise whose details are open over the workout, which carries on underneath. */
    readonly exerciseInDetails = signal<Exercise | null>(null);
    /** Whether those details are of the next step's exercise, opened during the rest before it. */
    private detailsOfNext = false;
    /**
     * The step's exercise being swapped for another (RUN-11), while its dialog is open; `next`
     * for the step after the rest it was opened in.
     */
    readonly swapping = signal<{
        exercise: Exercise;
        measuredBy: MeasuredBy;
        next: boolean;
    } | null>(null);

    /**
     * The Undo bar's offer to take a swap back, and the steps it stays for: the one swapped,
     * and the rest before it where it was swapped then.
     */
    private swapOffer: { id: number | undefined; steps: string[] } | null = null;

    /** `next` for the exercise after a rest, from the (i) beside "then …" on its face. */
    showExercise(exercise: Exercise, next = false) {
        this.detailsOfNext = next;
        this.exerciseInDetails.set(exercise);
    }

    /** Back to the (i) that opened the details. */
    closeExercise() {
        this.exerciseInDetails.set(null);
        this.focusInfo();
    }

    /**
     * Swap exercise, from the details: what to do instead (RUN-11), for a step measured as
     * the one being swapped is.
     */
    startSwap() {
        const exercise = this.exerciseInDetails();
        const target = exercise && this.swapTarget(exercise, this.detailsOfNext);
        this.exerciseInDetails.set(null);
        if (exercise && target) {
            this.swapping.set({
                exercise,
                measuredBy: target.step.kind === 'reps' ? 'reps' : 'timed',
                next: target.next,
            });
        } else {
            this.focusInfo();
        }
    }

    /**
     * The step to swap `exercise` on, if it's still to be done: with `next`, the one after
     * the rest, or this one if the rest has ended meanwhile; otherwise this one.
     */
    private swapTarget(exercise: Exercise, next: boolean) {
        const nextStep = this.view.nextState()?.step;
        if (next && nextStep && this.view.nextExercise()?.id === exercise.id) {
            return { step: nextStep, next: true };
        }
        const step = this.view.state()?.step;
        return step && this.view.stepExercise()?.id === exercise.id ? { step, next: false } : null;
    }

    /**
     * Swaps the step (or, from a rest, the next one) for `replacement`, for the rest of the
     * run, with Undo to take it back until the step ends. If the step has finished meanwhile,
     * nothing is swapped, and the Undo bar says so.
     */
    swapFor(replacement: Exercise) {
        const swapping = this.swapping();
        const was = swapping?.exercise;
        this.swapping.set(null);
        const target = was && this.swapTarget(was, swapping.next);
        const next = target?.next && this.view.nextState();
        // Undo stays through the rest, then for the step swapped
        const steps = next ? [this.view.stepKey(), this.view.keyOf(next)] : [this.view.stepKey()];
        const swap = target
            ? this.run.swapExercise(
                  replacement,
                  lastRepSets(this.history.entries(), replacement.id, this.run.runId()),
                  target.next
              )
            : null;
        if (swap && was) {
            this.undo.offerUndo({
                message: `Swapped to ${replacement.name}`,
                undo: () => {
                    this.run.undoSwap();
                    this.focusInfo();
                },
            });
            this.swapOffer = { id: this.undo.offer()?.id, steps };
        } else if (was) {
            this.undo.notify(`${was.name} has finished, so it wasn't swapped`);
        }
        this.focusInfo();
    }

    closeSwap() {
        this.swapping.set(null);
        this.focusInfo();
    }
}
