import { at, expect, rest, seed, test, timed, workout } from './fixtures';
import { HistoryPage } from './history-page';
import { WorkoutPage } from './workout-page';

// Onboarding and getting about the app (home-and-navigation.md): REG-NAV in
// docs/regression-tests.md. welcome.e2e.ts has the smoke test of the same first steps.

test.describe('a device new to the app', () => {
    test.use({ onboarding: 'show' });

    test(
        'REG-NAV-01 first visit: the welcome screen, then the setup',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/');
            await expect(page).toHaveURL('/welcome');
            await expect(
                page.getByRole('heading', { name: 'Welcome to Loop Workouts' })
            ).toBeVisible();
            await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
            await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
            await expect(
                page.getByRole('button', { name: 'Email me a sign-in link' })
            ).toBeVisible();
            await expect(app.tabBar).toBeHidden();
            expect(await app.storageItem('setup')).toBe('due');

            await page.getByRole('button', { name: 'Continue as guest' }).click();
            await expect(page).toHaveURL('/welcome/setup');
            expect(await app.storageItem('welcomed')).toBe('guest');
            await expect(page.getByText('Question 1 of 5')).toBeVisible();
            await expect(
                page.getByRole('heading', { name: 'What should we call you?' })
            ).toBeFocused();
            await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible();
            await expect(app.tabBar).toBeHidden();
        }
    );

    test(
        'REG-NAV-01 a deep link opens its page, not the welcome screen',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/exercises/back-squat');
            await expect(page).toHaveURL('/exercises/back-squat');
            await expect(app.heading('Back squat')).toBeVisible();
        }
    );

    test(
        'REG-NAV-02 the setup, answered all the way through',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/');
            await page.getByRole('button', { name: 'Continue as guest' }).click();
            const next = page.getByRole('button', { name: 'Next' });
            const skip = page.getByRole('button', { name: 'Skip for now' });
            const place = async () => [await next.boundingBox(), await skip.boundingBox()];

            await page.getByRole('textbox', { name: 'Your name' }).fill('Sam');
            const first = await place();
            // Enter is Next
            await page.getByRole('textbox', { name: 'Your name' }).press('Enter');

            await expect(page.getByText('Question 2 of 5')).toBeVisible();
            await expect(
                page.getByRole('heading', { name: 'What do you train for?' })
            ).toBeFocused();
            // Next and Skip for now stay put from question to question
            expect(await place()).toEqual(first);
            await page.getByRole('radio', { name: /^Fitness/ }).check();
            await next.click();

            await expect(page.getByText('Question 3 of 5')).toBeVisible();
            await expect(
                page.getByRole('heading', { name: 'What equipment do you have?' })
            ).toBeFocused();
            await page.getByRole('button', { name: 'Kettlebell', exact: true }).click();
            await next.click();

            await expect(page.getByText('Question 4 of 5')).toBeVisible();
            await page.getByRole('radio', { name: 'Female' }).check();
            await next.click();

            await expect(page.getByText('Question 5 of 5')).toBeVisible();
            await expect(
                page.getByRole('heading', { name: 'Do you lift in kilograms or pounds?' })
            ).toBeFocused();
            await expect(page.getByRole('radio', { name: /^Kilograms/ })).toBeChecked();
            await page.getByRole('button', { name: 'Done' }).click();

            await expect(page).toHaveURL('/home');
            await expect(app.heading('Good morning, Sam')).toBeVisible();
            await expect(app.undoBar).toContainText(
                "You're all set, Sam. Change any of it on You, under Profile."
            );
            await expect(app.undo).toHaveCount(0);
            expect(await app.storageItem('setup')).toBeNull();
            // Get started offers a ready-made plan for the goal and the kit (M3)
            await expect(
                page.getByRole('region', { name: 'Get started' }).getByRole('article')
            ).toHaveAccessibleName('Fitness, 4 days');

            await app.reload();
            await expect(page).toHaveURL('/home');
            await app.tab('You').click();
            const profile = page.getByRole('region', { name: 'Profile' });
            await expect(profile.getByRole('textbox', { name: 'Name' })).toHaveValue('Sam');
            await expect(profile.getByRole('radio', { name: 'Female' })).toBeChecked();
            await expect(profile.getByRole('radio', { name: 'Fitness' })).toBeChecked();
            await expect(profile.getByRole('radio', { name: 'Kilograms (kg)' })).toBeChecked();

            await app.tab('Exercises').click();
            await expect(page.getByRole('switch', { name: 'Only what I have' })).toBeChecked();
            await expect(page.getByRole('button', { name: 'My equipment: 1 piece' })).toBeVisible();
        }
    );

    test('REG-NAV-03 skipping the setup', { tag: '@p2' }, async ({ app, page }) => {
        await app.goto('/');
        await page.getByRole('button', { name: 'Continue as guest' }).click();
        await page.getByRole('button', { name: 'Skip for now' }).click();

        await expect(page).toHaveURL('/home');
        await expect(app.heading('Good morning')).toBeVisible();
        await expect(app.undoBar).toBeHidden();
        expect(await app.storageItem('setup')).toBeNull();

        await app.reload();
        await expect(page).toHaveURL('/home');
        await app.tab('You').click();
        const profile = page.getByRole('region', { name: 'Profile' });
        await expect(profile.getByRole('textbox', { name: 'Name' })).toHaveValue('');
        await expect(profile.getByRole('radio', { name: 'Male', exact: true })).toBeChecked();
        await expect(profile.getByRole('radio', { name: 'Muscle' })).toBeChecked();
        await expect(profile.getByRole('radio', { name: 'Kilograms (kg)' })).toBeChecked();
    });
});

