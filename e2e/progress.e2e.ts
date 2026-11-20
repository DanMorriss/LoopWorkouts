import { expect, reps, run, seed, sets, test, workout, type LoggedSet } from './fixtures';
import { setWheel, WorkoutPage } from './workout-page';

// Progress (progress.md): REG-PRG in docs/regression-tests.md. The clock is at NOW, Wednesday
// 11 November 2026 at 09:00.

const squat = (count: number, weight: number, round = 0): LoggedSet => ({
    round,
    step: 0,
    name: 'Back squat',
    reps: count,
    weight,
    exerciseId: 'builtin:back-squat',
});

test.describe('muscles worked this week', () => {
    test.use({
        storage: seed.history([
            run('legs', '2026-11-10T10:00', {
                title: 'Legs',
                sets: [
                    squat(10, 60),
                    squat(10, 60, 1),
                    {
                        round: 0,
                        step: 1,
                        name: 'Bench press',
                        reps: 10,
                        weight: 60,
                        exerciseId: 'builtin:bench-press',
                    },
                ],
            }),
            run('core', '2026-11-02T10:00', {
                title: 'Core',
                sets: [
                    { round: 0, step: 0, name: 'Plank', seconds: 45, exerciseId: 'builtin:plank' },
                ],
            }),
        ]),
    });

    test('REG-PRG-01 muscles worked this week', { tag: '@p2' }, async ({ app, page }) => {
        await app.goto('/history');
        const muscles = page.getByRole('region', { name: 'Muscles worked this week' });
        const bars = muscles
            .getByRole('list', { name: 'Sets per muscle this week' })
            .getByRole('listitem');
        await expect(bars).toHaveCount(16);
        await expect(bars.nth(0)).toContainText(/^Glutes.*2 sets, under 10$/);
        await expect(bars.nth(1)).toContainText(/^Quads.*2 sets, under 10$/);
        await expect(bars.nth(2)).toContainText(/^Adductors.*1 set, under 4$/);
        // The plank 9 days ago doesn't count
        await expect(bars.filter({ hasText: /^Abs/ })).toContainText('0 sets, under 10');

        // Training for Fitness, the aims come down; set to 2 sets a week, the glutes reach it
        await app.goto('/account');
        await page.getByRole('radio', { name: 'Fitness' }).check();
        const sets = page.getByRole('spinbutton', { name: /^Sets a week per muscle/ });
        await expect(sets).toHaveAttribute('aria-valuenow', '6');
        await app.goto('/history');
        await expect(bars.nth(0)).toContainText(/^Glutes.*2 sets, under 6$/);
        await app.goto('/account');
        await sets.focus();
        await page.keyboard.press('Home');
        await expect(sets).toHaveAttribute('aria-valuenow', '2');
        await app.goto('/history');
        await expect(bars.nth(0)).toContainText(/^Glutes.*2 sets, 2 reached$/);
        await expect(bars.nth(2)).toContainText(/^Adductors.*1 set, 1 reached$/);
    });

    test(
        'REG-PRG-08 a muscle picked on Progress, and its exercises',
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/history');
            const muscles = page.getByRole('region', { name: 'Muscles worked this week' });
            const quadsBar = muscles.getByRole('button', { name: /^Quads \d/ });
            const quadsPill = muscles.getByRole('button', { name: 'Quads', exact: true });
            await expect(muscles.getByText('Tap a muscle to find exercises for it')).toBeVisible();

            // Picked on its bar, it's picked in the list on the second slide too
            await quadsBar.click();
            await expect(quadsBar).toHaveAttribute('aria-pressed', 'true');
            const listDot = muscles.getByRole('button', { name: 'Muscle list 2 of 2' });
            await listDot.click();
            await expect(listDot).toHaveAttribute('aria-current', 'true');
            await expect(quadsPill).toHaveAttribute('aria-pressed', 'true');

            // Its exercises, with ‹ Progress back
            await muscles.getByRole('link', { name: 'Exercises for Quads' }).click();
            await expect(page).toHaveURL(/\/exercises\?muscles=quads&from=history$/);
            await page.getByRole('link', { name: 'Progress' }).first().click();
            await expect(page).toHaveURL(/\/history$/);
        }
    );
});

