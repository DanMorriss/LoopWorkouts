import {
    ALARM,
    expect,
    group,
    heading,
    reps,
    rest,
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
import { HistoryPage } from './history-page';
import { Finger } from './touch';
import { setWheel, WorkoutPage } from './workout-page';

// Running a workout (run-a-workout.md, pause-and-stop.md, alarms.md): REG-RUN in
// docs/regression-tests.md. The run works from the page's clock, which the fixtures install at
// NOW (Wednesday 09:00) and these move on with runFor, so nothing waits in real time. Each
// moves to the middle of a phase rather than its edge, as the clock runs on as usual between
// steps. Sound, vibration and the wake lock are the stand-ins in device.ts.

/** The saved workout's steps, in order. */
async function savedSteps(app: { stored<T>(key: string): Promise<T | null> }, index = 0) {
    const workouts = await app.stored<Workout[]>('workouts');
    return stepsOf(workouts![index]);
}

// Work 0:30 and rest 0:20 rather than the docs' 0:03 and 0:02, so a busy machine can't miss a
// phase between two checks
const short = workout('Short', { steps: [timed(30, 'Squats'), rest(20)], repeats: 2 });

test.describe('a simple workout', () => {
    test.use({
        storage: { ...seed.workouts([short]), ...seed.settings({ countdownBeeps: false }) },
    });

    test(
        'REG-RUN-01 a simple workout from start to finish',
        { tag: '@p1' },
        async ({ app, page, device }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Short');

            await expect(run.title).toContainText('Short');
            await expect(run.face.getByText('Squats', { exact: true })).toBeVisible();
            await expect(run.faceTime).toHaveText(/^00:(30|29)$/);
            await expect(run.main.getByText('Round 1 of 2', { exact: true })).toBeVisible();
            await expect(run.next).toHaveText('Up next: Rest, 00:20');
            // Only Pause and Skip under the ring
            await expect(run.main.getByRole('button')).toHaveCount(2);
            await expect(run.pause).toBeVisible();
            await expect(run.skip).toHaveAccessibleName('Skip step');

            await run.wait(30_000);
            await expect(run.face.getByText('Rest', { exact: true })).toBeVisible();
            await expect(run.next).toHaveText('Up next: Squats, 00:30');

            await run.wait(20_000);
            await expect(run.main.getByText('Last round!')).toBeVisible();
            await expect(run.next).toHaveText('Up next: Finish');

            await run.wait(30_000);
            await expect(run.main.getByText("You're finished!")).toBeVisible();
            await expect(run.summary).toHaveAccessibleName('Workout finished');
            await expect(run.summary.getByText('Short', { exact: true })).toBeVisible();
            await expect(run.stat('Time')).toHaveText('1:20');
            await expect(run.stat('Rounds')).toHaveText('2 rounds');
            await expect(run.summary.getByRole('button', { name: 'Back to workout' })).toHaveCount(
                0
            );

            // Work at the start and at 50s, rest at 30s, finishing at 80s, with no rest after the
            // last work; and a vibration for each, in the same order
            const alarms = await device.alarms();
            expect(alarms.map((a) => a.frequency)).toEqual([
                ALARM.work,
                ALARM.rest,
                ALARM.work,
                ALARM.finish,
            ]);
            expect(alarms.map((a) => a.second)).toEqual([0, 30, 50, 80]);
            expect(await device.vibrations()).toEqual([
                [150, 100, 150],
                [500],
                [150, 100, 150],
                [180, 20, 180, 20, 600],
            ]);

            await run.summaryDone.click();
            await expect(page).toHaveURL(/\/history/);
            const entry = new HistoryPage(page).entry('Short');
            await expect(entry).toContainText('9:00 AM');
            await expect(entry).toContainText('2 rounds');
        }
    );
});

test.describe('rep steps', () => {
    const pushUps = workout('Push and squat', {
        steps: [
            timed(3, 'Jog'),
            reps(10, 'Push-ups', { exercise: 'push-up', weight: 20 }),
            rest(10),
            reps(5, 'Squats'),
        ],
    });
    test.use({ storage: seed.workouts([pushUps]) });

    test('REG-RUN-02 rep steps wait for Done', { tag: '@p1' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Push and squat');

        await run.wait(3500);
        await expect(run.wheel('reps')).toHaveAttribute('aria-valuenow', '10');
        await expect(run.wheel('Weight, kg')).toHaveAttribute('aria-valuenow', '20');
        await expect(run.done).toHaveAccessibleName('Done. Next: Rest · 00:10');
        await expect(run.next).toHaveText('Up next: Rest, 00:10');
        await expect(run.pause).toBeVisible();
        await expect(run.skip).toBeVisible();

        // An hour on, still waiting on the push-ups
        await page.clock.fastForward('01:00:00');
        await expect(run.done).toBeVisible();
        await expect(run.wheel('reps')).toBeVisible();

        // Space presses Done, and the rest starts from its full time
        await page.locator('body').focus();
        await page.keyboard.press('Space');
        await expect(run.face.getByText('Rest', { exact: true })).toBeVisible();
        await expect(run.faceTime).toHaveText(/^00:(10|09)$/);

        // The last step is a rep step: it finishes only after Done
        await run.wait(10_500);
        await expect(run.done).toBeVisible();
        await expect(run.summary).toBeHidden();
        await run.pressDone();
        await expect(run.summary).toBeVisible();
        await expect(run.summary).toContainText('Push-ups: 10 reps @ 20 kg');
        await expect(run.summary).toContainText('Squats: 5 reps');
        // The hour on the push-ups counts
        await expect(run.stat('Time')).toHaveText(/^1:00:[1-3]\d$/);
    });
});

test.describe('pausing', () => {
    const plank = workout('Plank', { steps: [timed(30, 'Plank', 'plank'), rest(10)], repeats: 2 });
    test.use({ storage: seed.workouts([plank]) });

    test('REG-RUN-03 pause and resume', { tag: '@p1' }, async ({ app, page, device }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Plank');

        await run.wait(1500);
        await run.pause.click();
        await expect(run.main.getByText(/^Paused · 00:2\d$/)).toBeVisible();
        const shown = await run.main.getByText(/^Paused · /).textContent();
        await expect(run.resume).toBeFocused();
        await expect(run.end).toBeVisible();
        await expect(run.exercise('Plank')).toBeVisible();
        await expect(run.pause).toHaveCount(0);
        await expect(run.skip).toHaveCount(0);
        expect(await app.announcements()).toContain('Paused');

        // Ten minutes later it still shows the same time
        await page.clock.fastForward('10:00');
        await expect(run.main.getByText(/^Paused · /)).toHaveText(shown!);

        // It carries on from there, not from ten minutes later
        await run.resume.click();
        await expect(run.pause).toBeFocused();
        await expect(run.face.getByText('Plank', { exact: true })).toBeVisible();
        await expect(run.faceTime).toHaveText(/^00:2\d$/);

        // Space pauses, Escape resumes
        await page.keyboard.press('Space');
        await expect(run.resume).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(run.pause).toBeVisible();

        // Into the rest, then a quick pause and resume doesn't play its alarm again
        await run.wait(29_000);
        await expect(run.face.getByText('Rest', { exact: true })).toBeVisible();
        await run.pause.click();
        await run.resume.click();
        await run.wait(1000);
        const rests = (await device.alarms()).filter((a) => a.frequency === ALARM.rest);
        expect(rests).toHaveLength(1);
    });
});

test.describe('ending early', () => {
    const rounds = workout('Rounds', { steps: [timed(10), rest(5)], repeats: 3 });
    const other = workout('Other', { steps: [timed(30)] });
    test.use({ storage: seed.workouts([rounds, other]) });

    test(
        'REG-RUN-04 end a workout early, go back to it, then finish with Done',
        { tag: '@p1' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');

            // Ended on its first step: nothing to log
            await run.startFromLibrary('Rounds');
            await run.endWorkout();
            await expect(run.summary).toHaveAccessibleName('Workout ended');
            await expect(run.summary).toContainText(
                'Nothing to log: no step was done before it ended.'
            );
            await expect(run.summary.getByRole('textbox', { name: 'Note' })).toHaveCount(0);
            await run.summaryDone.click();
            await expect(page).toHaveURL(/\/history/);
            await expect(new HistoryPage(page).entries).toHaveCount(0);

            // Ended in round 2
            await app.tab('Workouts').click();
            await run.startFromLibrary('Rounds');
            await run.wait(17_000);
            await run.endWorkout();
            await expect(run.stat('Rounds')).toHaveText('Ended in round 2 of 3');

            // Back to it, paused where it was ended
            await run.summary.getByRole('button', { name: 'Back to workout' }).click();
            await expect(run.summary).toBeHidden();
            await expect(run.resume).toBeFocused();

            // Ended again, once logged
            await run.end.click();
            await run.summaryDone.click();
            await expect(page).toHaveURL(/\/history/);
            await expect(new HistoryPage(page).entries).toHaveCount(1);
            await expect(new HistoryPage(page).entries).toContainText('ended in round 2 of 3');

            // Starting another workout logs the one going as stopped
            await app.tab('Workouts').click();
            await run.startFromLibrary('Rounds');
            await run.wait(17_000);
            await run.close.click();
            await expect(page).toHaveURL('/library');
            await run.startFromLibrary('Other');
            await expect(run.title).toContainText('Other');
            await run.close.click();
            await app.tab('Progress').click();
            await expect(new HistoryPage(page).entry('Rounds')).toHaveCount(2);
        }
    );
});

test.describe('skipping', () => {
    const a = workout('A', { steps: [timed(30), rest(10)], repeats: 2 });
    const b = workout('B', { steps: [timed(45, 'Plank', 'plank'), rest(15)] });
    test.use({ storage: seed.workouts([a, b]) });

    test('REG-RUN-05 skip a step', { tag: '@p1' }, async ({ app, page, device }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('A');

        await run.wait(5000);
        // The clock held still over the press, as the app skips an alarm it finds over a second
        // late, and on a busy machine the clock could run on that far before it's scheduled
        const skippedAt = (await page.evaluate(() => Date.now())) + 500;
        await page.clock.pauseAt(skippedAt);
        await run.skip.click();
        await page.clock.runFor(100);
        await page.clock.resume();
        await expect(run.face.getByText('Rest', { exact: true })).toBeVisible();
        await expect(run.faceTime).toHaveText(/^00:(10|09)$/);
        // Its alarm sounds at once
        await expect.poll(() => device.alarms([ALARM.rest])).toHaveLength(1);
        const [alarm] = await device.alarms([ALARM.rest]);
        expect(alarm.at - skippedAt).toBeGreaterThanOrEqual(0);
        expect(alarm.at - skippedAt).toBeLessThan(1500);

        await expect(run.skip).toHaveAccessibleName('Skip rest');
        await run.skip.click();
        await expect(run.main.getByText('Last round!')).toBeVisible();

        // Skipping the last work ends it: the rest after it doesn't run, and once it's asked
        // about the plank, put aside to do later (RUN-16), it finishes
        await run.close.click();
        await run.startFromLibrary('B');
        await run.wait(20_000);
        await run.skip.click();
        await page
            .getByRole('dialog', { name: 'Do Plank before you finish?' })
            .getByRole('button', { name: 'Finish' })
            .click();
        await expect(run.summary).toHaveAccessibleName('Workout finished');
        await expect(run.summary).toContainText('Plank: 0:20');
        await expect(run.stat('Time')).toHaveText('0:20');
    });
});

test.describe('doing a skipped exercise later', () => {
    const gym = workout('Gym', {
        steps: [
            reps(10, 'Push-up', { exercise: 'push-up' }),
            rest(20),
            timed(30, 'Plank', 'plank'),
            rest(20),
            reps(10, 'Squat', { exercise: 'bodyweight-squat' }),
        ],
    });
    test.use({ storage: seed.workouts([gym]) });

    test('REG-RUN-19 do a skipped exercise later', { tag: '@p2' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Gym');
        await expect(run.later).toHaveCount(0);

        // Skipped, the push-ups are put aside at the top
        await run.skip.click();
        await expect(run.later).toHaveAccessibleName('Skipped: Push-up');
        await run.skip.click();
        await run.wait(5000);
        await run.skip.click();
        await expect(run.later).toHaveAccessibleName('2 skipped exercises');
        await expect(run.later).toContainText('2');

        // Its menu lists both; one picked is up next, after the rest
        await run.later.click();
        await expect(run.laterMenu).toBeVisible();
        await expect(run.laterMenu.getByRole('button')).toHaveText([
            /Push-up\s*10 reps/,
            /Plank\s*00:30/,
        ]);
        await run.laterMenu.getByRole('button', { name: /^Push-up/ }).click();
        await expect(app.undoBar).toContainText('Push-up is up next');
        await expect(run.later).toBeFocused();
        await expect(run.later).toHaveAccessibleName('Skipped: Plank');
        await expect(run.next).toContainText('Push-up');

        // It runs as it was, and Undo goes with the next press, then the workout carries on where it was, a reload and all
        await run.skip.click();
        await expect(app.undoBar).toHaveCount(0);
        await expect(run.face.getByText('Push-up', { exact: true })).toBeVisible();
        await expect(run.main.getByText('Skipped earlier')).toBeVisible();
        await app.reload();
        await expect(run.next).toContainText('Squat');
        await run.pressDone();
        await expect(run.face.getByText('Squat', { exact: true })).toBeVisible();

        // The one left asks first; Not now leaves it
        await run.later.click();
        await expect(run.laterMenu).toHaveAccessibleName('Do Plank next?');
        await run.laterMenu.getByRole('button', { name: 'Not now' }).click();
        await expect(run.laterMenu).toHaveCount(0);
        await expect(run.later).toBeFocused();

        // A timed one picked last runs its time, then the workout finishes
        await run.later.click();
        await run.laterMenu.getByRole('button', { name: 'Do it next' }).click();
        await expect(run.later).toHaveCount(0);
        await expect(run.next).toContainText('Plank');
        await run.pressDone();
        await expect(run.face.getByText('Plank', { exact: true })).toBeVisible();
        await run.wait(15_000);
        await expect(run.faceTime).toHaveText(/^00:1[45]$/);
        await expect(run.summary).toHaveCount(0);
        await run.wait(16_000);
        await expect(run.summary).toHaveAccessibleName('Workout finished');
        await expect(run.summary).toContainText('Push-up: 10 reps');
        await expect(run.summary).toContainText('Squat: 10 reps');
        await expect(run.summary).toContainText('Plank: 0:30');
    });

    test(
        'REG-RUN-20 asks about skipped exercises at the finish',
        { tag: '@p2' },
        async ({ app, page }, info) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Gym');
            // Push-ups, rest, plank and rest skipped, then the squats done
            for (let i = 0; i < 4; i++) {
                await run.skip.click();
            }
            await run.pressDone();

            // It asks rather than finishing, a reload and all
            const ask = page.getByRole('dialog', { name: 'Do them before you finish?' });
            await expect(ask).toBeVisible();
            await expect(run.summary).toHaveCount(0);
            await app.reload();
            const list = ask.getByRole('list', { name: 'Skipped exercises, in order' });
            await expect(list.getByRole('listitem')).toHaveText([
                /Push-up\s*10 reps/,
                /Plank\s*00:30/,
            ]);
            await expect(ask.getByRole('button', { name: 'Do them all' })).toBeFocused();

            // The plank dragged above the push-ups, by finger on a phone; the sheet stays put
            const handles = list.locator('.later-row__handle');
            if (info.project.use.hasTouch) {
                const finger = await Finger.on(page);
                await finger.drag(
                    await Finger.within(handles.nth(1), 0.5),
                    await Finger.within(handles.nth(0), 0.5, 0.1),
                    { steps: 20, settle: 200 }
                );
            } else {
                await handles.nth(1).hover();
                await page.mouse.down();
                const to = (await handles.nth(0).boundingBox())!;
                await page.mouse.move(to.x + to.width / 2, to.y + 4, { steps: 20 });
                await page.mouse.up();
            }
            await expect(list.getByRole('listitem')).toHaveText([/Plank/, /Push-up/]);
            await expect(ask).toBeVisible();

            // Do them all: the plank, then the push-ups
            await ask.getByRole('button', { name: 'Do them all' }).click();
            await expect(run.face.getByText('Plank', { exact: true })).toBeVisible();
            await expect(run.pause).toBeFocused();
            await expect(run.next).toContainText('Push-up');
            await run.wait(31_000);
            await expect(run.face.getByText('Push-up', { exact: true })).toBeVisible();

            // Skipped again, it's asked about once more; Finish leaves it undone
            await run.skip.click();
            const one = page.getByRole('dialog', { name: 'Do Push-up before you finish?' });
            await expect(one.getByRole('button', { name: 'Do it now' })).toBeFocused();
            await one.getByRole('button', { name: 'Finish' }).click();
            await expect(run.summary).toHaveAccessibleName('Workout finished');
            await expect(run.summary).toContainText('Plank: 0:30');
            await expect(run.summary).toContainText('Squat: 10 reps');
            await expect(run.summary).not.toContainText('Push-up');
        }
    );
});