test.describe('a device in use before the welcome screen', () => {
    test.use({
        onboarding: 'show',
        storage: seed.workouts([workout('Legs', { steps: [timed(30)] })]),
    });

    test('REG-NAV-01 opens Today straight away', { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/home');
        await expect(page).toHaveURL('/home');
        await expect(app.tab('Today')).toHaveAttribute('aria-current', 'page');
        expect(await app.storageItem('welcomed')).toBe('guest');
    });
});

test.describe('getting about', () => {
    const legs = workout('Legs', { steps: [timed(30, 'Squats')] });
    test.use({ storage: seed.workouts([legs]) });

    test(
        'REG-NAV-04 tabs, where pages open, and coming back',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/');
            const tabs = ['Today', 'Workouts', 'Exercises', 'Progress', 'You'];
            await expect(app.tabBar.getByRole('link')).toHaveCount(tabs.length);
            for (const [i, name] of tabs.entries()) {
                await expect(app.tabBar.getByRole('link').nth(i)).toHaveAccessibleName(name);
            }
            await expect(app.tab('Today')).toHaveAttribute('aria-current', 'page');

            // The tab a page is under is marked as the current item on it
            const under = [
                ['/settings', 'You'],
                ['/help', 'You'],
                ['/privacy', 'You'],
                ['/terms', 'You'],
                ['/plan', 'Today'],
                ['/ready-made-plans', 'Today'],
                ['/setup', 'Workouts'],
                ['/library/legs', 'Workouts'],
            ] as const;
            for (const [path, tab] of under) {
                await app.goto(path);
                await expect(app.tab(tab), path).toHaveAttribute('aria-current', 'true');
            }

            // An exercise opens at its top; ‹ Exercises brings the list back where it was
            await app.goto('/exercises');
            const last = page.getByRole('link', { name: /^Zercher squat|^Wall sit/ }).last();
            await last.scrollIntoViewIfNeeded();
            const scrolled = await page.evaluate(() => window.scrollY);
            expect(scrolled).toBeGreaterThan(500);
            await last.click();
            await expect(page).toHaveURL(/\/exercises\/[a-z-]+$/);
            expect(await page.evaluate(() => window.scrollY)).toBe(0);
            await app.backLink('Exercises').click();
            await expect(page).toHaveURL('/exercises');
            await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
            await expect(last).toBeFocused();

            // Another tab opens at its top
            await app.tab('Progress').click();
            await page.mouse.wheel(0, 2000);
            await app.tab('Workouts').click();
            await expect(page).toHaveURL('/library');
            await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        }
    );

    test.describe('at 320px wide', () => {
        test.use({ viewport: { width: 320, height: 640 } });

        test('REG-NAV-04 each tab is at least 44px wide', { tag: '@p1' }, async ({ app }) => {
            await app.goto('/home');
            for (const tab of ['Today', 'Workouts', 'Exercises', 'Progress', 'You'] as const) {
                const box = await app.tab(tab).boundingBox();
                expect(box!.width, tab).toBeGreaterThanOrEqual(44);
                expect(box!.height, tab).toBeGreaterThanOrEqual(44);
            }
        });
    });
});

