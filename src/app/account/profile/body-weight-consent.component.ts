import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AccountService } from '../account.service';
import { ConsentService } from '../consent.service';

/**
 * On Profile, signed in: the tick that keeps your body weight with your account, so your other
 * devices have it (CAL-6). It's health data, so ticking it is explicit consent, saved with
 * the account and dated by the server; unticking withdraws it, and the server deletes the
 * weight it kept. Nothing while signed out, or while the account's answer isn't known.
 */
@Component({
    selector: 'app-body-weight-consent',
    imports: [DatePipe],
    template: `
        @let given = consent.weightGiven();
        @if (given !== undefined) {
            <label class="weight-consent" for="body-weight-consent">
                <input
                    class="weight-consent__box"
                    id="body-weight-consent"
                    type="checkbox"
                    aria-describedby="body-weight-consent-status"
                    [checked]="ticked()"
                    [disabled]="busy()"
                    (change)="toggle($event)"
                />
                <span>
                    I agree that my body weight, which is health data, is kept with my account, so
                    my other devices have it.
                </span>
            </label>
            <p class="weight-consent__status" id="body-weight-consent-status" role="status">
                @if (message()) {
                    {{ message() }}
                } @else if (given) {
                    Agreed on {{ given.at | date: 'd MMMM y' }}. Untick to delete it from your
                    account; it stays on this device.
                }
            </p>
        }
    `,
    styles: `
        @use 'consent' as *;

        :host {
            display: block;
        }

        .weight-consent {
            @include consent-line;
        }

        .weight-consent__box {
            @include consent-box;
        }

        .weight-consent__status {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-muted);
        }
    `,
})
export class BodyWeightConsentComponent {
    protected readonly consent = inject(ConsentService);
    private readonly account = inject(AccountService);

    /** Waiting on the server, so it can't be pressed twice. */
    protected readonly busy = signal(false);
    /** What went wrong, read out; empty when nothing has. */
    protected readonly message = signal('');
    protected readonly ticked = computed(() => !!this.consent.weightGiven());

    protected async toggle(event: Event) {
        const box = event.target as HTMLInputElement;
        const keep = box.checked;
        this.busy.set(true);
        this.message.set('');
        const saved = await this.account.keepBodyWeight(keep);
        this.busy.set(false);
        // As it is on the account, whether that changed or not
        box.checked = this.ticked();
        if (!saved) {
            this.message.set("That couldn't be saved. Check your connection and try again.");
        }
    }
}
