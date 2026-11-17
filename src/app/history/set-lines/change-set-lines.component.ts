import { Component, computed, input, output, signal } from '@angular/core';
import { LoggedSet, repSetsOfStep, SetChange, setChanges } from '../../models/history';
import { RepSetAmount, TimedSetAmount } from '../../models/workout';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StepAmountsDialogComponent } from '../../shared/components/step-amounts-dialog/step-amounts-dialog.component';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { SetsSection, SetsSummary } from '../history-format';
import { SetLinesComponent } from './set-lines.component';

/** One exercise's sets corrected: its line, and the sets that changed. */
export interface SetsChanged {
    line: SetsSummary;
    changes: SetChange[];
}

let nextId = 0;

/**
 * A workout's lines of sets, as `app-set-lines` shows them, with each rep exercise's line a
 * button (✎) opening its sets in a dialog of Reps and Weight wheels, one exercise at a time:
 * every set's wheels at once was too much for a phone, whose page went white. Timed lines
 * ran as set, so they stay as text. Save tells `changed` which sets changed, if any; ‹ Back,
 * Escape or a click outside change nothing. Either way focus goes back to the line.
 *
 * Used for correcting sets on the workout summary and on a workout on Progress. `sets` are
 * those the lines' steps are found in, and a change's `index` is a place in them.
 */
@Component({
    selector: 'app-change-set-lines',
    imports: [IconComponent, SetLinesComponent, StepAmountsDialogComponent],
    host: { class: 'block' },
    template: `
        <app-set-lines [sections]="sections()">
            <ng-template let-line>
                @if (changeable(line.step)) {
                    <button
                        type="button"
                        class="btn-pill change-line"
                        [id]="buttonId(line.step)"
                        aria-haspopup="dialog"
                        [attr.aria-label]="'Change ' + line.name + ', ' + line.spoken"
                        (click)="editing.set(line)"
                    >
                        <span
                            ><strong>{{ line.name }}</strong
                            >: {{ line.text }}</span
                        >
                        <app-icon class="change-line__pencil">edit</app-icon>
                    </button>
                } @else {
                    <span aria-hidden="true"
                        ><strong>{{ line.name }}</strong
                        >: {{ line.text }}</span
                    >
                    <span class="sr-only">{{ line.name }}, {{ line.spoken }}</span>
                }
            </ng-template>
        </app-set-lines>

        @if (editing(); as line) {
            <app-step-amounts-dialog
                animate.leave="dialog-leave"
                [name]="line.name"
                [amounts]="open().amounts"
                [rowNames]="open().names"
                [hintText]="hint()"
                (closed)="close(line)"
                (saved)="save(line, $event)"
            />
        }
    `,
    styles: `
        strong {
            color: var(--text-strong);
            font-weight: 500;
        }

        // A rep exercise's line, as a pill opening its sets; a long one wraps
        .change-line {
            position: relative;
            justify-content: space-between;
            max-width: 100%;
            margin-block: 0.2rem;
            padding: 0.3rem 0.6rem 0.3rem 0.9rem;
            border-radius: 1.4rem;
            color: var(--text);
            font-size: inherit;
            text-align: left;
            line-height: 1.4;
        }

        .change-line__pencil {
            color: var(--text-muted);
            font-size: 1.1rem;
        }
    `,
})
export class ChangeSetLinesComponent {
    /** The lines, as `sectionsOf()` groups them. */
    readonly sections = input.required<SetsSection[]>();
    /** The sets the lines' steps are found in. */
    readonly sets = input.required<readonly LoggedSet[]>();
    /** What the dialog says under the exercise's name. */
    readonly hint = input('The reps and weight you did in each set.');
    /** Some sets of a line changed. */
    readonly changed = output<SetsChanged>();

    private readonly id = `change-set-lines-${nextId++}`;
    private readonly focusAfterRender = injectFocusAfterRender();

    /** The line whose sets are open in the dialog. */
    protected readonly editing = signal<SetsSummary | null>(null);
    /** Its rep sets: where they are, their reps and weights, and their names. */
    protected readonly open = computed(() => {
        const line = this.editing();
        return repSetsOfStep(this.sets(), line ? line.step : -1);
    });

    protected changeable(step: number): boolean {
        return repSetsOfStep(this.sets(), step).indexes.length > 0;
    }

    protected buttonId(step: number): string {
        return `${this.id}-${step}`;
    }

    protected save(line: SetsSummary, amounts: RepSetAmount[] | TimedSetAmount[]) {
        // Only rep sets open here, so it's always reps and weights
        const changes = setChanges(this.sets(), this.open().indexes, amounts as RepSetAmount[]);
        this.close(line);
        if (changes.length) {
            this.changed.emit({ line, changes });
        }
    }

    protected close(line: SetsSummary) {
        this.editing.set(null);
        this.focusAfterRender(this.buttonId(line.step));
    }
}
