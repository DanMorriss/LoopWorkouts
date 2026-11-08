import { expect, group, heading, reps, rest, run, seed, test, timed, workout } from './fixtures';
import { HistoryPage } from './history-page';
import { LibraryPage } from './library-page';
import { WorkoutPage } from './workout-page';

// Workouts, your own and the ready-made ones on one list (library.md): REG-LIB in
// docs/regression-tests.md.

test.describe('no workouts of my own', () => {
    test(
        'REG-LIB-01 an empty library lists the ready-made workouts',
        { tag: '@p1' },
        async ({ app, page }) => {
            const library = new LibraryPage(page);
            await app.goto('/library');
            await expect(app.heading('Workouts')).toBeVisible();
            await expect(page.getByRole('button', { name: 'New workout' })).toBeVisible();
            await expect(
                page.getByText('Start any of these, or make your own with New.')
            ).toBeVisible();
            // The 18 ready-made ones, A to Z, each with its badge
            await expect(library.cards).toHaveCount(18);
            const titles = await library.titles();
            expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
            await expect(library.card('Gym legs')).toContainText('Ready-made');

            await page.getByRole('button', { name: 'New workout' }).click();
            await expect(page).toHaveURL('/setup');
        }
    );
});

test.describe('my workouts', () => {
    const intervals = workout('Intervals', { steps: [timed(65), rest(20)], repeats: 3 });
    const gym = workout('Gym', {
        steps: [
            reps(10, 'Squats', { exercise: 'back-squat' }),
            reps(10, 'Bench press', { exercise: 'bench-press' }),
            reps(10, 'Rows', { exercise: 'barbell-row' }),
            rest(60),
        ],
    });
    const forever = workout('Forever', { steps: [timed(30)], repeats: 0 });
    const amrap = workout('AMRAP', {
        steps: [
            reps(10, 'Squats', { exercise: 'bodyweight-squat' }),
            reps(10, 'Push-ups', { exercise: 'push-up' }),
        ],
        timeLimitSeconds: 1200,
    });
    test.use({ storage: seed.workouts([intervals, gym, forever, amrap]) });

    test(
        'REG-LIB-02 what a card says, opening it and starting it',
        { tag: '@p1' },
        async ({ app, page }) => {
            const library = new LibraryPage(page);
            await app.goto('/library');
            await expect(library.card('Intervals')).toContainText('01:05 - 00:20');
            await expect(library.card('Intervals')).toContainText('3');
            await expect(library.card('Gym')).toContainText('Squats, Bench press + 1 more');
            await expect(library.card('Forever')).toContainText('∞');
            await expect(library.card('AMRAP')).toContainText('Squats, Push-ups in 20:00');
            // Mine have no badge
            await expect(library.card('Gym')).not.toContainText('Ready-made');

            // The card opens its details; nothing starts
            const open = page.getByRole('link', { name: 'Details of Intervals' });
            await open.click();
            await expect(page).toHaveURL('/library/intervals');
            await expect(app.heading('Intervals')).toBeVisible();
            await expect(app.runBar).toBeHidden();

            // Back, with focus on the card it came from
            await app.backLink('Workouts').click();
            await expect(page).toHaveURL(/\/library/);
            await expect(open).toBeFocused();

            await page.getByRole('button', { name: 'Start Intervals' }).click();
            const run = new WorkoutPage(page);
            await expect(page).toHaveURL('/workout');
            await expect(run.title).toContainText('Intervals');
            await expect(run.pause).toBeVisible();
        }
    );
});

