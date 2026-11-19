import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';

/**
 * The workout looked at on an exercise's progress chart (PRG-4), by hover or the arrow keys:
 * its figure, when and what it was, beside its dot. Seen only: the chart's readout says it
 * for screen readers.
 */
@Component({
    selector: 'app-progress-tooltip',
    imports: [DatePipe],
    template: `
        <strong>{{ text() }}</strong>
        <span>{{ at() | date: dateFormat() }}</span>
        <span>{{ title() }}</span>
    `,
    styleUrl: './progress-tooltip.component.scss',
    host: {
        'aria-hidden': 'true',
        '[class.progress-tooltip--left]': 'x() > 0.5',
        '[class.progress-tooltip--below]': 'y() < 0.5',
        '[style.left.%]': 'x() * 100',
        '[style.top.%]': 'y() * 100',
    },
})
export class ProgressTooltipComponent {
    readonly text = input.required<string>();
    /** When it was, in ms since the epoch, shown in `dateFormat` (a DatePipe format). */
    readonly at = input.required<number>();
    readonly dateFormat = input.required<string>();
    readonly title = input.required<string>();
    /** Where its dot is across the chart, from 0 at the left to 1. */
    readonly x = input.required<number>();
    /** Where its dot is down the chart, from 0 at the top to 1. */
    readonly y = input.required<number>();
}
