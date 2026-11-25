import { Component, computed, DOCUMENT, effect, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { PageSlide } from '../shared/navigation/page-slide';
import { LoopLogoComponent } from '../shared/components/loop-logo/loop-logo.component';
import { SyncStarter } from '../sync/sync-starter.service';
import { syncText } from '../sync/sync-text';
import { AccountService } from './account.service';
import { ProfileComponent } from './profile/profile.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { KeptWithAccountComponent } from './kept-with-account/kept-with-account.component';
import { LeavingComponent } from './leaving/leaving.component';
import { hasSignInTokens } from './sign-in-landing';
import { YourDataComponent } from './your-data/your-data.component';
import { TopBarComponent } from '../nav/top-bar/top-bar.component';

/**
 * The You tab (SYN-3, SYN-7, SYN-10, CAL-6): signing in (SignInComponent), or who's signed
 * in, how sync is going and what's kept with the account only with its own consent; then your
 * profile, Settings and Help, which slide in over it, your data (backups and bringing in a
 * plan), Leaving (signing out, Clear this device and deleting the account) and About.
 */
@Component({
    selector: 'app-account',
    imports: [
        TopBarComponent,
        LoopLogoComponent,
        KeptWithAccountComponent,
        LeavingComponent,
        MatIconModule,
        ProfileComponent,
        SignInComponent,
        YourDataComponent,
    ],
    templateUrl: './account.component.html',
    styleUrl: './account.component.scss',
})
export class AccountComponent {
    protected readonly account = inject(AccountService);
    /** Into Settings, the Privacy notice and Terms of use. */
    protected readonly slide = inject(PageSlide);
    private readonly document = inject(DOCUMENT);

    /** The email signed in with, or empty when no one is. */
    protected readonly signedInAs = computed(() => {
        const state = this.account.state();
        return state.status === 'signed-in' ? state.email : '';
    });

    private readonly sync = inject(SyncStarter);
    /** How sync is going, e.g. "Synced at 12:30." */
    protected readonly syncText = computed(() => syncText(this.sync.status()));

    private readonly router = inject(Router);
    /**
     * Back from Google or Apple with the account's tokens in the address, which
     * Supabase's client is reading: once it's signed in, on to Home.
     */
    private readonly returning = hasSignInTokens(this.document.location);

    constructor() {
        effect(() => {
            if (this.returning && this.account.state().status === 'signed-in') {
                this.goHome();
            }
        });
    }

    /** Signed in with the code: on to Today. */
    protected signedIn() {
        this.goHome();
    }

    /** Signed in, so on to Today, in place of the You tab (and the tokens in its address). */
    private goHome() {
        void this.account.goHomeSignedIn(this.router);
    }
}
