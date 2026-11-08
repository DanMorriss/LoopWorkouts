import type { CDPSession, Locator, Page } from '@playwright/test';

// A finger on the screen, for the gestures: swiping a card or the run bar, swiping a page back,
// holding a card. Chromium's own touch events (CDP Input.dispatchTouchEvent), so the app gets
// touch and pointer events as from a phone, each given its time rather than sent in real time:
// the gestures go by how fast the finger moves (each event's timeStamp), which a busy machine
// would otherwise change. Chromium only, on a project with touch (the phone).

type Point = { x: number; y: number };

export class Finger {
    /** The last event's time: each gesture's start after it, as a finger's would be. */
    private last = 0;

    private constructor(
        private readonly page: Page,
        private readonly cdp: CDPSession
    ) {}

    static async on(page: Page): Promise<Finger> {
        return new Finger(page, await page.context().newCDPSession(page));
    }

    /** A start time after the last gesture's end. */
    private start(): number {
        return Math.max(Date.now(), this.last + 100);
    }

    private touch(type: 'touchStart' | 'touchMove' | 'touchEnd', at: Point | null, time: number) {
        this.last = time;
        return this.cdp.send('Input.dispatchTouchEvent', {
            type,
            touchPoints: at ? [{ x: at.x, y: at.y, id: 1 }] : [],
            timestamp: time / 1000,
        });
    }

    /**
     * Drags from `from` to `to` over `ms` (by the events' times), in `steps` moves, and lets go.
     * Slow and far is a drag; quick is a flick, which carries on.
     */
    async drag(from: Point, to: Point, { ms = 600, steps = 12 } = {}) {
        const start = this.start();
        await this.touch('touchStart', from, start);
        for (let i = 1; i <= steps; i++) {
            const at = {
                x: from.x + ((to.x - from.x) * i) / steps,
                y: from.y + ((to.y - from.y) * i) / steps,
            };
            await this.touch('touchMove', at, start + (ms * i) / steps);
        }
        await this.touch('touchEnd', null, start + ms + 16);
    }

    /** Holds still on `at` for `ms` on the page's clock, then lets go without moving. */
    async hold(at: Point, ms: number) {
        const start = this.start();
        await this.touch('touchStart', at, start);
        await this.page.clock.runFor(ms);
        await this.touch('touchEnd', null, start + ms);
    }

    /** A point on an element, as fractions across and down it: `within(card, 0.9, 0.1)`. */
    static async within(element: Locator, x: number, y = 0.5): Promise<Point> {
        // On screen first: a touch only lands on what is
        let box = (await element.boundingBox())!;
        const height = await element.page().evaluate(() => window.innerHeight);
        if (box.y < 0 || box.y + box.height > height) {
            await element.scrollIntoViewIfNeeded();
            box = (await element.boundingBox())!;
        }
        return { x: box.x + box.width * x, y: box.y + box.height * y };
    }
}