test.describe("an exercise's progress", () => {
    const legs = (startedAt: string, sets: LoggedSet[]) =>
        run('legs', startedAt, { title: 'Legs', sets });
    test.use({
        storage: seed.history([
            legs('2026-11-01T10:00', [squat(5, 100)]),
            legs('2026-11-09T10:00', [squat(10, 80), squat(12, 60, 1)]),
            legs('2026-08-01T10:00', [squat(5, 50)]),
            legs('2026-08-15T10:00', [squat(6, 55)]),
            legs('2026-09-01T10:00', [squat(7, 60)]),
            legs('2026-09-10T10:00', [squat(8, 65)]),
            legs('2026-09-20T10:00', [squat(9, 70)]),
        ]),
    });

    test(
        "REG-PRG-02 an exercise's progress, and its card on the list",
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/exercises');
            const card = page.getByRole('listitem').filter({
                has: page.getByRole('link', { name: /^Back squat/ }),
            });
            await expect(card.first()).toContainText('Latest');
            await expect(card.first()).toContainText('10 @ 80, 12 @ 60 kg');
            await expect(card.first()).toContainText('Best 100 kg');

            await app.goto('/exercises/back-squat');
            const progress = page.getByRole('region', { name: 'Progress' });
            const best = (term: string) =>
                progress.getByRole('term').filter({ hasText: term }).locator('+ dd');
            await expect(best('Heaviest')).toContainText('100 kg × 5');
            await expect(best('Estimated one-rep max')).toContainText('116.5 kg');
            await expect(best('Estimated one-rep max')).toContainText('from 100 kg × 5');
            await expect(best('Most reps')).toContainText('12 @ 60 kg');
            const chart = progress.getByRole('group', { name: 'Estimated one-rep max' });
            await expect(chart).toContainText('7 workouts in all time');

            // The chart by keys: from the latest, Home to the first
            await chart.focus();
            await expect
                .poll(() => app.announcements())
                .toContainEqual(expect.stringMatching(/9 Nov/));
            await page.keyboard.press('Home');
            await expect
                .poll(() => app.announcements())
                .toContainEqual(expect.stringMatching(/1 Aug/));

            await progress.getByRole('button', { name: '4 weeks' }).click();
            await expect(chart).toContainText('2 workouts');
            await progress.getByRole('button', { name: 'Table 2 of 2' }).click();
            await expect(progress.getByRole('table')).toBeInViewport();
            await expect(progress.getByRole('table').getByRole('row')).toHaveCount(3);

            const sessions = progress
                .getByRole('list', { name: 'Recent sessions' })
                .getByRole('link');
            await expect(sessions).toHaveCount(5);
            await progress.getByRole('button', { name: 'Show all 7' }).click();
            await expect(sessions).toHaveCount(7);
            await expect(sessions.first()).toHaveAttribute('href', /\/history\?run=/);

            await app.goto('/account');
            await page.getByRole('radio', { name: 'Pounds (lb)' }).check();
            await app.goto('/exercises/back-squat');
            await expect(best('Heaviest')).toContainText('220.5 lb × 5');
        }
    );

    test('REG-PRG-02 an exercise never done', { tag: '@p2' }, async ({ app, page }) => {
        await app.goto('/exercises/plank');
        await expect(
            page
                .getByRole('region', { name: 'Progress' })
                .getByText(
                    'Nothing logged yet. Do it in a workout and its bests and progress show up here.'
                )
        ).toBeVisible();
    });
});

