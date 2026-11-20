import { Component, input } from '@angular/core';

/**
 * An exercise skipped to do later (RUN-16), as a menu row to pick it by: its name, and under
 * it which round, set and side, and its amount. On a button, which says what pressing it does:
 *
 *     <button type="button" appLaterOption [name]="item.name" [detail]="item.detail"></button>
 */
@Component({
    selector: 'button[appLaterOption]',
    template: `
        <span class="later-option__name">{{ name() }}</span>
        <span class="later-option__detail">{{ detail() }}</span>
    `,
    styles: `
        :host {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.1rem;
        }

        .later-option__name {
            color: var(--text-strong);
            font-weight: 600;
        }

        .later-option__detail {
            color: var(--text-muted);
            font-size: 0.85rem;
        }
    `,
    host: { class: 'menu__item' },
})
export class LaterOptionComponent {
    readonly name = input.required<string>();
    readonly detail = input.required<string>();
}
