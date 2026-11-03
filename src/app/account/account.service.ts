import { DOCUMENT, inject, Service, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { SyncStarter } from '../sync/sync-starter.service';
import { UndoService } from '../shared/undo/undo.service';
import { AccountClient, ACCOUNT_CLIENT, SIGN_IN_PATH, SignInProvider } from './account-client';

export type AccountState =
    | { status: 'loading' }
    | { status: 'signed-out' }
    | { status: 'signed-in'; email: string };

export type SendResult = 'sent' | 'too-many' | 'failed';

export { SIGN_IN_PATH };

/**
 * Signing in to an account (SYN-3), by an email link or the code in the same email, or with
 * Google or Apple (SYN-7); signing out and deleting the account (SYN-8). Signing out and deleting leave this device's data as
 * it is. Made when the You tab first opens, which loads Supabase's code.
 */
@Service()
export class AccountService {
    private readonly makeClient = inject(ACCOUNT_CLIENT);
    private readonly document = inject(DOCUMENT);
    private readonly sync = inject(SyncStarter);
    private readonly undo = inject(UndoService);
    private client: Promise<AccountClient> | null = null;

    private readonly _state = signal<AccountState>({ status: 'loading' });
    readonly state = this._state.asReadonly();

    /**
     * Why the sign-in link that opened the app didn't work (it's expired, or was used
     * already), or null.
     */
    readonly linkProblem = signal<string | null>(null);

    constructor() {
        this.linkProblem.set(this.takeLinkProblem());
        void this.start();
    }

    private async start() {
        try {
            const client = await this.connect();
            client.auth.onAuthStateChange((_event, session) => this.show(session));
            const { data } = await client.auth.getSession();
            // Unless a sign-in or out has been heard since, which is newer
            if (this._state().status === 'loading') {
                this.show(data.session);
            }
        } catch {
            // Offline with the code not loaded yet, say: as if signed out, until it's back
            this._state.set({ status: 'signed-out' });
        }
    }

    private connect(): Promise<AccountClient> {
        this.client ??= this.makeClient();
        return this.client;
    }

    private show(session: Session | null) {
        if (session) {
            this.sync.start();
        }
        this._state.set(
            session
                ? { status: 'signed-in', email: session.user.email ?? '' }
                : { status: 'signed-out' }
        );
    }

    /** Emails a link (and a code) to sign in with, making the account if it's new. */
    async sendLink(email: string): Promise<SendResult> {
        try {
            const client = await this.connect();
            const { error } = await client.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true,
                    emailRedirectTo: this.document.location.origin + SIGN_IN_PATH,
                },
            });
            if (!error) {
                return 'sent';
            }
            return error.status === 429 ? 'too-many' : 'failed';
        } catch {
            return 'failed';
        }
    }

    /**
     * Goes to Google or Apple to sign in, which come back to the You tab signed in (the
     * account's tokens in the address, as an email link's are). An account with the same
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

    /** Signs this device out. Gives whether it worked. */
    async signOut(): Promise<boolean> {
        this.sync.leaving = true;
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
            await client.auth.signOut({ scope: 'local' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * A sign-in that didn't work comes back with why in the address: an email link that's
     * expired or used, e.g. `#error=access_denied&error_code=otp_expired`, or Google or Apple
     * turned down or cancelled. Takes it out of the address, so a refresh doesn't show it
     * again, and says what to do.
     */
    private takeLinkProblem(): string | null {
        const location = this.document.location;
        const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
        if (!params.has('error') && !params.has('error_code')) {
            return null;
        }
        this.document.defaultView?.history.replaceState(null, '', location.pathname);
        return params.get('error_code') === 'otp_expired'
            ? 'That sign-in link has expired or was used already. Send yourself another.'
            : "Signing in didn't finish. Try again, or sign in another way.";
    }
}
