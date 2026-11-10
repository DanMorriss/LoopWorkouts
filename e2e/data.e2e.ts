import { readFileSync } from 'node:fs';
import { at, expect, reps, run, seed, test, timed, workout, type Workout } from './fixtures';
import { CreatePage } from './create-page';
import { HistoryPage } from './history-page';
import { WorkoutPage } from './workout-page';

// Your data on the device: backup, import, clearing it and working offline (backup-and-sync.md,
// data.md): REG-DATA in docs/regression-tests.md.

const legs = workout('Legs', { steps: [timed(30, 'Squats')] });
const arms = workout('Arms', { steps: [timed(30, 'Curls')] });

/** A backup file to import, made in the test: the fields given, as a Loop Workouts backup. */
function backup(contents: Record<string, unknown>, name = 'backup.json') {
    return {
        name,
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ app: 'Loop Workouts', version: 15, ...contents })),
    };
}

/** Imports a file through Import backup, as a person picks it. */
async function importFile(
    page: import('@playwright/test').Page,
    file: { name: string; mimeType: string; buffer: Buffer }
) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import backup' }).click();
    await (await chooser).setFiles(file);
}

test.describe('export', () => {
    test.use({
        storage: {
            ...seed.workouts([legs, arms]),
            ...seed.history(
                ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'].map((day) =>
                    run(legs, `${day}T18:00`)
                )
            ),
            ...seed.deleted([{ kind: 'workout', id: 'old', deletedAt: at('2026-11-01T10:00') }]),
            ...seed.notes({ 'builtin:back-squat': 'Pause at the bottom' }),
            ...seed.hidden(['builtin:plank']),
            ...seed.plan({ mon: ['legs'] }),
        },
    });

    test('REG-DATA-01 export a backup', { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/account');
        const download = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export backup' }).click();
        const file = await download;
        expect(file.suggestedFilename()).toBe('loop-workouts-2026-11-11.json');
        await expect(
            page.getByText('Backup saved as loop-workouts-2026-11-11.json.')
        ).toBeVisible();

        const saved = JSON.parse(readFileSync(await file.path(), 'utf8')) as Record<
            string,
            unknown[] & Record<string, unknown>
        >;
        expect(saved['app']).toBe('Loop Workouts');
        expect(saved['version']).toEqual(expect.any(Number));
        expect((saved['workouts'] as unknown as Workout[]).map((w) => w.title)).toEqual([
            'Legs',
            'Arms',
        ]);
        // The history comes from IndexedDB, so this proves the export waits for it
        expect(saved['history']).toHaveLength(5);
        expect(saved['deleted']).toContainEqual(expect.objectContaining({ id: 'old' }));
        expect(saved['exerciseNotes']).toContainEqual(
            expect.objectContaining({ id: 'builtin:back-squat', text: 'Pause at the bottom' })
        );
        expect(saved['hiddenExercises']).toContainEqual(
            expect.objectContaining({ id: 'builtin:plank' })
        );
        expect((saved['plan'] as unknown as { days: string[][] }).days[0]).toEqual(['legs']);
        expect(saved['settings']).toEqual(expect.objectContaining({ theme: 'dark' }));
    });
});

