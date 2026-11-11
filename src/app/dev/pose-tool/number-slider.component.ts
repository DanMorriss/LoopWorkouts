import { Component, computed, input, model } from '@angular/core';

/**
 * One number of a pose, set by dragging or typing: a range and a number box side by side.
 * An `optional` number can be left out (unticked), when the pose uses `fallback` instead.
 */
@Component({
    selector: 'app-number-slider',
    template: `
        <label class="slider__name" [for]="id + '-range'">{{ label() }}</label>
        @if (optional()) {
            <input
                #set
                class="slider__set"
                type="checkbox"
                [checked]="value() !== undefined"
                [attr.aria-label]="'Set ' + label()"
                (change)="toggle(set.checked)"
            />
        }
        <input
            #range
            class="slider__range"
            type="range"
            [id]="id + '-range'"
            [min]="min()"
            [max]="max()"
            [step]="step()"
            [value]="shown()"
            (input)="setTo(range.valueAsNumber)"
        />
        <input
            #typed
            class="slider__number"
            type="number"
            [attr.aria-label]="label()"
            [step]="step()"
            [value]="shown()"
            (change)="setTo(typed.valueAsNumber)"
        />
    `,
    styles: `
        :host {
            display: grid;
            grid-template-columns: 6.5rem 1.5rem minmax(0, 1fr) 5.25rem;
            align-items: center;
            gap: 0.5rem;
            min-height: 44px;
        }

        .slider__name {
            grid-column: 1;
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        .slider__set {
            grid-column: 2;
            width: 1.1rem;
            height: 1.1rem;
            accent-color: var(--accent);
        }

        .slider__range {
            grid-column: 3;
            width: 100%;
            accent-color: var(--accent);
        }

        .slider__number {
            grid-column: 4;
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            background: var(--control);
            color: var(--text);
            padding: 0.3rem 0.4rem;
            font: inherit;
            font-size: 0.85rem;
            font-variant-numeric: tabular-nums;
        }
    `,
})
export class NumberSliderComponent {
    private static count = 0;
    protected readonly id = `slider-${NumberSliderComponent.count++}`;

    readonly label = input.required<string>();
    readonly min = input.required<number>();
    readonly max = input.required<number>();
    readonly step = input(0.5);
    /** Whether it can be left out of the pose. */
    readonly optional = input(false);
    /** What the pose uses when it's left out. */
    readonly fallback = input(0);
    readonly value = model<number | undefined>();

    protected readonly shown = computed(() => this.value() ?? this.fallback());

    protected setTo(value: number) {
        if (Number.isFinite(value)) {
            this.value.set(value);
        }
    }

    protected toggle(on: boolean) {
        this.value.set(on ? this.fallback() : undefined);
    }
}
