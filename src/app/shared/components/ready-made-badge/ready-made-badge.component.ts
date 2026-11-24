import { Component } from '@angular/core';

/**
 * "Ready-made", on a ready-made workout (LIB-6) wherever it's listed or shown beside yours: its
 * card on Workouts, its Details, and a day's Add list on the Plan page.
 */
@Component({
    selector: 'app-ready-made-badge',
    template: 'Ready-made',
    styles: `
        @use 'type' as *;

        :host {
            display: inline-flex;
            flex: none;
            align-items: center;
            padding: 0.1rem 0.5rem;
            // A neutral tag, not the accent's tint, which says "picked": most cards have it
            border: 1px solid var(--border);
            border-radius: 999px;
            background: var(--control);
            color: var(--text-muted);
            @include small-type(0.72rem);
            font-weight: 600;
            white-space: nowrap;
        }
    `,
})
export class ReadyMadeBadgeComponent {}