test.describe('reloading', () => {
    const intervals = workout('Intervals', { steps: [timed(30), rest(10)], repeats: 2 });
    test.use({ storage: seed.workouts([intervals]) });

    test('REG-RUN-06 a reload carries on', { tag: '@p1' }, async ({ app, page, device }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Intervals');

        await run.wait(4500);
        await app.reload();
        // From 4.5s in, not from the start, and no alarm already past is played again
        await expect(run.faceTime).toHaveText(/^00:2[3-6]$/);
        expect((await device.notes()).filter((n) => n.frequency === ALARM.work)).toEqual([]);

        // After a reload the browser blocks sound until the page is tapped
        const tap = page.getByRole('button', { name: 'Sound off · tap to turn on' });
        await expect(tap).toBeVisible();
        // On the ring, in view without scrolling, as a phone propped up won't be scrolled
        await expect(tap).toBeInViewport({ ratio: 1 });
        await expect(
            page.getByRole('link', { name: 'Help: Why is there no sound?' })
        ).toBeVisible();
        await tap.click();
        await expect(tap).toBeHidden();

        // Paused, and still paused at the same point after a reload
        await run.pause.click();
        const shown = await run.main.getByText(/^Paused · /).textContent();
        await app.reload();
        await expect(run.main.getByText(/^Paused · /)).toHaveText(shown!);

        // Closing the tab once a step's done logs it as stopped
        await run.resume.click();
        await run.wait(30_000);
        await expect(run.face.getByText('Rest', { exact: true })).toBeVisible();
        const context = page.context();
        // Leaving the page (its pagehide) logs the run, then the tab closes
        await page.goto('about:blank');
        await page.close();
        const history = await context.newPage();
        await history.goto('/history');
        await expect(new HistoryPage(history).entries).toHaveCount(1);
        await expect(new HistoryPage(history).entries).toContainText('ended in round');
    });

    test(
        'REG-RUN-06 a run reloaded part-way is logged once when it finishes',
        { tag: '@p1' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Intervals');
            await run.wait(4500);
            await app.reload();
            await run.wait(66_000);
            await expect(run.summary).toHaveAccessibleName('Workout finished');
            await run.summaryDone.click();
            await expect(new HistoryPage(page).entries).toHaveCount(1);
            await expect(new HistoryPage(page).entries).not.toContainText('ended in round');
        }
    );
});

