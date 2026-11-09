import { HelpLinkComponent } from '../shared/components/help-link/help-link.component';
import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../account/account.service';
import { SignInComponent } from '../account/sign-in/sign-in.component';
import { LoopLogoComponent } from '../shared/components/loop-logo/loop-logo.component';
import { WELCOMED_KEY } from './welcome-first';

/**
 * The welcome screen (NAV-3), where a device new to the app starts: what the app is, then
 * signing in (as on the You tab), or going on as a guest, with everything kept on this
 * device. Either way it's not asked again here, and Home opens. No tab bar, so it's one
 * choice.
 */
@Component({
    selector: 'app-welcome',
    imports: [HelpLinkComponent, LoopLogoComponent, SignInComponent],
    template: `
        <div class="flex justify-center">
            <div class="welcome w-full max-w-md p-4">
                <app-loop-logo class="welcome__logo" />
                <h2 class="welcome__title">Welcome to Loop Workouts</h2>
                <p class="welcome__pitch">
                    The workout timer that remembers what you lifted. It runs your whole workout,
                    reps and rests included, and next time shows you what to beat.
                </p>

                <app-sign-in
                    intro="Loop Workouts is free while in beta. Sign in now to be a founding member, with your first year free when the app comes to the App Store and Google Play. Your workouts and history are then on every device you use."
                    (signedIn)="goHome('signed-in')"
                />

                <div class="welcome__guest">
                    <button
                        type="button"
                        class="btn-pill welcome__guest-button"
                        aria-describedby="welcome-guest-hint"
                        (click)="goHome('guest')"
                    >
                        Continue as guest
                    </button>
                    <p class="welcome__hint" id="welcome-guest-hint">
                        Everything stays on this device. You can sign in any time from the You tab.
                        <app-help-link topic="lose-workouts" />
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