test.describe("a workout's details", () => {
    const legs = workout('Legs', {
        repeats: 2,
        blocks: [
            heading('Main'),
            group([reps(10, 'Back squat', { exercise: 'back-squat' })], 3, 60),
            group([timed(30)]),
        ],
    });
    test.use({
        storage: {
            ...seed.workouts([legs]),
            ...seed.history([run(legs, '2026-11-09T18:00'), run(legs, '2026-11-10T18:00')]),
        },
    });

    test("REG-LIB-03 a workout's details", { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/library/legs');
        await expect(app.heading('Legs')).toBeVisible();
        const muscles = page.getByRole('region', { name: 'Muscles it works' });
        await expect(muscles.getByRole('list', { name: 'Main' }).getByRole('listitem')).toHaveText([
            'Glutes',
            'Quads',
        ]);
        await expect(
            muscles.getByRole('list', { name: 'Supporting' }).getByRole('listitem')
        ).toHaveText(['Lower back', 'Adductors', 'Hamstrings']);

        const history = page.getByRole('region', { name: 'History' });
        await expect(history).toContainText('Done 2 times');
        const runs = history.getByRole('link');
        await expect(runs).toHaveCount(2);
        await expect(runs.first()).toHaveAccessibleName(/^Tue 10 Nov/);
        await expect(runs.last()).toHaveAccessibleName(/^Mon 9 Nov/);
        await expect(runs.first()).toHaveAttribute('href', /\/history\?run=/);

        const inIt = page.getByRole('region', { name: "What's in it" });
        await expect(inIt).toContainText('2 rounds of all of it');
        await expect(inIt.getByRole('listitem')).toContainText([
            'Main',
            /Back squat.*3 × 10, rest 1:00/,
            /Work\s+0:30/,
        ]);
        // What's in it comes last, after History
        await expect(page.getByRole('main').getByRole('region').last()).toHaveAccessibleName(
            "What's in it"
        );

        await inIt.getByRole('link', { name: 'Back squat' }).click();
        await expect(page).toHaveURL('/library/legs/back-squat');
        await expect(app.heading('Back squat')).toBeVisible();
        await expect(app.tab('Workouts')).toHaveAttribute('aria-current', 'true');
        await app.backLink('Legs').click();
        await expect(page).toHaveURL('/library/legs');

        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(page).toHaveURL(/\/setup/);
        await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue('Legs');

        await app.goto('/library/not-a-workout');
        await expect(page.getByText('Workout not found')).toBeVisible();
    });
});

test.describe('deleting', () => {
    const legsDay = workout('Legs day', { steps: [timed(30)] });
    const arms = workout('Arms', { steps: [timed(30)] });
    test.use({
        storage: {
            ...seed.workouts([legsDay, arms]),
            ...seed.history([run(legsDay, '2026-11-09T18:00'), run(legsDay, '2026-11-10T18:00')]),
        },
    });

    test('REG-LIB-04 delete from the menu, and Undo', { tag: '@p1' }, async ({ app, page }) => {
        const library = new LibraryPage(page);
        await app.goto('/library');
        await (await library.options('Legs day')).getByRole('button', { name: 'Delete' }).click();
        await expect(library.card('Legs day')).toHaveCount(0);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(app.undoBar).toContainText('Deleted "Legs day"');
        await expect(app.undo).toBeFocused();

        // No timer on it
        await page.clock.fastForward('02:00');
        await expect(app.undoBar).toBeVisible();

        await app.undo.click();
        await expect(library.card('Legs day')).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Open options for Legs day' })).toBeFocused();

        // Escape closes the bar without undoing
        await (await library.options('Legs day')).getByRole('button', { name: 'Delete' }).click();
        await expect(app.undo).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(app.undoBar).toBeHidden();
        await expect(library.card('Legs day')).toHaveCount(0);

        // Another page takes the bar away; the history keeps the deleted workout's runs
        await (await library.options('Arms')).getByRole('button', { name: 'Delete' }).click();
        await app.tab('Progress').click();
        await expect(app.undoBar).toBeHidden();
        await expect(new HistoryPage(page).entry('Legs day')).toHaveCount(2);
    });
});

test.describe('the order', () => {
    test.use({
        storage: seed.workouts(
            ['Zone 2', 'arms', 'Bench'].map((title) => workout(title, { steps: [timed(30)] }))
        ),
    });

    test('REG-LIB-05 the list is A to Z, with nothing to move', async ({ app, page }) => {
        const library = new LibraryPage(page);
        await app.goto('/library');
        await page.getByRole('radio', { name: 'My own' }).check();
        expect(await library.titles()).toEqual(['arms', 'Bench', 'Zone 2']);
        const options = await library.options('Bench');
        await expect(options.getByRole('button')).toHaveCount(3);
        await expect(options.getByRole('button', { name: /^Move/ })).toHaveCount(0);
    });
});

