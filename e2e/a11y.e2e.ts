import type { Locator, Page } from '@playwright/test';
import { axeViolations } from './axe';
import {
    expect,
    reps,
    rest,
    run,
    seed,
    sets,
    test,
    timed,
    workout,
    type Settings,
} from './fixtures';
import { CreatePage } from './create-page';
import { WorkoutPage } from './workout-page';

// Accessibility at the level of whole journeys (accessibility.md): REG-A11Y in
// docs/regression-tests.md. a11y.spec.ts (Vitest) runs axe over every state of each component;
// these run it once on each page of the real app, and check focus, keys and announcements.

const legs = workout('Legs', {
    steps: [reps(10, 'Back squat', { exercise: 'back-squat', weight: 60 }), rest(5)],
    repeats: 2,
});
const intervals = workout('Intervals', {
    steps: [timed(30, 'Plank', 'plank'), rest(10)],
    repeats: 2,
});
const data = {
    ...seed.workouts([legs, intervals]),
    ...seed.history([
        run(legs, '2026-11-10T18:00', {
            sets: sets('back-squat', 'Back squat', [10, 60], [10, 60]),
        }),
    ]),
    ...seed.plan({ mon: ['legs'], wed: ['intervals'] }),
};

/** Checks the page with axe, naming it in the report. */
async function noViolations(page: Page, name: string) {
    expect(await axeViolations(page), `axe on ${name}`).toEqual([]);
}

for (const theme of ['dark', 'light'] as const) {
    test.describe(`axe, ${theme}`, () => {
        test.use({ storage: { ...data, ...seed.settings({ theme } as Partial<Settings>) } });

        test(
            `REG-A11Y-01 axe on each main page, ${theme}`,
            { tag: '@p1' },
            async ({ app, page }) => {
                test.setTimeout(180_000);
                const pages: [string, string][] = [
                    ['/home', 'Today with a week'],
                    ['/plan', 'Plan'],
                    ['/library', 'Workouts'],
                    ['/library/legs', "a workout's details"],
                    ['/history', 'Progress'],
                    ['/exercises', 'Exercises'],
                    ['/exercises/back-squat', "an exercise's page"],
                    ['/ready-made-plans', 'Ready-made plans'],
                    ['/account', 'You'],
                    ['/settings', 'Settings'],
                    ['/help', 'Help'],
                ];
                for (const [path, name] of pages) {
                    await app.goto(path);
                    await noViolations(page, name);
                }

                await app.goto('/plan');
                await page.getByRole('button', { name: 'Add a workout to Thursday' }).click();
                await expect(page.getByRole('dialog', { name: 'Plan on Thursday' })).toBeVisible();
                await noViolations(page, "Plan's Add dialog");

                await app.goto('/setup?editId=legs');
                await new CreatePage(page).open(1);
                await noViolations(page, 'Create with an open step');

                const run = new WorkoutPage(page);
                await app.goto('/library');
                await run.startFromLibrary('Intervals');
                await noViolations(page, 'the workout page running');
                await run.pause.click();
                await noViolations(page, 'the workout page paused');
                await run.end.click();
                await expect(run.summary).toBeVisible();
                await noViolations(page, 'the summary');
                await run.summaryDone.click();
                await app.tab('Workouts').click();
                await run.startFromLibrary('Legs');
                await expect(run.done).toBeVisible();
                await noViolations(page, 'the workout page on a rep step');
            }
        );
    });

    test.describe(`axe on a new device, ${theme}`, () => {
        test.use({
            onboarding: 'show',
            // The theme picked, on a device not yet set up (setup's due, as the welcome screen
            // leaves it)
            storage: { ...seed.settings({ theme } as Partial<Settings>), setup: 'due' },
        });

        test(
            `REG-A11Y-01 axe on the welcome screen and the setup, ${theme}`,
            { tag: '@p1' },
            async ({ app, page }) => {
                await app.goto('/welcome');
                await noViolations(page, 'the welcome screen');
                await page.getByRole('button', { name: 'Continue as guest' }).click();
                await expect(page.getByText('Question 1 of 5')).toBeVisible();
                await noViolations(page, 'a setup question');
                await page.getByRole('button', { name: 'Skip for now' }).click();
                await expect(page.getByRole('region', { name: 'Get started' })).toBeVisible();
                await noViolations(page, 'Today, Get started');
            }
        );
    });
}

