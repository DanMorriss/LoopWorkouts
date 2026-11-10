import { expect, NOW, run, seed, test, timed, workout } from './fixtures';
import { HistoryPage } from './history-page';
import { AUTH_KEY, FakeSupabase, signedIn } from './supabase';

// Signing in, sync and the account, with Supabase answered by FakeSupabase (supabase.ts) rather
// than reached (backup-and-sync.md): REG-ACC in docs/regression-tests.md.

const legs = workout('Legs', { steps: [timed(30, 'Squats')] });

/** The You tab's sign-in. */
const signIn = (page: import('@playwright/test').Page) => ({
    /** The tick for keeping notes that may mention health (SYN-10), needed to sign in. */
    agree: page.getByRole('checkbox', { name: /I agree that notes I write/ }),
    email: page.getByRole('textbox', { name: 'Email' }),
    send: page.getByRole('button', { name: 'Email me a sign-in link' }),
    code: page.getByRole('textbox', { name: 'Code' }),
    submit: page.getByRole('button', { name: 'Sign in', exact: true }),
});

test.describe('signing in by email', () => {
    test.use({ storage: seed.workouts([legs]) });

    test(
        'REG-ACC-01 signing in by email: checks and errors',
        { tag: '@p1' },
        async ({ app, page }) => {
            const supabase = new FakeSupabase(page);
            await supabase.install();
            const form = signIn(page);
            await app.goto('/account');
            await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Continue with Apple' })).toHaveCount(0);

            // Nothing's sent without the tick, which says why and takes focus
            await form.email.fill('me@example.com');
            await form.send.click();
            await expect(page.getByText('Tick the box to agree before signing in.')).toBeVisible();
            await expect(form.agree).toBeFocused();
            await form.agree.check();
            await expect(page.getByText('Tick the box to agree before signing in.')).toHaveCount(0);

            await form.email.fill('');
            await form.send.click();
            await expect(page.getByText('Enter your email address.')).toBeVisible();
            await expect(form.email).toBeFocused();
            await form.email.fill('nope');
            await form.send.click();
            await expect(
                page.getByText("That isn't an email address. Check it and try again.")
            ).toBeVisible();
            expect(supabase.callsTo('auth/v1/otp')).toEqual([]);

            supabase.otp = 429;
            await form.email.fill('me@example.com');
            await form.send.click();
            await expect(
                page.getByText('Too many sign-in emails for now. Wait a while, then try again.')
            ).toBeVisible();

            supabase.otp = 'abort';
            await form.send.click();
            await expect(
                page.getByText("The email couldn't be sent. Check your connection and try again.")
            ).toBeVisible();
        }
    );

    test('REG-ACC-02 signing in with the code', { tag: '@p1' }, async ({ app, page }) => {
        const supabase = new FakeSupabase(page);
        await supabase.install();
        const form = signIn(page);
        await app.goto('/account');

        await form.agree.check();
        await form.email.fill(' me@example.com ');
        await form.send.click();
        await expect(page.getByText(/We've sent a sign-in link to/)).toContainText(
            "We've sent a sign-in link to me@example.com. Open it on this device, or type the code from the email here."
        );
        expect(supabase.callsTo('auth/v1/otp')[0].body).toMatchObject({
            email: 'me@example.com',
        });
        await expect(page.getByRole('button', { name: 'Use another email' })).toBeVisible();

        await form.code.fill('12a');
        await form.submit.click();
        await expect(
            page.getByText('The code is the number in the email, e.g. 123456.')
        ).toBeVisible();

        supabase.verify = 403;
        await form.code.fill('123456');
        await form.submit.click();
        await expect(
            page.getByText(
                "That code didn't work: it may be wrong, or expired. Check it, or send another email."
            )
        ).toBeVisible();

        supabase.verify = 200;
        await form.submit.click();
        await expect(page).toHaveURL('/home');
        await expect(app.undoBar).toContainText('Signed in as me@example.com');
        // Fetched, then this device's Legs sent
        await expect.poll(() => supabase.callsTo('rpc/push_records').length).toBeGreaterThan(0);
        expect(supabase.callsTo('rpc/pull_records').length).toBeGreaterThan(0);
        expect(JSON.stringify(supabase.callsTo('rpc/push_records')[0].body)).toContain('"Legs"');

        await app.tab('You').click();
        const sync = page.getByRole('region', { name: 'Sync' });
        await expect(sync.getByText('Signed in as me@example.com.')).toBeVisible();
        await expect(sync.getByText(/Synced at /)).toBeVisible();
        await expect(sync.getByRole('button', { name: 'Sign out' })).toBeVisible();
        await expect(sync.getByRole('button', { name: 'Delete account' })).toBeVisible();
        // The tick was saved with the account, dated by the server, under the notice's date
        expect(supabase.callsTo('rpc/give_health_consent')[0].body).toEqual({
            notice_date: '2026-11-10',
        });
        await expect(
            page.getByText(
                'On 11 November 2026 you agreed that notes you write, which may mention your health, are kept with your account (under the privacy notice of 10 November 2026).'
            )
        ).toBeVisible();
    });
});

test.describe('Google, and links that come back with an error', () => {
    test(
        'REG-ACC-03 Continue with Google goes to Google',
        { tag: '@p2' },
        async ({ app, page }) => {
            const supabase = new FakeSupabase(page);
            await supabase.install();
            await app.goto('/account');
            const google = page.getByRole('button', { name: 'Continue with Google' });
            await google.click();
            await expect(signIn(page).agree).toBeFocused();
            expect(supabase.callsTo('auth/v1/authorize')).toEqual([]);
            await signIn(page).agree.check();
            await google.click();
            await expect.poll(() => supabase.callsTo('auth/v1/authorize').length).toBe(1);
        }
    );

    for (const [link, said] of [
        [
            '/account#error=access_denied&error_description=cancelled',
            "Signing in didn't finish. Try again, or sign in another way.",
        ],
        [
            '/account#error=access_denied&error_code=otp_expired&error_description=expired',
            'That sign-in link has expired or was used already. Send yourself another.',
        ],
        [
            // Landing on the wrong page, it goes on to You
            '/home#error=access_denied&error_code=otp_expired',
            'That sign-in link has expired or was used already. Send yourself another.',
        ],
    ]) {
        test(
            `REG-ACC-03 a link back with an error: ${link}`,
            { tag: '@p2' },
            async ({ app, page }) => {
                await app.goto(link);
                await expect(page).toHaveURL('/account');
                await expect(page.getByRole('alert').filter({ hasText: said })).toBeVisible();
            }
        );
    }

    test('REG-ACC-03 a real Google sign-in', { tag: '@p2' }, () => {
        test.skip(
            true,
            "Manual: sign in with Google on a Vercel preview, and in Safari on an iPhone, as it's Google's page and the real Content-Security-Policy."
        );
    });
});

test.describe('signing in from the welcome screen', () => {
    test.use({ onboarding: 'show' });

    for (const withProfile of [false, true]) {
        test(
            `REG-ACC-04 signing in from the welcome screen, ${withProfile ? 'with' : 'without'} a profile`,
            {
                tag: '@p1',
            },
            async ({ app, page }) => {
                const supabase = new FakeSupabase(page);
                const now = Date.parse(NOW);
                if (withProfile) {
                    supabase.pull = [
                        {
                            seq: 1,
                            kind: 'profile',
                            id: 'me',
                            updated_at: now,
                            deleted_at: null,
                            version: 15,
                            data: {
                                id: 'me',
                                updatedAt: now,
                                name: 'Sam',
                                bodyFigure: 'male',
                                trainingGoal: 'fitness',
                                weightUnit: 'lb',
                                myEquipment: [],
                            },
                        },
                    ];
                }
                await supabase.install();
                const form = signIn(page);
                await app.goto('/');
                await form.agree.check();
                await form.email.fill('me@example.com');
                await form.send.click();
                await form.code.fill('123456');
                await form.submit.click();

                if (withProfile) {
                    // Its profile comes with it, so nothing's asked
                    await expect(page).toHaveURL('/home');
                    await expect(app.heading('Good morning, Sam')).toBeVisible();
                    await app.tab('You').click();
                    await expect(page.getByRole('radio', { name: 'Fitness' })).toBeChecked();
                    await expect(page.getByRole('radio', { name: 'Pounds (lb)' })).toBeChecked();
                } else {
                    await expect(page).toHaveURL('/welcome/setup');
                    await expect(page.getByText('Question 1 of 5')).toBeVisible();
                }
            }
        );
    }
});

test.describe('signed in', () => {
    test.use({
        storage: {
            ...signedIn('me@example.com', Date.parse(NOW)),
            ...seed.workouts([legs]),
            ...seed.history([run(legs, '2026-11-10T18:00')]),
            ...seed.settings({ theme: 'light', name: 'Sam' }),
        },
    });

    test('REG-ACC-05 signing out', { tag: '@p1' }, async ({ app, page }) => {
        const supabase = new FakeSupabase(page);
        await supabase.install();
        await app.goto('/account');
        await page.getByRole('button', { name: 'Sign out' }).click();
        await expect(app.undoBar).toContainText(
            'Signed out. Your data was removed from this device; your account keeps it.'
        );
        await expect(page).toHaveURL('/account');
        expect(await app.storageItem('workouts')).toBeNull();
        expect(await app.storageItem(AUTH_KEY)).toBeNull();
        expect(await app.storageItem('sync')).toBeNull();
        // The theme's this device's, so it stays; the name was the account's profile
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('');
        await app.goto('/history');
        await expect(new HistoryPage(page).entries).toHaveCount(0);
        await app.goto('/home');
        await expect(page).toHaveURL('/welcome');
    });

    test(
        'REG-ACC-05 signing out with changes not synced',
        { tag: '@p1' },
        async ({ app, page }) => {
            const supabase = new FakeSupabase(page);
            supabase.push = 'abort';
            await supabase.install();
            await app.goto('/account');
            const signOut = page.getByRole('button', { name: 'Sign out' });
            await signOut.click();
            await expect(
                page.getByRole('group', {
                    name: /^Some changes on this device haven't synced, maybe because you're offline/,
                })
            ).toBeVisible();
            await page.getByRole('button', { name: 'Cancel' }).click();
            await expect(signOut).toBeFocused();
            expect(await app.storageItem(AUTH_KEY)).not.toBeNull();

            await signOut.click();
            await page.getByRole('button', { name: 'Sign out anyway' }).click();
            await expect(app.undoBar).toContainText('Signed out.');
            expect(await app.storageItem('workouts')).toBeNull();
        }
    );

    test('REG-ACC-06 deleting the account', { tag: '@p2' }, async ({ app, page }) => {
        const supabase = new FakeSupabase(page);
        await supabase.install();
        await app.goto('/account');
        const remove = page.getByRole('button', { name: 'Delete account' });
        await remove.click();
        await expect(
            page.getByRole('group', {
                name: /^This deletes your account and everything of yours/,
            })
        ).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(remove).toBeFocused();
        expect(supabase.callsTo('rpc/delete_my_account')).toEqual([]);

        supabase.deleteAccount = 500;
        await remove.click();
        await page.getByRole('button', { name: 'Delete my account' }).click();
        await expect(
            page.getByText("Your account couldn't be deleted. Check your connection and try again.")
        ).toBeVisible();
        expect(await app.storageItem(AUTH_KEY)).not.toBeNull();

        supabase.deleteAccount = 204;
        await page.getByRole('button', { name: 'Delete my account' }).click();
        await expect(app.undoBar).toContainText(
            'Your account has been deleted, and its data removed from this device.'
        );
        expect(supabase.callsTo('rpc/delete_my_account').length).toBeGreaterThan(1);
        expect(await app.storageItem('workouts')).toBeNull();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test(
        'REG-ACC-06 sync status: offline, then back',
        { tag: '@p2' },
        async ({ app, page, context }) => {
            const supabase = new FakeSupabase(page);
            await supabase.install();
            // Workouts' code loaded first, as nothing can load offline
            await app.goto('/library');
            await app.tab('You').click();
            await expect(page.getByText(/Synced at /)).toBeVisible();

            await context.setOffline(true);
            supabase.push = 'abort';
            await app.tab('Workouts').click();
            await page.getByRole('button', { name: 'Favourite Legs' }).click();
            await app.tab('You').click();
            await expect(
                page.getByText("You're offline: it'll sync when you're back online.")
            ).toBeVisible();

            supabase.push = 200;
            const before = supabase.callsTo('rpc/push_records').length;
            await context.setOffline(false);
            await expect
                .poll(() =>
                    supabase
                        .callsTo('rpc/push_records')
                        .slice(before)
                        .map((call) => JSON.stringify(call.body))
                        .join()
                )
                .toContain('"favourite":true');
        }
    );

    test.describe('when the server fails', () => {
        test('REG-ACC-06 a sync that fails says so', { tag: '@p2' }, async ({ app, page }) => {
            const supabase = new FakeSupabase(page);
            supabase.pull = 500;
            await supabase.install();
            await app.goto('/account');
            await expect(
                page.getByText("It couldn't sync just now, and will try again in a minute.")
            ).toBeVisible();
        });
    });
});

test.describe('a session the server has ended', () => {
    test.use({
        storage: {
            // Expired an hour ago, so it's refreshed as the app opens, which the server turns down
            ...signedIn('me@example.com', Date.parse(NOW) - 2 * 3600_000),
            ...seed.workouts([legs]),
            ...seed.settings({ theme: 'light' }),
        },
    });

    test('REG-ACC-05 signed out by the server', { tag: '@p1' }, async ({ app, page }) => {
        const supabase = new FakeSupabase(page);
        supabase.user = 401;
        await supabase.install();
        await app.goto('/account');
        await expect(app.undoBar).toContainText(
            'You were signed out, so your data was removed from this device. Signing in again brings back what your account has.'
        );
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        expect(await app.storageItem('workouts')).toBeNull();
    });
});

test.describe('consent to keeping notes, signed in', () => {
    test.use({ storage: signedIn('me@example.com', Date.parse(NOW)) });

    test(
        'REG-ACC-07 an account with no consent on record is asked',
        { tag: '@p1' },
        async ({ app, page }) => {
            const supabase = new FakeSupabase(page);
            await supabase.install();
            await app.goto('/account');
            await expect(
                page.getByText(
                    'Notes you write may mention your health, which needs your consent to keep them with your account.'
                )
            ).toBeVisible();
            const agree = page.getByRole('button', { name: 'Agree' });
            const tick = signIn(page).agree;

            await agree.click();
            await expect(page.getByText('Tick the box to agree.')).toBeVisible();
            await expect(tick).toBeFocused();

            supabase.consentAnswer = 'abort';
            await tick.check();
            await agree.click();
            await expect(
                page.getByText("That couldn't be saved. Check your connection and try again.")
            ).toBeVisible();

            supabase.consentAnswer = 200;
            await agree.click();
            const given = page.getByText(/On 11 November 2026 you agreed that notes you write/);
            await expect(given).toBeVisible();
            await expect(given).toBeFocused();
            await expect(agree).toHaveCount(0);
        }
    );

    test(
        "REG-ACC-07 consent on record is shown; none when it can't be looked up",
        { tag: '@p2' },
        async ({ app, page }) => {
            const supabase = new FakeSupabase(page);
            supabase.consent = { at: Date.parse('2026-11-09T12:00:00Z'), notice: '2026-11-08' };
            await supabase.install();
            await app.goto('/account');
            await expect(
                page.getByText(
                    'On 9 November 2026 you agreed that notes you write, which may mention your health, are kept with your account (under the privacy notice of 8 November 2026). To withdraw, delete those notes, or your account.'
                )
            ).toBeVisible();

            supabase.consentAnswer = 'abort';
            await app.reload();
            await expect(page.getByText('Signed in as me@example.com.')).toBeVisible();
            await expect(page.getByText(/you agreed that notes/)).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'Agree' })).toHaveCount(0);
        }
    );
});
