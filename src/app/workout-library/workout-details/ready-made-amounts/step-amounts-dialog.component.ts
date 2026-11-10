import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { weightIn, weightOptions, weightToKg } from '../../../models/weight';
import { MAX_REPS, RepSetAmount } from '../../../models/workout';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { WheelPickerComponent } from '../../../shared/components/wheel-picker/wheel-picker.component';
import { SettingsStore } from '../../../shared/state/settings-store.service';

const REP_OPTIONS = Array.from({ length: MAX_REPS }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
}));

let nextId = 0;

/**
 * A ready-made workout's exercise's reps and weight, set before running it: a Reps and a
 * Weight wheel for each of its sets (or rounds, in a superset), and Save. Weights show in
 * your unit and are kept in kg; one left as it was keeps its kg exactly. ‹ Back, Escape or a
 * click outside change nothing. Where it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-step-amounts-dialog',
    imports: [DialogComponent, WheelPickerComponent],
    template: `
        <app-dialog
            [labelledBy]="id + '-title'"
            [describedBy]="id + '-hint'"
            [width]="420"
            (closed)="closed.emit()"
        >
            <h2 class="amounts__title" [id]="id + '-title'">{{ name() }}</h2>
            <p class="amounts__hint" [id]="id + '-hint'">
                Your reps and weight{{
                    rows().length > 1 ? ' for each ' + setName().toLowerCase() : ''
                }}{{ eachSide() ? ', each side' : '' }}. They're kept for next time, and change as
                you go too.
            </p>
            <ol class="amounts__sets">
                @for (row of rows(); track $index; let i = $index) {
                    @let rowId = id + '-set-' + i;
                    <li class="amounts__set">
                        @if (rows().length > 1) {
                            <span class="amounts__set-name" [id]="rowId"
                                >{{ setName() }} {{ i + 1 }}</span
                            >
                        }
                        <div class="picker-row">
                            <div class="picker-field">
                                <span class="picker-field__label" [id]="rowId + '-reps'">Reps</span>
                                <app-wheel-picker
                                    [value]="row.reps"
                                    (valueChange)="setRow(i, { reps: $event })"
                                    [options]="repOptions"
                                    [labelledBy]="labelled(i, 'reps')"
                                />
                            </div>
                            <div class="picker-field">
                                <span class="picker-field__label" [id]="rowId + '-weight'"
                                    >Weight ({{ unit() }})</span
                                >
                                <app-wheel-picker
                                    [value]="row.weight"
                                    (valueChange)="setRow(i, { weight: $event })"
                                    [options]="weightOptions()"
                                    [labelledBy]="labelled(i, 'weight')"
                                />
                            </div>
                        </div>
                    </li>
                }
            </ol>
            <button type="button" class="btn-main amounts__save" (click)="save()">Save</button>
        </app-dialog>
    `,
    styleUrl: './step-amounts-dialog.component.scss',
})
export class StepAmountsDialogComponent {
    /** The exercise, e.g. "Back squat". */
    readonly name = input.required<string>();
    /** Each set's reps and weight (in kg) as they are now. */
    readonly amounts = input.required<readonly RepSetAmount[]>();
    /** What a set is called: "Set", or "Round" in a superset. */
    readonly setName = input('Set');
    readonly eachSide = input(false);
    readonly closed = output<void>();
    /** Each set's reps and weight (in kg, missing for none), as saved. */
    readonly saved = output<RepSetAmount[]>();

    protected readonly id = `step-amounts-${nextId++}`;
    protected readonly unit = inject(SettingsStore).weightUnit;
    protected readonly repOptions = REP_OPTIONS;
    protected readonly weightOptions = computed(() => weightOptions(this.unit()));

    /** As the wheels show them: the weight in your unit, 0 for none. */
    protected readonly rows = linkedSignal(() =>
        this.amounts().map(({ reps, weight }) => ({
            reps,
            weight: weight ? weightIn(weight, this.unit()) : 0,
        }))
    );

    protected labelled(set: number, wheel: 'reps' | 'weight'): string {
        const row = this.rows().length > 1 ? `${this.id}-set-${set} ` : '';
        return `${this.id}-title ${row}${this.id}-set-${set}-${wheel}`;
    }

    protected setRow(set: number, change: Partial<{ reps: number; weight: number }>) {
        this.rows.update((rows) => rows.map((row, i) => (i === set ? { ...row, ...change } : row)));
    }

    protected save() {
        const unit = this.unit();
        const before = this.amounts();
        this.saved.emit(
            this.rows().map(({ reps, weight }, i) => {
                const was = before[i]?.weight;
                // Left as it showed, it keeps its kg, rather than drift by rounding
                const kg =
                    weight === 0
                        ? undefined
                        : was !== undefined && weightIn(was, unit) === weight
                          ? was
                          : weightToKg(weight, unit);
                return { reps, ...(kg === undefined ? {} : { weight: kg }) };
            })
        );
    }
}
