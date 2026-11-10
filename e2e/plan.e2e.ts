import { expect, reps, run, seed, test, workout } from './fixtures';
import { CreatePage } from './create-page';
import { LibraryPage } from './library-page';
import { WorkoutPage } from './workout-page';

// Today and the weekly plan (planning.md): REG-PLAN in docs/regression-tests.md. The clock is at
// NOW, Wednesday 11 November 2026 at 09:00.

const legs = workout('Legs', { steps: [reps(10, 'Back squat', { exercise: 'back-squat' })] });
const push = workout('Push', { steps: [reps(10, 'Bench press', { exercise: 'bench-press' })] });
const pull = workout('Pull', { steps: [reps(10, 'Barbell row', { exercise: 'barbell-row' })] });

/** What a day of the Plan page shows, by its name ("Wednesday · today" for today). */
const day = (page: import('@playwright/test').Page, name: string) =>
    page.getByRole('region', { name, exact: true });

test.describe('a new guest', () => {
    test(
        'REG-PLAN-01 Get started: use a ready-made week, then Undo',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/home');
            const getStarted = page.getByRole('region', { name: 'Get started' });
            await expect(page.getByRole('region', { name: 'This week' })).toHaveCount(0);
            await expect(getStarted.getByRole('article')).toHaveAccessibleName(
                'No equipment, 3 days'
            );
            await expect(
                getStarted.getByRole('link', { name: 'Bodyweight basics : Mon' })
            ).toBeVisible();
            await expect(getStarted.getByRole('link', { name: 'More plans' })).toBeVisible();
            await expect(
                getStarted.getByRole('link', { name: 'Make your own plan' })
            ).toBeVisible();

            await getStarted.getByRole('button', { name: 'Use No equipment, 3 days' }).click();
            const week = page.getByRole('region', { name: 'This week' });
            await expect(week).toBeVisible();
            await expect(getStarted).toHaveCount(0);
            // Planned today, a Wednesday, so Monday's counts from next week (PLN-3)
            await expect(week.getByRole('listitem')).toContainText([
                'Monday: Bodyweight basics, from next week',
                'Tuesday: nothing planned',
                'Wednesday, today: Cardio intervals, due today',
                'Thursday: nothing planned',
                'Friday: Core in 15, to come; Tabata, to come',
                'Saturday: nothing planned',
                'Sunday: nothing planned',
            ]);
            await expect(
                page.getByRole('region', { name: 'Due today' }).getByRole('button', {
                    name: 'Start Cardio intervals',
                })
            ).toBeVisible();
            await expect(app.undoBar).toContainText('Your week is planned: No equipment, 3 days');
            // The ready-made workouts are planned as they are, not copied into my own
            expect(await app.stored('workouts')).toBeNull();

            await app.undo.click();
            await expect(getStarted).toBeVisible();
            await expect(week).toHaveCount(0);
            const plan = await app.stored<{ days: string[][] }>('week-plan');
            expect(plan?.days.flat()).toEqual([]);
        }
    );
});

test.describe('a new guest, focus', () => {
    test(
        'REG-PLAN-01 focus moves to Edit plan once a plan is used',
        { tag: '@p1' },
        async ({ app, page }) => {
            test.fixme(
                true,
                "App bug: focus ends on the Undo bar's Undo, not Edit plan. injectUsePlanOnToday() focuses Edit plan after the next render, but the undo bar focuses Undo after its own, later. docs/features/home-and-navigation.md says focus is on Edit plan."
            );
            await app.goto('/home');
            await page.getByRole('button', { name: 'Use No equipment, 3 days' }).click();
            await expect(page.getByRole('link', { name: 'Edit plan' })).toBeFocused();
        }
    );
});