test.describe('sets and sections', () => {
    const legs = workout('Legs', {
        blocks: [
            heading('Warmup'),
            group([timed(10, 'Exercise bike')]),
            heading('Legs'),
            group([reps(10, 'Leg press', { exercise: 'leg-press' })], 3, 60),
            group([timed(30, 'Plank', 'plank')]),
        ],
    });
    test.use({ storage: seed.workouts([legs]) });

    test("REG-RUN-07 sets, sections and what's next", { tag: '@p2' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Legs');
        const section = run.main.locator('.workout-section');

        await expect(section).toHaveText(/Warmup.*1 of 3/);
        await run.wait(10_500);

        await expect(section).toHaveText(/Legs.*2 of 3/);
        await expect(run.main.getByText(/set 1 of 3/i).first()).toBeVisible();
        await expect
            .poll(() => app.announcements())
            .toContainEqual(expect.stringContaining('Legs, exercise 2 of 3'));

        await run.pressDone();
        await expect(run.main.getByText(/set 1 of 3/i).first()).toBeVisible();
        await expect(run.next).toHaveText('Up next: Leg press, Set 2 of 3 · 10 reps');

        await run.wait(60_500);
        await run.pressDone();
        await run.wait(60_500);
        await expect(run.main.getByText(/set 3 of 3/i).first()).toBeVisible();
        await expect(run.main.getByText('Last round!')).toHaveCount(0);
        await run.pressDone();
        await expect(run.main.getByText(/set 3 of 3/i).first()).toBeVisible();
        await run.wait(60_500);
        await expect(section).toHaveText(/Legs.*3 of 3/);

        // "exercise 2 of 3" was said as the leg press began, not again on its sets
        const said = (await app.announcements()).filter((text) => text.includes('exercise 2 of 3'));
        expect(said).toHaveLength(1);
    });
});

