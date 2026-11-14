import { expect, type Locator, type Page } from '@playwright/test';

// The workout page (/workout) as it runs: its face, its controls and the summary at the end.
// The run works from the page's clock, so a test moves it on with page.clock.runFor(ms)
// rather than waiting: the fixtures install the clock, running from NOW.

export class WorkoutPage {
    constructor(readonly page: Page) {}

    /** Starts a workout by its card's play button on Workouts, and waits for its page. */
    async startFromLibrary(title: string) {
        await this.page.getByRole('button', { name: `Start ${title}`, exact: true }).click();
        await expect(this.page).toHaveURL('/workout');
        await expect(this.pause.or(this.done).first()).toBeVisible();
    }

    /** The page's main part: the ring, its face and the controls. */
    get main(): Locator {
        return this.page.getByRole('main');
    }

    /**
     * The ring's face: the step's name, its time or its reps and weight, and "then …" in a
     * rest. (By its component, as nothing names it: the text in it is what's checked.) As one
     * step rolls on to the next, the last one's face is there a moment longer, after the new
     * one: the first is the step now.
     */
    get face(): Locator {
        return this.main.locator('app-workout-face-slide').first();
    }

    /** The time on the face, e.g. "00:10" (the countdown, as screen readers have it). */
    get faceTime(): Locator {
        return this.face.getByText(/^\d\d:\d\d$/).first();
    }

    /** The workout's title, in the header. */
    get title(): Locator {
        return this.page.getByRole('banner').getByRole('heading', { level: 1 });
    }

    /** ⌄, back to the page the workout was started from (named for it: "Back to Workouts"). */
    get close(): Locator {
        return this.page.getByRole('banner').getByRole('link', { name: /^Back to / });
    }

    get pause(): Locator {
        return this.main.getByRole('button', { name: 'Pause', exact: true });
    }

    get resume(): Locator {
        return this.main.getByRole('button', { name: 'Resume', exact: true });
    }

    get end(): Locator {
        return this.main.getByRole('button', { name: 'End workout' });
    }

    /** Skip: "Skip step", or "Skip rest" in a rest. */
    get skip(): Locator {
        return this.main.getByRole('button', { name: /^Skip (step|rest)$/ });
    }

    /** A rep step's Done, the "Next: …" pill (named "Done. Next: Rest · 00:10"). */
    get done(): Locator {
        return this.main.getByRole('button', { name: /^Done\. Next/ });
    }

    /** What's next, under the ring: "Next: Rest · 00:10". */
    get next(): Locator {
        return this.main.getByText(/^\s*Next: /);
    }

    /** A wheel on the face of a rep step: `wheel('reps')`, `wheel('Weight, kg')`. */
    wheel(name: string): Locator {
        return this.main.getByRole('spinbutton', { name, exact: true });
    }

    /** The summary, once finished or ended: "Workout finished", "Workout ended", "Time's up". */
    get summary(): Locator {
        return this.page.getByRole('dialog', { name: /^(Workout (finished|ended)|Time's up)$/ });
    }

    /** The summary's Done, to the history. */
    get summaryDone(): Locator {
        return this.summary.getByRole('button', { name: 'Done', exact: true });
    }

    /** One of the summary's figures, by its term: `stat('Time')`, `stat('Rounds')`. */
    stat(term: 'Time' | 'Rounds' | 'Calories'): Locator {
        return this.summary.getByRole('term').filter({ hasText: term }).locator('+ dd');
    }

    /** Pauses, then ends the workout from the paused ring, opening the summary. */
    async endWorkout() {
        await this.pause.click();
        await this.end.click();
        await expect(this.summary).toBeVisible();
    }

    /** Moves the page's clock on, firing the run's timers. */
    async wait(ms: number) {
        await this.page.clock.runFor(ms);
    }

    /**
     * Swaps the exercise whose details are open for the one whose name starts with `name`,
     * typing `search` into the swap dialog's search box (RUN-11). Types only once the box has
     * focus: the dialog gives it focus a moment after it opens, and keys pressed before then go
     * to the button that opened it, so only the last letters would reach the box.
     */
    async swapTo(search: string, name: string) {
        await this.page.getByRole('button', { name: 'Swap exercise' }).click();
        const swap = this.page.getByRole('dialog', { name: /^Swap / });
        await expect(swap.getByRole('searchbox', { name: 'Search exercises' })).toBeFocused();
        await this.page.keyboard.type(search);
        await swap.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    }
}

/** Waits for the page to draw `count` frames. */
export async function frames(page: Page, count: number) {
    await page.evaluate(
        (n) =>
            new Promise<void>((resolve) => {
                const next = (left: number) =>
                    left === 0 ? resolve() : requestAnimationFrame(() => next(left - 1));
                next(n);
            }),
        count
    );
}

/**
 * Sets a number wheel (a spin button) with its keys, as someone with a keyboard does: Page Down
 * or Up five rows at a time and the arrows for the rest, `step` apart (0.5 for weights, 1 for
 * reps, minutes and seconds), then checks where it landed and goes on from there. A wheel far
 * from its value has the number typed first, as quick digits build one. A wheel can be redrawn
 * as its value changes (the summary's, as the set it changes is logged), losing a key pressed
 * meanwhile or starting a typed number again, which the keys after it make up.
 */
export async function setWheel(wheel: Locator, value: number, step = 1) {
    const page = wheel.page();
    const now = async () => Number(await wheel.getAttribute('aria-valuenow'));
    // Typed, a few times if need be, as a redraw between two digits starts the number again
    for (let tries = 0; tries < 3 && Math.abs(value - (await now())) / step > 20; tries++) {
        await wheel.focus();
        await frames(page, 2);
        await page.keyboard.type(String(value));
        await expect
            .poll(now, { timeout: 1500 })
            .toBe(value)
            .catch(() => undefined);
    }
    for (let attempt = 0; attempt < 10; attempt++) {
        const current = await now();
        if (current === value) {
            break;
        }
        await wheel.focus();
        // A wheel just shown scrolls to its value a frame later, which would undo a key
        // pressed before it (CLAUDE.md, zoneless tests)
        await frames(page, 2);
        const rows = Math.round((value - current) / step);
        const [page5, one] = rows > 0 ? ['PageDown', 'ArrowDown'] : ['PageUp', 'ArrowUp'];
        for (let i = 0; i < Math.floor(Math.abs(rows) / 5); i++) {
            await page.keyboard.press(page5);
        }
        for (let i = 0; i < Math.abs(rows) % 5; i++) {
            await page.keyboard.press(one);
        }
        await expect
            .poll(now, { timeout: 1000 })
            .toBe(value)
            .catch(() => undefined);
    }
    await expect(wheel).toHaveAttribute('aria-valuenow', String(value));
}