/**
 * Checks a dialog the keyboard opens from `opener`: focus starts on `first`, Tab stays inside it,
 * and Escape, ‹ Back and a tap outside (where there's an outside: a phone shows some full screen)
 * each close it with focus back on `opener`.
 */
async function checkDialog(page: Page, opener: Locator, dialog: Locator, first: Locator) {
    const open = async () => {
        await opener.focus();
        await page.keyboard.press('Enter');
        await expect(dialog).toBeVisible();
    };
    await open();
    await expect(first).toBeFocused();
    for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        expect(
            await dialog.evaluate((el) => el.contains(document.activeElement)),
            'focus stays in the dialog'
        ).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();

    await open();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();

    await open();
    const box = await dialog.boundingBox();
    if (box && box.y > 10) {
        await page.mouse.click(5, 5);
        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
    }
}

test.describe('dialogs', () => {
    const goblets = run('builtin:goblet-squat', '2026-11-04T18:00', {
        title: 'At home',
        sets: sets('goblet-squat', 'Goblet squat', [10, 24]),
    });
    test.use({ storage: { ...data, ...seed.history([goblets]) } });

    test("REG-A11Y-02 dialogs: Plan's Add", { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/plan');
        const plan = page.getByRole('dialog', { name: 'Plan on Thursday' });
        await checkDialog(
            page,
            page.getByRole('button', { name: 'Add a workout to Thursday' }),
            plan,
            plan.getByRole('button', { name: 'Make a new workout' })
        );
    });

    test(
        "REG-A11Y-02 dialogs: an exercise's Add to workout",
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/exercises/back-squat');
            const add = page.getByRole('dialog', { name: 'Add Back squat to' });
            await checkDialog(
                page,
                page.getByRole('button', { name: 'Add to workout' }),
                add,
                add.getByRole('button', { name: 'New workout' })
            );
        }
    );

    test("REG-A11Y-02 dialogs: Create's Details", { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/setup?editId=legs');
        await new CreatePage(page).open(1);
        const details = page.getByRole('dialog', { name: 'Back squat' });
        await checkDialog(
            page,
            page.getByRole('button', { name: 'Details of Back squat' }),
            details,
            details.getByRole('heading', { name: 'Back squat' })
        );
    });

    test("REG-A11Y-02 dialogs: Create's Swap", { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/setup?editId=legs');
        await new CreatePage(page).open(1);
        const swap = page.getByRole('dialog', { name: 'Swap Back squat' });
        await checkDialog(
            page,
            page.getByRole('button', { name: 'Swap Back squat' }),
            swap,
            swap.getByRole('searchbox', { name: 'Search exercises' })
        );
    });

    test("REG-A11Y-02 dialogs: Create's Browse", { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/setup?editId=legs');
        await new CreatePage(page).open(1);
        const browse = page.getByRole('dialog', { name: 'Browse exercises' });
        await checkDialog(
            page,
            page.getByRole('button', { name: 'Browse exercises for step 1' }),
            browse,
            browse.getByRole('searchbox').first()
        );
    });

    test('REG-A11Y-02 dialogs: the details mid-workout', { tag: '@p1' }, async ({ app, page }) => {
        // Escape closes the details without pausing or resuming the run
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Legs');
        const details = page.getByRole('dialog', { name: 'Back squat' });
        await checkDialog(
            page,
            run.main.getByRole('button', { name: 'Details of Back squat' }),
            details,
            details.getByRole('heading', { name: 'Back squat' })
        );
        await expect(run.done).toBeVisible();
        await expect(run.resume).toHaveCount(0);
    });

    test(
        'REG-A11Y-02 dialogs: the Discard dialog starts on Keep editing',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/setup?editId=legs');
            await new CreatePage(page).title.fill('Legs 2');
            await app.backLink(/./).click();
            const discard = page.getByRole('alertdialog', { name: 'Discard your changes?' });
            await expect(discard.getByRole('button', { name: 'Keep editing' })).toBeFocused();
            await page.keyboard.press('Escape');
            await expect(discard).toBeHidden();
        }
    );
});

