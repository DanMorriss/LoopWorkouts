import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { weightIn, weightOptions, weightToKg } from '../../../models/weight';
import { MAX_REPS, RepSetAmount, TimedSetAmount } from '../../../models/workout';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { WheelPickerComponent } from '../../../shared/components/wheel-picker/wheel-picker.component';
import { SettingsStore } from '../../../shared/state/settings-store.service';

/** `from` to `to` as wheel options, each labelled by `label`. */
const options = (from: number, to: number, label: (n: number) => string = String) =>
    Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: label(from + i) }));
const twoDigits = (n: number) => String(n).padStart(2, '0');

const REP_OPTIONS = options(1, MAX_REPS);
const MINUTE_OPTIONS = options(0, 99, twoDigits);
const SECOND_OPTIONS = options(0, 59, twoDigits);

/** A set's two wheels, as they show: reps and weight (in your unit, 0 for none), or a time. */
interface Row {
    first: number;
    second: number;
}

let nextId = 0;

/**
 * A ready-made workout's exercise's sets, set before running it: for each set (or round, in
 * a superset), a Reps and a Weight wheel for a rep exercise, or Minutes and Seconds for a
 * timed one, and Save. Weights show in your unit and are kept in kg; one left as it was keeps
 * its kg exactly. A time of 0:00 can't be saved. ‹ Back, Escape or a click outside change
 * nothing. Where it's used, it has animate.leave="dialog-leave".
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
            <p class="amounts__hint" [id]="id + '-hint'">{{ hint() }}</p>
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
                                <span class="picker-field__label" [id]="rowId + '-first'">{{
                                    labels()[0]
                                }}</span>
                                <app-wheel-picker
                                    [value]="row.first"
                                    (valueChange)="setRow(i, { first: $event })"
                                    [options]="firstOptions()"
                                    [labelledBy]="labelled(i, 'first')"
                                />
                            </div>
                            <div class="picker-field">
                                <span class="picker-field__label" [id]="rowId + '-second'">{{
                                    labels()[1]
                                }}</span>
                                <app-wheel-picker
                                    [value]="row.second"
                                    (valueChange)="setRow(i, { second: $event })"
                                    [options]="secondOptions()"
                                    [labelledBy]="labelled(i, 'second')"
                                />
                            </div>
                        </div>
                    </li>
                }
            </ol>
            @if (noTime()) {
                <p class="amounts__error" role="alert">Each set needs some time.</p>
            }
            <button
                type="button"
                class="btn-main amounts__save"
                [disabled]="noTime()"
                (click)="save()"
            >
                Save
            </button>
        </app-dialog>
    `,
    styleUrl: './step-amounts-dialog.component.scss',
})
export class StepAmountsDialogComponent {
    /** The exercise, e.g. "Back squat". */
    readonly name = input.required<string>();
    /** Each set's amount as it is now: reps and weight (in kg), or a time. */
    readonly amounts = input.required<readonly RepSetAmount[] | readonly TimedSetAmount[]>();
    /** What a set is called: "Set", or "Round" in a superset. */
    readonly setName = input('Set');
    readonly eachSide = input(false);
    readonly closed = output<void>();
    /** Each set's amount, as saved: reps and weight (in kg, missing for none), or a time. */
    readonly saved = output<RepSetAmount[] | TimedSetAmount[]>();

    protected readonly id = `step-amounts-${nextId++}`;
    protected readonly unit = inject(SettingsStore).weightUnit;
    /** A timed exercise's, with Minutes and Seconds, rather than Reps and Weight. */
    protected readonly timed = computed(() => {
        const [first] = this.amounts();
        return first !== undefined && 'seconds' in first;
    });
    protected readonly labels = computed(() =>
        this.timed() ? ['Minutes', 'Seconds'] : ['Reps', `Weight (${this.unit()})`]
    );
    protected readonly firstOptions = computed(() => (this.timed() ? MINUTE_OPTIONS : REP_OPTIONS));
    protected readonly secondOptions = computed(() =>
        this.timed() ? SECOND_OPTIONS : weightOptions(this.unit())
    );
    protected readonly hint = computed(() => {
        const what = this.timed() ? 'Your time' : 'Your reps and weight';
        const each = this.rows().length > 1 ? ` for each ${this.setName().toLowerCase()}` : '';
        const side = this.eachSide() ? ', each side' : '';
        // Reps and weight change mid-workout too; a time doesn't
        const kept = this.timed()
            ? "It's kept for next time."
            : "They're kept for next time, and change as you go too.";
        return `${what}${each}${side}. ${kept}`;
    });

    protected readonly rows = linkedSignal((): Row[] =>
        this.amounts().map((amount) =>
            'seconds' in amount
                ? { first: Math.floor(amount.seconds / 60), second: amount.seconds % 60 }
                : {
                      first: amount.reps,
                      second: amount.weight ? weightIn(amount.weight, this.unit()) : 0,
                  }
        )
    );
    /** A timed set set to 0:00, which can't be run. */
    protected readonly noTime = computed(
        () => this.timed() && this.rows().some((row) => row.first === 0 && row.second === 0)
    );

    protected labelled(set: number, wheel: 'first' | 'second'): string {
        const row = this.rows().length > 1 ? `${this.id}-set-${set} ` : '';
        return `${this.id}-title ${row}${this.id}-set-${set}-${wheel}`;
    }

    protected setRow(set: number, change: Partial<Row>) {
        this.rows.update((rows) => rows.map((row, i) => (i === set ? { ...row, ...change } : row)));
    }

    protected save() {
        if (this.timed()) {
            this.saved.emit(this.rows().map((row) => ({ seconds: row.first * 60 + row.second })));
            return;
        }
        const unit = this.unit();
        const before = this.amounts() as readonly RepSetAmount[];
        this.saved.emit(
            this.rows().map(({ first: reps, second: weight }, i) => {
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