test.describe('planning by hand', () => {
    test.use({ storage: seed.workouts([legs, push]) });

    test('REG-PLAN-02 plan the week by hand', { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/home');
        const week = page.getByRole('region', { name: 'This week' });
        await expect(week).toContainText('Nothing planned yet.');
        await expect(week.getByRole('button', { name: /^Use / })).toBeVisible();
        await expect(week.getByRole('link', { name: 'More plans' })).toBeVisible();

        await week.getByRole('link', { name: 'Make your own plan' }).click();
        await expect(page).toHaveURL('/plan');
        await expect(app.heading('Plan')).toBeVisible();
        await expect(app.backLink('Today')).toBeVisible();
        await expect(app.tab('Today')).toHaveAttribute('aria-current', 'true');
        for (const name of ['Monday', 'Tuesday', 'Thursday', 'Sunday']) {
            await expect(day(page, name)).toContainText('Nothing planned');
        }

        const thursday = day(page, 'Thursday');
        const add = thursday.getByRole('button', { name: 'Add a workout to Thursday' });
        await add.click();
        const dialog = page.getByRole('dialog', { name: 'Plan on Thursday' });
        await expect(dialog).toBeVisible();
        // After its ‹ Back, Make a new workout comes first
        await expect(dialog.getByRole('listitem').first().getByRole('button')).toHaveAccessibleName(
            'Make a new workout'
        );
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(add).toBeFocused();

        await add.click();
        await dialog.getByRole('button', { name: /^Push/ }).click();
        await expect(thursday.getByRole('listitem')).toHaveCount(1);
        await expect(thursday.getByRole('listitem')).toContainText('Push');
        await expect(add).toBeFocused();
        await expect.poll(() => app.announcements()).toContain('Push planned on Thursday');

        await add.click();
        await expect(dialog.getByRole('button', { name: /^Push/ })).toBeDisabled();
        await expect(dialog.getByRole('button', { name: /^Push/ })).toContainText('Planned');
        await dialog.getByRole('button', { name: 'Back' }).click();
        await thursday.getByRole('button', { name: 'Take Push off Thursday' }).click();
        await expect(thursday).toContainText('Nothing planned');
        await expect(add).toBeFocused();
        await expect.poll(() => app.announcements()).toContain('Push taken off Thursday');

        await add.click();
        await dialog.getByRole('button', { name: /Make a new workout/ }).click();
        await expect(page).toHaveURL('/setup?planOn=3&from=%2Fplan');
        await expect(app.backLink('Plan')).toBeVisible();
        const plan = await app.stored<{ days: string[][] }>('week-plan');
        expect(plan?.days.flat() ?? []).toEqual([]);
    });

    test(
        'REG-PLAN-07 make a new workout for a day, and come back to the plan with it',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/plan');
            const thursday = day(page, 'Thursday');
            await thursday.getByRole('button', { name: 'Add a workout to Thursday' }).click();
            await page
                .getByRole('dialog', { name: 'Plan on Thursday' })
                .getByRole('button', { name: /Make a new workout/ })
                .click();
            const create = new CreatePage(page);
            await create.build('Sprints', [{ kind: 'Timed', seconds: 30 }]);
            await create.save.click();

            await expect(page).toHaveURL(/\/plan\?saved=/);
            await expect(thursday.getByRole('listitem')).toContainText(['Sprints']);
            await expect(
                thursday.getByRole('button', { name: 'Add a workout to Thursday' })
            ).toBeFocused();
            await expect
                .poll(() => app.announcements())
                .toContain('Saved Sprints, planned on Thursday');
        }
    );

    test(
        'REG-PLAN-08 Add to plan from a workout: several days at once, with Undo',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/library');
            const options = await new LibraryPage(page).options('Legs');
            await options.getByRole('button', { name: 'Add to plan' }).click();
            const dialog = page.getByRole('dialog', { name: 'Plan Legs on…' });
            await expect(dialog).toBeVisible();
            const monday = dialog.getByRole('button', { name: /^Monday/ });
            await monday.click();
            await expect(monday).toHaveAttribute('aria-pressed', 'true');
            await dialog.getByRole('button', { name: /^Thursday/ }).click();
            await dialog.getByRole('button', { name: 'Done' }).click();
            await expect(dialog).toBeHidden();
            await expect(app.undoBar).toContainText('Legs planned on Monday and Thursday');

            // Its Details say where it's planned; Change days takes it off one
            await page.getByRole('link', { name: 'Details of Legs', exact: true }).click();
            await expect(page.getByText('On your plan: Mon, Thu')).toBeVisible();
            await page.getByRole('button', { name: 'Change days' }).click();
            await dialog.getByRole('button', { name: /^Monday/ }).click();
            await dialog.getByRole('button', { name: 'Done' }).click();
            await expect(page.getByText('On your plan: Thu')).toBeVisible();
            await expect(app.undoBar).toContainText('Legs taken off Monday');

            await app.undo.click();
            await expect(page.getByText('On your plan: Mon, Thu')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Change days' })).toBeFocused();
            const plan = await app.stored<{ days: string[][] }>('week-plan');
            expect(plan?.days).toEqual([['legs'], [], [], ['legs'], [], [], []]);
        }
    );
});