test.describe('a ready-made workout, reloaded', () => {
    test(
        'REG-RUN-08 a weight changed mid-run on a ready-made workout survives a reload',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library/builtin:gym-legs');
            await page.getByRole('button', { name: 'Start Gym legs' }).click();
            await expect(page).toHaveURL('/workout');

            await setWheel(run.wheel('Weight, kg'), 40, 0.5);
            await expect
                .poll(() => app.stored<{ id: string }[]>('ready-made-changes'))
                .toEqual([expect.objectContaining({ id: 'builtin:gym-legs' })]);

            await app.reload();
            await expect(run.face.getByText('Back squat', { exact: true })).toBeVisible();
            await expect(run.wheel('Weight, kg')).toHaveAttribute('aria-valuenow', '40');
        }
    );
});

test.describe('changing reps mid-workout', () => {
    const push = workout('Push', {
        id: 'push',
        steps: [reps(20, 'Push-ups', { exercise: 'push-up' }), rest(5)],
        repeats: 2,
    });
    test.use({ storage: seed.workouts([push]) });

    test('REG-RUN-08 change reps or weight mid-workout', { tag: '@p2' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Push');

        await setWheel(run.wheel('reps'), 15);
        await setWheel(run.wheel('Weight, kg'), 22.5, 0.5);
        await expect
            .poll(async () => (await savedSteps(app))[0])
            .toMatchObject({ reps: 15, weight: 22.5 });

        await run.pressDone();
        await run.wait(5500);
        await expect(run.main.getByText('Last round!')).toBeVisible();
        await expect(run.wheel('reps')).toHaveAttribute('aria-valuenow', '15');
        await expect(run.wheel('Weight, kg')).toHaveAttribute('aria-valuenow', '22.5');

        // Back to no weight: the "+" at the bottom of the wheel
        await run.wheel('Weight, kg').focus();
        await page.keyboard.press('Home');
        await expect.poll(async () => (await savedSteps(app))[0]).not.toHaveProperty('weight');
    });
});

