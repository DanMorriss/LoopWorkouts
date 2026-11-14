import { expect, NOW, seed, test, timed, workout } from './fixtures';
import { FakeSupabase, signedIn } from './supabase';
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

    test(
        'REG-CAL-02 no calories without a body weight, and a way to add one',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Planks');
            await run.wait(600_000);

            await expect(run.summary).toHaveAccessibleName('Workout finished');
            await expect(run.stat('Time')).toHaveText('10:00');
            await expect(run.stat('Calories')).toHaveCount(0);
            // Asked for here, not in the setup: the run ends, and You opens on Body weight
            await run.summary
                .getByRole('button', { name: 'Add your weight to see calories' })
                .click();
            await expect(page).toHaveURL('/account?focus=body-weight');
            await expect(
                page.getByRole('textbox', { name: 'Body weight in kilograms' })
            ).toBeFocused();
            await app.goto('/history');
            await expect(new HistoryPage(page).entry('Planks')).not.toContainText('kcal');
        }
    );
});

test.describe('signed in, keeping the body weight with the account', () => {
    test.use({
        storage: {
            ...signedIn('me@example.com', Date.parse(NOW)),
            ...seed.settings({ bodyWeight: 80, bodyWeightUpdatedAt: Date.parse(NOW) - 60_000 }),
        },
    });

    test(
        'REG-CAL-03 consent to keeping it, sending it, and withdrawing it',
        { tag: '@p2' },
        async ({ app, page }) => {
            const supabase = new FakeSupabase(page);
            await supabase.install();
            await app.goto('/account');
            const tick = page.getByRole('checkbox', {
                name: /my body weight, which is health data/,
            });
            const hint = page.getByText(/^For calories burnt\./);
            await expect(tick).not.toBeChecked();
            await expect(hint).toHaveText('For calories burnt. Kept on this device only');

            await tick.check();
            await expect(hint).toHaveText('For calories burnt. Kept with your account');
            await expect(
                page.getByRole('status').filter({ hasText: 'Agreed on 11 November 2026.' })
            ).toBeVisible();
            expect(supabase.callsTo('rpc/give_body_weight_consent')[0].body).toEqual({
                notice_date: '2026-11-14',
            });
            // Sent with the rest, as a record of its own
            await expect
                .poll(() => JSON.stringify(supabase.callsTo('rpc/push_records')))
                .toContain('"kind":"body-weight"');

            await tick.uncheck();
            await expect(hint).toHaveText('For calories burnt. Kept on this device only');
            expect(supabase.callsTo('rpc/withdraw_body_weight_consent')).toHaveLength(1);
            // It stays on this device
            await expect(
                page.getByRole('textbox', { name: 'Body weight in kilograms' })
            ).toHaveValue('80');
        }
    );
});
