import { InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Loop Workouts' Supabase project, in Europe. The publishable key is meant to be in the app:
 * what each account can reach is set on the server (row-level security, in
 * supabase/schema.sql). The secret key never goes in the app.
 */
export const SUPABASE_URL = 'https://cpgacyzlfyskifzhkotu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YnL-skDr7iSBsqSqaIbWBg_vE-kGXQa';

/** Where signing in (an email link, or Google) brings you back to: the You tab. */
export const SIGN_IN_PATH = '/account';

/** Who else can sign you in (SYN-7). */
export type SignInProvider = 'google' | 'apple';

/**
 * Those offered on the You tab: each set up in Supabase (Authentication → Providers)
 * first. Apple waits on an Apple Developer account; add it here once it's set up.
 */
export const SIGN_IN_PROVIDERS: readonly SignInProvider[] = ['google'];

/** Where the client keeps the sign-in, in localStorage: there while this device is signed in. */
export const AUTH_STORAGE_KEY = 'sb-cpgacyzlfyskifzhkotu-auth-token';

/** The parts of the Supabase client accounts use. */
export type AccountClient = Pick<SupabaseClient, 'auth' | 'rpc'>;

/**
 * Gives the Supabase client, loading its code only when it's first needed (signing in, or a
 * device signed in already: see AccountService and SyncStarter), so it stays out of the app's first load. There's one client, which
 * accounts and sync share. Tests provide a fake.
 */
export const ACCOUNT_CLIENT = new InjectionToken<() => Promise<AccountClient>>('ACCOUNT_CLIENT', {
    providedIn: 'root',
    factory: () => {
        let client: Promise<AccountClient> | null = null;
        return () =>
            (client ??= makeClient().catch((error: unknown) => {
                // Offline, say: try again next time
                client = null;
                throw error;
            }));
    },
});

function makeClient(): Promise<AccountClient> {
    return import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: {
                storageKey: AUTH_STORAGE_KEY,
                // The link's tokens come back in the address, so a link opened in another
                // browser on the device signs that browser in (the code is for the Home
                // Screen app, which keeps its storage apart from Safari's)
                flowType: 'implicit',
                detectSessionInUrl: true,
                persistSession: true,
                autoRefreshToken: true,
            },
        })
    );
}
