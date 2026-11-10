import { Component, computed, inject, input, signal } from '@angular/core';
import { describeSets } from '../../../history/history-format';
import { RepSet } from '../../../models/history';
import {
    groupKind,
    RepSetAmount,
    RepStep,
    setAmountsOf,
    withSetAmounts,
    Workout,
} from '../../../models/workout';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { injectFocusAfterRender } from '../../../shared/focus-after-render';
import { ReadyMadeChanges } from '../../../shared/state/ready-made-changes.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { UndoService } from '../../../shared/undo/undo.service';
import { StepAmountsDialogComponent } from './step-amounts-dialog.component';

/** A rep step of the workout that's an exercise, as this lists it. */
interface AmountsLine {
    /** Its place in `allSteps()`. */
    index: number;
    step: RepStep;
    name: string;
    amounts: RepSetAmount[];
    /** e.g. "3 × 10 @ 60 kg", as the history writes sets. */
    text: string;
    /** "Set", or "Round" in a superset. */
    setName: string;
}

/**
 * On a ready-made workout's Details (LIB-6): its rep exercises with your reps and weights, each
 * pressed to set them before running it, in a dialog of wheels. Kept as the summary's Apply
 * keeps them (ReadyMadeChanges), with Undo; Reset reps and weights puts them all back.
 */
@Component({
    selector: 'app-ready-made-amounts',
    imports: [IconComponent, StepAmountsDialogComponent],
    template: `
        @if (lines().length) {
            <section class="amounts" aria-labelledby="ready-made-amounts-title">
                <h3 id="ready-made-amounts-title" class="amounts__heading">
                    Your reps and weights
                </h3>
                <p class="amounts__text">Set them before you start, for each exercise.</p>
                <ul class="amounts__lines">
                    @for (line of lines(); track line.index) {
                        <li>
                            <button
                                type="button"
                                class="amounts__line"
                                [id]="buttonId(line.index)"
                                aria-haspopup="dialog"
                                [attr.aria-label]="'Change ' + line.name + ', ' + line.text"
                                (click)="editing.set(line)"
                            >
                                <span class="amounts__name">{{ line.name }}</span>
                                <span class="amounts__amount">{{ line.text }}</span>
                                <app-icon class="amounts__edit">edit</app-icon>
                            </button>
                        </li>
                    }
                </ul>
            </section>
        }
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
                if (step.kind === 'reps' && step.exerciseId) {
                    const amounts = setAmountsOf(step, block.rounds);
                    const name = step.name.trim() || 'Reps';
                    lines.push({
                        index,
                        step,
                        name,
                        amounts,
                        text: this.textOf(index, step, amounts),
                        setName,
                    });
                }
                index++;
            }
        }
        return lines;
    });

    protected buttonId(index: number): string {
        return `ready-made-amounts-${index}`;
    }

    /** Keeps them, saying so with Undo, which puts back what there was. */
    protected save(line: AmountsLine, amounts: RepSetAmount[]) {
        this.editing.set(null);
        const workoutId = this.workout().id;
        const was = this.changes.byId().get(workoutId) ?? null;
        this.workouts.setReadyMadeStep(workoutId, line.index, withSetAmounts(line.step, amounts));
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

    /** "3 × 10 @ 60 kg", "12, 10, 8 @ 60 kg", "10 @ 60, 8 @ 62.5 kg", or "15 reps" for one. */
    private textOf(index: number, step: RepStep, amounts: RepSetAmount[]): string {
        const sets = amounts.map(
            (amount, set): RepSet => ({ round: 0, step: index, set, name: step.name, ...amount })
        );
        const [line] = describeSets(sets, this.unit());
        return step.eachSide ? `${line.text} each side` : line.text;
    }
}
