import { expect, group, reps, rest, seed, test, timed, workout } from './fixtures';
import { CreatePage } from './create-page';
import { LibraryPage } from './library-page';
import { Finger } from './touch';
import { WorkoutPage } from './workout-page';

// Touch gestures and dragging: REG-GES in docs/regression-tests.md. The swipes are touch, on the
// phone project; the drags in Create are a mouse's, on both.

const legs = workout('Legs', { steps: [timed(60), rest(10)], repeats: 3 });

test.describe('swiping', () => {
    test.use({
        reducedMotion: 'no-preference',
        storage: seed.workouts([
            legs,
            workout('Arms', { steps: [timed(30)] }),
            workout('Core', { steps: [timed(30)] }),
        ]),
    });
    test.beforeEach(({ isMobile }) => {
        test.skip(!isMobile, 'touch, on the phone project');
    });

    test('REG-GES-01 swipe a page back', { tag: '@p3' }, async ({ app, page }) => {
        const finger = await Finger.on(page);
        await app.goto('/exercises');
        await page.getByRole('link', { name: /^Back squat / }).click();
        await expect(page).toHaveURL('/exercises/back-squat');
        const main = page.getByRole('main');

        // A short, slow swipe springs back
        await finger.drag(
            await Finger.within(main, 0.1, 0.3),
            await Finger.within(main, 0.3, 0.3),
            {
                ms: 800,
                settle: 200,
            }
        );
        await expect(page).toHaveURL('/exercises/back-squat');

        // Past halfway, the page goes back
        await finger.drag(
            await Finger.within(main, 0.1, 0.3),
            await Finger.within(main, 0.8, 0.3),
            {
                ms: 600,
            }
        );
        await expect(page).toHaveURL('/exercises');
    });

    test(
        'REG-GES-01 swiping the run bar to end the workout',
        { tag: '@p3' },
        async ({ app, page }) => {
            const finger = await Finger.on(page);
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Legs');
            await run.wait(61_000);
            await run.close.click();
            await expect(app.runBar).toBeVisible();

            // Short, it springs back and the run carries on
            await finger.drag(
                await Finger.within(app.runBar, 0.2),
                await Finger.within(app.runBar, 0.4),
                {
                    ms: 800,
                    settle: 200,
                }
            );
            await expect(app.runBar).toBeVisible();
            await expect(page).toHaveURL('/library');

            // A mouse drag does nothing
            const from = await Finger.within(app.runBar, 0.2);
            await page.mouse.move(from.x, from.y);
            await page.mouse.down();
            await page.mouse.move(from.x + 300, from.y, { steps: 10 });
            await page.mouse.up();
            await expect(app.runBar).toBeVisible();

            // Past halfway, it ends the workout and its summary opens
            await finger.drag(
                await Finger.within(app.runBar, 0.1),
                await Finger.within(app.runBar, 0.9),
                {
                    ms: 600,
                }
            );
            await expect(page).toHaveURL('/workout');
            await expect(run.summary).toHaveAccessibleName('Workout ended');
            await expect(
                run.summary.getByRole('button', { name: 'Back to workout' })
            ).toBeVisible();
        }
    );

    test(
        'REG-GES-02 library cards: swipe to delete, hold for options',
        { tag: '@p3' },
        async ({ app, page }) => {
            const finger = await Finger.on(page);
            const library = new LibraryPage(page);
            await app.goto('/library');
            const arms = library.card('Arms');

            // A little way, slowly: it springs back, and nothing opens or starts
            await finger.drag(
                await Finger.within(arms, 0.6, 0.3),
                await Finger.within(arms, 0.45, 0.3),
                {
                    ms: 800,
                    settle: 200,
                }
            );
            await expect(arms).toHaveCount(1);
            await expect(page).toHaveURL('/library');
            // Sprung back into place before the next swipe
            const home = (await library.card('Core').getByRole('link').first().boundingBox())!.x;
            await expect
                .poll(async () => (await arms.getByRole('link').first().boundingBox())!.x)
                .toBeCloseTo(home, 0);

            // Past halfway: deleted, with Undo
            await finger.drag(
                await Finger.within(arms, 0.9, 0.3),
                await Finger.within(arms, 0.1, 0.3),
                {
                    ms: 600,
                }
            );
            await expect(arms).toHaveCount(0);
            await expect(app.undoBar).toContainText('Deleted "Arms"');
            await app.undo.click();
            await expect(arms).toHaveCount(1);
            await expect(page).toHaveURL('/library');

            // Held still, its options open; it doesn't start or open
            await finger.hold(await Finger.within(library.card('Core'), 0.5, 0.3), 700);
            await expect(page.getByRole('group', { name: 'Options for Core' })).toBeVisible();
            await expect(page).toHaveURL('/library');
        }
    );

    test(
        'REG-GES-01 a tap and a swipe mid page-slide, and the summary drag, on an iPhone',
        { tag: '@p3' },
        () => {
            test.skip(
                true,
                "Manual in Safari on an iPhone (TODO.md): try a tap and a swipe while a page slides, and dragging the summary down from its content. Chromium's touch here isn't Safari's."
            );
        }
    );
});