test.describe('the suggested next workout', () => {
    const legs = workout('Legs', { steps: [reps(10, 'Back squat', { exercise: 'back-squat' })] });
    const push = workout('Push', { steps: [reps(10, 'Bench press', { exercise: 'bench-press' })] });
    test.use({
        storage: {
            ...seed.workouts([legs, push]),
            ...seed.history([
                run(legs, '2026-11-10T10:00', { sets: [squat(10, 60), squat(10, 60, 1)] }),
            ]),
        },
    });

    test(
        'REG-PRG-03 the suggested next workout on Today',
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/home');
            const suggested = page.getByRole('region', { name: 'Suggested next workout' });
            await expect(suggested).toContainText('Push');
            await expect(suggested).toContainText(
                "It works your Chest, which you haven't trained in the last 7 days."
            );
            // Start is its only way on: Progress is linked from the muscles under it
            await expect(suggested.getByRole('link')).toHaveCount(0);
            await expect(
                page
                    .getByRole('region', { name: 'Muscles worked this week' })
                    .getByRole('link', { name: "See this week's progress" })
            ).toHaveAttribute('href', '/history');
            await suggested.getByRole('button', { name: 'Start Push' }).click();
            await expect(page).toHaveURL('/workout');
            await expect(new WorkoutPage(page).title).toContainText('Push');
        }
    );
});

test.describe("the week's exercises", () => {
    const lunge = (side: 'left' | 'right', round: number): LoggedSet => ({
        round,
        step: 2,
        side,
        name: 'Dumbbell lunge',
        reps: 10,
        exerciseId: 'builtin:dumbbell-lunge',
    });
    const plank = (seconds: number): LoggedSet => ({
        round: 0,
        step: 1,
        name: 'Plank',
        seconds,
        exerciseId: 'builtin:plank',
    });
    test.use({
        storage: seed.history([
            run('legs', '2026-11-10T10:00', {
                title: 'Legs',
                sets: [
                    squat(10, 62.5),
                    squat(10, 62.5, 1),
                    plank(60),
                    lunge('left', 0),
                    lunge('right', 0),
                    lunge('left', 1),
                    lunge('right', 1),
                ],
            }),
            // 9 days ago: not this week's, but what this week beat
            run('legs', '2026-11-02T10:00', { title: 'Legs', sets: [squat(10, 60), plank(45)] }),
        ]),
    });

    test(
        "REG-PRG-04 the week's exercises, with their new bests",
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/history');
            const week = page.getByRole('region', { name: 'Exercises this week' });
            const rows = week.getByRole('listitem');
            await expect(rows).toHaveCount(3);
            // Those with a new best first, then most sets
            await expect(rows.nth(0)).toContainText('Back squat');
            await expect(rows.nth(0)).toContainText('20 reps in 2 sets, 1,250 kg lifted');
            await expect(rows.nth(0)).toContainText('New best, heaviest: 62.5 kg for 10 reps');
            await expect(rows.nth(1)).toContainText('Plank');
            await expect(rows.nth(1)).toContainText('1 minute in 1 set');
            await expect(rows.nth(1)).toContainText('New best, longest: 1 minute');
            // Each side's reps, a left and a right making a set; a first time sets no best
            await expect(rows.nth(2)).toContainText('20 reps each side in 2 sets');
            await expect(rows.nth(2)).not.toContainText('New best');

            // Its page's ‹ comes back to its row, focused
            await week.getByRole('link', { name: 'Back squat' }).click();
            await expect(page).toHaveURL('/exercises/back-squat?from=progress');
            await page.locator('.back-link', { hasText: 'Progress' }).click();
            await expect(page).toHaveURL('/history?exercise=back-squat');
            await expect(week.getByRole('link', { name: 'Back squat' })).toBeFocused();

            // And from the log, back to the run it was in
            await page.locator('.entry__exercise', { hasText: 'Plank' }).first().click();
            await expect(page).toHaveURL(/\/exercises\/plank\?run=/);
            await page.locator('.back-link', { hasText: 'Progress' }).click();
            await expect(page).toHaveURL(/\/history\?run=/);
        }
    );
});

