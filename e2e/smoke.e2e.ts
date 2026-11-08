import { expect, test } from './fixtures';

// The app loads, and the tab bar reaches each of its pages. Each test starts past the welcome
// screen and the setup (the fixtures' default).

test('opens on Today', async ({ app, page }) => {
    await app.goto('/');

    await expect(page).toHaveURL('/home');
    await expect(page.getByRole('heading', { level: 1, name: 'Loop Workouts' })).toBeVisible();
    await expect(app.tab('Today')).toHaveAttribute('aria-current', 'page');
});

const PAGES = [
    { tab: 'Workouts', path: '/library', heading: 'Workouts' },
    { tab: 'Exercises', path: '/exercises', heading: 'Exercises' },
    { tab: 'Progress', path: '/history', heading: 'Progress' },
    { tab: 'You', path: '/account', heading: 'You' },
] as const;

test('the tab bar reaches each page, and back to Today', async ({ app, page, network }) => {
    await app.goto('/home');

    for (const { tab, path, heading } of PAGES) {
        await app.tab(tab).click();

        await expect(page).toHaveURL(path);
        await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
        await expect(app.tab(tab)).toHaveAttribute('aria-current', 'page');
    }

    await app.tab('Today').click();
    await expect(page).toHaveURL('/home');
    await expect(app.tab('Today')).toHaveAttribute('aria-current', 'page');

    expect(network.supabase).toEqual([]);
});

test('a deep link opens its page', async ({ app, page }) => {
    await app.goto('/history');

    await expect(page.getByRole('heading', { level: 2, name: 'Progress' })).toBeVisible();
    await expect(app.tab('Progress')).toHaveAttribute('aria-current', 'page');
});

test.describe('with a light theme saved', () => {
    test.use({ storage: { settings: JSON.stringify({ theme: 'light' }) } });

    test('opens in the light theme', async ({ app, page }) => {
        await app.goto('/home');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });
});
