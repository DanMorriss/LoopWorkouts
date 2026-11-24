import { Component, input } from '@angular/core';

/**
 * A ready-made plan's workout as a mark: its number in its colour (1 to 4), in a plan card's
 * week and its list alike, or, for active rest (colour 0), an empty ring, as it's optional.
 * `small` where two share a day.
 */
@Component({
    selector: 'app-plan-mark',
    template: `{{ number() }}`,
    host: {
        '[class.plan-mark--rest]': 'colour() === 0',
        '[class.plan-mark--small]': 'small()',
        '[style.--c]': "colour() ? 'var(--plan-' + colour() + ')' : null",
    },
    styles: `
        :host {
            display: inline-flex;
            flex: none;
            align-items: center;
            justify-content: center;
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 50%;
            background: var(--c);
            color: var(--plan-ink);
            font-size: 0.75rem;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            line-height: 1;
        }

        :host(.plan-mark--small) {
            width: 1.1rem;
            height: 1.1rem;
            font-size: 0.65rem;
        }

        :host(.plan-mark--rest) {
            border: 2px solid var(--text-muted);
            background: transparent;
        }
    `,
})
export class PlanMarkComponent {
    readonly number = input('');
    /** 1 to 4 for training, the plan's colours (going round again past four); 0 for active rest. */
    readonly colour = input(0);
    readonly small = input(false);
}