test.describe('import', () => {
    test.use({ storage: seed.workouts([legs]) });

    test(
        'REG-DATA-02 import a backup, and the AI prompt',
        { tag: '@p1' },
        async ({ app, page, context }) => {
            await app.goto('/account');
            await importFile(
                page,
                backup({
                    workouts: [
                        workout('Push', { id: 'push', steps: [timed(30)] }),
                        workout('Pull', { id: 'pull', steps: [timed(30)] }),
                    ],
                    settings: { theme: 'light' },
                })
            );
            const yourData = page.getByRole('region', { name: 'Your data' });
            await expect(yourData).toContainText('Added 2 workouts.');
            await expect(app.undoBar).toContainText('Added 2 workouts.');
            // Its settings aren't taken
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

            await app.undoBar.getByRole('link', { name: 'View workouts' }).click();
            await expect(page).toHaveURL('/library');
            await expect(page.getByRole('link', { name: 'Details of Push' })).toBeVisible();
            await expect(app.undoBar).toBeHidden();

            await app.goto('/account');
            await importFile(page, {
                name: 'notes.txt',
                mimeType: 'text/plain',
                buffer: Buffer.from('hello'),
            });
            await expect(yourData).toContainText(
                "That file couldn't be read. Is it a Loop Workouts backup?"
            );
            await importFile(page, {
                name: 'other.json',
                mimeType: 'application/json',
                buffer: Buffer.from(JSON.stringify({ app: 'something-else' })),
            });
            await expect(yourData).toContainText("That file isn't a Loop Workouts backup.");
            await importFile(page, backup({ version: 999, workouts: [] }));
            await expect(yourData).toContainText(
                'That backup is from a newer version of Loop Workouts. Update the app and try again.'
            );

            // A file written by hand: no ids, linked by name
            const byHand = backup({
                workouts: [
                    {
                        title: 'Legs 2',
                        repeats: 1,
                        blocks: [
                            {
                                kind: 'group',
                                rounds: 1,
                                restSeconds: 0,
                                steps: [
                                    { kind: 'reps', reps: 8, name: 'Back squat' },
                                    { kind: 'work', seconds: 30, name: 'Sled push' },
                                ],
                            },
                        ],
                    },
                ],
                exercises: [{ name: 'Sled push', measuredBy: 'timed' }],
            });
            await importFile(page, byHand);
            await expect(yourData).toContainText('Added 1 workout');
            const saved = (await app.stored<Workout[]>('workouts'))!;
            const legs2 = saved.find((w) => w.title === 'Legs 2')!;
            const steps = legs2.blocks.flatMap((b) => (b.kind === 'group' ? b.steps : []));
            expect(steps[0]).toMatchObject({ exerciseId: 'builtin:back-squat' });
            expect(steps[1].exerciseId).toMatch(/^(?!builtin:)/);
            await importFile(page, byHand);
            await expect
                .poll(async () => (await app.stored<Workout[]>('workouts'))!.length)
                .toBe(saved.length);

            await context.grantPermissions(['clipboard-read', 'clipboard-write']);
            await page.getByRole('button', { name: 'Copy AI prompt' }).click();
            await expect(
                page.getByText('Prompt copied. Paste it into an AI chat, then add your plan.')
            ).toBeVisible();
            const prompt = await page.evaluate(() => navigator.clipboard.readText());
            expect(prompt.trimEnd()).toMatch(/MY PLAN:?$/);
            expect(prompt).toContain('Back squat');
        }
    );
});

test.describe('clearing the device', () => {
    test.use({
        storage: {
            ...seed.workouts([workout('Legs', { steps: [timed(30), timed(30)], repeats: 3 })]),
            ...seed.history([run(legs, '2026-11-10T18:00')]),
            ...seed.settings({ theme: 'light' }),
        },
    });

    test('REG-DATA-03 clear this device', { tag: '@p1' }, async ({ app, page, context }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Legs');
        await run.wait(31_000);
        await run.close.click();
        const other = await context.newPage();
        await other.goto('/history');
        await expect(new HistoryPage(other).entries).toHaveCount(1);

        await app.tab('You').click();
        const clear = page.getByRole('button', { name: 'Clear this device' });
        await clear.click();
        const warning = page.getByRole('group', {
            name: /^This removes your workouts, history, exercises and settings from this device/,
        });
        await expect(warning).toBeVisible();
        await expect(warning.getByRole('paragraph')).toBeFocused();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(clear).toBeFocused();
        expect(await app.storageItem('workouts')).not.toBeNull();

        await clear.click();
        await page.getByRole('button', { name: 'Clear everything' }).click();
        await expect(page).toHaveURL('/account');
        await app.ready();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await expect(app.runBar).toBeHidden();
        expect(await app.storageItem('workouts')).toBeNull();
        await app.goto('/history');
        await expect(new HistoryPage(page).entries).toHaveCount(0);

        // The other tab started again empty too
        await expect(new HistoryPage(other).entries).toHaveCount(0);
        await app.goto('/home');
        await expect(page).toHaveURL('/welcome');
    });
});

