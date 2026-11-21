import { DatePipe } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch/toggle-switch.component';
import { AccountService } from '../account.service';
import { ConsentService } from '../consent.service';

/**
 * On the You tab, signed in: the switch that keeps your notes, which may mention your health,
 * with your account (SYN-10), so your other devices have them. Turning it on is explicit
 * consent, saved with the account and dated by the server; turning it off withdraws it, and
 * the server deletes the notes it kept. Nothing while the account's answer isn't known, e.g.
 * offline.
 */
@Component({
    selector: 'app-notes-consent',
    imports: [DatePipe, ToggleSwitchComponent],
    template: `
        @let given = consent.given();
        @if (given !== undefined) {
            <div class="notes-consent">
                <div class="notes-consent__text">
                    <span class="notes-consent__name" id="keep-notes-label">
                        Keep notes with my account
                    </span>
                    <span class="notes-consent__hint" id="keep-notes-hint">
                        @if (given) {
                            Agreed on {{ given.at | date: 'd MMMM y' }}. Notes may mention your
                            health. Turn off to delete them from your account; they stay on this
                            device.
                        } @else {
                            Notes may mention your health, so they stay on this device. Turn on to
                            agree to keeping them with your account, so your other devices have
                            them.
                        }
                    </span>
                </div>
                <app-toggle-switch
                    [checked]="!!given"
                    (checkedChange)="keep($event)"
                    [disabled]="busy()"
                    labelledBy="keep-notes-label"
                    describedBy="keep-notes-hint"
                />
            </div>
        }
        <p class="notes-consent__status" role="status">{{ message() }}</p>
    `,
    styles: `
        @use 'switch-row' as *;

        :host {
            display: block;
        }

        .notes-consent {
            @include switch-row;
            margin-block: 0.75rem;
        }

        .notes-consent__text {
            @include switch-row-text;
        }

        .notes-consent__name {
            @include switch-row-name;
        }

        .notes-consent__hint,
        .notes-consent__status {
            @include switch-row-hint;
        }

        .notes-consent__status {
            margin: 0;

            &:not(:empty) {
                margin-top: 0.5rem;
            }
        }
    `,
})
export class NotesConsentComponent {
    protected readonly consent = inject(ConsentService);
    private readonly account = inject(AccountService);

    /** The switch, put back by hand if a change can't be saved, as its binding hasn't changed. */
    private readonly switch = viewChild(ToggleSwitchComponent);
    /** Waiting on the server, so it can't be switched twice. */
    protected readonly busy = signal(false);
    /** What went wrong, read out; empty when nothing has. */
    protected readonly message = signal('');

    protected async keep(keep: boolean) {
        const state = this.account.state();
        if (state.status === 'signed-in') {
            // An answer, so it isn't asked just after signing in as well
            this.consent.notesAnswered(state.email);
        }
        this.busy.set(true);
        this.message.set('');
        const saved = await this.account.keepNotes(keep);
        this.busy.set(false);
        if (!saved) {
            this.switch()?.checked.set(!!this.consent.given());
            this.message.set("That couldn't be saved. Check your connection and try again.");
        }
    }
}
