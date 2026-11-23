import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../account/account.service';
import { SignInComponent } from '../account/sign-in/sign-in.component';
import { LoopLogoComponent } from '../shared/components/loop-logo/loop-logo.component';
import { WELCOMED_KEY } from './welcome-first';

/**
 * The welcome screen (NAV-3), where a device new to the app starts: the name and what it is
 * in a line, then signing in (as on the You tab) in a card, or going on without an account,
 * with everything kept on this device, as a quieter link under it. Either way it's not asked
 * again here, and Home opens. No tab bar, so it's one choice.
 */
@Component({
    selector: 'app-welcome',
    imports: [LoopLogoComponent, SignInComponent],
    template: `
        <div class="flex justify-center">
            <div class="welcome w-full max-w-md p-4">
                <app-loop-logo class="welcome__logo" />
                <!-- The name, as the page's hidden h1 already says it to screen readers -->
                <p class="welcome__title" aria-hidden="true">Loop Workouts</p>
                <p class="welcome__pitch">The workout timer that remembers what you lifted.</p>

                <section class="welcome__card" aria-labelledby="welcome-sync-title">
                    <h2 class="welcome__card-title" id="welcome-sync-title">
                        Keep your workouts on every device
                    </h2>
                    <app-sign-in (signedIn)="goHome('signed-in')" />
                </section>

                <div class="welcome__guest">
                    <button
                        type="button"
                        class="welcome__guest-button"
                        aria-describedby="welcome-guest-hint"
                        (click)="goHome('guest')"
                    >
                        Continue without an account
                    </button>
                    <p class="welcome__hint" id="welcome-guest-hint">
                        Free while in beta. Without an account, everything stays on this device.
                    </p>
                </div>
            </div>
        </div>
    `,
    styleUrl: './welcome.component.scss',
})
export class WelcomeComponent {
    private readonly router = inject(Router);
    private readonly account = inject(AccountService);

    constructor() {
        // Signed in already (in another tab, say), or as the code's taken: nothing to ask
        effect(() => {
            if (this.account.state().status === 'signed-in') {
                this.goHome('signed-in');
            }
        });
    }

    /** Answered, so it isn't asked again on this device, and on to Home. */
    protected goHome(answer: 'guest' | 'signed-in') {
        if (localStorage.getItem(WELCOMED_KEY) === answer) {
            return;
        }
        localStorage.setItem(WELCOMED_KEY, answer);
        void (answer === 'signed-in'
            ? this.account.goHomeSignedIn(this.router)
            : this.router.navigateByUrl('/home', { replaceUrl: true }));
    }
}
