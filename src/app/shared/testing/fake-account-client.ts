import { Provider } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { AccountClient, ACCOUNT_CLIENT } from '../../account/account-client';
import { AUTH_STORAGE_KEY } from '../state/auth-storage-key';

/** A session for `email`, as much of one as the app reads. */
export function sessionFor(email: string): Session {
    return { user: { id: `user-${email}`, email } } as Session;
}

/**
 * A stand-in for Supabase's client, signed in as `email` (or signed out). Signing in with a
 * code and signing out tell its listener, as the real one does. Each call is a spy, so tests
 * can change what it answers. As the real one does, it keeps a session in localStorage while
 * signed in, which is how the app knows there may be one before loading Supabase's code: so
 * make it after a test empties localStorage. The account has consent to keeping notes that
 * may mention health on record (SYN-10), unless `consent` is null.
 */
export function fakeAccountClient(
    email: string | null = null,
    { consent = { at: Date.UTC(2026, 10, 8, 12), notice: '2026-11-08' } as unknown } = {}
) {
    let session = email === null ? null : sessionFor(email);
    let listener: ((event: string, session: Session | null) => void) | null = null;
    const save = () => {
        if (session) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: session.user }));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    };
    save();
    const change = (next: Session | null) => {
        session = next;
        save();
        listener?.(next ? 'SIGNED_IN' : 'SIGNED_OUT', next);
    };
    const auth = {
        onAuthStateChange: vi.fn((callback: typeof listener) => {
            listener = callback;
            // As the real one does, says who's signed in to start with
            queueMicrotask(() => listener?.('INITIAL_SESSION', session));
            return { data: { subscription: { unsubscribe: () => (listener = null) } } };
        }),
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
        signInWithOtp: vi.fn(async (_credentials: unknown) => ({
            data: {},
            error: null as unknown,
        })),
        // The browser would go to Google or Apple here, and come back signed in
        signInWithOAuth: vi.fn(async (_credentials: unknown) => ({
            data: {},
            error: null as unknown,
        })),
        verifyOtp: vi.fn(async ({ email: address }: { email: string; token: string }) => {
            change(sessionFor(address));
            return { data: {}, error: null as unknown };
        }),
        signOut: vi.fn(async (_options?: unknown) => {
            change(null);
            return { error: null as unknown };
        }),
    };
    const rpc = vi.fn(async (fn: string, args?: unknown) => {
        if (fn === 'give_health_consent') {
            const { notice_date } = args as { notice_date: string };
            consent = { at: Date.UTC(2026, 10, 9, 12), notice: notice_date };
        }
        const data = fn.endsWith('_health_consent') ? consent : null;
        return { data: data as unknown, error: null as unknown };
    });
    return { auth, rpc, change };
}

export type FakeAccountClient = ReturnType<typeof fakeAccountClient>;

/** Provides `client` in place of Supabase's. */
export function provideFakeAccountClient(client: FakeAccountClient): Provider {
    return {
        provide: ACCOUNT_CLIENT,
        useValue: () => Promise.resolve(client as unknown as AccountClient),
    };
}
