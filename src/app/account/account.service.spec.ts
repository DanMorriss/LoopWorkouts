import { DOCUMENT } from '@angular/core';
import { Router } from '@angular/router';
import { UndoService } from '../shared/undo/undo.service';
import { TestBed } from '@angular/core/testing';
import {
    FakeAccountClient,
    fakeAccountClient,
    provideFakeAccountClient,
    sessionFor,
} from '../shared/testing/fake-account-client';
import {
    FakeSyncStarter,
    fakeSyncStarter,
    provideFakeSyncStarter,
} from '../shared/testing/fake-sync';
import { AUTH_STORAGE_KEY } from './account-client';
import { AccountService } from './account.service';

describe('AccountService', () => {
    let client: FakeAccountClient;
    let sync: FakeSyncStarter;

    // A signed-in fake keeps its session in localStorage, as Supabase does
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    function start(signedInAs: string | null = null) {
        client = fakeAccountClient(signedInAs);
        sync = fakeSyncStarter();
        TestBed.configureTestingModule({
            providers: [provideFakeAccountClient(client), provideFakeSyncStarter(sync)],
        });
        return TestBed.inject(AccountService);
    }

    // Lets the client's promises settle
    const settled = () => new Promise((resolve) => setTimeout(resolve));

    it("is signed out at once with no account on this device, without loading Supabase's code", async () => {
        const account = start();
        expect(account.state()).toEqual({ status: 'signed-out' });

        await settled();

        expect(client.auth.onAuthStateChange).not.toHaveBeenCalled();
    });

    it('loads it once the sign-in form is used, still signed out', async () => {
        const account = start();
        account.prepare();
        await settled();

        expect(client.auth.onAuthStateChange).toHaveBeenCalled();
        expect(account.state()).toEqual({ status: 'signed-out' });
    });

    it('loads it at once for a sign-in coming back in the address', async () => {
        const before = location.href;
        history.replaceState(null, '', '/account#access_token=abc&refresh_token=def');
        try {
            start();
            await settled();
            expect(client.auth.onAuthStateChange).toHaveBeenCalled();
        } finally {
            history.replaceState(null, '', before);
        }
    });

    it('starts sync once signed in, and not before', async () => {
        const account = start();
        account.prepare();
        await settled();
        expect(sync.start).not.toHaveBeenCalled();

        client.change(sessionFor('me@example.com'));
        expect(sync.start).toHaveBeenCalled();
    });

    it('is signed in with a session, and follows the client when it changes', async () => {
        const account = start('me@example.com');
        // Its session saved here, so it's looked for
        expect(account.state()).toEqual({ status: 'loading' });
        await settled();
        expect(account.state()).toEqual({ status: 'signed-in', email: 'me@example.com' });

        client.change(null);
        expect(account.state()).toEqual({ status: 'signed-out' });
        client.change(sessionFor('other@example.com'));
        expect(account.state()).toEqual({ status: 'signed-in', email: 'other@example.com' });
    });

    it("is signed out if the client can't load, e.g. offline", async () => {
        // With an account saved here, so it's loaded at once
        localStorage.setItem(AUTH_STORAGE_KEY, '{}');
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: (await import('./account-client')).ACCOUNT_CLIENT,
                    useValue: () => Promise.reject(new Error('offline')),
                },
            ],
        });
        const account = TestBed.inject(AccountService);
        await settled();

        expect(account.state()).toEqual({ status: 'signed-out' });
        expect(await account.sendLink('me@example.com')).toBe('failed');
    });

    it('goes Home once signed in, saying who in the bar there', async () => {
        const account = start('me@example.com');
        await settled();
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

        await account.goHomeSignedIn(router);

        expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
        expect(TestBed.inject(UndoService).offer()?.message).toBe('Signed in as me@example.com');
    });

    describe('signInWith (SYN-7)', () => {
        it('goes to Google or Apple, to come back to the Account tab', async () => {
            const account = start();

            expect(await account.signInWith('google')).toBe(true);
            expect(await account.signInWith('apple')).toBe(true);

            expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
                provider: 'google',
                options: { redirectTo: `${location.origin}/account` },
            });
            expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
                provider: 'apple',
                options: { redirectTo: `${location.origin}/account` },
            });
        });

        it("says when it couldn't start", async () => {
            const account = start();
            client.auth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: { status: 400 } });
            client.auth.signInWithOAuth.mockRejectedValueOnce(new Error('network'));

            expect(await account.signInWith('google')).toBe(false);
            expect(await account.signInWith('apple')).toBe(false);
        });
    });

    describe('sendLink', () => {
        it('emails a link back to the Account tab, making the account if it is new', async () => {
            const account = start();

            expect(await account.sendLink('me@example.com')).toBe('sent');

            expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
                email: 'me@example.com',
                options: {
                    shouldCreateUser: true,
                    emailRedirectTo: `${location.origin}/account`,
                },
            });
        });

        it('says when too many have been sent, and when it failed', async () => {
            const account = start();
            client.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { status: 429 } });
            client.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { status: 500 } });
            client.auth.signInWithOtp.mockRejectedValueOnce(new Error('network'));

            expect(await account.sendLink('me@example.com')).toBe('too-many');
            expect(await account.sendLink('me@example.com')).toBe('failed');
            expect(await account.sendLink('me@example.com')).toBe('failed');
        });
    });

    it('signs in with the code from the email, or says it did not work', async () => {
        const account = start();

        expect(await account.enterCode('me@example.com', '123456')).toBe(true);
        expect(client.auth.verifyOtp).toHaveBeenCalledWith({
            email: 'me@example.com',
            token: '123456',
            type: 'email',
        });
        expect(account.state()).toEqual({ status: 'signed-in', email: 'me@example.com' });

        client.auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: { status: 403 } });
        expect(await account.enterCode('me@example.com', '000000')).toBe(false);
    });

    it('signs only this device out', async () => {
        const account = start('me@example.com');
        await settled();

        expect(await account.signOut()).toBe(true);

        expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
        expect(account.state()).toEqual({ status: 'signed-out' });
    });

    describe('deleteAccount', () => {
        it('deletes the account on the server, then signs this device out', async () => {
            const account = start('me@example.com');
            await settled();

            expect(await account.deleteAccount()).toBe(true);

            expect(client.rpc).toHaveBeenCalledWith('delete_my_account');
            expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
            expect(account.state()).toEqual({ status: 'signed-out' });
        });

        it("stays signed in when the account couldn't be deleted", async () => {
            const account = start('me@example.com');
            await settled();
            client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'failed' } });

            expect(await account.deleteAccount()).toBe(false);

            expect(client.auth.signOut).not.toHaveBeenCalled();
            expect(account.state().status).toBe('signed-in');
        });
    });

    describe('a sign-in link that did not work', () => {
        function startAt(hash: string, search = '') {
            const replaceState = vi.fn();
            client = fakeAccountClient();
            TestBed.configureTestingModule({
                providers: [
                    provideFakeAccountClient(client),
                    provideFakeSyncStarter(),
                    {
                        provide: DOCUMENT,
                        useValue: {
                            location: { hash, search, pathname: '/account', origin: 'https://x' },
                            defaultView: { history: { replaceState } },
                        },
                    },
                ],
            });
            return { account: TestBed.inject(AccountService), replaceState };
        }

        it('says so, and takes why out of the address', () => {
            const { account, replaceState } = startAt(
                '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'
            );

            expect(account.linkProblem()).toBe(
                'That sign-in link has expired or was used already. Send yourself another.'
            );
            expect(replaceState).toHaveBeenCalledWith(null, '', '/account');
        });

        it("says when signing in with Google or Apple didn't finish", () => {
            const { account, replaceState } = startAt(
                '',
                '?error=access_denied&error_description=The+user+cancelled'
            );

            expect(account.linkProblem()).toBe(
                "Signing in didn't finish. Try again, or sign in another way."
            );
            expect(replaceState).toHaveBeenCalledWith(null, '', '/account');
        });

        it('says nothing for an address without a problem', () => {
            const { account, replaceState } = startAt('#access_token=abc');

            expect(account.linkProblem()).toBeNull();
            expect(replaceState).not.toHaveBeenCalled();
        });
    });
});
