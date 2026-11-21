import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DeviceDataService } from '../shared/state/device-data.service';
import { PageSlide } from '../shared/navigation/page-slide';
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
import { SettingsStore } from '../shared/state/settings-store.service';

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
    });

    async function settle() {
        await new Promise((resolve) => setTimeout(resolve));
        await fixture.whenStable();
    }

    const text = () => element.textContent!.replace(/\s+/g, ' ');
    /** The switch keeping notes with the account (SYN-10). */
    const notesSwitch = () =>
        element.querySelector<HTMLButtonElement>('[aria-labelledby="keep-notes-label"]')!;
    /** What's been said: the sign-in's, and the tab's own, as there's one of each signed out. */
    const status = () =>
        [...element.querySelectorAll('[role="status"]')]
            .map((region) => region.textContent!.trim())
            .filter(Boolean)
            .join(' ');
    /** A button by its text, or its name when it's an icon. */
    const button = (label: string) =>
        [...element.querySelectorAll('button')].find(
            (b) => b.textContent!.trim() === label || b.getAttribute('aria-label') === label
        )!;
    async function press(label: string) {
        button(label).click();
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

    describe('signed out, keeping notes (SYN-10)', () => {
        beforeEach(() => create());

        it("isn't asked before signing in, as it's asked after", async () => {
            expect(element.querySelector('#health-consent')).toBeNull();
            expect(element.querySelector('[role="switch"]')).toBeNull();

            await press('Continue with Google');
            expect(client.auth.signInWithOAuth).toHaveBeenCalled();
            expect(client.rpc).not.toHaveBeenCalledWith('give_health_consent', expect.anything());
        });
    });

    describe('signed out', () => {
        beforeEach(() => create());

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

        it('says the account keeps notes, since when, and how to stop (SYN-10)', () => {
            expect(client.rpc).toHaveBeenCalledWith('my_health_consent');
            expect(notesSwitch().getAttribute('aria-checked')).toBe('true');
            expect(text()).toContain(
                'Agreed on 8 November 2026. Notes may mention your health. Turn off to delete them from your account; they stay on this device.'
            );
            expect(element.querySelector('#health-consent')).toBeNull();
        });

        it('stops keeping notes when switched off, the server deleting them', async () => {
            notesSwitch().click();
            await settle();

            expect(client.rpc).toHaveBeenCalledWith('withdraw_health_consent');
            expect(notesSwitch().getAttribute('aria-checked')).toBe('false');
            expect(text()).toContain('Notes may mention your health, so they stay on this device.');
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

        it("says signing out loses notes the account doesn't keep (SYN-10)", async () => {
            notesSwitch().click();
            await settle();
            sync.syncAll.mockResolvedValue(false);

            await press('Sign out');
            expect(text()).toContain(
                "Your notes aren't kept with your account, so signing out removes them from this device."
            );
            expect(clear).not.toHaveBeenCalled();
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

        it('says notes stay on this device, with the switch off', () => {
            expect(notesSwitch().getAttribute('aria-checked')).toBe('false');
            expect(text()).toContain(
                'Notes may mention your health, so they stay on this device. Turn on to agree to keeping them with your account'
            );
        });

        it('keeps them when switched on, saving the consent, then says when', async () => {
            notesSwitch().click();
            await settle();

            expect(client.rpc).toHaveBeenCalledWith('give_health_consent', {
                notice_date: '2026-11-21',
            });
            expect(notesSwitch().getAttribute('aria-checked')).toBe('true');
            expect(text()).toContain('Agreed on 9 November 2026.');
        });

        it("puts the switch back, saying so, when it couldn't be saved", async () => {
            client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
            notesSwitch().click();
            await settle();

            expect(status()).toContain("That couldn't be saved.");
            expect(notesSwitch().getAttribute('aria-checked')).toBe('false');
        });
    });

    describe('keeping the body weight with the account (CAL-6)', () => {
        const box = () => element.querySelector<HTMLInputElement>('#body-weight-consent');
        const hint = () => element.querySelector('#body-weight-hint')!.textContent!.trim();
        async function toggle() {
            box()!.click();
            await settle();
        }

        it("isn't offered signed out", async () => {
            await create();
            expect(box()).toBeNull();
            expect(hint()).toBe('For calories burnt. Kept on this device only');
        });

        it('signed in, asks for consent, saves it when ticked, and withdraws it unticked', async () => {
            await create('me@example.com');
            expect(client.rpc).toHaveBeenCalledWith('my_body_weight_consent');
            expect(box()!.checked).toBe(false);
            expect(box()!.closest('label')!.textContent).toContain(
                'I agree that my body weight, which is health data, is kept with my account'
            );

            await toggle();
            expect(client.rpc).toHaveBeenCalledWith('give_body_weight_consent', {
                notice_date: '2026-11-21',
            });
            expect(box()!.checked).toBe(true);
            expect(hint()).toBe('For calories burnt. Kept with your account');
            expect(status()).toContain('Agreed on 14 November 2026.');

            await toggle();
            expect(client.rpc).toHaveBeenCalledWith('withdraw_body_weight_consent');
            expect(box()!.checked).toBe(false);
            expect(hint()).toBe('For calories burnt. Kept on this device only');
        });

        it("says when it couldn't be saved, leaving the tick as it was", async () => {
            await create('me@example.com');
            client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });

            await toggle();

            expect(box()!.checked).toBe(false);
            expect(status()).toContain("That couldn't be saved.");
        });

        it('signing out removes a body weight the account kept, as its name', async () => {
            await create('me@example.com', {
                weightConsent: { at: Date.UTC(2026, 10, 14), notice: '2026-11-14' },
            });
            const settings = TestBed.inject(SettingsStore);
            settings.update({ bodyWeight: 80 });

            await press('Sign out');

            expect(settings.bodyWeight()).toBeNull();
        });

        it("signing out keeps a body weight the account didn't keep", async () => {
            await create('me@example.com');
            const settings = TestBed.inject(SettingsStore);
            settings.update({ bodyWeight: 80 });

            await press('Sign out');

            expect(settings.bodyWeight()).toBe(80);
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