test.describe('the summary', () => {
    const push = workout('Push', {
        steps: [reps(20, 'Push-ups', { exercise: 'push-up', weight: 40 }), rest(5)],
        repeats: 3,
    });
    test.use({ storage: seed.workouts([push]) });

    for (const answer of ['Yes, use next time', 'No, just this time'] as const) {
        test(
            `REG-RUN-09 the summary: correct a set, note, next time (${answer})`,
            { tag: '@p2' },
            async ({ app, page }) => {
                const run = new WorkoutPage(page);
                await app.goto('/library');
                await run.startFromLibrary('Push');
                await run.pressDone();
                await run.wait(5500);
                await run.endWorkout();
                await expect(run.summary).toContainText('Push-ups: 20 reps @ 40 kg');

                await run.summary.getByRole('button', { name: 'Change reps or weight' }).click();
                await run.summary.getByRole('button', { name: /^Change Push-ups/ }).click();
                const sets = page.getByRole('dialog', { name: 'Push-ups' });
                await setWheel(sets.getByRole('spinbutton', { name: /Reps/ }), 18);
                await sets.getByRole('button', { name: 'Save' }).click();
                await expect(sets).toBeHidden();
                await expect(run.summary.getByText('Use these settings next time?')).toBeVisible();

                await run.summary.getByRole('button', { name: answer }).click();
                if (answer === 'Yes, use next time') {
                    await expect(
                        run.summary.getByText('Saved: next time starts from these.')
                    ).toBeVisible();
                }
                // The saved step starts from 18 next time, or stays at 20
                await expect
                    .poll(async () => (await savedSteps(app))[0])
                    .toMatchObject({ reps: answer === 'Yes, use next time' ? 18 : 20, weight: 40 });

                await run.summary.getByRole('textbox', { name: 'Note' }).fill('felt strong');
                await run.summary.getByRole('textbox', { name: 'Note' }).press('Tab');
                await run.summaryDone.click();
                const entry = new HistoryPage(page).entry('Push');
                await expect(entry).toContainText('felt strong');
                await expect(entry).toContainText('Push-ups: 18 reps @ 40 kg');
            }
        );
    }
});

test.describe('a time limit', () => {
    const a = workout('A', { steps: [timed(3), rest(2)], timeLimitSeconds: 64 });
    const b = workout('B', {
        steps: [timed(3), reps(10, 'Push-ups', { exercise: 'push-up' })],
        timeLimitSeconds: 20,
    });
    // 1:01 is a second into the 13th round's timed step, which runs on to 1:03
    const c = workout('C', { steps: [timed(3), rest(2)], timeLimitSeconds: 61 });
    test.use({ storage: seed.workouts([a, b, c]) });

    test('REG-RUN-10 a time limit runs out', { tag: '@p2' }, async ({ app, page, device }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('A');
        await expect(run.main.getByText('Round 1', { exact: true })).toBeVisible();
        await expect(run.main.getByText(/^\s*01:0[34] left\s*$/)).toBeVisible();

        await run.wait(12_000);
        await expect(run.main.getByText('Round 3', { exact: true })).toBeVisible();
        await expect(run.main.getByText(/^\s*00:5[0-2] left\s*$/)).toBeVisible();

        await run.wait(53_000);
        await expect(run.summary).toHaveAccessibleName("Time's up");
        await expect(run.stat('Rounds')).toHaveText('12 rounds + 1 in 1:04');
        const ticks = await device.alarms([ALARM.countdown]);
        expect(ticks.map((tick) => tick.second)).toEqual(expect.arrayContaining([61, 62, 63]));
        const finish = await device.alarms([ALARM.finish]);
        expect(finish.map((alarm) => alarm.second)).toEqual([64]);
    });

    test(
        'REG-RUN-10 the timed step time runs out in is finished',
        { tag: '@p2' },
        async ({ app, page, device }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('C');
            await run.wait(61_500);
            await expect(
                run.main.getByText("Time's up · finish this one", { exact: true })
            ).toBeVisible();
            await expect(run.summary).toBeHidden();

            await run.wait(2000);
            await expect(run.summary).toHaveAccessibleName("Time's up");
            await expect(run.stat('Rounds')).toHaveText('12 rounds + 1 in 1:01');
            const finish = await device.alarms([ALARM.finish]);
            expect(finish.map((alarm) => alarm.second)).toEqual([63]);
        }
    );

    test('REG-RUN-10 time runs out during a rep step', { tag: '@p2' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('B');
        await run.wait(3500);
        await expect(run.done).toBeVisible();
        await run.wait(20_000);
        // Asked first, on a card of its own, before the summary
        const asked = page.getByRole('dialog', { name: 'How many reps?' });
        await expect(asked).toHaveAccessibleDescription('Time ran out during Push-ups.');
        await expect(run.summary).toBeHidden();
        await expect(asked.getByRole('button', { name: 'Add set' })).toBeFocused();
        const wheel = asked.getByRole('spinbutton', { name: 'How many reps?' });
        await expect(wheel).toHaveAttribute('aria-valuenow', '10');
        await setWheel(wheel, 6);
        await asked.getByRole('button', { name: 'Add set' }).click();
        await expect(asked).toBeHidden();
        await expect(run.summary).toHaveAccessibleName("Time's up");
        await expect(run.summary.getByRole('heading', { name: "Time's up" })).toBeFocused();
        await expect(run.summary).toContainText('Push-ups: 6 reps');
    });

    test(
        "REG-RUN-10 Skip on How many reps? isn't asked again after a reload",
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('B');
            await run.wait(23_500);
            const asked = page.getByRole('dialog', { name: 'How many reps?' });
            await asked.getByRole('button', { name: 'Skip' }).click();
            await expect(run.summary).toHaveAccessibleName("Time's up");

            await app.reload();
            await expect(run.summary).toHaveAccessibleName("Time's up");
            await expect(asked).toBeHidden();
            await expect(run.summary).not.toContainText('Push-ups');
        }
    );
});

