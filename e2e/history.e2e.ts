import { expect, rest, run, seed, sets, test, timed, workout } from './fixtures';
import { HistoryPage } from './history-page';
import { WorkoutPage } from './workout-page';

// The history, on the Progress tab (history.md): REG-HIS in docs/regression-tests.md. The clock is
// at NOW, Wednesday 11 November 2026 at 09:00.

test.describe('the log', () => {
    const sprints = run('sprints', '2026-11-11T08:00', {
        title: 'Sprints',
        activeSeconds: 750,
        roundsCompleted: 3,
        totalRounds: 3,
        sets: sets('back-squat', 'Back squat', [10, 60], [10, 60], [10, 60]),
    });
    const legs = run('legs', '2026-11-10T18:00', {
        title: 'Legs',
        activeSeconds: 1200,
        roundsCompleted: 2,
        totalRounds: 5,
        outcome: 'stopped',
        sets: sets('back-squat', 'Back squat', [10, 60], [8, 62.5]),
    });
    const gym = run('gym', '2026-11-09T18:00', {
        title: 'Gym',
        activeSeconds: 1800,
        headings: [{ text: 'Warmup', step: 0 }],
        supersets: [{ kind: 'superset', step: 1, steps: 2 }],
        sets: [
            { round: 0, step: 0, name: 'Exercise bike', seconds: 300 },
            {
                round: 0,
                step: 1,
                name: 'Bench press',
                reps: 8,
                weight: 60,
                exerciseId: 'builtin:bench-press',
            },
            {
                round: 0,
                step: 2,
                name: 'Barbell row',
                reps: 8,
                weight: 50,
                exerciseId: 'builtin:barbell-row',
            },
        ],
    });
    const amrap = run('amrap', '2026-11-03T18:00', {
        title: 'AMRAP',
        activeSeconds: 1200,
        totalRounds: 0,
        timeLimitSeconds: 1200,
        roundsCompleted: 7,
        stepsIntoRound: 3,
    });
    test.use({ storage: seed.history([sprints, legs, gym, amrap]) });

    test('REG-HIS-01 the log', { tag: '@p1' }, async ({ app, page }) => {
        const history = new HistoryPage(page);
        await app.goto('/history');
        // AMRAP is outside the last 7 × 24 hours
        await expect(page.getByText('Last 7 days: 3 workouts · 1:02:30')).toBeVisible();
        // The days, newest first (and Gym's heading, under Monday)
        await expect(page.getByRole('main').getByRole('heading', { level: 4 })).toContainText([
            'Today',
            'Yesterday',
            'Monday 9 November',
            'Warmup',
            'Tuesday 3 November',
        ]);

        const today = history.entry('Sprints');
        await expect(today).toContainText('8:00 AM');
        await expect(today).toContainText('3 rounds');
        await expect(today).toContainText('12:30');
        await expect(today).toContainText('Back squat: 3 × 10 @ 60 kg');
        await expect(today.getByRole('link', { name: 'Back squat' })).toHaveAttribute(
            'href',
            '/exercises/back-squat'
        );
        await expect(history.entry('Legs')).toContainText('2 of 5 rounds · stopped');
        await expect(history.entry('Legs')).toContainText('Back squat: 10 @ 60, 8 @ 62.5 kg');
        await expect(history.entry('AMRAP')).toContainText('7 rounds + 3 in 20:00');

        const gymEntry = history.entry('Gym');
        await expect(gymEntry).toContainText('Warmup');
        await expect(gymEntry).toContainText('Superset');
        await expect(gymEntry.getByRole('list').last()).toContainText('Bench press');

        // In pounds
        await app.goto('/account');
        await page.getByRole('radio', { name: 'Pounds (lb)' }).check();
        await app.goto('/history');
        await expect(history.entry('Sprints')).toContainText('Back squat: 3 × 10 @ 132.5 lb');
    });
});

test.describe('no history', () => {
    test('REG-HIS-01 nothing done yet', { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/history');
        await expect(
            page.getByText(
                "Nothing here yet. Do a workout, and how your week is going and what you've done show up here."
            )
        ).toBeVisible();
        await page.getByRole('link', { name: 'Go to workouts' }).click();
        await expect(page).toHaveURL('/library');
    });
});

