import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DeviceDataService } from '../shared/state/device-data.service';
import { PageSlide } from '../nav/page-slide';
import {
    FakeAccountClient,
    fakeAccountClient,
    provideFakeAccountClient,
} from '../shared/testing/fake-account-client';
import {
    FakeSyncStarter,
    fakeSyncStarter,
    provideFakeSyncStarter,
} from '../shared/testing/fake-sync';
import { AccountComponent } from './account.component';
import { PENDING_CONSENT_KEY } from './consent.service';

describe('AccountComponent', () => {
    let fixture: ComponentFixture<AccountComponent>;
    let element: HTMLElement;
    let client: FakeAccountClient;
    let sync: FakeSyncStarter;

    let clear: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.spyOn>;

    async function create(
        signedInAs: string | null = null,
        options?: Parameters<typeof fakeAccountClient>[1]
    ) {
        localStorage.removeItem(PENDING_CONSENT_KEY);
        client = fakeAccountClient(signedInAs, options);
        sync = fakeSyncStarter();
        clear = vi.fn(async () => undefined);
        TestBed.configureTestingModule({
            providers: [
                provideFakeAccountClient(client),
                provideFakeSyncStarter(sync),
                { provide: DeviceDataService, useValue: { clear } },
            ],
        });
        navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        fixture = TestBed.createComponent(AccountComponent);
        element = fixture.nativeElement;
        document.body.appendChild(element);
        await settle();
    }
    afterEach(() => {
        fixture.destroy();
        element.remove();
        localStorage.removeItem(PENDING_CONSENT_KEY);
    });

    async function settle() {
        await new Promise((resolve) => setTimeout(resolve));
        await fixture.whenStable();
    }

    const text = () => element.textContent!.replace(/\s+/g, ' ');
    /** What's been said: the sign-in's, and the tab's own, as there's one of each signed out. */
    const status = () =>
        [...element.querySelectorAll('[role="status"]')]
            .map((region) => region.textContent!.trim())
            .filter(Boolean)
            .join(' ');
    const button = (label: string) =>
        [...element.querySelectorAll('button')].find((b) => b.textContent!.trim() === label)!;
    async function press(label: string) {
        button(label).click();
        await settle();
    }
    /** Ticks the box for keeping notes that may mention health (SYN-10). */
    async function tick() {
        element.querySelector<HTMLInputElement>('#health-consent')!.click();
        await settle();
    }
    async function type(id: string, value: string) {
        const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        await settle();
    }

    describe('back from Google or an email link', () => {
        afterEach(() => history.replaceState(null, '', location.pathname + location.search));

        it('goes Home once signed in', async () => {
            history.replaceState(
                null,
                '',
                location.pathname + location.search + '#access_token=abc'
            );
            await create('me@example.com');

            expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
        });

        it('stays on the Account tab when opened as usual', async () => {
            await create('me@example.com');

            expect(navigate).not.toHaveBeenCalled();
        });
    });

    describe('signed out, before ticking to agree to keeping notes (SYN-10)', () => {
        beforeEach(() => create());

        it('asks for consent above the ways of signing in, unticked, with a label', () => {
            const box = element.querySelector<HTMLInputElement>('#health-consent')!;
            expect(box.type).toBe('checkbox');
            expect(box.checked).toBe(false);
            expect(box.labels![0].textContent!.replace(/\s+/g, ' ').trim()).toBe(
                'I agree that notes I write, which may mention my health, are kept with my account.'
            );
            expect(box.compareDocumentPosition(element.querySelector('.sign-in__provider')!)).toBe(
                Node.DOCUMENT_POSITION_FOLLOWING
            );
            // Its label is the line, at least 44px to press
            expect(box.labels![0].getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
            expect(element.querySelector('#health-consent-error')).toBeNull();
        });

        it("doesn't go to Google, saying why on the box and going to it", async () => {
            await press('Continue with Google');

            expect(client.auth.signInWithOAuth).not.toHaveBeenCalled();
            const box = element.querySelector<HTMLInputElement>('#health-consent')!;
            expect(element.querySelector('#health-consent-error')!.textContent).toBe(
                'Tick the box to agree before signing in.'
            );
            expect(box.getAttribute('aria-invalid')).toBe('true');
            expect(box.getAttribute('aria-describedby')).toBe('health-consent-error');
            expect(document.activeElement).toBe(box);
            expect(localStorage.getItem(PENDING_CONSENT_KEY)).toBeNull();
        });

        it("doesn't send a sign-in link", async () => {
            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');

            expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
            expect(document.activeElement!.id).toBe('health-consent');
        });

        it('signs in once ticked, the error gone, saving the consent with the account', async () => {
            await press('Continue with Google');
            await tick();
            expect(element.querySelector('#health-consent-error')).toBeNull();

            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');
            expect(client.auth.signInWithOtp).toHaveBeenCalled();
            // Kept until signed in, as an email link may open in another tab
            expect(localStorage.getItem(PENDING_CONSENT_KEY)).toBe('2026-11-10');

            await type('account-code', '123456');
            await press('Sign in');
            expect(client.rpc).toHaveBeenCalledWith('give_health_consent', {
                notice_date: '2026-11-10',
            });
            expect(localStorage.getItem(PENDING_CONSENT_KEY)).toBeNull();
        });
    });

    describe('signed out', () => {
        beforeEach(async () => {
            await create();
            await tick();
        });

        it('asks for an email to send a sign-in link to, saying an account is optional', () => {
            expect(text()).toContain('An account is optional');
            const input = element.querySelector<HTMLInputElement>('#account-email')!;
            expect(input.type).toBe('email');
            expect(input.autocomplete).toBe('email');
            expect(button('Email me a sign-in link')).toBeTruthy();
            // No error until something's been tried
            expect(element.querySelector('#account-email-error')).toBeNull();
        });

        it("says what's wrong with the email, on the field, and doesn't send", async () => {
            await press('Email me a sign-in link');

            const input = element.querySelector<HTMLInputElement>('#account-email')!;
            expect(element.querySelector('#account-email-error')!.textContent).toBe(
                'Enter your email address.'
            );
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(input.getAttribute('aria-describedby')).toContain('account-email-error');
            expect(document.activeElement).toBe(input);

            await type('account-email', 'not an email');
            expect(element.querySelector('#account-email-error')!.textContent).toBe(
                "That isn't an email address. Check it and try again."
            );
            expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
        });

        it('offers Google first (Apple not yet), then the email', () => {
            const labels = [...element.querySelectorAll('.sign-in__provider')].map((b) =>
                b.textContent!.trim()
            );
            expect(labels).toEqual(['Continue with Google']);
            const or = element.querySelector('.sign-in__or')!;
            expect(or.compareDocumentPosition(element.querySelector('#account-email')!)).toBe(
                Node.DOCUMENT_POSITION_FOLLOWING
            );
        });

        it('goes to Google to sign in, saying so', async () => {
            await press('Continue with Google');

            expect(client.auth.signInWithOAuth).toHaveBeenCalledWith(
                expect.objectContaining({ provider: 'google' })
            );
            expect(status()).toBe('Going to Google…');
            // Off to Google, so nothing more to press here
            expect(button('Continue with Google').disabled).toBe(true);
        });

        it('is ready again when come back to from Google without signing in', async () => {
            await press('Continue with Google');
            await type('account-email', 'me@example.com');
            expect(button('Email me a sign-in link').disabled).toBe(true);

            // Back from Google: the browser shows the page as it was left
            window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
            await settle();

            expect(status()).toBe('');
            expect(button('Continue with Google').disabled).toBe(false);
            expect(button('Email me a sign-in link').disabled).toBe(false);
        });

        it("says when Google can't be reached, and can be tried again", async () => {
            client.auth.signInWithOAuth.mockRejectedValueOnce(new Error('offline'));

            await press('Continue with Google');

            expect(status()).toBe("Couldn't reach Google. Check your connection and try again.");
            expect(button('Continue with Google').disabled).toBe(false);
        });

        it('sends the link, then asks for the code from the email', async () => {
            await type('account-email', ' me@example.com ');
            await press('Email me a sign-in link');

            expect(client.auth.signInWithOtp).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'me@example.com' })
            );
            expect(text()).toContain("We've sent a sign-in link to me@example.com.");
            expect(document.activeElement!.id).toBe('account-sent');
            const code = element.querySelector<HTMLInputElement>('#account-code')!;
            expect(code.inputMode).toBe('numeric');
            expect(code.autocomplete).toBe('one-time-code');
        });

        it('signs in with the code, then goes Home', async () => {
            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');
            await type('account-code', '123456');
            await press('Sign in');

            expect(client.auth.verifyOtp).toHaveBeenCalledWith({
                email: 'me@example.com',
                token: '123456',
                type: 'email',
            });
            expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
        });

        it("says when a code didn't work, or isn't one", async () => {
            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');
            await type('account-code', '12');
            await press('Sign in');
            expect(element.querySelector('#account-code-error')!.textContent).toBe(
                'The code is the number in the email, e.g. 123456.'
            );
            expect(client.auth.verifyOtp).not.toHaveBeenCalled();

            client.auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: { status: 403 } });
            await type('account-code', '654321');
            await press('Sign in');
            expect(status()).toBe(
                "That code didn't work: it may be wrong, or expired. Check it, or send another email."
            );
        });

        it('goes back to the email on Use another email', async () => {
            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');
            await press('Use another email');

            expect(document.activeElement!.id).toBe('account-email');
        });

        it("says when the email couldn't be sent, or too many have been", async () => {
            await type('account-email', 'me@example.com');
            client.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { status: 429 } });
            await press('Email me a sign-in link');
            expect(status()).toBe('Too many sign-in emails for now. Wait a while, then try again.');

            client.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { status: 500 } });
            await press('Email me a sign-in link');
            expect(status()).toBe(
                "The email couldn't be sent. Check your connection and try again."
            );
            expect(element.querySelector('#account-code')).toBeNull();
        });
    });

    describe('signed in', () => {
        beforeEach(() => create('me@example.com'));

        it('says when the account agreed to keeping notes, and how to withdraw (SYN-10)', () => {
            expect(client.rpc).toHaveBeenCalledWith('my_health_consent');
            expect(text()).toContain(
                'On 8 November 2026 you agreed that notes you write, which may mention your health, are kept with your account (under the privacy notice of 8 November 2026). To withdraw, delete those notes, or your account.'
            );
            expect(element.querySelector('#health-consent')).toBeNull();
        });

        it('says who, what syncs, and that clearing the device signs it out', () => {
            expect(text()).toContain('Signed in as me@example.com.');
            expect(text()).toContain('Other settings stay a choice for each device.');
            expect(text()).toContain('That signs this device out too');
            expect(element.querySelector('#account-email')).toBeNull();
        });

        it('says how sync is going', async () => {
            const syncLine = () => element.querySelector('.account__sync')!.textContent!.trim();
            expect(syncLine()).toBe('Not synced yet.');

            sync.status.set({ syncing: true, lastSyncedAt: null, problem: null });
            await settle();
            expect(syncLine()).toBe('Syncing…');

            sync.status.set({ syncing: false, lastSyncedAt: Date.now(), problem: null });
            await settle();
            expect(syncLine()).toMatch(/^Synced at .+\.$/);

            sync.status.set({ syncing: false, lastSyncedAt: Date.now(), problem: 'offline' });
            await settle();
            expect(syncLine()).toBe("You're offline: it'll sync when you're back online.");
        });

        it('says signing out removes the data from this device, which the account keeps', () => {
            expect(text()).toContain(
                'Signing out removes your workouts and history from this device. Your account keeps them'
            );
        });

        it('syncs, then signs out and removes the data from this device, keeping settings', async () => {
            await press('Sign out');

            expect(sync.syncAll).toHaveBeenCalled();
            expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
            expect(clear).toHaveBeenCalledWith({ leaving: 'signed-out' });
        });

        it("asks first when something hasn't synced, and can sign out anyway or not", async () => {
            sync.syncAll.mockResolvedValue(false);

            await press('Sign out');
            expect(text()).toContain("Some changes on this device haven't synced");
            expect(document.activeElement!.id).toBe('account-sign-out-warning');
            expect(clear).not.toHaveBeenCalled();

            await press('Cancel');
            expect(document.activeElement!.id).toBe('account-sign-out');
            expect(client.auth.signOut).not.toHaveBeenCalled();

            await press('Sign out');
            await press('Sign out anyway');
            expect(client.auth.signOut).toHaveBeenCalled();
            expect(clear).toHaveBeenCalledWith({ leaving: 'signed-out' });
        });

        it('asks before deleting the account, with focus on the warning', async () => {
            await press('Delete account');

            const warning = element.querySelector('#account-delete-warning')!;
            expect(warning.textContent).toContain("It can't be undone.");
            expect(document.activeElement).toBe(warning);
            expect(client.rpc).not.toHaveBeenCalledWith('delete_my_account');

            await press('Cancel');
            expect(document.activeElement!.id).toBe('account-delete');
        });

        it('deletes the account, then removes its data from this device too', async () => {
            await press('Delete account');
            expect(text()).toContain('on the server and on this device');
            await press('Delete my account');

            expect(client.rpc).toHaveBeenCalledWith('delete_my_account');
            expect(clear).toHaveBeenCalledWith({ leaving: 'deleted' });
        });

        it("leaves this device as it is if the account couldn't be deleted", async () => {
            client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
            await press('Delete account');
            await press('Delete my account');

            expect(clear).not.toHaveBeenCalled();
            expect(status()).toBe(
                "Your account couldn't be deleted. Check your connection and try again."
            );
        });

        it("says when the account couldn't be deleted", async () => {
            client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'failed' } });
            await press('Delete account');
            await press('Delete my account');

            expect(status()).toBe(
                "Your account couldn't be deleted. Check your connection and try again."
            );
            expect(text()).toContain('Signed in as me@example.com.');
        });
    });

    describe('signed in, with no consent to keeping notes on record (SYN-10)', () => {
        beforeEach(() => create('me@example.com', { consent: null }));

        it('asks for it, needing the box ticked', async () => {
            expect(text()).toContain('which needs your consent to keep them with your account');
            await press('Agree');

            expect(client.rpc).not.toHaveBeenCalledWith('give_health_consent', expect.anything());
            expect(element.querySelector('#health-consent-error')!.textContent).toBe(
                'Tick the box to agree.'
            );
            expect(document.activeElement!.id).toBe('health-consent');
        });

        it('saves it once ticked, then says when, with focus there', async () => {
            await tick();
            await press('Agree');

            expect(client.rpc).toHaveBeenCalledWith('give_health_consent', {
                notice_date: '2026-11-10',
            });
            expect(element.querySelector('#health-consent')).toBeNull();
            expect(document.activeElement!.id).toBe('consent-given');
            expect(text()).toContain('On 9 November 2026 you agreed');
        });

        it("says when it couldn't be saved", async () => {
            await tick();
            client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
            await press('Agree');

            expect(status()).toContain("That couldn't be saved.");
            expect(element.querySelector('#health-consent')).not.toBeNull();
        });
    });

    describe('below sync', () => {
        beforeEach(() => create());

        it('links to Settings, saying what is in it, sliding it in', () => {
            const navigate = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            const link = element.querySelector<HTMLAnchorElement>('.account__link')!;

            expect(link.getAttribute('href')).toBe('/settings');
            expect(link.textContent).toContain('Settings');
            expect(
                element.querySelector('#' + link.getAttribute('aria-describedby'))!.textContent
            ).toContain('Theme, alarms and sounds');
            link.click();

            expect(navigate).toHaveBeenCalledWith('/settings', 'in');
        });

        it('links to Help under Settings, sliding it in (NAV-7)', () => {
            const navigate = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            const links = element.querySelectorAll<HTMLAnchorElement>('.account__link');
            const help = links[1];

            expect(help.getAttribute('href')).toBe('/help');
            expect(help.textContent).toContain('Help');
            expect(
                element.querySelector('#' + help.getAttribute('aria-describedby'))!.textContent
            ).toContain('Questions and answers, from planning to sound');
            help.click();

            expect(navigate).toHaveBeenCalledWith('/help', 'in');
        });

        it('has your profile, with sex and weight units', () => {
            expect(element.querySelector('#profile-heading')!.textContent).toBe('Profile');
            expect(element.querySelector('app-profile input[name="bodyFigure"]')).not.toBeNull();
            expect(element.querySelector('app-profile input[name="weightUnit"]')).not.toBeNull();
        });

        it('has your data, with backups and Clear this device', () => {
            expect(element.querySelector('#data-heading')!.textContent).toBe('Your data');
            expect(button('Export backup')).toBeDefined();
            expect(button('Clear this device')).toBeDefined();
        });

        it('links to the privacy notice and terms of use, under About', () => {
            const links = [...element.querySelectorAll('.account__legal a')].map((a) => [
                a.textContent!.trim(),
                a.getAttribute('href'),
            ]);

            expect(links).toEqual([
                ['Privacy notice', '/privacy'],
                ['Terms of use', '/terms'],
            ]);
        });

        it('offers an email for feedback, under About, its subject filled in', () => {
            const link = element.querySelector<HTMLAnchorElement>('.account__feedback a')!;

            expect(link.textContent!.trim()).toBe('dan@loopworkouts.com');
            expect(link.getAttribute('href')).toBe(
                'mailto:dan@loopworkouts.com?subject=Loop%20Workouts%20feedback'
            );
        });
    });
});
