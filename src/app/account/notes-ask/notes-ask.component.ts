import { Component, computed, inject, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { injectCurrentUrl, isOnPage } from '../../shared/navigation/current-url';
import { AccountService } from '../account.service';
import { ConsentService } from '../consent.service';
import { HealthConsentComponent } from '../health-consent/health-consent.component';

/**
 * Just after signing in, once, for an account that doesn't keep notes: whether to keep them,
 * as they may mention health (SYN-10). Ticked, Continue gives consent; unticked, or closed,
 * notes stay on this device, and it isn't asked again here; the You tab's switch changes it
 * later, and counts as an answer too. Not over the welcome screens or a workout. Loaded by the app once sync starts.
 */
@Component({
    selector: 'app-notes-ask',
    imports: [DialogComponent, HealthConsentComponent],
    template: `
        @if (due()) {
            <app-dialog
                animate.leave="dialog-leave"
                labelledBy="notes-ask-title"
                describedBy="notes-ask-text"
                [width]="420"
                (closed)="asked()"
            >
                <h2 class="notes-ask__title" id="notes-ask-title">Keep your notes too?</h2>
                <p class="notes-ask__text" id="notes-ask-text">
                    Your workouts and history now sync to each device you sign in on. Notes you
                    write may mention your health, so they're kept with your account only if you
                    agree.
                </p>
                <app-health-consent class="notes-ask__tick" [field]="consentForm.agreed" />
                <button
                    type="button"
                    class="btn-main notes-ask__go"
                    cdkFocusInitial
                    [disabled]="busy()"
                    (click)="answer()"
                >
                    Continue
                </button>
                <p class="notes-ask__hint" role="status">
                    {{
                        message() ||
                            'Unticked, notes stay on this device. You can change this on the You tab.'
                    }}
                </p>
            </app-dialog>
        }
    `,
    styles: `
        @use 'type' as *;

        .notes-ask__title {
            @include dialog-title;
        }

        .notes-ask__text {
            margin: 0;
            color: var(--text);
        }

        .notes-ask__tick {
            margin-top: 1rem;
        }

        .notes-ask__go {
            width: 100%;
            margin-top: 1.25rem;
        }

        .notes-ask__hint {
            margin: 0.75rem 0 0;
            font-size: 0.85rem;
            color: var(--text-muted);
            text-align: center;
        }
    `,
})
export class NotesAskComponent {
    private readonly account = inject(AccountService);
    private readonly consent = inject(ConsentService);
    private readonly url = injectCurrentUrl();

    protected readonly consentForm = form(signal({ agreed: false }));
    /** Waiting on the server, so Continue can't be pressed twice. */
    protected readonly busy = signal(false);
    /** What went wrong, read out; empty when nothing has. */
    protected readonly message = signal('');

    /** The email signed in with, or null when no one is. */
    private readonly email = computed(() => {
        const state = this.account.state();
        return state.status === 'signed-in' ? state.email : null;
    });

    protected readonly due = computed(() => {
        const email = this.email();
        const url = this.url();
        return (
            email !== null &&
            this.consent.given() === null &&
            this.consent.notesAskedFor() !== email &&
            !isOnPage(url, '/welcome') &&
            !isOnPage(url, '/workout')
        );
    });

    protected async answer() {
        if (this.consentForm.agreed().value()) {
            this.busy.set(true);
            this.message.set('');
            const saved = await this.account.keepNotes(true);
            this.busy.set(false);
            if (!saved) {
                this.message.set("That couldn't be saved. Check your connection and try again.");
                return;
            }
        }
        this.asked();
    }

    /** Answered, or closed: not asked again on this device for this account. */
    protected asked() {
        const email = this.email();
        if (email !== null) {
            this.consent.notesAnswered(email);
        }
    }
}
