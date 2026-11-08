import { ALARM, expect, reps, seed, stepsOf, test, workout, type Workout } from './fixtures';
import { CreatePage } from './create-page';
import { setWheel, WorkoutPage } from './workout-page';

// Settings and the profile (settings.md): REG-SET in docs/regression-tests.md.

/** The page's theme, and its colour bar's (the theme-color meta). */
const theme = (page: import('@playwright/test').Page) => page.locator('html');

test.describe('the theme', () => {
    test('REG-SET-01 theme', { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/account');
        await page.getByRole('link', { name: /^Settings/ }).click();
        await expect(page).toHaveURL('/settings');
        await expect(app.backLink('You')).toBeVisible();
        await expect(app.tab('You')).toHaveAttribute('aria-current', 'true');
        await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
        for (const name of ['Sound', 'Countdown beeps', 'Vibration', 'Keep screen on']) {
            await expect(page.getByRole('switch', { name })).toBeChecked();
        }

        const themeColor = () =>
            page.evaluate(() =>
                document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
            );
        const dark = await themeColor();
        await page.getByRole('radio', { name: 'Light' }).check();
        await expect(theme(page)).toHaveAttribute('data-theme', 'light');
        expect(await themeColor()).not.toBe(dark);
        await app.reload();
        await expect(theme(page)).toHaveAttribute('data-theme', 'light');

        // System follows the device, without a reload
        await page.getByRole('radio', { name: 'System' }).check();
        await page.emulateMedia({ colorScheme: 'dark' });
        await expect(theme(page)).toHaveAttribute('data-theme', 'dark');
        await page.emulateMedia({ colorScheme: 'light' });
        await expect(theme(page)).toHaveAttribute('data-theme', 'light');
    });

    test.describe('with broken settings saved', () => {
        test.use({ storage: { settings: 'not json' } });

        test(
            'REG-SET-01 the app loads with the defaults',
            { tag: '@p1' },
            async ({ app, page }) => {
                await app.goto('/settings');
                await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
                await expect(theme(page)).toHaveAttribute('data-theme', 'dark');
            }
        );
    });
});

test.describe('alarm previews', () => {
    test.use({ storage: seed.settings({ sound: false }) });

    test(
        'REG-SET-02 alarm previews play even with Sound off',
        { tag: '@p2' },
        async ({ app, page, device }) => {
            await app.goto('/settings');
            const notes = async () => (await device.notes()).map((note) => note.frequency);
            await page.getByRole('button', { name: 'Play the rest alarm' }).click();
            await expect.poll(notes).toEqual([ALARM.rest]);
            await page.getByRole('button', { name: 'Play the timed alarm' }).click();
            await expect.poll(notes).toEqual([ALARM.rest, ALARM.work, ALARM.work]);
            await page.getByRole('button', { name: 'Play the finish alarm' }).click();
            await page.getByRole('button', { name: 'Play the countdown alarm' }).click();
            await expect.poll(notes).toContain(ALARM.finish);
            await expect.poll(notes).toContain(ALARM.countdown);
        }
    );

    test.describe("on a device that can't vibrate or keep the screen on", () => {
        test.use({ deviceApis: { audio: 'allowed', vibrate: false, wakeLock: false } });

        test(
            "REG-SET-02 what the device can't do is said",
            { tag: '@p2' },
            async ({ app, page }) => {
                await app.goto('/settings');
                await expect(page.getByRole('switch', { name: 'Vibration' })).toBeDisabled();
                await expect(page.getByText("This device can't vibrate")).toBeVisible();
                await expect(page.getByRole('switch', { name: 'Keep screen on' })).toBeDisabled();
                await expect(page.getByText("This browser can't keep the screen on")).toBeVisible();
            }
        );
    });
});

test.describe('the profile', () => {
    const pounds = workout('Pounds', {
        steps: [reps(10, 'Back squat', { exercise: 'back-squat', weight: 61.235 })],
    });
    const light = workout('Light', {
        steps: [reps(10, 'Goblet squat', { exercise: 'goblet-squat', weight: 20.412 })],
    });
    test.use({ storage: seed.workouts([pounds, light]), now: '2026-11-11T19:00:00Z' });

    test(
        'REG-SET-03 profile: name, sex, units, training for',
        { tag: '@p1' },
        async ({ app, page }) => {
            // Create is slow on a busy machine (a few seconds a step with six tests going), and
            // this goes through it twice
            test.slow();
            await app.goto('/account');
            const profile = page.getByRole('region', { name: 'Profile' });
            const name = profile.getByRole('textbox', { name: 'Name' });
            await name.fill(' Sam ');
            await name.press('Tab');
            await expect(name).toHaveValue('Sam');
            await app.tab('Today').click();
            await expect(app.heading('Good evening, Sam')).toBeVisible();

            await app.tab('You').click();
            await profile.getByRole('radio', { name: 'Female' }).check();
            await app.reload();
            await expect(profile.getByRole('radio', { name: 'Female' })).toBeChecked();

            await profile.getByRole('radio', { name: 'Pounds (lb)' }).check();
            await app.goto('/setup?editId=pounds');
            const create = new CreatePage(page);
            await create.open(1);
            await expect(create.field(1, 'Weight (lb)')).toHaveAttribute('aria-valuenow', '135');

            // A new step at 135 lb is saved in kg; a weight only renamed around stays exactly
            await create.addStep.click();
            await create.name(2, 'Front squat');
            await setWheel(create.field(2, 'Reps'), 5);
            await setWheel(create.field(2, 'Weight (lb)'), 135, 0.5);
            await create.save.click();
            await expect(page).not.toHaveURL(/\/setup/);
            const saved = (await app.stored<Workout[]>('workouts'))!;
            expect(stepsOf(saved.find((w) => w.title === 'Pounds')!)[1]).toMatchObject({
                weight: 61.235,
            });

            await app.goto('/setup?editId=light');
            await create.title.fill('Light 2');
            await create.save.click();
            await expect(page).not.toHaveURL(/\/setup/);
            const after = (await app.stored<Workout[]>('workouts'))!;
            expect(stepsOf(after.find((w) => w.title === 'Light 2')!)[0]).toMatchObject({
                weight: 20.412,
            });

            // On the workout's face too
            await app.goto('/library');
            const run = new WorkoutPage(page);
            await run.startFromLibrary('Pounds');
            await expect(run.wheel('Weight, lb')).toHaveAttribute('aria-valuenow', '135');

            await run.close.click();
            await app.tab('You').click();
            await profile.getByRole('radio', { name: 'Fitness' }).check();
            await expect(profile.getByText(/6 to 12 sets a week/)).toBeVisible();
        }
    );
});

test.describe('about', () => {
    test('REG-SET-04 about, privacy and terms', { tag: '@p3' }, async ({ app, page }) => {
        await app.goto('/account');
        const about = page.getByRole('region', { name: 'About' });
        await expect(about).toContainText('Loop Workouts: build a workout, then let it loop.');
        await expect(about.getByRole('link', { name: 'dan@loopworkouts.com' })).toHaveAttribute(
            'href',
            /^mailto:dan@loopworkouts\.com\?subject=Loop%20Workouts%20feedback/
        );

        await about.getByRole('link', { name: 'Privacy notice' }).click();
        await expect(page).toHaveURL('/privacy');
        await expect(app.tab('You')).toHaveAttribute('aria-current', 'true');
        await app.backLink('You').click();
        await about.getByRole('link', { name: 'Terms of use' }).click();
        await expect(page).toHaveURL('/terms');
        await app.backLink('You').click();
        await expect(page).toHaveURL('/account');
    });
});