test.describe('swapping mid-workout', () => {
    const legs = workout('Legs', {
        steps: [
            timed(3, 'Jog'),
            reps(10, 'Back squat', { exercise: 'back-squat', weight: 60 }),
            rest(5),
        ],
        repeats: 2,
    });
    const goblets = run('builtin:goblet-squat', '2026-11-04T18:00', {
        title: 'At home',
        sets: sets('goblet-squat', 'Goblet squat', [10, 24]),
    });
    test.use({ storage: { ...seed.workouts([legs]), ...seed.history([goblets]) } });

    test(
        "REG-RUN-11 an exercise's details and Swap, mid-workout",
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Legs');
            await expect(run.face.getByRole('button')).toHaveCount(0);
            await run.wait(3500);

            const info = run.exercise('Back squat');
            await info.click();
            const details = page.getByRole('dialog', { name: 'Back squat' });
            await expect(details).toBeVisible();
            // Just how it's done: no chips or body map mid-set
            await expect(details.getByRole('region', { name: 'How to do it' })).toBeVisible();
            await expect(details.getByRole('region', { name: 'Tips' })).toBeVisible();
            await expect(details.getByRole('region', { name: 'Muscles worked' })).toHaveCount(0);
            await expect(
                details.getByRole('list', { name: "Equipment and how it's measured" })
            ).toHaveCount(0);
            // The workout still waits, and Space doesn't press Done
            await page.keyboard.press('Space');
            await expect(details).toBeVisible();
            await details.getByRole('button', { name: 'Back' }).click();
            await expect(details).toBeHidden();
            await expect(info).toBeFocused();
            await expect(run.done).toBeVisible();

            await info.click();
            await details.getByRole('button', { name: 'Swap exercise' }).click();
            const swap = page.getByRole('dialog', { name: 'Swap Back squat' });
            await expect(swap).toContainText(
                'For the rest of this workout. Sets done so far stay.'
            );
            await expect(swap.getByRole('searchbox', { name: 'Search exercises' })).toBeFocused();
            await page.keyboard.type('goblet');
            await swap.getByRole('button', { name: /^Goblet squat/ }).click();
            await expect(run.face.getByText('Goblet squat', { exact: true })).toBeVisible();
            await expect(run.wheel('Weight, kg')).toHaveAttribute('aria-valuenow', '24');
            await expect(app.undoBar).toContainText('Swapped to Goblet squat');

            // Kept for the tab, through a reload
            await app.reload();
            await expect(run.face.getByText('Goblet squat', { exact: true })).toBeVisible();

            await run.pressDone();
            await run.wait(8500);
            await expect(run.face.getByText('Goblet squat', { exact: true })).toBeVisible();
            await run.pressDone();
            await expect(run.summary).toContainText('Back squat for Goblet squat');
            await run.summary.getByRole('button', { name: 'No, just this time' }).click();
            await expect(run.summary).toContainText("Next time it's Back squat again.");
            expect((await savedSteps(app))[1]).toMatchObject({
                name: 'Back squat',
                weight: 60,
                exerciseId: 'builtin:back-squat',
            });
            await expect(run.summary).toContainText('Goblet squat: 2 × 10 @ 24 kg');
        }
    );

    test(
        'REG-RUN-11 focus goes back to the name after a swap',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Legs');
            await run.wait(3500);
            await run.exercise('Back squat').click();
            await run.swapTo('goblet', 'Goblet squat');
            await expect(run.exercise('Goblet squat')).toBeFocused();
        }
    );
});

test.describe('swapping while paused in a rest', () => {
    const pair = workout('Pair', {
        steps: [
            reps(10, 'Back squat', { exercise: 'back-squat', weight: 60 }),
            rest(30),
            reps(10, 'Deadlift', { exercise: 'deadlift', weight: 80 }),
        ],
    });
    test.use({ storage: seed.workouts([pair]) });

    test(
        'REG-RUN-12 swap the next exercise while paused in a rest',
        { tag: '@p3' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Pair');
            await run.pressDone();
            await run.pause.click();
            await expect(run.main.getByText('Rest, then Deadlift')).toBeVisible();
            await run.exercise('Rest, then Deadlift').click();
            await run.swapTo('romanian', 'Romanian deadlift');
            // Still paused, the next exercise swapped, and focus back on its name
            await expect(run.main.getByText('Rest, then Romanian deadlift')).toBeVisible();
            await expect(run.resume).toBeVisible();
            await expect(run.exercise('Rest, then Romanian deadlift')).toBeFocused();
        }
    );
});

