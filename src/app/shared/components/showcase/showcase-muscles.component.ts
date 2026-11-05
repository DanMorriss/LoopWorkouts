import { Component, input } from '@angular/core';

/** The main muscles a card's workout works, each with a dot, then how many more. */
@Component({
    selector: 'app-showcase-muscles',
    template: `
        <span class="label">Works</span>
        {{ ' ' }}
        @for (muscle of muscles(); track muscle) {
            <span class="showcase-muscle">{{ muscle }}</span>
            {{ ' ' }}
        }
        @if (more()) {
            <span class="showcase-more">+{{ more() }} more</span>
        }
    `,
    styles: `
        @use 'type' as *;

        :host {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.3rem 0.45rem;
        }

        .label {
            margin-right: 0.1rem;
            color: var(--text-muted);
            @include small-type(0.75rem);
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        // The dot is in the body map's main-muscle colour
        .showcase-muscle {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            color: var(--text-strong);
            font-size: 0.85rem;

            &::before {
                content: '';
                width: 0.45rem;
                height: 0.45rem;
                border-radius: 50%;
                background: var(--muscle-main);
                box-shadow: 0 0 0.4rem var(--glow-soft);
            }
        }

        .showcase-more {
            color: var(--text-muted);
            font-size: 0.8rem;
        }
    `,
})
export class ShowcaseMusclesComponent {
    /** Their names, already cut down to what fits. */
    readonly muscles = input.required<readonly string[]>();
    /** How many more it works than are named. */
    readonly more = input(0);
}
