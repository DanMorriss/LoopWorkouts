import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { allTopics } from '../../../help/help-topics';

/**
 * A small ? beside a harder part of the app (NAV-7), opening Help on the question about it,
 * e.g. `<app-help-link topic="no-sound" />`. Screen readers hear "Help: Why is there no sound?".
 */
@Component({
    selector: 'app-help-link',
    imports: [RouterLink],
    template: `
        <a
            class="help-link"
            routerLink="/help"
            [queryParams]="{ q: topic() }"
            [attr.aria-label]="'Help: ' + question()"
            [title]="question()"
        >
            <!-- Drawn, not a font's ligature, so no word joins the text around it -->
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="9" />
                <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7" />
                <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
            </svg>
        </a>
    `,
    styles: `
        :host {
            display: inline-flex;
            vertical-align: middle;
        }

        // 44px to tap, though the icon is small
        .help-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            margin: -10px 0;
            border-radius: 50%;
            color: var(--text-muted);

            &:hover {
                color: var(--accent);
            }

            &:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: -4px;
            }
        }
    `,
})
export class HelpLinkComponent {
    /** The Help topic's id. */
    readonly topic = input.required<string>();

    protected readonly question = computed(() => {
        const found = allTopics().find(({ topic }) => topic.id === this.topic());
        if (!found) {
            throw new Error(`No help topic ${this.topic()}`);
        }
        return found.topic.question;
    });
}
