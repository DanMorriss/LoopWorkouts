import { Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * What a card's workout or plan needs, as quiet tags after an icon, above a faint rule.
 * Anything given to it follows the tags on the row.
 */
@Component({
    selector: 'app-showcase-kit',
    imports: [IconComponent],
    template: `
        <app-icon class="icon-kit">{{
            needs().includes('No equipment') ? 'self_improvement' : 'fitness_center'
        }}</app-icon>
        <span class="sr-only">Needs: </span>
        <span class="tags" role="list">
            @for (need of needs(); track need) {
                <span class="showcase-tag" role="listitem">{{ need }}</span>
                {{ ' ' }}
            }
        </span>
        <ng-content />
    `,
    styles: `
        @use 'type' as *;

        :host {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border-soft);
        }

        .icon-kit {
            flex: none;
            width: 20px;
            height: 20px;
            font-size: 20px;
            color: var(--text-muted);
        }

        .tags {
            display: flex;
            flex: 1 1 auto;
            flex-wrap: wrap;
            gap: 0.3rem;
        }

        .showcase-tag {
            padding: 0.15rem 0.55rem;
            border: 1px solid var(--border-soft);
            border-radius: 999px;
            color: var(--text);
            @include small-type(0.75rem);
        }
    `,
})
export class ShowcaseKitComponent {
    /** What it needs, as they're to read: "Dumbbells", "Bench", or "No equipment". */
    readonly needs = input.required<readonly string[]>();
}
