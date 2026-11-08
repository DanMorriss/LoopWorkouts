import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

/**
 * The tick giving consent to keeping notes that may mention health with the account
 * (SYN-10), and why it's needed once it's been missed. Its `field` is required to be ticked;
 * the form it's in says when it's been tried. Focus it by its id, `health-consent`.
 */
@Component({
    selector: 'app-health-consent',
    imports: [FormField],
    template: `
        <label class="consent" for="health-consent">
            <input
                class="consent__box"
                id="health-consent"
                type="checkbox"
                [formField]="field()"
                [attr.aria-invalid]="!!error()"
                [attr.aria-describedby]="error() ? 'health-consent-error' : null"
            />
            <span class="consent__text">
                I agree that notes I write, which may mention my health, are kept with my account.
            </span>
        </label>
        @if (error(); as message) {
            <p class="consent__error" id="health-consent-error">{{ message }}</p>
        }
    `,
    styles: `
        :host {
            display: block;
        }

        // The whole line is the tick's label, so it's at least 44px to press
        .consent {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            min-height: 44px;
            padding: 0.6rem 0;
            color: var(--text);
            font-size: 0.9rem;
            cursor: pointer;
        }

        .consent__box {
            flex-shrink: 0;
            width: 1.25rem;
            height: 1.25rem;
            margin: 0;
            accent-color: var(--accent);
            cursor: pointer;

            &:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }
        }

        .consent__error {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-danger);
        }
    `,
})
export class HealthConsentComponent {
    /** Whether it's ticked, required to be. */
    readonly field = input.required<FieldTree<boolean>>();

    /** Why it's needed, once something's been tried without it. */
    protected readonly error = computed(() =>
        this.field()().touched() ? this.field()().errors().at(0)?.message : undefined
    );
}
