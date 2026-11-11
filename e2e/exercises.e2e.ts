import { expect, reps, run, seed, test, timed, workout, type Workout } from './fixtures';
import { CreatePage } from './create-page';
import { WorkoutPage } from './workout-page';

// Exercises (exercises.md): REG-EXR in docs/regression-tests.md.

/** The Exercises list's cards, and the count over them ("97 exercises"). */
const list = (page: import('@playwright/test').Page) => ({
    cards: page.getByRole('main').getByRole('list').last().getByRole('link'),
    count: page
        .getByRole('main')
        .getByRole('status')
        .filter({ hasText: /\d+ exercises?/ })
        .first(),
});

test.describe('the list', () => {
    test(
        'REG-EXR-01 the list: search, muscles, equipment',
        { tag: '@p1' },
        async ({ app, page }) => {
            const { cards, count } = list(page);
            await app.goto('/exercises');
            await expect(app.heading('Exercises')).toBeVisible();
            await expect(page.getByRole('button', { name: 'New exercise' })).toBeVisible();
            // As many as it says, A to Z
            const all = Number((await count.textContent())!.match(/\d+/)![0]);
            expect(all).toBeGreaterThan(90);
            await expect(cards).toHaveCount(all);
            await expect(cards.first()).toHaveAccessibleName(/^Ab wheel rollout/);

            const search = page.getByRole('searchbox', { name: 'Search' });
            await search.fill('press-up');
            await expect(cards.first()).toHaveAccessibleName(/^Push-up Also called Press-up/);
            await expect(count).toHaveText(/^\s*\d exercises\s*$/);

            // Quads from the chips, Glutes from the body map
            await search.fill('');
            const chips = page.getByRole('group', { name: 'Main muscle' });
            await chips.getByRole('button', { name: 'Quads' }).click();
            // By its keys: a muscle's shape doesn't cover the middle of its box, so a click there
            // lands on the drawing around it
            await page
                .getByRole('region', { name: 'Pick muscles on body map' })
                .getByRole('button', { name: 'Glutes' })
                .first()
                .press('Enter');
            await expect(page).toHaveURL('/exercises?muscles=quads,glutes');
            await expect(chips.getByRole('button', { name: 'Quads' })).toHaveAttribute(
                'aria-pressed',
                'true'
            );
            await expect(chips.getByRole('button', { name: 'Glutes' })).toHaveAttribute(
                'aria-pressed',
                'true'
            );
            const filtered = Number((await count.textContent())!.match(/\d+/)![0]);
            expect(filtered).toBeLessThan(all);

            // An exercise and back keeps the muscles; so do the browser's Back and Forward
            await cards.first().click();
            await expect(page).toHaveURL(/\/exercises\/[a-z-]+/);
            await app.backLink('Exercises').click();
            await expect(page).toHaveURL('/exercises?muscles=quads,glutes');
            await page.goBack();
            await page.goForward();
            await expect(page).toHaveURL('/exercises?muscles=quads,glutes');
            await expect(count).toContainText(`${filtered} exercises`);

            await page.getByRole('button', { name: 'All muscles' }).click();
            await page.getByRole('switch', { name: 'Only what I have' }).click();
            await expect(cards.and(page.getByRole('link', { name: /^Back squat / }))).toHaveCount(
                0
            );
            await expect(cards.and(page.getByRole('link', { name: /^Push-up / }))).toHaveCount(1);

            await page.getByRole('button', { name: 'My equipment: none picked' }).click();
            await page.getByRole('button', { name: 'Barbell', exact: true }).click();
            await page.getByRole('button', { name: 'Rack', exact: true }).click();
            await page.keyboard.press('Escape');
            await expect(
                page.getByRole('button', { name: 'My equipment: 2 pieces' })
            ).toBeVisible();
            await expect(cards.and(page.getByRole('link', { name: /^Back squat / }))).toHaveCount(
                1
            );

            await search.fill('zzzz');
            await expect(page.getByText('No exercises match.')).toBeVisible();
            await page.getByRole('button', { name: 'Clear search and filters' }).click();
            await expect(search).toHaveValue('');

            await app.goto('/exercises?muscles=quads,notamuscle');
            await expect(chips.getByRole('button', { name: 'Quads' })).toHaveAttribute(
                'aria-pressed',
                'true'
            );
            await expect(chips.getByRole('button', { pressed: true })).toHaveCount(1);
        }
    );
});