test.describe('last time and step-ups', () => {
    const squats = workout('Squats', {
        blocks: [group([reps(10, 'Back squat', { exercise: 'back-squat', weight: 60 })], 3, 5)],
    });
    const lastWeek = run(squats, '2026-11-04T18:00', {
        sets: sets('back-squat', 'Back squat', [10, 60], [10, 60], [12, 60]).map((set, i) => ({
            ...set,
            round: 0,
            set: i,
        })),
    });
    test.use({ storage: { ...seed.workouts([squats]), ...seed.history([lastWeek]) } });

    test(
        'REG-RUN-13 last time, a suggested weight, personal bests',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Squats');
            await expect(run.main.getByText('Last time: 10, 10, 12 @ 60 kg')).toBeVisible();

            await run.main.getByRole('button', { name: 'Try 62.5 kg' }).click();
            await expect(run.wheel('Weight, kg')).toHaveAttribute('aria-valuenow', '62.5');
            await expect(run.main.getByRole('button', { name: 'Try 62.5 kg' })).toHaveCount(0);
            await expect
                .poll(async () => JSON.stringify(await app.stored('workouts')))
                .toContain('"weight":62.5');

            for (let set = 0; set < 3; set++) {
                await run.pressDone();
                if (set < 2) {
                    await run.wait(5500);
                }
            }
            await expect(run.summary).toHaveAccessibleName('Workout finished');
            // Since last time: the squats by name, a new best against the one it beat
            await expect(
                run.summary.getByRole('heading', { name: 'Since last time' })
            ).toBeVisible();
            await expect(
                run.summary.getByRole('listitem').filter({ hasText: 'New best' })
            ).toHaveText(/Back squat\s*New best\s*62\.5 kg × 10, up from 60 kg × 12/);
            await expect(run.summary).toContainText('Back squat: try 65 kg, up from 62.5 kg');
            await expect(
                run.summary.getByRole('heading', { name: 'Muscles worked' })
            ).toBeVisible();

            await run.summary.getByRole('button', { name: /^Apply/ }).click();
            await expect(run.summary.getByText(/Applied/)).toBeFocused();
            await expect
                .poll(async () => JSON.stringify(await app.stored('workouts')))
                .toContain('"weight":65');
        }
    );
});

test.describe('one side at a time', () => {
    const sidePlank = workout('Side plank', {
        steps: [{ ...timed(10, 'Side plank', 'side-plank'), eachSide: true }],
    });
    test.use({
        storage: {
            ...seed.workouts([sidePlank]),
            ...seed.settings({ eachSideFirst: 'right', switchSidesSeconds: 5 }),
        },
    });

    test('REG-RUN-14 one side at a time', { tag: '@p3' }, async ({ app, page }) => {
        const run = new WorkoutPage(page);
        await app.goto('/library');
        await run.startFromLibrary('Side plank');
        await expect(run.main.getByText('Right side', { exact: true })).toBeVisible();
        await run.wait(10_500);
        await expect(run.face.getByText('Switch sides', { exact: true })).toBeVisible();
        await run.wait(5000);
        await expect(run.main.getByText('Left side', { exact: true })).toBeVisible();
        await run.wait(10_000);
        await expect(run.summary).toHaveAccessibleName('Workout finished');
        await expect(run.summary).toContainText('Side plank');
    });
});

test.describe('sound, beeps and the screen', () => {
    const intervals = workout('Intervals', { steps: [timed(30), rest(10)], repeats: 2 });
    test.use({ storage: seed.workouts([intervals]) });

    test(
        'REG-RUN-15 countdown beeps, turned off mid-workout',
        { tag: '@p2' },
        async ({ app, page, device }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Intervals');

            await run.wait(30_500);
            const ticks = await device.alarms([ALARM.countdown]);
            expect(ticks.map((tick) => tick.second)).toEqual([27, 28, 29]);
            expect((await device.alarms([ALARM.rest])).map((a) => a.second)).toEqual([30]);

            await run.close.click();
            await app.tab('You').click();
            await page.getByRole('link', { name: 'Settings' }).click();
            await page.getByRole('switch', { name: 'Countdown beeps' }).click();
            await app.runBar.getByRole('link').click();
            await run.wait(50_000);
            await expect(run.summary).toBeVisible();
            const after = await device.alarms([ALARM.countdown]);
            expect(after.map((tick) => tick.second)).toEqual([27, 28, 29]);
            // The step alarms still play
            expect((await device.alarms([ALARM.work])).map((a) => a.second)).toEqual([0, 40]);
        }
    );

    test(
        'REG-RUN-15 the screen is kept on while running',
        { tag: '@p2' },
        async ({ app, page, device }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Intervals');
            await expect.poll(async () => (await device.wakeLock()).held).toBe(true);
            await run.pause.click();
            await expect.poll(async () => (await device.wakeLock()).held).toBe(false);
            await run.resume.click();
            await expect.poll(async () => (await device.wakeLock()).held).toBe(true);
            await run.wait(71_000);
            await expect(run.summary).toBeVisible();
            await expect.poll(async () => (await device.wakeLock()).held).toBe(false);
        }
    );

    test.describe('with sound and Keep screen on off', () => {
        test.use({
            storage: {
                ...seed.workouts([intervals]),
                ...seed.settings({ sound: false, keepScreenOn: false }),
            },
        });

        test(
            'REG-RUN-15 sound off plays nothing, and the screen may lock',
            { tag: '@p2' },
            async ({ app, page, device }) => {
                const run = new WorkoutPage(page);
                await app.goto('/library');
                await run.startFromLibrary('Intervals');
                await run.wait(31_000);
                expect(await device.notes()).toEqual([]);
                expect((await device.wakeLock()).requests).toBe(0);
            }
        );
    });

    test('REG-RUN-15 real sound, vibration and the screen staying on', { tag: '@p2' }, () => {
        test.skip(
            true,
            'Manual on a phone: hear the beeps, feel the vibration (Android), and see the screen stay on through a workout. Alarms with the phone locked (ALM-2) are a known web limit on iPhone.'
        );
    });
});