test.describe('due today', () => {
    const legsToday = run(legs, '2026-11-11T08:00');
    const pushToday = run(push, '2026-11-11T08:20');
    test.use({
        storage: { ...seed.workouts([legs, push]), ...seed.plan({ wed: ['push', 'legs'] }) },
    });

    test('REG-PLAN-03 due today', { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/home');
        const due = page.getByRole('region', { name: 'Due today' });
        const starts = due.getByRole('button', { name: /^Start / });
        await expect(starts).toHaveCount(2);
        await expect(starts.first()).toHaveAccessibleName('Start Push');
        await expect(starts.last()).toHaveAccessibleName('Start Legs');
        await expect(page.getByRole('region', { name: /suggested|Fancy a workout/i })).toHaveCount(
            0
        );

        await due.getByRole('button', { name: 'Start Push' }).click();
        const run = new WorkoutPage(page);
        await expect(page).toHaveURL('/workout');
        await expect(run.title).toContainText('Push');
    });

    test.describe('with Legs done today', () => {
        test.use({
            storage: {
                ...seed.workouts([legs, push]),
                ...seed.plan({ wed: ['push', 'legs'] }),
                ...seed.history([legsToday]),
            },
        });

        test(
            'REG-PLAN-03 only what is still due is listed',
            { tag: '@p1' },
            async ({ app, page }) => {
                await app.goto('/home');
                const due = page.getByRole('region', { name: 'Due today' });
                await expect(due.getByRole('button', { name: /^Start / })).toHaveAccessibleName(
                    'Start Push'
                );
                await expect(due).toContainText('Done today: Legs');
            }
        );
    });

    test.describe('with both done today', () => {
        test.use({
            storage: {
                ...seed.workouts([legs, push]),
                ...seed.plan({ wed: ['push', 'legs'] }),
                ...seed.history([legsToday, pushToday]),
            },
        });

        test(
            'REG-PLAN-03 all done, and still no suggestion (M4)',
            { tag: '@p1' },
            async ({ app, page }) => {
                await app.goto('/home');
                await expect(page.getByText(/All done: Push, Legs/)).toBeVisible();
                await expect(
                    page.getByRole('region', { name: 'Suggested next workout' })
                ).toHaveCount(0);
            }
        );
    });
});

