import { Component, input } from '@angular/core';

/** The big number by a card's title, over what it counts: "3 days a week", "5 exercises". */
@Component({
    selector: 'app-showcase-count',
    template: `
        <span class="number">{{ number() }}</span>
        {{ ' ' }}
        <span class="label">{{ label() }}</span>
    `,
    styles: `
        @use 'type' as *;

        :host {
            display: grid;
            justify-items: center;
            align-content: start;
            min-width: 3.5rem;
            margin: 0;
            padding: 0.45rem 0.5rem 0.4rem;
            border: 1px solid var(--accent-line);
            border-radius: 0.7rem;
            background: var(--accent-soft);
            text-align: center;
        }

        .number {
            @include display;
            color: var(--glow-text);
            font-size: 1.6rem;
            line-height: 1;
        }

        .label {
            margin-top: 0.2rem;
            max-width: 3.6rem;
            color: var(--text-muted);
            @include small-type(0.65rem);
            line-height: 1.15;
        }
    `,
})
export class ShowcaseCountComponent {
    readonly number = input.required<number>();
    readonly label = input.required<string>();
}