test.describe('offline', () => {
    test.use({ storage: seed.workouts([legs]) });

    test(
        'REG-DATA-04 working with no connection, as a guest',
        { tag: '@p1' },
        async ({ app, page, context, network }) => {
            // Each page's code loaded first, by going to it in the app: there's no service worker,
            // so a page not yet opened can't load offline (nor can the app be opened offline)
            await app.goto('/home');
            await page.getByRole('link', { name: 'Make your own plan' }).click();
            await app.backLink('Today').click();
            await app.tab('Workouts').click();
            await page.getByRole('button', { name: 'New workout' }).click();
            await app.backLink('Workouts').click();
            const run = new WorkoutPage(page);
            await run.startFromLibrary('Legs');
            await run.endWorkout();
            await run.summaryDone.click();
            await expect(page).toHaveURL(/\/history/);
            await app.tab('Exercises').click();
            await app.tab('You').click();
            await page.getByRole('link', { name: /^Settings/ }).click();
            await app.backLink('You').click();
            await app.tab('Workouts').click();
            await context.setOffline(true);

            // Build and save one, run it to the end, add a note, change the theme, plan it
            await page.getByRole('button', { name: 'New workout' }).click();
            const create = new CreatePage(page);
            await create.build('Offline', [{ kind: 'Timed', name: 'Jog', seconds: 30 }]);
            await create.save.click();
            await expect(page).toHaveURL(/\/library/);
            await run.startFromLibrary('Offline');
            await run.wait(31_000);
            await run.summary.getByRole('textbox', { name: 'Note' }).fill('no signal');
            await run.summary.getByRole('textbox', { name: 'Note' }).press('Tab');
            await run.summaryDone.click();
            await expect(new HistoryPage(page).entry('Offline')).toContainText('no signal');
            await app.tab('You').click();
            await page.getByRole('link', { name: /^Settings/ }).click();
            await page.getByRole('radio', { name: 'Light' }).check();
            await app.backLink('You').click();
            await app.tab('Today').click();
            await page.getByRole('link', { name: /Make your own plan|Edit plan/ }).click();
            await page.getByRole('button', { name: 'Add a workout to Thursday' }).click();
            await page
                .getByRole('dialog', { name: 'Plan on Thursday' })
                .getByRole('button', { name: 'Offline', exact: true })
                .click();

            await context.setOffline(false);
            await app.goto('/history');
            await expect(new HistoryPage(page).entry('Offline')).toContainText('no signal');
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
            const plan = await app.stored<{ days: string[][] }>('week-plan');
            expect(plan?.days[3]).toHaveLength(1);
            expect(network.supabase).toEqual([]);
        }
    );
});

test.describe('data saved by an older version of the app', () => {
    // Version 2's: a workout's steps in one list, not linked to exercises yet, which version 3
    // does by name, to the built-in exercises, which aren't in the first download
    const { blocks: _blocks, ...squats } = workout('Squat day', {
        steps: [reps(10, 'Back squat')],
    });
    const saved = { ...squats, steps: [reps(10, 'Back squat')] };
    test.use({ storage: { 'data-version': '2', workouts: JSON.stringify([saved]) } });

    test(
        'REG-DATA-06 an old device is brought up to date, its steps linked to built-in exercises',
        { tag: '@p1' },
        async ({ app, page }) => {
            await app.goto('/library/squat-day');

            await expect(page.getByRole('heading', { name: 'Squat day' })).toBeVisible();
            await expect(page.getByText('None of its steps is an exercise yet.')).toHaveCount(0);
            const now = await app.stored<Workout[]>('workouts');
            const steps = now?.[0].blocks.flatMap((block) =>
                block.kind === 'group' ? block.steps : []
            );
            expect(steps?.map((step) => step.exerciseId)).toEqual(['builtin:back-squat']);
            // Linked to the built-in one, not a copy of your own
            expect(await app.stored('exercises')).toBeNull();
            expect(await app.storageItem('data-version')).toBe('5');
        }
    );
});

test.describe('years of history', () => {
    const entries = Array.from({ length: 600 }, (_, i) =>
        run(legs, new Date(at('2026-11-10T18:00') - i * 86_400_000).toISOString())
    );
    test.use({ storage: seed.history(entries) });

    test('REG-DATA-05 years of history', { tag: '@p3' }, async ({ app, page }) => {
        await app.goto('/history');
        await app.historySaved();
        await app.reload();
        const count = await page.evaluate(
            () =>
                new Promise<number>((resolve, reject) => {
                    const open = indexedDB.open('loop-workouts');
                    open.onerror = () => reject(open.error);
                    open.onsuccess = () => {
                        const request = open.result
                            .transaction('history')
                            .objectStore('history')
                            .count();
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                    };
                })
        );
        expect(count).toBe(600);
        await expect(new HistoryPage(page).entries.first()).toBeVisible();
    });
});