test.describe('the plan page suggests a workout', () => {
    const squats = workout('Squat day', {
        steps: [reps(10, 'Back squat', { exercise: 'back-squat' })],
    });
    const bench = workout('Bench day', {
        steps: [reps(10, 'Bench press', { exercise: 'bench-press' })],
    });
    test.use({
        storage: {
            ...seed.workouts([squats, bench]),
            ...seed.plan({ mon: ['squat-day'], thu: ['bench-day'] }),
        },
    });

    test('REG-LIB-06 missing muscle groups and the workout to fill them', async ({ app, page }) => {
        await app.goto('/plan');
        const missing = page.getByRole('region', { name: 'Missing muscle groups' });
        await expect(missing.getByRole('list').first().getByRole('link')).toHaveText([
            'Biceps',
            'Forearms',
            'Abs',
            'Obliques',
            'Traps',
            'Upper back',
            'Abductors',
            'Calves',
            'Shins',
            'Neck',
        ]);
        const works = page.getByRole('region', { name: 'What your plan works' });
        await expect(works.getByRole('list', { name: 'Supporting' }).getByRole('link')).toHaveText([
            'Shoulders',
            'Triceps',
            'Lower back',
            'Adductors',
            'Hamstrings',
        ]);
        await expect(missing).toContainText('Gym extras');
        await expect(missing).toContainText('Adds Forearms, Abs, Obliques and 7 more.');

        await missing.getByRole('link', { name: 'Calves' }).click();
        await expect(page).toHaveURL(/\/exercises\?muscles=calves(&|$)/);
        await expect(
            page.getByRole('group', { name: 'Main muscle' }).getByRole('button', { name: 'Calves' })
        ).toHaveAttribute('aria-pressed', 'true');
    });
});

test.describe('ready-made workouts', () => {
    test.use({ storage: seed.workouts([workout('Legs', { steps: [timed(30)] })]) });

    test(
        'REG-LIB-07 ready-made workouts: filter, look, copy, start as they are',
        { tag: '@p1' },
        async ({ app, page }) => {
            const library = new LibraryPage(page);
            await app.goto('/library');
            await page.getByRole('radio', { name: 'Ready-made' }).check();
            await expect(library.card('Legs')).toHaveCount(0);
            await expect(library.cards).toHaveCount(18);

            // Only what I have, with a kettlebell: those needing nothing or a kettlebell
            await page.getByRole('button', { name: 'More filters' }).click();
            await page.getByRole('switch', { name: 'Only what I have' }).click();
            await page.getByRole('button', { name: /^My equipment/ }).click();
            await page.getByRole('button', { name: 'Kettlebell', exact: true }).click();
            await page.keyboard.press('Escape');
            await expect(library.card('Kettlebell AMRAP')).toHaveCount(1);
            await expect(library.card('Tabata')).toHaveCount(1);
            await expect(library.card('Gym legs')).toHaveCount(0);
            await page.getByRole('switch', { name: 'Only what I have' }).click();

            await page.getByRole('link', { name: 'Details of Gym legs' }).click();
            await expect(page).toHaveURL('/library/builtin:gym-legs');
            await expect(page.getByRole('main')).toContainText('Ready-made');
            await expect(page.getByRole('region', { name: "What's in it" })).toContainText(
                /Back squat.*3 sets: 12, 10, 8, rest 2:30/
            );
            await expect(page.getByRole('region', { name: 'Muscles it works' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);

            await page.getByRole('button', { name: 'Make a copy' }).click();
            await expect(page).toHaveURL(/\/setup/);
            await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue(
                'Gym legs (copy)'
            );
            const saved = await app.stored<{ title: string }[]>('workouts');
            expect(saved?.map((w) => w.title)).toContain('Gym legs (copy)');

            // Started as it is, with no copy made
            await app.goto('/library');
            await page.getByRole('button', { name: 'Start Tabata' }).click();
            await expect(page).toHaveURL('/workout');
            const after = await app.stored<{ title: string }[]>('workouts');
            expect(after?.map((w) => w.title)).not.toContain('Tabata');

            // The old addresses
            await app.goto('/ready-made/gym-legs');
            await expect(page).toHaveURL('/library/builtin:gym-legs');
            await app.goto('/ready-made');
            await expect(page).toHaveURL('/library');
            await app.goto('/library/builtin:nope');
            await expect(page.getByText('Workout not found')).toBeVisible();
        }
    );
});

test.describe('deleting the workout that is running', () => {
    test.use({
        storage: seed.workouts([workout('Legs', { steps: [timed(30), rest(10)], repeats: 3 })]),
    });

    test(
        "REG-LIB-08 deleting the workout that's running",
        { tag: '@p3' },
        async ({ app, page }) => {
            const library = new LibraryPage(page);
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Legs');
            await run.close.click();
            await (await library.options('Legs')).getByRole('button', { name: 'Delete' }).click();
            // Today's behaviour (an open question in library.md): it carries on in the bar...
            await expect(app.runBar).toContainText('Legs');
            // ...until a reload, after which it's gone
            await app.reload();
            await expect(app.runBar).toBeHidden();
        }
    );
});
