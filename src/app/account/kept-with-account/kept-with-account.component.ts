import { Component, computed, inject } from '@angular/core';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { AccountService } from '../account.service';
import { ConsentService } from '../consent.service';
import { ConsentSwitchComponent } from './consent-switch.component';

/**
 * On the You tab, signed in, under Sync: what's kept with the account only with its own
 * consent, as it may be health data. Notes (SYN-10), and your body weight (CAL-6) once you've
 * given one, or while it's kept. Each switch only once the account's answer is known.
 */
@Component({
    selector: 'app-kept-with-account',
    imports: [ConsentSwitchComponent],
    template: `
        @let notes = consent.given();
        @if (notes !== undefined) {
            <app-consent-switch
                class="kept__switch"
                switchId="keep-notes"
                name="Keep notes with my account"
                [given]="notes"
                [save]="saveNotes"
            >
                <ng-container given>
                    Notes may mention your health. Turn off to delete them from your account; they
                    stay on this device.
                </ng-container>
                <ng-container not-given>
                    Notes may mention your health, so they stay on this device. Turn on to agree to
                    keeping them with your account, so your other devices have them.
                </ng-container>
            </app-consent-switch>
        }
        @let weight = consent.weightGiven();
        @if (weight !== undefined && (weight || hasWeight())) {
            <app-consent-switch
                class="kept__switch"
                switchId="keep-body-weight"
                name="Keep my body weight with my account"
                [given]="weight"
                [save]="saveWeight"
            >
                <ng-container given>
                    It's health data. Turn off to delete it from your account; it stays on this
                    device.
                </ng-container>
                <ng-container not-given>
                    It's health data, so it stays on this device. Turn on to agree to keeping it
                    with your account, so your other devices have it.
                </ng-container>
            </app-consent-switch>
        }
    `,
    styles: `
        :host {
            display: block;
        }

        .kept__switch {
            margin-top: 1rem;
        }
    `,
})
export class KeptWithAccountComponent {
    protected readonly consent = inject(ConsentService);
    private readonly account = inject(AccountService);
    private readonly settings = inject(SettingsStore);

    /** A body weight is set, on Profile, so there's one to keep. */
    protected readonly hasWeight = computed(() => this.settings.bodyWeight() !== null);

    protected readonly saveNotes = (keep: boolean) => {
        const state = this.account.state();
        if (state.status === 'signed-in') {
            // An answer, so it isn't asked just after signing in as well
            this.consent.notesAnswered(state.email);
        }
        return this.account.keepNotes(keep);
    };

    protected readonly saveWeight = (keep: boolean) => this.account.keepBodyWeight(keep);
}