test.describe('a kettlebell workout', () => {
    test.use({
        storage: seed.workouts([
            workout('Kettlebell', {
                steps: [
                    reps(20, 'Kettlebell swing', { exercise: 'kettlebell-swing' }),
                    reps(10, 'Goblet squat', { exercise: 'goblet-squat' }),
                ],
            }),
        ]),
    });

    test(
        'REG-PRG-05 one kettlebell for the workout, and when to get a heavier one',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Kettlebell');

            // The kettlebell's weight, said once, is on every step that uses it
            await setWheel(run.wheel('Weight, kg'), 16, 0.5);
            await run.pressDone();
            await expect(run.face).toContainText('Goblet squat');
            await expect(
                run.face.getByRole('spinbutton', { name: 'Weight, kg', exact: true })
            ).toHaveAttribute('aria-valuenow', '16');
            await run.pressDone();

            // 20 swings: time for a heavier kettlebell, not 2.5 kg more
            const notice = run.summary.getByRole('region', { name: 'Time for a new kettlebell' });
            await expect(notice).toContainText("Congratulations, you're ready to go up in weight.");
            await expect(notice).toContainText('Kettlebell swing: 20 reps @ 16 kg');
            await expect(notice).not.toContainText('Goblet squat');
            // Short of 20, a rep more
            const nextTime = run.summary.getByRole('region', { name: 'Next time' });
            await expect(nextTime).toContainText('Goblet squat: try 11 reps, up from 10');
            await expect(nextTime).not.toContainText('Kettlebell swing');
        }
    );
});

test.describe('my kettlebell, across workouts', () => {
    const swings = (weight: number) =>
        reps(15, 'Kettlebell swing', { exercise: 'kettlebell-swing', weight });
    test.use({
        storage: {
            ...seed.settings({ myEquipment: ['kettlebell'], kettlebellWeight: 16 }),
            ...seed.workouts([
                workout('Swings', { steps: [swings(16)] }),
                workout('Kettlebell', {
                    steps: [
                        swings(16),
                        reps(10, 'Goblet squat', { exercise: 'goblet-squat', weight: 16 }),
                    ],
                }),
            ]),
        },
    });

    test(
        'REG-PRG-06 a heavier kettlebell in one workout starts them all at it',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Swings');
            await setWheel(run.wheel('Weight, kg'), 20, 0.5);
            await run.endWorkout();
            await run.summaryDone.click();

            // The other workout starts at it, without being changed
            await app.goto('/library');
            await run.startFromLibrary('Kettlebell');
            await expect(
                run.face.getByRole('spinbutton', { name: 'Weight, kg', exact: true })
            ).toHaveAttribute('aria-valuenow', '20');
            await run.endWorkout();
            await run.summaryDone.click();

            // And it's on Profile, to see or change
            await app.goto('/account');
            await expect(
                page.getByRole('textbox', { name: 'My kettlebell in kilograms' })
            ).toHaveValue('20');
        }
    );
});

test.describe('stretches on Today', () => {
    const push = workout('Push', { steps: [reps(10, 'Push-up', { exercise: 'push-up' })] });
    test.use({
        storage: {
            ...seed.workouts([push]),
            ...seed.history([
                run(push, '2026-11-11T07:00', { sets: sets('push-up', 'Push-up', [10], [10]) }),
            ]),
        },
    });

    test(
        "REG-PRG-07 after today's training, Today offers its stretches first",
        { tag: '@p2' },
        async ({ app, page }) => {
            await app.goto('/home');
            const card = page.getByRole('region', { name: "After today's training" });
            await expect(card.getByRole('group', { name: /^Suggestion 1 of/ })).toContainText(
                'Stretch what you worked'
            );
            // Then the workouts to do next, swiped to
            await expect(card.getByRole('group', { name: /^Suggestion 2 of/ })).toBeAttached();
            await card.getByRole('button', { name: /^Start stretches/ }).click();
            await expect(page).toHaveURL('/workout');
            await expect(new WorkoutPage(page).face).toContainText('Doorway chest stretch');
        }
    );
});
