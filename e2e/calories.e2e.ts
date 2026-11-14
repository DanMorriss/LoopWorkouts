import { expect, seed, test, timed, workout } from './fixtures';
import { HistoryPage } from './history-page';
import { WorkoutPage } from './workout-page';

// Calories (calories.md): REG-CAL in docs/regression-tests.md. The run works from the page's
// clock, which these move on with runFor, so nothing waits in real time.

const planks = workout('Planks', { steps: [timed(600, 'Plank', 'plank')] });

test.describe('with a body weight given', () => {
    test.use({
        storage: { ...seed.workouts([planks]), ...seed.settings({ bodyWeight: 75 }) },
    });

    test(
        'REG-CAL-01 the summary and the history estimate the calories burnt',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Planks');
            await run.wait(600_000);

            // 10 minutes of planks at 3.8 METs and 75 kg: 47.5, to the nearest 5
            await expect(run.summary).toHaveAccessibleName('Workout finished');
            await expect(run.stat('Calories')).toHaveText('About 50 kcalabout 50 calories');
            await run.summaryDone.click();

            const entry = new HistoryPage(page).entry('Planks');
            // Shown at the end of its line, and heard as calories
            await expect(entry.getByText('· about 50 kcal')).toBeVisible();
            await expect(entry).toContainText('1 round · 10:00 spent');
            await expect(entry).toContainText('about 50 calories');
        }
    );
});

test.describe('with no body weight', () => {
    test.use({ storage: seed.workouts([planks]) });

    test('REG-CAL-02 no calories are shown', { tag: '@p2' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Planks');
        await run.wait(600_000);

        await expect(run.summary).toHaveAccessibleName('Workout finished');
        await expect(run.stat('Time')).toHaveText('10:00');
        await expect(run.stat('Calories')).toHaveCount(0);
        await run.summaryDone.click();
        await expect(new HistoryPage(page).entry('Planks')).not.toContainText('kcal');
    });
});