test.describe("an exercise's page", () => {
    test("REG-EXR-02 an exercise's page", { tag: '@p1' }, async ({ app, page }) => {
        await app.goto('/exercises/back-squat');
        await expect(app.backLink('Exercises')).toBeVisible();
        await expect(app.heading('Back squat')).toBeVisible();
        await expect(
            page
                .getByRole('list', { name: "Equipment and how it's measured" })
                .getByRole('listitem')
        ).toHaveText(['Barbell', 'Rack', 'Reps']);
        await expect(page.getByRole('button', { name: 'Add to workout' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible();
        const muscles = page.getByRole('region', { name: 'Muscles worked' });
        await expect(muscles.getByRole('list', { name: 'Main' }).getByRole('listitem')).toHaveText([
            'Quads',
            'Glutes',
        ]);
        await expect(
            muscles.getByRole('list', { name: 'Supporting' }).getByRole('listitem')
        ).toHaveText(['Hamstrings', 'Adductors', 'Lower back']);
        const how = page.getByRole('region', { name: 'How to do it' });
        await expect(how.getByRole('listitem')).toHaveCount(4);
        await expect(page.getByRole('region', { name: 'Tips' })).toBeVisible();
        // Reduced motion: its key positions side by side, with no Pause
        await expect(how.getByText('Standing', { exact: true })).toBeVisible();
        await expect(how.getByText('Bottom', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Pause the demo' })).toHaveCount(0);

        await app.goto('/exercises/plank');
        await expect(
            page.getByRole('region', { name: 'How to do it' }).getByText('Hold', { exact: true })
        ).toBeVisible();
        await app.goto('/exercises/inverted-row');
        await expect(page.getByRole('main')).toContainText(
            'Barbell and rack, Smith machine, or rings'
        );
        await app.goto('/exercises/nope');
        await expect(page.getByText('Exercise not found')).toBeVisible();
    });

    test.describe('with motion', () => {
        test.use({ reducedMotion: 'no-preference' });

        test('REG-EXR-02 the demo plays and pauses', { tag: '@p1' }, async ({ app, page }) => {
            await app.goto('/exercises/back-squat');
            const pause = page.getByRole('button', { name: 'Pause the demo' });
            await pause.click();
            const play = page.getByRole('button', { name: 'Play the demo' });
            await expect(play).toBeVisible();
            await play.click();
            await expect(pause).toBeVisible();
        });
    });

    test('REG-EXR-02 turning the 3D figure and how it looks', { tag: '@p1' }, () => {
        test.skip(
            true,
            'Manual: drag the 3D figure and press Turn the figure on a phone, and look at the figure. Headless Chromium draws WebGL in software, too slowly to judge.'
        );
    });
});

test.describe('notes and hiding', () => {
    test.use({
        storage: seed.workouts([
            workout('Squats', { steps: [reps(10, 'Back squat', { exercise: 'back-squat' })] }),
        ]),
    });

    test('REG-EXR-03 notes, and hiding from the picker', { tag: '@p2' }, async ({ app, page }) => {
        await app.goto('/exercises/back-squat');
        await page.getByRole('button', { name: 'Add note' }).click();
        const dialog = page.getByRole('dialog', { name: 'Back squat' });
        await dialog
            .getByRole('textbox', { name: 'Your note (optional)' })
            .fill('Pause at the bottom');
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByRole('main')).toContainText('Pause at the bottom');
        const edit = page.getByRole('button', { name: 'Edit note' });
        await expect(edit).toBeFocused();

        await app.goto('/exercises/plank');
        await page.getByRole('button', { name: 'Hide from the picker' }).click();
        await expect(page.getByText('Hidden from the picker in Create.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Show in the picker' })).toBeVisible();

        await app.goto('/exercises');
        await expect(
            page
                .getByRole('main')
                .getByRole('list')
                .last()
                .getByRole('link', { name: /^Plank Abs/ })
        ).toHaveCount(0);
        await expect(page.getByText(/Hidden from the picker \(1\)/)).toBeVisible();

        // Create's picker leaves it out for "plan", not for "plank"
        await app.goto('/setup');
        const create = new CreatePage(page);
        await create.exercise(1).fill('plan');
        const plank = page
            .getByRole('listbox', { name: 'Exercises' })
            .getByRole('option', { name: /^Plank ,/ });
        await expect(page.getByRole('listbox', { name: 'Exercises' })).toBeVisible();
        await expect(plank).toHaveCount(0);
        await create.exercise(1).fill('plank');
        await expect(plank).toHaveCount(1);

        // The note shows under the ring mid-workout
        await app.goto('/library');
        const run = new WorkoutPage(page);
        await run.startFromLibrary('Squats');
        await expect(
            run.main.getByText('Your note: Pause at the bottom', { exact: true })
        ).toBeVisible();
    });
});

test.describe('your own exercises', () => {
    test(
        'REG-EXR-04 your own exercises: make, use, rename, delete',
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/exercises');
            await page.getByRole('button', { name: 'New exercise' }).click();
            const dialog = page.getByRole('dialog', { name: 'New exercise' });
            await dialog.getByRole('textbox', { name: 'Name' }).fill('Sled push');
            await dialog
                .getByRole('group', { name: 'Main muscles' })
                .getByRole('button', { name: 'Quads' })
                .click();
            await dialog.getByRole('button', { name: 'Save' }).click();
            await expect(page).toHaveURL(/\/exercises\/[0-9a-f-]+$/);
            await expect(app.heading('Sled push')).toBeVisible();
            await expect(page.getByRole('main')).toContainText('Your own');
            await expect(page.getByRole('main')).toContainText(
                'No how-to steps or tips yet. Add them with Edit.'
            );
            const ownId = page.url().split('/').pop()!;

            // Make another and delete it, then Undo
            await app.goto('/exercises');
            await page.getByRole('button', { name: 'New exercise' }).click();
            await dialog.getByRole('textbox', { name: 'Name' }).fill('Sled drag');
            await dialog.getByRole('button', { name: 'Save' }).click();
            await expect(app.heading('Sled drag')).toBeVisible();
            await page.getByRole('button', { name: 'Delete' }).click();
            await expect(page).toHaveURL(/\/exercises$/);
            await expect(app.undoBar).toContainText('Deleted Sled drag');
            await app.undo.click();
            await expect(app.heading('Sled drag')).toBeVisible();

            // Rename it with Edit
            await app.goto(`/exercises/${ownId}`);
            await page.getByRole('button', { name: 'Edit' }).click();
            const editor = page.getByRole('dialog');
            await editor.getByRole('textbox', { name: 'Name' }).fill('Prowler push');
            await editor.getByRole('button', { name: 'Save' }).click();
            await expect(app.heading('Prowler push')).toBeVisible();
        }
    );

    test.describe('in a workout, and in the history', () => {
        const ownId = '71652dd3-bf96-4c6b-9ebd-8d9052e2ba0a';
        const legs: Workout = workout('Legs', {
            steps: [{ ...timed(30, 'Sled push'), exerciseId: ownId }],
        });
        test.use({
            storage: {
                ...seed.workouts([legs]),
                exercises: JSON.stringify([
                    {
                        id: ownId,
                        updatedAt: 1,
                        name: 'Sled push',
                        otherNames: [],
                        equipment: [],
                        measuredBy: 'timed',
                        mainMuscles: ['quads'],
                        supportingMuscles: [],
                        description: '',
                        steps: [],
                        tips: [],
                    },
                ]),
                ...seed.history([
                    run(legs, '2026-11-10T10:00', {
                        sets: [
                            {
                                round: 0,
                                step: 0,
                                name: 'Sled push',
                                seconds: 30,
                                exerciseId: ownId,
                            },
                        ],
                    }),
                ]),
            },
        });

        test(
            "REG-EXR-04 one in a workout can't be deleted; one in the history is hidden",
            { tag: '@p2' },
            async ({ app, page }) => {
                await app.goto(`/exercises/${ownId}`);
                await page.getByRole('button', { name: 'Delete' }).click();
                await expect(
                    page.getByText(
                        "Sled push is in Legs, so it can't be deleted. Take it out of that workout first, or hide it from the picker."
                    )
                ).toBeVisible();

                // Out of the workout, it's hidden instead, as it's in the history
                await app.goto('/setup?editId=legs');
                const create = new CreatePage(page);
                await create.name(1, 'Run');
                await create.save.click();
                await app.goto(`/exercises/${ownId}`);
                await page.getByRole('button', { name: 'Delete' }).click();
                await expect(app.undoBar).toContainText(
                    "Sled push is in your history, so it's hidden from the picker instead"
                );
            }
        );
    });
});

test.describe('adding to a workout from its page', () => {
    test.use({
        storage: seed.workouts([
            workout('Legs', {
                steps: Array.from({ length: 6 }, (_, i) => timed(30, `Step ${i + 1}`)),
            }),
            workout('Arms', {
                steps: Array.from({ length: 20 }, (_, i) => timed(30, `Step ${i + 1}`)),
            }),
        ]),
    });

    test(
        'REG-EXR-05 add an exercise to a workout from its page',
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/exercises/back-squat');
            const add = page.getByRole('button', { name: 'Add to workout' });
            await add.click();
            const dialog = page.getByRole('dialog', { name: 'Add Back squat to' });
            await expect(dialog).toContainText(
                'It goes at the end with 3 sets, to change before you save.'
            );
            await expect(dialog.getByRole('button', { name: 'New workout' })).toBeFocused();
            await expect(dialog.getByRole('button', { name: /^Arms/ })).toBeDisabled();
            await expect(dialog.getByRole('button', { name: /^Arms/ })).toContainText('Full');
            await page.keyboard.press('Escape');
            await expect(dialog).toBeHidden();
            await expect(add).toBeFocused();

            await add.click();
            await dialog.getByRole('button', { name: /^Legs/ }).click();
            await expect(page).toHaveURL(/\/setup\?editId=legs/);
            const create = new CreatePage(page);
            await expect(create.exercise(7)).toHaveValue('Back squat');
            await expect(create.field(7, 'Sets')).toHaveAttribute('aria-valuenow', '3');
            await expect
                .poll(() => app.announcements())
                .toContainEqual(expect.stringContaining('Added Back squat, step 7'));
            // Not saved yet
            const [legs] = (await app.stored<Workout[]>('workouts'))!;
            expect(legs.blocks).toHaveLength(1);

            // A reload opens it as saved, without adding it again
            await app.reload();
            await expect(page).not.toHaveURL(/add=/);
            await expect(create.kindPill(7)).toHaveCount(0);
        }
    );
});

test.describe("the tour of an exercise's page", () => {
    test(
        "REG-EXR-06 the tour of an exercise's page, the first one opened",
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/exercises');
            await page.evaluate(() => localStorage.removeItem('tour-exercise'));
            await page.getByRole('link', { name: /^Back squat/ }).click();

            const tour = page.getByRole('dialog', { name: 'Add to workout' });
            await expect(tour).toBeVisible();
            await expect(tour).toContainText('1 of 4');
            const titles = ['Add to workout', 'Your note', 'Muscles worked', 'How to do it'];
            for (const [stop, title] of titles.entries()) {
                const card = page.getByRole('dialog', { name: title });
                await expect(card).toBeVisible();
                await card
                    .getByRole('button', { name: stop < titles.length - 1 ? 'Next' : 'Done' })
                    .click();
            }
            await expect(page.getByRole('dialog')).toHaveCount(0);
            await expect(page.getByRole('heading', { name: 'Back squat', level: 2 })).toBeFocused();
            expect(await app.storageItem('tour-exercise')).toBe('seen');

            // Not again on the next one
            await app.goto('/exercises/plank');
            await expect(page.getByRole('heading', { name: 'Plank', level: 2 })).toBeVisible();
            await expect(page.getByRole('dialog')).toHaveCount(0);
        }
    );
});
