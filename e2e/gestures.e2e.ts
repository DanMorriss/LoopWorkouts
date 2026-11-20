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
        'REG-GES-06 drag a dialog sheet back down to close it',
        { tag: '@p3' },
        async ({ app, page }) => {
            const finger = await Finger.on(page);
            await app.goto('/library');
            await page.getByRole('link', { name: 'Details of Legs' }).click();
            const addToPlan = page.getByRole('button', { name: 'Add to plan' });
            await addToPlan.click();
            const dialog = page.getByRole('dialog', { name: /^Plan Legs on/ });
            await expect(dialog).toBeVisible();
            // A sheet along the bottom of the screen, with a grabber at its top
            const grabber = dialog.locator('.dialog-grabber');
            await expect(grabber).toBeVisible();
            const height = await page.evaluate(() => window.innerHeight);
            await expect
                .poll(async () =>
                    Math.round(
                        (await dialog.boundingBox())!.y + (await dialog.boundingBox())!.height
                    )
                )
                .toBe(height);
            const top = (await dialog.boundingBox())!.y;

            // A little way down by its grabber, slowly: it springs back up and stays open
            const from = await Finger.within(grabber, 0.5);
            await finger.drag(from, { x: from.x, y: from.y + 80 }, { ms: 600, settle: 200 });
            await expect(dialog).toBeVisible();
            await expect
                .poll(async () => Math.round((await dialog.boundingBox())!.y))
                .toBe(Math.round(top));

            // Down past halfway from its content, scrolled to the top: it closes, picking no
            // day, and focus is back on Add to plan
            const monday = await Finger.within(
                dialog.getByRole('button', { name: /^Monday/ }),
                0.5
            );
            await finger.drag(monday, { x: monday.x, y: monday.y + 300 }, { ms: 500 });
            await expect(dialog).toHaveCount(0);
            await expect(addToPlan).toBeFocused();
            await expect(app.undoBar).toHaveCount(0);
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
        'REG-GES-03 an open superset stays put as its handle is pressed, then drags whole',
        { tag: '@p3' },
        async ({ app, page }) => {
            const create = new CreatePage(page);
            await app.goto('/setup?editId=upper');
            await page.getByRole('button', { name: /^Superset, steps 1 to 2/ }).click();
            const plank = create.header(3);
            const before = (await plank.boundingBox())!;
            const handle = (await page.getByTitle('Drag to move it with its steps').boundingBox())!;
            const [x, y] = [handle.x + handle.width / 2, handle.y + handle.height / 2];

            // Pressed, nothing moves under the finger
            await page.mouse.move(x, y);
            await page.mouse.down();
            expect((await plank.boundingBox())!.y).toBe(before.y);

            // Dragged, its steps fold away and the rows below are measured again where they
            // are, so it goes past Plank
            await page.mouse.move(x, y + 10, { steps: 5 });
            await expect.poll(async () => (await plank.boundingBox())!.y).toBeLessThan(before.y);
            const moved = (await plank.boundingBox())!;
            await page.mouse.move(x, moved.y + moved.height + 5, { steps: 20 });
            await page.mouse.up();

            await expect(create.header(1)).toHaveAccessibleName(/^Step 1, Plank/);
            // Open again as it was, with both its steps
            await expect(
                page.getByRole('button', { name: /^Superset, steps 2 to 3/ })
            ).toHaveAttribute('aria-expanded', 'true');
            await expect
                .poll(() => app.announcements())
                .toContainEqual(expect.stringContaining('Moved superset to the end'));
        }
    );
});

