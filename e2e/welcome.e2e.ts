import { expect, test } from './fixtures';

// A device opening the app for the first time (NAV-3, NAV-4), with nothing set up for it
test.use({ onboarding: 'show' });

test('a new device is welcomed, goes on as a guest and can skip the setup', async ({
    app,
    page,
    network,
}) => {
    await app.goto('/');

    await expect(page).toHaveURL('/welcome');
    await expect(page.getByRole('heading', { name: 'Welcome to Loop Workouts' })).toBeVisible();
    // No tab bar on the welcome screen: it's one choice
    await expect(app.tabBar).toBeHidden();

    await page.getByRole('button', { name: 'Continue as guest' }).click();

    await expect(page).toHaveURL('/welcome/setup');
    await expect(page.getByRole('heading', { name: 'What should we call you?' })).toBeVisible();

    await page.getByRole('button', { name: 'Skip for now' }).click();

    await expect(page).toHaveURL('/home');
    await expect(app.tab('Today')).toHaveAttribute('aria-current', 'page');
    expect(await app.storageItem('welcomed')).toBe('guest');

    // Not asked again
    await app.reload();
    await expect(page).toHaveURL('/home');

    // A guest never talks to Supabase
    expect(network.supabase).toEqual([]);
});
