import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { AccountService } from '../account.service';
import { ConsentService } from '../consent.service';
import { HealthConsentComponent } from '../health-consent/health-consent.component';
import { injectFocusAfterRender } from '../../shared/focus-after-render';

/**
 * On the You tab, signed in: when the account agreed to keeping notes that may mention
 * health (SYN-10), and how to withdraw; or, with none on record (an account made before the
 * tick, or an email link opened on another device), the tick to agree now. Nothing while
 * it's not known, e.g. offline.
 */
@Component({
    selector: 'app-consent-status',
    imports: [DatePipe, HealthConsentComponent],
    template: `
        @let given = consent.given();
        @if (given) {
            <p class="consent-status__text" id="consent-given" tabindex="-1">
                On {{ given.at | date: 'd MMMM y' }} you agreed that notes you write, which may
                mention your health, are kept with your account (under the privacy notice of
                {{ given.notice | date: 'd MMMM y' }}). To withdraw, delete those notes, or your
                account.
            </p>
        } @else if (given === null) {
            <form class="consent-status__ask" novalidate (submit)="agree($event)">
                <p class="consent-status__text">
                    Notes you write may mention your health, which needs your consent to keep them
                    with your account.
                </p>
                <app-health-consent [field]="consentForm.agreed" />
                <button type="submit" class="btn-pill consent-status__agree" [disabled]="busy()">
                    Agree
                </button>
            </form>
        }
        <p class="consent-status__text" role="status">{{ message() }}</p>
    `,
    styles: `
        :host {
            display: block;
        }

        .consent-status__text {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-muted);

            &:focus {
                outline: none;
            }

            &:not(:empty) {
                margin-top: 0.75rem;
            }
        }

        .consent-status__agree {
            margin-top: 0.25rem;
        }
    `,
})
export class ConsentStatusComponent {
    protected readonly consent = inject(ConsentService);
    private readonly account = inject(AccountService);
    private readonly focus = injectFocusAfterRender();

    protected readonly consentForm = form(signal({ agreed: false }), (fields) => {
        required(fields.agreed, { message: 'Tick the box to agree.' });
    });
    /** Waiting on the server, so Agree can't be pressed twice. */
    protected readonly busy = signal(false);
    /** What pressing Agree did, read out as it changes. */
    protected readonly message = signal('');

    /** Handled here rather than as a form submission, as the form goes once it's agreed. */
    protected async agree(event: Event) {
        event.preventDefault();
        this.consentForm.agreed().markAsTouched();
        if (this.consentForm().invalid()) {
            this.focus('health-consent');
            return;
        }
        this.busy.set(true);
        const saved = await this.account.agreeToConsent();
        this.busy.set(false);
        if (saved) {
            this.message.set('');
            this.focus('consent-given');
        } else {
            this.message.set("That couldn't be saved. Check your connection and try again.");
        }
    }
}
