import { Component, computed, inject, input, signal } from '@angular/core';
import { describeSets } from '../../../history/history-format';
import { LoggedSet } from '../../../models/history';
import {
    groupKind,
    RepSetAmount,
    RepStep,
    setAmountsOf,
    TimedSetAmount,
    TimedStep,
    timedSetAmountsOf,
    withSetAmounts,
    withTimedSetAmounts,
    Workout,
} from '../../../models/workout';
import {
    OutlineAmount,
    WorkoutOutlineComponent,
} from '../../../shared/components/workout-outline/workout-outline.component';
import { injectFocusAfterRender } from '../../../shared/focus-after-render';
import { ReadyMadeChanges } from '../../../shared/state/ready-made-changes.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { UndoService } from '../../../shared/undo/undo.service';
import { StepAmountsDialogComponent } from './step-amounts-dialog.component';

/** A rep step or timed exercise of the workout, as this lists it. */
type AmountsLine = {
    /** Its place in `allSteps()`. */
    index: number;
    name: string;
    /** e.g. "3 × 10 @ 60 kg" or "3 × 0:45", as the history writes sets. */
    text: string;
    /** "Set", or "Round" in a superset. */
    setName: string;
} & ({ step: RepStep; amounts: RepSetAmount[] } | { step: TimedStep; amounts: TimedSetAmount[] });

/**
 * A ready-made workout's What's in it, on its Details (LIB-6): its outline, with each rep
 * exercise's reps and weights and each timed exercise's times (since data version 16) as
 * buttons, pressed to set them before running it, in a dialog of wheels. Kept as the
 * summary's Apply keeps them (ReadyMadeChanges), with Undo; Reset reps and weights puts them
 * all back.
 */
@Component({
    selector: 'app-ready-made-amounts',
    imports: [StepAmountsDialogComponent, WorkoutOutlineComponent],
    template: `
        @if (lines().length) {
            <p class="amounts__text">{{ hint() }}</p>
        }
        <app-workout-outline
            [workout]="workout()"
            [exerciseUrl]="exerciseUrl()"
            [amounts]="amounts()"
            (changeAmount)="open($event)"
        />
        @if (editing(); as line) {
            <app-step-amounts-dialog
                animate.leave="dialog-leave"
                [name]="line.name"
                [amounts]="line.amounts"
                [setName]="line.setName"
                [eachSide]="line.step.eachSide === true"
                (closed)="close(line)"
                (saved)="save(line, $event)"
            />
        }
    `,
    styleUrl: './ready-made-amounts.component.scss',
})
export class ReadyMadeAmountsComponent {
    /** The ready-made workout, with your reps and weights on it. */
    readonly workout = input.required<Workout>();
    /** Where an exercise's link goes, as the outline's. */
    readonly exerciseUrl = input<(exerciseId: string) => string | null>();

    private readonly workouts = inject(WorkoutStore);
    private readonly changes = inject(ReadyMadeChanges);
    private readonly undo = inject(UndoService);
    private readonly unit = inject(SettingsStore).weightUnit;
    private readonly focusAfterRender = injectFocusAfterRender();

    /** The exercise whose dialog is open. */
    protected readonly editing = signal<AmountsLine | null>(null);

    protected readonly lines = computed((): AmountsLine[] => {
        const lines: AmountsLine[] = [];
        let index = 0;
        for (const block of this.workout().blocks) {
            if (block.kind !== 'group') {
                continue;
            }
            const setName = groupKind(block.steps) === 'exercise' ? 'Set' : 'Round';
            for (const step of block.steps) {
                const name = step.name.trim() || (step.kind === 'reps' ? 'Reps' : 'Work');
                if (step.kind === 'reps' && step.exerciseId) {
                    const amounts = setAmountsOf(step, block.rounds);
                    const text = this.textOf(index, step, amounts);
                    lines.push({ index, step, name, amounts, text, setName });
                } else if (step.kind === 'work' && step.exerciseId) {
                    const amounts = timedSetAmountsOf(step, block.rounds);
                    const text = this.textOf(index, step, amounts);
                    lines.push({ index, step, name, amounts, text, setName });
                }
                index++;
            }
        }
        return lines;
    });

    /** Each exercise's sets, as the outline's buttons, by its place in `allSteps()`. */
    protected readonly amounts = computed(
        (): ReadonlyMap<number, OutlineAmount> =>
            new Map(
                this.lines().map((line) => [
                    line.index,
                    { id: this.buttonId(line.index), text: line.text },
                ])
            )
    );

    /** What can be set: reps and weights, times, or both. */
    protected readonly hint = computed(() => {
        const timed = this.lines().filter((line) => line.step.kind === 'work').length;
        const what =
            timed === 0
                ? 'your reps and weights'
                : timed === this.lines().length
                  ? 'your times'
                  : 'your reps, weights and times';
        return `Press an exercise's sets to set ${what} before you start.`;
    });

    protected open(index: number) {
        this.editing.set(this.lines().find((line) => line.index === index) ?? null);
    }

    protected buttonId(index: number): string {
        return `ready-made-amounts-${index}`;
    }

    /** Keeps them, saying so with Undo, which puts back what there was. */
    protected save(line: AmountsLine, amounts: RepSetAmount[] | TimedSetAmount[]) {
        this.editing.set(null);
        const workoutId = this.workout().id;
        const was = this.changes.byId().get(workoutId) ?? null;
        const step =
            line.step.kind === 'reps'
                ? withSetAmounts(line.step, amounts as RepSetAmount[])
                : withTimedSetAmounts(line.step, amounts as TimedSetAmount[]);
        this.workouts.setReadyMadeStep(workoutId, line.index, step);
        const focus = () => this.focusAfterRender(this.buttonId(line.index));
        if (JSON.stringify(this.changes.byId().get(workoutId) ?? null) === JSON.stringify(was)) {
            focus();
            return;
        }
        this.undo.offerUndo({
            message: `${line.name}: ${this.textOf(line.index, line.step, amounts)}`,
            undo: () => {
                if (was) {
                    this.changes.restore(was);
                } else {
                    this.changes.reset(workoutId);
                }
                focus();
            },
            dismissed: focus,
        });
    }

    protected close(line: AmountsLine) {
        this.editing.set(null);
        this.focusAfterRender(this.buttonId(line.index));
    }

    /**
     * "3 × 10 @ 60 kg", "12, 10, 8 @ 60 kg", "10 @ 60, 8 @ 62.5 kg", "15 reps" for one, or a
     * time: "3 × 0:45", "0:45, 0:30", or "1:00" for one.
     */
    private textOf(
        index: number,
        step: RepStep | TimedStep,
        amounts: readonly (RepSetAmount | TimedSetAmount)[]
    ): string {
        const sets = amounts.map(
            (amount, set): LoggedSet => ({ round: 0, step: index, set, name: step.name, ...amount })
        );
        const [line] = describeSets(sets, this.unit());
        return step.eachSide ? `${line.text} each side` : line.text;
    }
}