test.describe('dragging steps', () => {
    const abc = workout('ABC', {
        blocks: ['A', 'B', 'C'].map((name) => group([timed(30, name)])),
    });
    const upper = workout('Upper', {
        blocks: [
            group(
                [
                    reps(10, 'Bench press', { exercise: 'bench-press' }),
                    reps(10, 'Barbell row', { exercise: 'barbell-row' }),
                ],
                3,
                60
            ),
            group([timed(30, 'Plank', 'plank')]),
        ],
    });
    test.use({ storage: seed.workouts([abc, upper]) });

    /** Drags step `n`'s handle with the mouse, onto `target`'s lower half, in small moves. */
    async function dragStep(
        page: import('@playwright/test').Page,
        handle: import('@playwright/test').Locator,
        target: import('@playwright/test').Locator,
        below: boolean
    ) {
        const from = (await handle.boundingBox())!;
        const to = (await target.boundingBox())!;
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(
            from.x + from.width / 2,
            from.y + from.height / 2 + (below ? 10 : -10),
            {
                steps: 5,
            }
        );
        await page.mouse.move(from.x + from.width / 2, to.y + (below ? to.height + 5 : -5), {
            steps: 20,
        });
        await page.mouse.up();
    }

    test("REG-GES-03 dragging Create's steps", { tag: '@p3' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        await app.goto('/setup?editId=abc');
        const handles = page.getByTitle('Drag to reorder');
        await dragStep(page, handles.nth(2), create.header(1), false);
        await expect(create.header(1)).toHaveAccessibleName(/^Step 1, C/);
        await expect(create.header(2)).toHaveAccessibleName(/^Step 2, A/);
        await expect(create.header(3)).toHaveAccessibleName(/^Step 3, B/);
        await expect
            .poll(() => app.announcements())
            .toContainEqual(expect.stringMatching(/^Moved C/));
    });

    test('REG-GES-03 dragging a superset past a step', { tag: '@p3' }, async ({ app, page }) => {
        const create = new CreatePage(page);
        await app.goto('/setup?editId=upper');
        await dragStep(
            page,
            page.getByTitle('Drag to move it with its steps'),
            create.header(3),
            true
        );
        await expect(create.header(1)).toHaveAccessibleName(/^Step 1, Plank/);
        // The superset follows, with both its steps
        await expect(page.getByRole('button', { name: /^Superset, steps 2 to 3/ })).toBeVisible();

        await expect
            .poll(() => app.announcements())
            .toContainEqual(expect.stringContaining('Moved superset to the end'));
    });

    test(
        'REG-GES-03 an open superset stays put as its handle is pressed',
        { tag: '@p3' },
        async ({ app, page }) => {
            test.fixme(
                true,
                'Known issue (TODO.md): an open superset folds as its handle is pressed, so the list below jumps up under the finger before the drag starts.'
            );
            await app.goto('/setup?editId=upper');
            await page.getByRole('button', { name: /^Superset, steps 1 to 2/ }).click();
            const plank = new CreatePage(page).header(3);
            const before = (await plank.boundingBox())!.y;
            const handle = (await page.getByTitle('Drag to move it with its steps').boundingBox())!;
            await page.mouse.move(handle.x + 5, handle.y + 5);
            await page.mouse.down();
            expect((await plank.boundingBox())!.y).toBe(before);
            await page.mouse.up();
        }
    );
});
