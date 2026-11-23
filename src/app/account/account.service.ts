import { DOCUMENT, inject, Service, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { SyncStarter } from '../sync/sync-starter.service';
import { UndoService } from '../shared/undo/undo.service';
import { AccountClient, ACCOUNT_CLIENT, SIGN_IN_PATH, SignInProvider } from './account-client';
import { AUTH_STORAGE_KEY } from '../shared/state/auth-storage-key';
import { hasSignInTokens } from './sign-in-landing';
import { ConsentService } from './consent.service';
import { SettingsStore } from '../shared/state/settings-store.service';

export type AccountState =
    | { status: 'loading' }
    | { status: 'signed-out' }
    | { status: 'signed-in'; email: string };

/**
 * Whether the sign-in email was sent. Too many: Supabase won't send another yet, and `wait` is
 * how many seconds until it will, when it says (one address can have one a minute), or null
 * (the project's emails for the hour are used up, say).
 */
export type SendResult =
    | { status: 'sent' }
    | { status: 'too-many'; wait: number | null }
    | { status: 'failed' };

export { SIGN_IN_PATH };

/**
 * Signing in to an account (SYN-3), by a 6-digit code emailed and typed in the app, or with
 * Google or Apple (SYN-7); signing out and deleting the account (SYN-8). Signing out and deleting leave this device's data as
 * it is. Supabase's code loads only once it's needed: at once if there's an account on this
 * device, or a sign-in coming back in the address, and otherwise when signing in.
 */
@Service()
export class AccountService {
    private readonly makeClient = inject(ACCOUNT_CLIENT);
    private readonly document = inject(DOCUMENT);
    private readonly sync = inject(SyncStarter);
    private readonly undo = inject(UndoService);
    private readonly consent = inject(ConsentService);
    private readonly settings = inject(SettingsStore);
    /** The account whose consent (SYN-10) has been saved or looked up, once signed in. */
    private consentChecked: string | null = null;
    private client: Promise<AccountClient> | null = null;

    private readonly _state = signal<AccountState>({ status: 'loading' });
    readonly state = this._state.asReadonly();

    /** Why signing in with Google or Apple didn't finish, coming back to the app, or null. */
    readonly signInProblem = signal<string | null>(null);

    constructor() {
        this.signInProblem.set(this.takeSignInProblem());
        if (this.mightBeSignedIn()) {
            void this.connect().catch(() => undefined);
        } else {
            // No account on this device, and none coming back in the address: signed out,
            // without loading Supabase's code (59 KiB) until something needs it, so a first
            // visit's welcome screen doesn't wait on it
            this._state.set({ status: 'signed-out' });
        }
    }

    /**
     * Loads Supabase's code ahead of signing in, e.g. once the sign-in form's being filled in,
     * so sending the code doesn't wait on it.
     */
    prepare() {
        void this.connect().catch(() => undefined);
    }

    /** Whether there's a session to look for: Supabase's, saved here, or a sign-in's tokens. */
    private mightBeSignedIn(): boolean {
        try {
            if (localStorage.getItem(AUTH_STORAGE_KEY) !== null) {
                return true;
            }
        } catch {
            // Storage blocked: nothing can have been saved there
        }
        return hasSignInTokens(this.document.location);
    }

    /** Supabase's client, loaded the first time, then listened to for signing in and out. */
    private connect(): Promise<AccountClient> {
        this.client ??= this.makeClient().then(
            (client) => {
                this.listen(client);
                return client;
            },
            (error: unknown) => {
                // Offline with the code not loaded yet, say: as if signed out, until it's back
                this.client = null;
                if (this._state().status === 'loading') {
                    this._state.set({ status: 'signed-out' });
                }
                throw error;
            }
        );
        return this.client;
    }

    private listen(client: AccountClient) {
        client.auth.onAuthStateChange((_event, session) => this.show(client, session));
        client.auth.getSession().then(
            ({ data }) => {
                // Unless a sign-in or out has been heard since, which is newer
                if (this._state().status === 'loading') {
                    this.show(client, data.session);
                }
            },
            () => {
                if (this._state().status === 'loading') {
                    this._state.set({ status: 'signed-out' });
                }
            }
        );
    }

    private show(client: AccountClient, session: Session | null) {
        if (session) {
            this.sync.start();
        }
        this.checkConsent(client, session);
        this._state.set(
            session
                ? { status: 'signed-in', email: session.user.email ?? '' }
                : { status: 'signed-out' }
        );
    }

    /**
     * Once each account's signed in, looks up its consents (SYN-10, CAL-6). Not waited on: Supabase's listener waiting on its own client
     * would never finish.
     */
    private checkConsent(client: AccountClient, session: Session | null) {
        const user = session?.user.id ?? null;
        if (user === this.consentChecked) {
            return;
        }
        this.consentChecked = user;
        if (user === null) {
            this.consent.signedOut();
        } else {
            void this.consent.signedIn(client);
        }
    }

    /**
     * Agreed, signed in, to keeping notes that may mention health with the account (SYN-10),
     * or withdrawn, which deletes them there. Gives whether it was saved.
     */
    async keepNotes(keep: boolean): Promise<boolean> {
        try {
            const client = await this.connect();
            return await (keep ? this.consent.give(client) : this.consent.withdraw(client));
        } catch {
            return false;
        }
    }

    /**
     * Emails a code to sign in with, making the account if it's new. The email carries only
     * the code (`supabase/email-templates/`), so signing in never leaves the app.
     */
    async sendCode(email: string): Promise<SendResult> {
        try {
            const client = await this.connect();
            const { error } = await client.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: true },
            });
            if (!error) {
                return { status: 'sent' };
            }
            if (error.status !== 429) {
                return { status: 'failed' };
            }
            // "For security purposes, you can only request this after 42 seconds."
            const wait = /after (\d+) seconds?/.exec(error.message)?.[1];
            return { status: 'too-many', wait: wait ? Number(wait) : null };
        } catch {
            return { status: 'failed' };
        }
    }

    /**
     * Goes to Google or Apple to sign in, which come back to the You tab signed in (the
     * account's tokens in the address). An account with the same
     * email, made by email or the other, is the same account. Gives false if it couldn't
     * start (offline, say); otherwise the page is on its way there.
     */
    async signInWith(provider: SignInProvider): Promise<boolean> {
        try {
            const client = await this.connect();
            const { error } = await client.auth.signInWithOAuth({
                provider,
                options: { redirectTo: this.document.location.origin + SIGN_IN_PATH },
            });
            return !error;
        } catch {
            return false;
        }
    }

    /** Signs in with the code from the email, giving whether it worked. */
    async enterCode(email: string, code: string): Promise<boolean> {
        try {
            const client = await this.connect();
            const { error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
            return !error;
        } catch {
            return false;
        }
    }

    /**
     * Syncs, then gives whether everything on this device has been sent to the account:
     * signing out removes it from the device, so anything unsent would be lost.
     */
    syncAll(): Promise<boolean> {
        return this.sync.syncAll();
    }

    /**
     * On to Home once signed in, wherever it was started, saying who's signed in in the bar
     * there, read out as it shows.
     */
    async goHomeSignedIn(router: Router) {
        await router.navigateByUrl('/home', { replaceUrl: true });
        const state = this._state();
        this.undo.notify(
            state.status === 'signed-in' && state.email
                ? `Signed in as ${state.email}`
                : 'Signed in'
        );
    }

    /**
     * Signs this device out. Gives whether it worked. A body weight kept with the account
     * (CAL-6) goes from the device, as the account's name does: the device is cleared either
     * way.
     */
    async signOut(): Promise<boolean> {
        this.sync.leaving = true;
        this.forgetKeptBodyWeight();
        try {
            const client = await this.connect();
            const { error } = await client.auth.signOut({ scope: 'local' });
            return !error;
        } catch {
            return false;
        }
    }

    /**
     * Deletes the account and everything of it on the server, then signs this device out,
     * keeping its data. Gives whether the account was deleted.
     */
    async deleteAccount(): Promise<boolean> {
        this.sync.leaving = true;
        try {
            const client = await this.connect();
            const { error } = await client.rpc('delete_my_account');
            if (error) {
                this.sync.leaving = false;
                return false;
            }
            this.forgetKeptBodyWeight();
            await client.auth.signOut({ scope: 'local' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Agreed on Profile, signed in, to keeping the body weight with the account (CAL-6), or
     * withdrawn, which deletes it there. Gives whether it was saved.
     */
    async keepBodyWeight(keep: boolean): Promise<boolean> {
        try {
            const client = await this.connect();
            return await (keep
                ? this.consent.giveWeight(client)
                : this.consent.withdrawWeight(client));
        } catch {
            return false;
        }
    }

    /** Leaving an account that kept the body weight: it was the account's. */
    private forgetKeptBodyWeight() {
        if (this.consent.weightGiven()) {
            this.settings.forgetBodyWeight();
        }
    }

    /**
     * A sign-in that didn't work comes back with why in the address, e.g.
     * `#error=access_denied`: Google or Apple turned down or cancelled (or an old email's
     * link, from before the emails carried only a code). Takes it out of the address, so a
     * refresh doesn't show it again, and says what to do.
     */
    private takeSignInProblem(): string | null {
        const location = this.document.location;
        const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
        if (!params.has('error') && !params.has('error_code')) {
            return null;
        }
        this.document.defaultView?.history.replaceState(null, '', location.pathname);
        return "Signing in didn't finish. Try again, or sign in another way.";
    }
}
