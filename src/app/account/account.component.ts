import { Component, computed, DOCUMENT, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { PageSlide } from '../shared/navigation/page-slide';
import { LoopLogoComponent } from '../shared/components/loop-logo/loop-logo.component';
import { SyncStarter } from '../sync/sync-starter.service';
import { syncText } from '../sync/sync-text';
import { AccountService } from './account.service';
import { DeviceDataService } from '../shared/state/device-data.service';
import { ProfileComponent } from './profile/profile.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { ConsentStatusComponent } from './consent-status/consent-status.component';
import { hasSignInTokens } from './sign-in-landing';
import { YourDataComponent } from './your-data/your-data.component';
import { injectFocusAfterRender } from '../shared/focus-after-render';

/**
 * The You tab (SYN-3, SYN-7, SYN-8, SYN-9, SYN-10): signing in (SignInComponent), who's
 * signed in and how sync is going, consent to keeping notes that may mention health, signing out and deleting the account; then your profile
 * (sex and weight units), Settings, which slides in over it, your data (backups and Clear
 * this device), and About.
 */
@Component({
    selector: 'app-account',
    imports: [
        ConsentStatusComponent,
        LoopLogoComponent,
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
    private readonly focus = injectFocusAfterRender();
    private readonly document = inject(DOCUMENT);

    /** The email signed in with, or empty when no one is. */
    protected readonly signedInAs = computed(() => {
        const state = this.account.state();
        return state.status === 'signed-in' ? state.email : '';
    });

    private readonly sync = inject(SyncStarter);
    /** How sync is going, e.g. "Synced at 12:30." */
    protected readonly syncText = computed(() => syncText(this.sync.status()));

    /** Waiting on the server, so the buttons can't be pressed twice. */
    protected readonly busy = signal(false);
    /** What the last thing done did, read out as it changes. */
    protected readonly message = signal('');
    /** Delete account was pressed: its warning is open. */
    protected readonly confirmingDelete = signal(false);
    /** Signing out would lose changes that haven't synced, so it's asking first. */
    protected readonly confirmingSignOut = signal(false);
    private readonly deviceData = inject(DeviceDataService);
    private readonly router = inject(Router);
    /**
     * Back from Google or an email link with the account's tokens in the address, which
     * Supabase's client is reading: once it's signed in, on to Home.
     */
    private readonly returning = hasSignInTokens(this.document.location);

    constructor() {
        // From the workout summary's Add your weight to see calories (CAL-2)
        const url =
            this.router.currentNavigation()?.finalUrl ?? this.router.parseUrl(this.router.url);
        if (url.queryParamMap.get('focus') === 'body-weight') {
            this.focus('body-weight');
        }
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

    /**
     * Signs out, removing the account's data from this device so the next person to use it
     * doesn't see it, or have it merged into their account; this device's settings stay.
     * It syncs first, and if anything couldn't be sent (offline, say), asks before losing it,
     * unless `anyway`. Clearing reloads the app, which then says it's signed out.
     */
    protected async signOut(anyway = false) {
        this.confirmingSignOut.set(false);
        this.busy.set(true);
        if (!anyway) {
            this.message.set('Syncing before signing out…');
            if (!(await this.account.syncAll())) {
                this.busy.set(false);
                this.message.set('');
                this.confirmingSignOut.set(true);
                this.focus('account-sign-out-warning');
                return;
            }
        }
        this.message.set('Signing out…');
        // Signed out here either way, as clearing takes the sign-in with it
        await this.account.signOut();
        await this.deviceData.clear({ leaving: 'signed-out' });
    }

    protected cancelSignOut() {
        this.confirmingSignOut.set(false);
        this.focus('account-sign-out');
    }

    protected askToDelete() {
        this.confirmingDelete.set(true);
        this.focus('account-delete-warning');
    }

    protected cancelDelete() {
        this.confirmingDelete.set(false);
        this.focus('account-delete');
    }

    /**
     * Deletes the account and everything of it on the server, then clears this device as
     * signing out does, keeping its settings; the app reloads and says so.
     */
    protected async deleteAccount() {
        this.busy.set(true);
        const deleted = await this.account.deleteAccount();
        if (deleted) {
            await this.deviceData.clear({ leaving: 'deleted' });
        } else {
            this.busy.set(false);
            this.message.set(
                "Your account couldn't be deleted. Check your connection and try again."
            );
        }
    }
}