test.describe('only a keyboard', () => {
    const push = workout('Push', {
        steps: [reps(10, 'Push-ups', { exercise: 'push-up' }), rest(30)],
        repeats: 2,
    });
    test.use({ storage: seed.workouts([push]) });

    test('REG-A11Y-03 a workout with only a keyboard', { tag: '@p1' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await page.getByRole('button', { name: 'Start Push' }).focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL('/workout');
        await expect(run.done).toBeVisible();

        // Space is Done on a rep step; in a rest it pauses, and Escape resumes
        await page.keyboard.press('Space');
        await expect(run.face).toContainText('Rest');
        await page.keyboard.press('Space');
        await expect(run.resume).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(run.pause).toBeFocused();

        // With nothing focused (a focused button takes Space itself), Shift+Space does nothing
        // (a held Space is a fixme below)
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.keyboard.press('Shift+Space');
        await expect(run.pause).toBeVisible();

        // On the reps wheel, the arrows change it and Space doesn't press Done
        await run.wait(30_500);
        await expect(run.done).toBeVisible();
        const wheel = run.wheel('reps');
        await wheel.focus();
        await page.keyboard.press('ArrowDown');
        await expect(wheel).toHaveAttribute('aria-valuenow', '11');
        await page.keyboard.press('Space');
        await expect(run.done).toBeVisible();
        await expect(run.summary).toHaveCount(0);
    });
});

test.describe('a held Space', () => {
    test.use({ storage: seed.workouts([intervals]) });

    test('REG-A11Y-03 a held Space toggles once', { tag: '@p1' }, async ({ app, page }) => {
        test.fixme(
            true,
            "App bug: holding Space (nothing focused) pauses, then resumes as it's let go. The pause moves focus to Resume; the key's repeats then reach that button, which onSpace() leaves to it (SPACE_HANDLED_BY) without preventing them, so it's pressed on release. pause-and-stop.md: 'It's ignored when held down (no flicker)'."
        );
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Intervals');
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.keyboard.down('Space');
        await page.keyboard.down('Space');
        await page.keyboard.down('Space');
        await page.keyboard.up('Space');
        await expect(run.resume).toBeVisible();
    });
});

test.describe('reduced motion', () => {
    const twenty = workout('Twenty', { steps: [timed(20), rest(10)], repeats: 2 });
    test.use({ storage: seed.workouts([twenty]) });

    /** The animations running that repeat for ever, by their names. */
    const looping = (page: Page) =>
        page.evaluate(() =>
            document
                .getAnimations()
                .filter((animation) => animation.effect?.getTiming().iterations === Infinity)
                .filter((animation) => animation.playState === 'running')
                .map((animation) => (animation as CSSAnimation).animationName ?? 'animation')
        );

    test('REG-A11Y-04 reduced motion: nothing loops', { tag: '@p2' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Twenty');
        await run.wait(16_000);
        expect(await looping(page)).toEqual([]);
        await run.wait(5_000);
        await expect(run.face).toContainText('Rest');
        expect(await looping(page)).toEqual([]);
    });

    test.describe('with motion', () => {
        test.use({ reducedMotion: 'no-preference' });

        test(
            'REG-A11Y-04 without reduced motion, "Next:" pulses near the end',
            { tag: '@p2' },
            async ({ app, page }) => {
                const run = new WorkoutPage(page);
                await app.goto('/library');
                await run.startFromLibrary('Twenty');
                await run.wait(16_000);
                await expect.poll(() => looping(page)).not.toEqual([]);
            }
        );
    });
});

