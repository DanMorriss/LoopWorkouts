import {
    expect,
    group,
    reps,
    run,
    seed,
    sets,
    stepsOf,
    test,
    timed,
    workout,
    type Workout,
} from './fixtures';
import { CreatePage } from './create-page';
import { LibraryPage } from './library-page';
import { setWheel, WorkoutPage } from './workout-page';

// Building a workout in Create (build-a-workout.md, sets-and-supersets.md): REG-BLD in
// docs/regression-tests.md.

// Create redraws its form on each change, so with six tests going at once each key on a wheel
// can take a few seconds: these get three times the usual time
test.beforeEach(() => {
    test.slow();
});

const legs = workout('Legs', { steps: [reps(10, 'Back squat', { exercise: 'back-squat' })] });

/** The workouts as saved. */
const saved = async (app: { stored<T>(key: string): Promise<T | null> }) =>
    (await app.stored<Workout[]>('workouts')) ?? [];

test.describe('a new workout', () => {
    test.use({ storage: seed.workouts([legs]) });

    test('REG-BLD-01 build and start a new workout', { tag: '@p1' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        await app.goto('/library');
        await page.getByRole('button', { name: 'New workout' }).click();
        await expect(page).toHaveURL('/setup');
        await expect(app.backLink('Workouts')).toBeVisible();
        await expect(app.tab('Workouts')).toHaveAttribute('aria-current', 'true');

        // One open rep step at 0 reps, 1 round, no error, and it can't be started
        await expect(create.kindPill(1)).toHaveAccessibleName('Reps, change type of step 1');
        await expect(create.kindPill(2)).toHaveCount(0);
        await expect(create.field(1, 'Reps')).toHaveAttribute('aria-valuenow', '0');
        await expect(create.rounds).toHaveAttribute('aria-valuenow', '1');
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(create.start).toBeDisabled();

        await create.title.fill('Sprints');
        await create.setKind(1, 'Timed');
        await expect(create.field(1, 'Minutes')).toBeVisible();
        await expect(create.kindPill(1)).toBeFocused();
        await create.setTime(1, 0, 30);
        await create.name(1, 'Jog');

        // A new step opens, closing the others, with the cursor in its name
        await create.addStep.click();
        await expect(create.exercise(2)).toBeFocused();
        await expect(create.field(1, 'Seconds')).toHaveCount(0);
        await create.name(2, 'Push-ups');
        await setWheel(create.field(2, 'Reps'), 20);

        await create.addStep.click();
        await create.setKind(3, 'Rest');
        await create.setTime(3, 0, 15);

        await setWheel(create.rounds, 3);
        await create.start.click();

        const run = new WorkoutPage(page);
        await expect(page).toHaveURL('/workout');
        await expect(run.face).toContainText('Jog');
        await expect(run.faceTime).toHaveText(/^00:(30|[12]\d)$/);
        await expect(run.main.getByText('round 1 of 3', { exact: true })).toBeVisible();

        const sprints = (await saved(app)).find((w) => w.title === 'Sprints')!;
        expect(sprints.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(sprints.repeats).toBe(3);
        expect(stepsOf(sprints)).toMatchObject([
            { kind: 'work', seconds: 30, name: 'Jog' },
            { kind: 'reps', reps: 20, name: 'Push-ups', exerciseId: 'builtin:push-up' },
            { kind: 'rest', seconds: 15 },
        ]);
    });

    test(
        'REG-BLD-02 the saved workout is scrolled into view',
        { tag: '@p1' },
        async ({ app, page }) => {
            const create = new CreatePage(page);
            await app.goto('/setup');
            await create.build('Sprints', [{ kind: 'Timed', seconds: 30 }]);
            await create.save.click();
            const card = new LibraryPage(page).card('Sprints');
            await expect(card).toBeInViewport();
            await expect(card.getByRole('button', { name: 'Start Sprints' })).toBeFocused();
        }
    );

    test(
        'REG-BLD-10 a tip the first time Join with next shows',
        { tag: '@p2' },
        async ({ app, page }) => {
            const create = new CreatePage(page);
            await app.goto('/setup');
            await page.evaluate(() => localStorage.removeItem('tip-join'));
            await create.addStep.click();
            // + Step opens the new step and closes the first, where Join with next is
            await create.open(1);

            const tip = page.getByRole('dialog', { name: 'Supersets' });
            await expect(tip).toBeVisible();
            await expect(tip).toContainText(
                'Join with next makes this step and the next a superset'
            );
            await expect(tip.getByText(/of \d/)).toHaveCount(0);
            await tip.getByRole('button', { name: 'Done' }).click();
            await expect(tip).toBeHidden();
            // Back where it was as the tip showed
            await expect(create.header(1)).toBeFocused();
            expect(await app.storageItem('tip-join')).toBe('seen');

            // Once only
            await create.header(1).click();
            await create.open(1);
            await expect(page.getByRole('dialog', { name: 'Supersets' })).toHaveCount(0);
        }
    );

    test('REG-BLD-02 save without starting, then edit', { tag: '@p1' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        const library = new LibraryPage(page);
        await app.goto('/setup');
        await create.build('Sprints', [{ kind: 'Timed', seconds: 30 }]);
        await create.save.click();

        await expect(page).toHaveURL(/\/library\?saved=/);
        // Picked out, with focus on its play button (BLD-02's "in view" is a fixme below)
        await expect(page.getByRole('button', { name: 'Start Sprints' })).toBeFocused();
        await expect
            .poll(() => app.announcements())
            .toContainEqual(expect.stringContaining('Saved Sprints'));
        await expect(app.runBar).toBeHidden();
        const id = (await saved(app)).find((w) => w.title === 'Sprints')!.id;

        await (await library.options('Sprints')).getByRole('button', { name: 'Edit' }).click();
        await expect(page).toHaveURL(/\/setup/);
        // Steps collapsed, and the main button saves and starts
        await expect(create.field(1, 'Seconds')).toHaveCount(0);
        await expect(create.start).toHaveAccessibleName('Save & start workout');

        await create.title.fill('Sprints 2');
        await create.save.click();
        await expect(page).not.toHaveURL(/\/setup/);
        const after = await saved(app);
        expect(after.filter((w) => w.title.startsWith('Sprints'))).toEqual([
            expect.objectContaining({ id, title: 'Sprints 2' }),
        ]);
        await expect(app.runBar).toBeHidden();
    });
});

test.describe('what Create stops', () => {
    test('REG-BLD-03 what cannot be saved or started', { tag: '@p2' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        await app.goto('/setup');
        await create.name(1, 'Squats');
        // 0 reps: Start stays disabled, saying why
        await expect(create.start).toBeDisabled();
        await expect(page.getByText('Workout needs a timed step or some reps')).toBeVisible();

        await create.setKind(1, 'Rest');
        await create.setTime(1, 0, 20);
        await expect(create.save).toBeDisabled();
        await expect(create.start).toBeDisabled();

        await create.setKind(1, 'Timed');
        await create.setTime(1, 0, 45);
        await create.addStep.click();
        await create.setKind(2, 'Rest');
        await create.start.click();
        await expect(page).toHaveURL('/workout');
        const [squats] = await saved(app);
        expect(stepsOf(squats)).toEqual([expect.objectContaining({ kind: 'work', seconds: 45 })]);
    });

    test('REG-BLD-03 a time limit of 00:00 cannot start', { tag: '@p2' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        await app.goto('/setup');
        await create.build('Limit', [{ kind: 'Timed', seconds: 30 }]);
        await page.getByRole('radio', { name: 'Time limit' }).check();
        await setWheel(page.getByRole('spinbutton', { name: 'Minutes', exact: true }), 0);
        await setWheel(page.getByRole('spinbutton', { name: 'Seconds', exact: true }), 0);
        await expect(page.getByText('Time limit needs to be longer than 00:00')).toBeVisible();
        await expect(create.start).toBeDisabled();
    });
});

test.describe('steps', () => {
    const abc = workout('ABC', {
        blocks: ['A', 'B', 'C'].map((name) => group([timed(30, name)])),
    });
    const full = workout('Full', {
        blocks: Array.from({ length: 20 }, (_, i) => group([timed(30, `Step ${i + 1}`)])),
    });
    test.use({ storage: seed.workouts([abc, full]) });

    test(
        'REG-BLD-04 steps: move, delete with Undo, change kind, the limits',
        { tag: '@p2' },
        async ({ app, page }) => {
            const create = new CreatePage(page);
            await app.goto(`/setup?editId=abc`);
            await create.header(3).click();
            await page.getByRole('button', { name: /^Move Step 3, C up$/ }).click();
            await expect(create.header(2)).toHaveAccessibleName(/^Step 2, C, 00:30/);
            await expect(create.header(3)).toHaveAccessibleName(/^Step 3, B, 00:30/);
            await expect
                .poll(() => app.announcements())
                .toContainEqual(expect.stringMatching(/^Moved C/));

            await create.header(3).click();
            await page.getByRole('button', { name: /^Delete Step 3, B/ }).click();
            await expect(create.kindPill(3)).toHaveCount(0);
            await expect(app.undoBar).toContainText('Deleted Step 3, B, 00:30');
            await expect(app.undo).toBeFocused();
            await app.undo.click();
            await expect(create.header(3)).toHaveAccessibleName(/^Step 3, B, 00:30/);

            await create.setKind(1, 'Reps');
            await create.setKind(1, 'Timed');
            await expect(create.header(1)).toHaveAccessibleName(/^Step 1, A, 00:30/);

            for (let n = 3; n >= 1; n--) {
                const remove = page.getByRole('button', { name: new RegExp(`^Delete Step ${n},`) });
                if ((await remove.count()) === 0) {
                    await create.header(n).click();
                }
                await remove.click();
            }
            await expect(page.getByText('Add a step to start.')).toBeVisible();

            await app.goto('/setup?editId=full');
            await expect(create.addStep).toBeDisabled();
            await expect(
                page.getByText("That's the most steps a workout can have (20).")
            ).toBeVisible();
        }
    );
});

test.describe('sets', () => {
    test(
        'REG-BLD-05 sets, each side and varying each set',
        { tag: '@p2' },
        async ({ app, page }) => {
            const create = new CreatePage(page);
            await app.goto('/setup');
            await create.name(1, 'Leg press');
            await setWheel(create.field(1, 'Reps'), 10);
            await setWheel(create.field(1, 'Weight (kg)'), 40, 0.5);
            await setWheel(create.field(1, 'Sets'), 3);
            // Rest after each set appears, at 01:00
            await expect(create.field(1, 'Rest after each set (mm:ss) Minutes')).toHaveAttribute(
                'aria-valuenow',
                '1'
            );
            await create.header(1).click();
            await expect(create.header(1)).toHaveAccessibleName(
                'Step 1, Leg press, 3 × 10 @ 40 kg · rest 01:00'
            );

            await create.header(1).click();
            await create.field(1, 'Vary each set', 'switch').click();
            const rows = page.getByRole('list', { name: 'Vary each set' }).getByRole('button');
            await expect(rows).toHaveCount(3);
            for (const n of [1, 2, 3]) {
                await expect(rows.nth(n - 1)).toHaveAccessibleName(`Set ${n} · 10 × 40 kg`);
            }

            // Set 3 to 8 reps, then a 4th set copies the 3rd
            await rows.nth(2).click();
            await setWheel(create.field(1, 'Set 3 Reps'), 8);
            await setWheel(create.field(1, 'Sets'), 4);
            await expect(rows).toHaveCount(4);
            await expect(rows.nth(3)).toHaveAccessibleName('Set 4 · 8 × 40 kg');

            // Off again, every set is set 1's
            await create.field(1, 'Vary each set', 'switch').click();
            await create.field(1, 'Each side', 'switch').click();
            await create.header(1).click();
            await expect(create.header(1)).toHaveAccessibleName(
                'Step 1, Leg press, 4 × 10 @ 40 kg each side · rest 01:00'
            );
        }
    );

    test(
        'REG-BLD-04 deleting the only step leaves focus on + Step',
        { tag: '@p2' },
        async ({ app, page }) => {
            const create = new CreatePage(page);
            await app.goto('/setup');
            await page.getByRole('button', { name: /^Delete Step 1/ }).click();
            await expect(page.getByText('Add a step to start.')).toBeVisible();
            await expect(create.addStep).toBeFocused();
        }
    );
});

test.describe('a time limit', () => {
    test('REG-BLD-07 time limit', { tag: '@p2' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        await app.goto('/setup');
        await create.build('Limit', [{ kind: 'Timed', seconds: 30 }]);
        await setWheel(create.rounds, 5);
        await page.getByRole('radio', { name: 'Time limit' }).check();
        await expect(page.getByText("As many rounds as you can before time's up.")).toBeVisible();
        await page.getByRole('radio', { name: 'Rounds' }).check();
        await expect(create.rounds).toHaveAttribute('aria-valuenow', '5');

        await page.getByRole('radio', { name: 'Time limit' }).check();
        const minutes = page.getByRole('spinbutton', { name: 'Minutes', exact: true });
        const seconds = page.getByRole('spinbutton', { name: 'Seconds', exact: true });
        await expect(minutes).toHaveAttribute('aria-valuenow', '20');
        await setWheel(minutes, 12);
        await setWheel(seconds, 30);
        await create.save.click();
        const [limit] = await saved(app);
        expect(limit).toMatchObject({ repeats: 0, timeLimitSeconds: 750 });
        await expect(new LibraryPage(page).card('Limit')).toContainText('in 12:30');

        await (await new LibraryPage(page).options('Limit'))
            .getByRole('button', { name: 'Edit' })
            .click();
        await expect(page.getByRole('radio', { name: 'Time limit' })).toBeChecked();
        await expect(minutes).toHaveAttribute('aria-valuenow', '12');
        await expect(seconds).toHaveAttribute('aria-valuenow', '30');
    });
});

test.describe('leaving with changes', () => {
    test.use({ storage: seed.workouts([legs]) });

    test('REG-BLD-08 leaving with unsaved changes', { tag: '@p1' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        const library = new LibraryPage(page);
        await app.goto('/library');

        // Nothing changed: no question
        await page.getByRole('button', { name: 'New workout' }).click();
        await app.backLink('Workouts').click();
        await expect(page).toHaveURL('/library');

        await (await library.options('Legs')).getByRole('button', { name: 'Edit' }).click();
        await create.title.fill('Legs 2');
        await app.backLink(/./).click();
        const dialog = page.getByRole('alertdialog', { name: 'Discard your changes?' });
        // Named as it's been changed to (M7)
        await expect(dialog).toContainText("Your changes to Legs 2 haven't been saved.");
        await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(page).toHaveURL(/\/setup/);
        await expect(create.title).toHaveValue('Legs 2');

        await app.tab('Today').click();
        await dialog.getByRole('button', { name: 'Discard changes' }).click();
        await expect(page).toHaveURL('/home');
        expect((await saved(app))[0].title).toBe('Legs');

        // The browser's Back asks too
        await app.goto('/library');
        await (await library.options('Legs')).getByRole('button', { name: 'Edit' }).click();
        await create.title.fill('Legs 3');
        await page.goBack();
        await expect(dialog).toBeVisible();
    });
});

test.describe('picking an exercise', () => {
    test.use({
        storage: seed.history([
            run('builtin:goblet-squat', '2026-11-04T18:00', {
                title: 'At home',
                sets: sets('goblet-squat', 'Goblet squat', [10, 24]),
            }),
        ]),
    });

    test(
        'REG-BLD-09 picking an exercise, its details, Swap and Browse',
        { tag: '@p2' },
        async ({ app, page }) => {
            const create = new CreatePage(page);
            await app.goto('/setup');
            const box = create.exercise(1);
            await box.fill('squat');
            const options = page.getByRole('listbox', { name: 'Exercises' }).getByRole('option');
            await expect(options).toHaveCount(8);
            await expect(options.first()).toHaveAccessibleName(
                'Back squat , Also called Squat , Quads, glutes · Barbell, rack'
            );
            await options.first().click();
            await expect(box).toHaveValue('Back squat');
            await expect(create.stepRow(1).getByText('Built-in exercise')).toBeVisible();
            await setWheel(create.field(1, 'Reps'), 10);
            await setWheel(create.field(1, 'Weight (kg)'), 60, 0.5);

            const details = page.getByRole('button', { name: 'Details of Back squat' });
            await details.click();
            const dialog = page.getByRole('dialog', { name: 'Back squat' });
            await expect(dialog).toBeVisible();
            await dialog.getByRole('button', { name: 'Back' }).click();
            await expect(details).toBeFocused();

            await page.getByRole('button', { name: 'Swap Back squat' }).click();
            const swap = page.getByRole('dialog', { name: 'Swap Back squat' });
            await swap.getByRole('searchbox', { name: 'Search exercises' }).fill('goblet');
            await swap.getByRole('button', { name: /^Goblet squat/ }).click();
            await expect(box).toHaveValue('Goblet squat');
            await expect(create.field(1, 'Weight (kg)')).toHaveAttribute('aria-valuenow', '24');
            await expect(create.field(1, 'Reps')).toHaveAttribute('aria-valuenow', '10');
            await expect(app.undoBar).toContainText('Swapped to Goblet squat');
            await app.undo.click();
            await expect(box).toHaveValue('Back squat');
            await expect(create.field(1, 'Weight (kg)')).toHaveAttribute('aria-valuenow', '60');

            await page.getByRole('button', { name: 'Browse exercises for step 1' }).click();
            const browse = page.getByRole('dialog', { name: 'Browse exercises' });
            await expect(browse).toContainText('Pick one for step 1.');
            await browse
                .getByRole('button', { name: /^Plank/ })
                .first()
                .click();
            await expect(browse).toBeHidden();
            await expect(box).toHaveValue('Plank');
            await expect(create.kindPill(1)).toHaveAccessibleName('Timed, change type of step 1');
            await expect(create.field(1, 'Seconds')).toHaveAttribute('aria-valuenow', '30');
        }
    );
});

test.describe('supersets and headings', () => {
    const upper = workout('Upper', {
        blocks: [
            group([reps(10, 'Bench press', { exercise: 'bench-press' })], 3, 60),
            group([reps(10, 'Seated cable row', { exercise: 'seated-cable-row' })], 3, 60),
            group(
                [reps(10, 'Dumbbell shoulder press', { exercise: 'dumbbell-shoulder-press' })],
                3,
                60
            ),
        ],
    });
    test.use({ storage: seed.workouts([upper]) });

    test('REG-BLD-06 supersets and headings', { tag: '@p2' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        await app.goto('/setup?editId=upper');
        await create.header(1).click();
        await page
            .getByRole('button', { name: 'Join Step 1, Bench press with the next step' })
            .click();
        const superset = page.getByRole('button', {
            name: 'Superset, steps 1 to 2, 3 rounds · rest 01:00',
        });
        await expect(superset).toBeFocused();
        await expect
            .poll(() => app.announcements())
            .toContain(
                'Superset, steps 1 to 2, 3 rounds · rest 01:00: Bench press, Seated cable row'
            );

        await page
            .getByRole('button', { name: 'Join Superset, steps 1 to 2 with the next step' })
            .click();
        await expect(
            page.getByRole('button', { name: /^Giant set, steps 1 to 3, 3 rounds/ })
        ).toBeVisible();

        await create.header(3).click();
        await page
            .getByRole('button', { name: 'Take Step 3, Dumbbell shoulder press out' })
            .click();
        await expect(superset).toBeVisible();
        await expect(create.header(3)).toHaveAccessibleName(
            'Step 3, Dumbbell shoulder press, 3 × 10 · rest 01:00'
        );

        await create.addHeading.click();
        const headingBox = page.getByRole('textbox', { name: /Heading/ }).last();
        await expect(headingBox).toBeFocused();
        await headingBox.fill(' Warmup ');
        await page.getByRole('button', { name: 'Collapse all' }).click();
        await expect(superset).toContainText('Bench press, Seated cable row');
        await expect(superset).toContainText('3 rounds · rest 01:00');
        await expect(create.header(1)).toBeHidden();
        await create.save.click();

        const [saved] = (await app.stored<Workout[]>('workouts'))!;
        expect(saved.blocks).toEqual([
            expect.objectContaining({
                kind: 'group',
                rounds: 3,
                restSeconds: 60,
                steps: [
                    expect.objectContaining({ name: 'Bench press' }),
                    expect.objectContaining({ name: 'Seated cable row' }),
                ],
            }),
            expect.objectContaining({ kind: 'group', rounds: 3 }),
            { kind: 'heading', text: 'Warmup' },
        ]);
    });
});