test.describe('the run bar', () => {
    const circuit = workout('Circuit', {
        steps: [timed(30, 'Squats', 'bodyweight-squat'), rest(10)],
        repeats: 2,
    });
    test.use({ storage: seed.workouts([circuit]) });

    test(
        'REG-NAV-05 the run bar, and back to the workout',
        { tag: '@p1' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Circuit');
            await expect(app.tabBar).toBeHidden();
            await expect(run.close).toHaveAccessibleName('Back to Workouts');

            await run.close.click();
            await expect(page).toHaveURL('/library');
            await expect(app.runBar).toContainText('Circuit');
            await expect(app.runBar).toContainText(/Squats · 00:[23]\d/);

            await app.runBar.getByRole('button', { name: 'Pause' }).click();
            await expect(app.runBar).toContainText(/Paused · Squats · 00:[23]\d/);
            await app.runBar.getByRole('button', { name: 'Resume' }).click();
            await expect(app.runBar.getByRole('button', { name: 'Pause' })).toBeVisible();

            // It finishes, and is logged, while another page is open
            await app.tab('Progress').click();
            await page.clock.runFor(80_000);
            await expect(app.runBar).toContainText('Finished: see how it went');
            await expect(app.runBar.getByRole('button', { name: 'Pause' })).toHaveCount(0);
            const entry = new HistoryPage(page).entry('Circuit');
            await expect(entry).toContainText('2 rounds');

            await app.runBar.getByRole('link').click();
            await expect(page).toHaveURL('/workout');
            await expect(run.summary).toHaveAccessibleName('Workout finished');
        }
    );

    test(
        'REG-NAV-05 the workout page with nothing running',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/workout');
            await expect(page.getByText('No workout selected.')).toBeVisible();
            await page.getByRole('link', { name: 'Choose a workout' }).click();
            await expect(page).toHaveURL('/library');

            await app.goto('/timer');
            await expect(page).toHaveURL('/workout');
        }
    );
});

test.describe('help', () => {
    const legs = workout('Legs', { steps: [timed(30)] });
    test.use({
        storage: {
            ...seed.workouts([legs]),
            // Planned on Monday today, a Wednesday: it counts from next week
            ...seed.plan({ mon: ['legs'] }, { '0:legs': at('2026-11-11T08:00') }),
        },
    });

    test('REG-NAV-06 Help, its search, and a ? link', { tag: '@p2' }, async ({ app, page }) => {
        await app.goto('/account');
        await page.getByRole('link', { name: /^Help/ }).click();
        await expect(page).toHaveURL('/help');
        await expect(app.heading('Help')).toBeVisible();
        await expect(app.backLink('You')).toBeVisible();
        await expect(app.tab('You')).toHaveAttribute('aria-current', 'true');
        const opened = page.locator('details[open]');
        await expect(opened).toHaveCount(0);

        const search = page.getByRole('searchbox', { name: 'Search help' });
        await search.fill('iphone');
        await expect(page.getByRole('status').filter({ hasText: /answers?$/ })).toHaveText(
            '3 answers'
        );
        await expect(page.getByRole('group')).toHaveCount(3);
        await expect(opened).toHaveCount(3);

        await search.fill('zzzz');
        await expect(
            page.getByText('Nothing matches "zzzz". Try other words, or email us below.')
        ).toBeVisible();

        await app.goto('/plan');
        await page
            .getByRole('region', { name: 'Monday' })
            .getByRole('link', { name: /^Help: / })
            .click();
        await expect(page).toHaveURL(/\/help/);
        const topic = page.getByRole('group').filter({
            hasText: 'What do Done, Missed, Due and From next week mean?',
        });
        await expect(topic).toHaveAttribute('open', '');
        await expect(
            topic.getByText('What do Done, Missed, Due and From next week mean?')
        ).toBeFocused();
    });
});