test.describe('what screen readers hear', () => {
    const three = workout('Three', { steps: [timed(20), rest(10)], repeats: 3 });
    test.use({ storage: seed.workouts([three]) });

    test(
        'REG-A11Y-05 what screen readers hear during a run',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Three');
            await run.wait(25_000);
            await run.wait(10_000);
            await run.pause.click();
            await run.resume.click();
            await run.wait(55_000);
            await expect(run.summary).toBeVisible();

            const heard = (await app.announcements()).filter((text) =>
                /round|Rest|Paused|Finished|finished/.test(text)
            );
            expect(heard).toEqual(
                expect.arrayContaining([
                    expect.stringMatching(/round 1 of 3/),
                    expect.stringMatching(/^Rest/),
                    expect.stringMatching(/round 2 of 3/),
                    'Paused',
                    expect.stringMatching(/last round/),
                ])
            );
            // Not every second: a few lines a phase, not one a tick
            expect((await app.announcements()).length).toBeLessThan(40);
        }
    );
});

test.describe('phone widths', () => {
    const long = workout('Long name', {
        steps: [
            reps(10, 'Single-leg Romanian deadlift', { exercise: 'single-leg-romanian-deadlift' }),
        ],
    });

    for (const [width, height] of [
        [320, 640],
        [390, 844],
    ] as const) {
        for (const theme of ['dark', 'light'] as const) {
            test.describe(`${width} wide, ${theme}`, () => {
                test.use({
                    viewport: { width, height },
                    storage: {
                        ...data,
                        ...seed.workouts([legs, intervals, long]),
                        ...seed.settings({ theme } as Partial<Settings>),
                    },
                });

                test(
                    `REG-A11Y-06 no sideways scroll at ${width}px, ${theme}`,
                    { tag: '@p2' },
                    async ({ app, page, isMobile }) => {
                        test.skip(!isMobile, 'phone widths, on the phone project');
                        for (const path of [
                            '/home',
                            '/plan',
                            '/library',
                            '/library/legs',
                            '/history',
                            '/exercises',
                            '/exercises/back-squat',
                            '/account',
                            '/settings',
                            '/setup?editId=legs',
                        ]) {
                            await app.goto(path);
                            const sideways = await page.evaluate(
                                () => document.documentElement.scrollWidth - window.innerWidth
                            );
                            expect(sideways, `sideways scroll on ${path}`).toBeLessThanOrEqual(0);
                        }
                        const run = new WorkoutPage(page);
                        await app.goto('/library');
                        await run.startFromLibrary('Long name');
                        const sideways = await page.evaluate(
                            () => document.documentElement.scrollWidth - window.innerWidth
                        );
                        expect(sideways, 'sideways scroll on the workout page').toBeLessThanOrEqual(
                            0
                        );
                    }
                );
            });
        }
    }

    test.describe('touch targets', () => {
        test.use({ storage: data });

        test(
            'REG-A11Y-06 small controls take a press 44px across',
            { tag: '@p2' },
            async ({ app, page }) => {
                /** Whether a press `offset` px from the control's middle, each way, still hits it. */
                const hitAcross = (control: Locator, offset = 20) =>
                    control.evaluate((el, d) => {
                        const box = el.getBoundingClientRect();
                        const x = box.left + box.width / 2;
                        const y = box.top + box.height / 2;
                        return [
                            [x - d, y],
                            [x + d, y],
                            [x, y - d],
                            [x, y + d],
                        ].every(([px, py]) => {
                            const hit = document.elementFromPoint(px, py);
                            return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
                        });
                    }, offset);

                await app.goto('/plan');
                const help = page.getByRole('link', { name: /^Help: / }).first();
                if (await help.count()) {
                    await help.scrollIntoViewIfNeeded();
                    expect(await hitAcross(help), 'a ? link').toBe(true);
                }
                await app.goto('/setup?editId=legs');
                const pill = page.getByRole('button', { name: 'Reps, change type of step 1' });
                expect(await hitAcross(pill), 'the step-kind pill').toBe(true);

                const run = new WorkoutPage(page);
                await app.goto('/library');
                await run.startFromLibrary('Legs');
                const info = run.main.getByRole('button', { name: 'Details of Back squat' });
                expect(await hitAcross(info), "the step's (i)").toBe(true);
            }
        );
    });
});