test.describe('dragging the plan (PLN-1, PLN-6)', () => {
    const push = workout('Push', { steps: [reps(10, 'Bench press', { exercise: 'bench-press' })] });
    test.use({
        storage: { ...seed.workouts([legs, push]), ...seed.plan({ tue: ['legs'], thu: ['push'] }) },
    });

    /** Drags with the mouse from the middle of `from` to the middle of `to`, in small moves. */
    async function drag(
        page: import('@playwright/test').Page,
        from: import('@playwright/test').Locator,
        to: import('@playwright/test').Locator
    ) {
        await from.scrollIntoViewIfNeeded();
        const a = (await from.boundingBox())!;
        const b = (await to.boundingBox())!;
        const [x, y] = [a.x + a.width / 2, a.y + a.height / 2];
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 5, y + 5, { steps: 5 });
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
        await page.mouse.up();
    }

    test(
        'REG-GES-04 dragging a planned workout to another day',
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/plan');
            const handle = page.getByRole('button', { name: 'Move Legs to other days' });
            const monday = page.getByRole('region', { name: 'Monday', exact: true });
            await drag(page, handle, monday.getByText('Nothing planned'));

            await expect(monday).toContainText('Legs');
            await expect(page.getByRole('region', { name: 'Tuesday', exact: true })).toContainText(
                'Nothing planned'
            );
            await expect.poll(() => app.announcements()).toContainEqual('Legs moved to Monday');
            const plan = await app.stored<{ days: string[][] }>('week-plan');
            expect(plan?.days[0]).toEqual(['legs']);
            // Its day had gone by when it was moved there, so it starts next week (PLN-3)
            await expect(monday).toContainText('From next week');
            // Still on the Plan page: the drag didn't swipe it back
            await expect(page).toHaveURL('/plan');
        }
    );

    test(
        "REG-GES-04 dragging a ready-made plan's day to another place in the week",
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/ready-made-plans');
            const card = page.getByRole('article', { name: 'Push, pull, legs' });
            const week = card.getByRole('list', { name: 'The week of Push, pull, legs' });
            await drag(
                page,
                week.getByRole('button', { name: 'Monday: Gym push' }),
                week.getByRole('button', { name: 'Thursday: rest' })
            );

            await expect(week.getByRole('button', { name: 'Thursday: Gym push' })).toBeVisible();
            await expect(card.getByRole('link', { name: 'Gym push : Thu' })).toBeVisible();
            await card.getByRole('button', { name: 'Use Push, pull, legs' }).click();
            await expect(page).toHaveURL('/home');
            const plan = await app.stored<{ days: string[][] }>('week-plan');
            expect(plan?.days[3]).toEqual(['builtin:gym-push']);
        }
    );

    test(
        "REG-GES-04 holding and dragging a ready-made plan's day on a phone",
        { tag: '@p3' },
        async ({ app, page, isMobile }) => {
            test.skip(!isMobile, 'touch, on the phone project');
            const finger = await Finger.on(page);
            await app.goto('/ready-made-plans');
            const card = page.getByRole('article', { name: 'Push, pull, legs' });
            const week = card.getByRole('list', { name: 'The week of Push, pull, legs' });
            const monday = week.getByRole('button', { name: 'Monday: Gym push' });
            const from = await Finger.within(monday, 0.5);
            const to = await Finger.within(week.getByRole('button', { name: /^Thursday/ }), 0.5);
            // Held still a moment first, then dragged
            await finger.drag(from, to, { hold: 400, ms: 600, settle: 100 });

            await expect(card.getByRole('link', { name: 'Gym push : Thu' })).toBeVisible();
            // And the drag didn't swipe the page back
            await expect(page).toHaveURL('/ready-made-plans');
        }
    );
});

test.describe('swiping between ready-made plans on Today (NAV-6)', () => {
    test.use({
        // The swipe is the browser's own scrolling, motion or not; with reduced motion, a dot
        // goes straight to its plan rather than gliding there
        reducedMotion: 'reduce',
        storage: seed.settings({ trainingGoal: 'fitness', myEquipment: ['kettlebell'] }),
    });
    test.beforeEach(({ isMobile }) => {
        test.skip(!isMobile, 'touch, on the phone project');
    });

    test('REG-GES-05 swipe Get started to the next plan', { tag: '@p2' }, async ({ app, page }) => {
        const finger = await Finger.on(page);
        await app.goto('/home');
        const getStarted = page.getByRole('region', { name: 'Get started' });
        const dots = getStarted.getByRole('button', { name: /^Plan \d of 3$/ });
        await expect(dots).toHaveCount(3);
        await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');

        // A swipe left on its title, not its week (whose days are dragged)
        const card = getStarted.locator('.plan-card__intro').first();
        await finger.drag(
            await Finger.within(card, 0.9, 0.5),
            await Finger.within(card, 0.1, 0.5),
            {
                ms: 300,
            }
        );
        await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
        await expect(
            getStarted.getByRole('heading', { name: 'Kettlebell, 3 days' })
        ).toBeInViewport();
        // Settled on it: the dot is current from halfway, and a tap while the swipe still
        // snaps would be pulled back by it, where a real finger would stop it
        const track = getStarted.locator('.carousel__track');
        const scrolledTo = (slide: number) =>
            expect
                .poll(() =>
                    track.evaluate(
                        (el, i) =>
                            el.scrollLeft === (el.children[i] as HTMLElement).offsetLeft &&
                            el.scrollLeft > 0,
                        slide
                    )
                )
                .toBe(true);
        await scrolledTo(1);

        // And a dot goes straight to its plan, scrolled across to it
        await dots.nth(2).click();
        await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true');
        await scrolledTo(2);
        await expect(getStarted.getByRole('link', { name: 'All plans' })).toBeVisible();
    });
});