test.describe('how the week is going', () => {
    test.use({
        storage: {
            ...seed.workouts([legs, push, pull]),
            ...seed.plan({ mon: ['legs'], tue: ['push'], wed: ['legs'], fri: ['pull'] }),
            ...seed.history([run(legs, '2026-11-09T18:00')]),
        },
    });

    test(
        'REG-PLAN-04 how this week is going, on Today and the Plan page',
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/home');
            const week = page.getByRole('region', { name: 'This week' });
            await expect(week.getByRole('listitem')).toContainText([
                'Monday: Legs, done',
                'Tuesday: Push, missed',
                'Wednesday, today: Legs, due today',
                'Thursday: nothing planned',
                'Friday: Pull',
            ]);
            await expect(week).toContainText('1 of 4 done this week · Next: Pull on Friday');

            await week.getByRole('link', { name: 'Edit plan' }).click();
            await expect(day(page, 'Monday')).toContainText('Done');
            await expect(day(page, 'Tuesday')).toContainText('Missed');
            await expect(day(page, 'Wednesday · today')).toContainText('Due');
            await expect(page.getByText('1 of 3 done so far this week')).toBeVisible();

            // Planned on a day already gone this week, it counts from next week
            await day(page, 'Monday')
                .getByRole('button', { name: 'Add a workout to Monday' })
                .click();
            await page
                .getByRole('dialog', { name: 'Plan on Monday' })
                .getByRole('button', { name: /^Push/ })
                .click();
            await expect(
                day(page, 'Monday').getByRole('listitem').filter({ hasText: 'Push' })
            ).toContainText('From next week');
            await expect(page.getByText('1 of 3 done so far this week')).toBeVisible();
        }
    );
});

test.describe('the ready-made plans', () => {
    test.use({
        storage: { ...seed.workouts([legs]), ...seed.settings({ trainingGoal: 'fitness' }) },
    });

    test(
        "REG-PLAN-05 the ready-made plans page, and a plan's workouts",
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/home');
            await page.getByRole('link', { name: 'More plans' }).click();
            await expect(page).toHaveURL('/ready-made-plans');
            await expect(app.backLink('Today')).toBeVisible();
            await expect(app.tab('Today')).toHaveAttribute('aria-current', 'true');
            const plans = page.getByRole('main').getByRole('article');
            await expect(plans.first()).toHaveAccessibleName('Fitness, 4 days');
            await expect(plans.nth(1)).toHaveAccessibleName('Kettlebell, 3 days');
            await expect(plans.nth(2)).toHaveAccessibleName('No equipment, 3 days');

            await page.getByRole('switch', { name: 'Only what I have' }).click();
            await expect(plans).toHaveCount(1);
            await expect(plans).toHaveAccessibleName('No equipment, 3 days');
            await expect(page.getByText("5 more need equipment you haven't picked.")).toBeVisible();

            const tabata = plans.getByRole('link', { name: /^Tabata/ });
            await tabata.click();
            await expect(page).toHaveURL(/\/ready-made-plans\/tabata/);
            await expect(
                page.getByRole('button', { name: /Add and start|Add to my workouts/ })
            ).toHaveCount(0);

            // Back to the plans, with focus on the link it came from
            await page
                .getByRole('link', { name: /^Ready-made plans|^Plans/ })
                .first()
                .click();
            await expect(page).toHaveURL('/ready-made-plans');
            await expect(tabata).toBeFocused();
        }
    );
});

test.describe('a ready-made plan over my own', () => {
    test.use({
        storage: { ...seed.workouts([legs]), ...seed.plan({ sat: ['legs'] }) },
    });

    test(
        'REG-PLAN-06 using a ready-made plan over an existing one',
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/ready-made-plans');
            await page.getByRole('button', { name: 'Use Dumbbells at home, 4 days' }).click();
            await expect(page).toHaveURL('/home');
            await expect(app.undoBar).toContainText(
                'Your week is planned: Dumbbells at home, 4 days'
            );
            const plan = await app.stored<{ days: string[][] }>('week-plan');
            expect(plan?.days).toEqual([
                ['builtin:dumbbell-upper'],
                ['builtin:dumbbell-lower'],
                [],
                ['builtin:dumbbell-upper'],
                ['builtin:dumbbell-lower'],
                [],
                [],
            ]);
            // Planned as they are: nothing added to my workouts
            expect((await app.stored<unknown[]>('workouts'))?.length).toBe(1);

            await app.undo.click();
            const undone = await app.stored<{ days: string[][] }>('week-plan');
            expect(undone?.days[5]).toEqual(['legs']);
        }
    );
});
