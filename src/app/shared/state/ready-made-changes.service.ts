import { computed, inject, Service, signal } from '@angular/core';
import {
    ReadyMadeChange,
    readReadyMadeChange,
    RestAmount,
    restAmount,
    sameAmounts,
    stepAmounts,
    StepAmounts,
} from '../../models/ready-made-change';
import { Deletion } from '../../models/sync';
import { soloRest, Step, Workout } from '../../models/workout';
import { DeletionStore } from './deletion-store.service';
import { SyncClock } from './sync-clock.service';

export const READY_MADE_CHANGES_KEY = 'ready-made-changes';

/**
 * The reps, weights and rests you've set on ready-made workouts (LIB-6, PRG-15). A ready-made workout isn't
 * your data, so each one changed has a record of its own, as a favourite does: there while
 * any step is changed, and deleted, leaving a deletion, when they're all back as they came.
 */
@Service()
export class ReadyMadeChanges {
    private readonly deletions = inject(DeletionStore);
    private readonly clock = inject(SyncClock);
    private readonly _list = signal<ReadyMadeChange[]>(load());

    readonly list = this._list.asReadonly();
    readonly byId = computed(
        () => new Map(this._list().map((change) => [change.id, change] as const))
    );

    /**
     * Keeps a step's reps and weight, `original` being the step as the workout came. Nothing is
     * kept if more than those changed, e.g. a swap for another exercise.
     */
    setStep(workoutId: string, index: number, original: Step, step: Step) {
        const amounts = stepAmounts(index, original, step);
        if (!amounts) {
            return;
        }
        const was = this.byId().get(workoutId);
        const others = (was?.steps ?? []).filter((own) => own.step !== index);
        const steps = sameAmounts(original, amounts)
            ? others
            : [...others, amounts].sort((a, b) => a.step - b.step);
        this.keep(workoutId, steps, was?.rests ?? []);
    }

    /**
     * Keeps a step's rest after each set (PRG-15), e.g. the swing ladder's stepped down,
     * `original` being the workout as it came. Nothing is kept for a step with no rest of its
     * own, and a rest put back as it came is dropped.
     */
    setRest(workoutId: string, index: number, original: Pick<Workout, 'blocks'>, seconds: number) {
        const rest = restAmount(index, original, seconds);
        if (!rest) {
            return;
        }
        const was = this.byId().get(workoutId);
        const others = (was?.rests ?? []).filter((own) => own.step !== index);
        const rests =
            seconds === soloRest(original, index)
                ? others
                : [...others, rest].sort((a, b) => a.step - b.step);
        this.keep(workoutId, was?.steps ?? [], rests);
    }

    /** Keeps what's changed, or with nothing left, puts the workout back as it came. */
    private keep(workoutId: string, steps: StepAmounts[], rests: RestAmount[]) {
        if (steps.length === 0 && rests.length === 0) {
            this.reset(workoutId);
        } else {
            this.put(workoutId, steps, rests);
        }
    }

    /** Puts a ready-made workout back as it came, giving what it had, e.g. for Undo. */
    reset(workoutId: string): ReadyMadeChange | null {
        const was = this.byId().get(workoutId);
        if (!was) {
            return null;
        }
        this._list.update((list) => list.filter((own) => own.id !== workoutId));
        this.deletions.add({
            kind: 'ready-made-change',
            id: workoutId,
            deletedAt: this.clock.now(was.updatedAt),
        });
        this.save();
        return was;
    }

    /** Gives a ready-made workout back the reps and weights it had, e.g. with Undo of reset(). */
    restore(change: ReadyMadeChange) {
        this.put(change.id, change.steps, change.rests ?? []);
    }

    private put(workoutId: string, steps: StepAmounts[], rests: RestAmount[]) {
        const was = this.byId().get(workoutId);
        const updatedAt = this.clock.now(
            was?.updatedAt ?? this.deletions.deletedAt('ready-made-change', workoutId)
        );
        const change = { id: workoutId, updatedAt, steps, ...(rests.length > 0 ? { rests } : {}) };
        this._list.update((list) =>
            was ? list.map((own) => (own.id === workoutId ? change : own)) : [...list, change]
        );
        this.deletions.remove('ready-made-change', workoutId);
        this.save();
    }

    /** Merges another copy's in, the latest change to each workout winning, as favourites do. */
    merge(changes: readonly ReadyMadeChange[], deletedThere: readonly Deletion[]) {
        this.deletions.merge(
            'ready-made-change',
            this._list(),
            changes,
            deletedThere,
            (records) => {
                this._list.set(records);
                this.save();
            }
        );
    }

    private save() {
        localStorage.setItem(READY_MADE_CHANGES_KEY, JSON.stringify(this._list()));
    }
}

function load(): ReadyMadeChange[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(READY_MADE_CHANGES_KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.map(readReadyMadeChange).filter((change) => change !== null)
            : [];
    } catch {
        return [];
    }
}