test.describe('waiting for Start after a long rest', () => {
    const holds = workout('Holds', {
        steps: [timed(30, 'Plank', 'plank'), rest(40), timed(30, 'Plank', 'plank')],
        repeats: 1,
    });
    test.use({ storage: seed.workouts([holds]) });

    test(
        'REG-RUN-16 a timed exercise after a long rest waits for Start, a reload too',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            // The big button, in Pause's place, as the exercise hasn't begun
            const start = run.main.getByRole('button', { name: 'Start', exact: true });
            await app.goto('/library');
            await run.startFromLibrary('Holds');

            // Through the plank and the rest, then well past where the plank would have ended
            await run.wait(30_000 + 40_000 + 45_000);
            // The ring's fill, which mustn't start till Start does
            const fill = page.locator('.workout-ring__sweep');
            await expect(run.faceTime).toHaveText('00:30');
            await expect(start).toBeVisible();
            await expect(run.pause).toBeHidden();
            await expect(fill).toHaveCount(0);

            await app.reload();
            await expect(run.faceTime).toHaveText('00:30');
            await expect(fill).toHaveCount(0);

            await start.click();
            await expect(fill).toHaveCount(1);
            await run.wait(5500);
            await expect(run.faceTime).toHaveText(/^00:2[3-5]$/);
            await expect(start).toBeHidden();
            await expect(run.pause).toBeEnabled();
        }
    );
});

test.describe('changing the workout while it runs', () => {
    const push = workout('Push', {
        steps: [
            reps(10, 'Push-up', { exercise: 'push-up' }),
            rest(20),
            reps(10, 'Diamond push-up', { exercise: 'diamond-push-up' }),
        ],
    });
    test.use({ storage: seed.workouts([push]) });

    test(
        'REG-RUN-17 a change saved in Create reaches the workout going',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            const create = new CreatePage(page);
            await app.goto('/library');
            await run.startFromLibrary('Push');
            await run.pressDone();

            await app.goto('/setup?editId=push');
            await create.open(3);
            await page.getByRole('button', { name: 'Swap Diamond push-up' }).click();
            const swap = page.getByRole('dialog', { name: /^Swap / });
            await expect(swap.getByRole('searchbox', { name: 'Search exercises' })).toBeFocused();
            await page.keyboard.type('push-up');
            // The one in the workout already says so
            await expect(swap.getByRole('button', { name: /^Push-up/ }).first()).toContainText(
                'Already in this workout'
            );
            await swap.getByRole('button', { name: /^Kettlebell push-up/ }).click();
            await create.save.click();

            await expect(app.undoBar).toContainText(
                "Saved. The workout that's going has the change from here."
            );
            await app.undoBar.getByRole('link', { name: 'Back to workout' }).click();
            await expect(run.next).toContainText('Kettlebell push-up');
        }
    );
});

test.describe('stretches after a workout', () => {
    const push = workout('Push', { steps: [reps(10, 'Push-up', { exercise: 'push-up' })] });
    test.use({ storage: seed.workouts([push]) });

    test(
        'REG-RUN-18 the summary offers stretches for the muscles worked, and starts them',
        { tag: '@p2' },
        async ({ app, page }) => {
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Push');
            await run.pressDone();

            const stretches = run.summary.getByRole('region', { name: 'Stretch what you worked' });
            await expect(stretches).toContainText('Doorway chest stretch');
            // The main button starts them
            await run.summary.getByRole('button', { name: /^Stretch what you worked/ }).click();

            await expect(run.summary).toBeHidden();
            await expect(run.face).toContainText('Doorway chest stretch');
            await expect(run.pause).toBeFocused();

            // Never saved, it carries on after a reload all the same, and isn't in Workouts
            await app.reload();
            await expect(run.face).toContainText('Doorway chest stretch');
            const workouts = await app.stored<Workout[]>('workouts');
            expect(workouts!.map((saved) => saved.title)).toEqual(['Push']);
        }
    );
});

test.describe('on a wide window', () => {
    test.use({ storage: seed.workouts([short]) });

    test(
        'REG-RUN-21 the ring is beside the rest of the page, as big as fits, with nothing blurred',
        { tag: '@p2' },
        async ({ app, page }, testInfo) => {
            test.skip(testInfo.project.name !== 'desktop', 'The wide layout is for a wide window');
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Short');

            const ring = (await page.locator('app-workout-ring').boundingBox())!;
            const next = (await page.locator('app-up-next-card').boundingBox())!;
            // Beside it, not under it, and bigger than a phone's
            expect(ring.x + ring.width).toBeLessThan(next.x);
            expect(ring.width).toBeGreaterThan(400);
            // The controls' blur, for what scrolls under them on a phone, is off here: it once
            // covered the whole page
            const blur = await page
                .locator('app-workout-controls')
                .evaluate((controls) => getComputedStyle(controls, '::before').display);
            expect(blur).toBe('none');
            // One title, in the header
            await expect(run.main.getByText('Short', { exact: true })).toHaveCount(0);
        }
    );
});

test.describe('on a short phone', () => {
    const squats = workout('Squats', { steps: [reps(10, 'Squats'), rest(30)], repeats: 3 });
    test.use({ storage: seed.workouts([squats]), viewport: { width: 375, height: 667 } });

    test(
        'REG-RUN-22 Done, Up next and the controls all fit, none under another',
        { tag: '@p1' },
        async ({ app, page }, testInfo) => {
            test.skip(testInfo.project.name !== 'phone', 'The size of an iPhone SE or 8');
            const run = new WorkoutPage(page);
            await app.goto('/library');
            await run.startFromLibrary('Squats');

            // Done is the big button, and a tap at its middle lands on it, not on Pause or Skip
            await expect(run.done).toBeVisible();
            const hit = await run.done.evaluate((done) => {
                const box = done.getBoundingClientRect();
                const at = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
                return at?.closest('button') === done;
            });
            expect(hit).toBe(true);
            // Up next is clear of the controls held at the foot, so it can be read
            const card = (await page.locator('app-up-next-card').boundingBox())!;
            const controls = (await page.locator('app-workout-controls').boundingBox())!;
            expect(card.y + card.height).toBeLessThanOrEqual(controls.y + 1);
            await run.pressDone();
            await expect(run.next).toContainText('Squats');
        }
    );
});