test.describe('notes', () => {
    test.use({ storage: seed.history([run('sprints', '2026-11-11T08:00', { title: 'Sprints' })]) });

    test('REG-HIS-02 notes', { tag: '@p1' }, async ({ app, page }) => {
        const history = new HistoryPage(page);
        await app.goto('/history');
        const entry = history.entry('Sprints');
        const menu = page.getByRole('group', { name: /^Options for Sprints at / });
        const note = entry.getByRole('textbox', { name: 'Note' });

        await history.options(entry).click();
        await menu.getByRole('button', { name: 'Add note' }).click();
        await note.fill('x'.repeat(200));
        await entry.getByRole('button', { name: 'Save' }).click();
        await expect(entry.getByRole('paragraph').filter({ hasText: /^Note: / })).toHaveText(
            `Note: ${'x'.repeat(120)}`
        );

        await history.options(entry).click();
        await menu.getByRole('button', { name: 'Edit note' }).click();
        await note.fill('changed');
        await entry.getByRole('button', { name: 'Cancel' }).click();
        await expect(entry.getByRole('paragraph').filter({ hasText: /^Note: / })).toHaveText(
            `Note: ${'x'.repeat(120)}`
        );

        await history.options(entry).click();
        await menu.getByRole('button', { name: 'Edit note' }).click();
        await note.fill('');
        await entry.getByRole('button', { name: 'Save' }).click();
        await expect(entry.getByRole('paragraph').filter({ hasText: /^Note: / })).toHaveCount(0);
        await history.options(entry).click();
        await expect(menu.getByRole('button', { name: 'Add note' })).toBeVisible();
    });
});

test.describe('deleting', () => {
    test.use({
        storage: seed.history([
            run('sprints', '2026-11-11T08:00', { title: 'Sprints', note: 'felt strong' }),
            run('legs', '2026-11-10T18:00', { title: 'Legs' }),
        ]),
    });

    test('REG-HIS-03 delete an entry, and Undo', { tag: '@p1' }, async ({ app, page }) => {
        const history = new HistoryPage(page);
        await app.goto('/history');
        const sprints = history.entry('Sprints');
        const menu = page.getByRole('group', { name: /^Options for Sprints at / });

        await history.options(sprints).click();
        await menu.getByRole('button', { name: 'Delete' }).click();
        await expect(sprints).toHaveCount(0);
        await expect(app.undoBar).toContainText('Deleted Sprints');
        await expect(app.undo).toBeFocused();

        await app.undo.click();
        await expect(sprints).toContainText('felt strong');

        await history.options(sprints).click();
        await menu.getByRole('button', { name: 'Delete' }).click();
        await expect(sprints).toHaveCount(0);
        await app.reload();
        await expect(history.entry('Legs')).toHaveCount(1);
        await expect(sprints).toHaveCount(0);
        const deleted = await app.stored<{ kind: string }[]>('deleted');
        expect(deleted).toContainEqual(expect.objectContaining({ kind: 'history' }));
    });
});

test.describe('a run deleted while it goes on', () => {
    // Long enough that it can't finish while the test deletes its entry
    const twice = workout('Twice', { steps: [timed(60), rest(10)], repeats: 3 });
    test.use({
        storage: {
            ...seed.workouts([twice]),
            // An older run, so the new one isn't last, where its options open under the run
            // bar (see the fixme below)
            ...seed.history([run('legs', '2026-11-10T18:00', { title: 'Legs' })]),
        },
    });

    test(
        "REG-HIS-04 a deleted entry doesn't come back when its run finishes",
        { tag: '@p3' },
        async ({ app, page }) => {
            const history = new HistoryPage(page);
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Twice');
            // Ended and taken up again, so it has an entry
            await run.wait(61_000);
            await run.endWorkout();
            await run.summary.getByRole('button', { name: 'Back to workout' }).click();
            await run.resume.click();
            await run.close.click();

            await app.tab('Progress').click();
            const entry = history.entry('Twice');
            await expect(entry).toHaveCount(1);
            await history.options(entry).click();
            await page
                .getByRole('group', { name: /^Options for Twice at / })
                .getByRole('button', {
                    name: 'Delete',
                })
                .click();
            await expect(entry).toHaveCount(0);

            await page.clock.runFor(200_000);
            await expect(app.runBar).toContainText('Finished');
            await expect(entry).toHaveCount(0);
            await app.reload();
            await expect(entry).toHaveCount(0);
        }
    );
});

test.describe('the last entry with a workout going', () => {
    test.use({
        storage: {
            ...seed.workouts([workout('Twice', { steps: [timed(60), rest(10)], repeats: 3 })]),
            ...seed.history([run('legs', '2026-11-10T18:00', { title: 'Legs' })]),
        },
    });

    test(
        "REG-HIS-03 the last entry's options open clear of the run bar",
        { tag: '@p1' },
        async ({ app, page }) => {
            const history = new HistoryPage(page);
            await app.goto('/library');
            await new WorkoutPage(page).startFromLibrary('Twice');
            await new WorkoutPage(page).close.click();
            await app.tab('Progress').click();
            await history.options(history.entry('Legs')).click();
            await page
                .getByRole('group', { name: /^Options for Legs at / })
                .getByRole('button', { name: 'Delete' })
                .click({ timeout: 5000 });
            await expect(history.entry('Legs')).toHaveCount(0);
        }
    );
});
