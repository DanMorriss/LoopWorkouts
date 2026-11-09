import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { Device, type DeviceOptions } from './device';
import { NOW } from './seed';

// The `test` every e2e spec imports instead of Playwright's: each test starts on a device new to
// the app (Playwright gives each its own browser context, so its localStorage and IndexedDB
// start empty), already past the welcome screen, the setup and the tours unless it asks for
// them, and with no request leaving the app's own server. See e2e/README.md.

/** What the app keeps in localStorage to know a device has been through its first steps. */
const ONBOARDED: Record<string, string> = {
    // The welcome screen's answer (NAV-3): going on as a guest. With no `setup` key, Home
    // doesn't open the setup (NAV-4) either.
    welcomed: 'guest',
    // The tours of the app (NAV-8), of Create (BLD-17), of the workout page (RUN-13) and of
    // the Plan page (PLN-8), counted as seen
    tour: 'seen',
    'tour-create': 'seen',
    'tour-workout': 'seen',
    'tour-plan': 'seen',
    // The data's shape now, so nothing seeded is converted as if from an older version
    'data-version': '5',
};

/** Where the app's sign-in and sync go: Loop Workouts' Supabase project. */
export const SUPABASE = /^https:\/\/[\w-]+\.supabase\.co\//;

export interface AppOptions {
    /**
     * `skip` (the default) starts each test past the welcome screen, the setup and the tours;
     * `show` starts it on a device that has never opened the app, so Home opens the welcome
     * screen.
     */
    onboarding: 'skip' | 'show';
    /**
     * More localStorage for the app's origin when the test starts, such as saved workouts or
     * settings (`{ settings: JSON.stringify({ theme: 'light' }) }`). It's set once, before the
     * first page loads, so a test that clears the device sees it cleared.
     */
    storage: Record<string, string>;
    /** Whether an uncaught error on the page fails the test (it does by default). */
    failOnPageError: boolean;
    /**
     * The time on the page's clock as the test starts (`page.clock`, installed before the
     * first page loads), Wednesday 11 November 2026 at 09:00 by default (`NOW` in seed.ts).
     * It runs on as usual from there; `page.clock.runFor()` moves it on, firing the app's
     * timers, as for a workout's countdown. `null` leaves the real clock.
     */
    now: string | null;
    /** The phone's sound, vibration and wake lock: stand-ins that record what's asked of them. */
    deviceApis: DeviceOptions;
}

export interface AppFixtures {
    /** The requests the test stopped from leaving the app's server. */
    network: Network;
    /** Helpers for getting about the app. */
    app: App;
    /** What the app has asked of the device: sounds played, vibrations, the wake lock. */
    device: Device;
}

/** The requests stopped from leaving the app's server, as the test goes. */
export class Network {
    /** Every one, by URL: Supabase, Google Fonts, web sockets and anything else. */
    readonly blocked: string[] = [];

    /** Those to Supabase (sign-in and sync): none, for a guest. */
    get supabase(): string[] {
        return this.blocked.filter((url) => SUPABASE.test(url));
    }
}

/** Getting about the app, by what a person sees. */
export class App {
    constructor(readonly page: Page) {}

    /** The tab bar: Today, Workouts, Exercises, Progress and You. */
    get tabBar(): Locator {
        return this.page.getByRole('navigation', { name: 'Main' });
    }

    /** One of the tab bar's tabs, by its label. */
    tab(label: 'Today' | 'Workouts' | 'Exercises' | 'Progress' | 'You'): Locator {
        return this.tabBar.getByRole('link', { name: label, exact: true });
    }

    /** Opens a page by its path (`/history`) and waits for the app to have drawn it. */
    async goto(path: string) {
        await this.page.goto(path);
        await this.ready();
    }

    /** Reloads the page, as after a refresh, and waits for the app again. */
    async reload() {
        await this.page.reload();
        await this.ready();
    }

    /** Waits for Angular to have started and the router to have drawn a page. */
    async ready() {
        // Longer than an expect's 5s: a page can take that long to load on a busy machine
        await expect(this.page.locator('app-root main > router-outlet + *').first()).toBeAttached({
            timeout: 15_000,
        });
    }

    /** What the app has saved in localStorage under `key`, or null. */
    storageItem(key: string): Promise<string | null> {
        return this.page.evaluate((k) => localStorage.getItem(k), key);
    }

    /** What the app has saved under `key`, as JSON, or null. */
    async stored<T = unknown>(key: string): Promise<T | null> {
        const item = await this.storageItem(key);
        return item === null ? null : (JSON.parse(item) as T);
    }

    /** The page's heading, the title under the header (level 2). */
    heading(name: string | RegExp): Locator {
        return this.page.getByRole('heading', { level: 2, name });
    }

    /** The bar at the bottom saying what just happened, with Undo where it can be undone. */
    get undoBar(): Locator {
        return this.page.locator('app-undo-bar .undo-bar');
    }

    /** The undo bar's Undo. */
    get undo(): Locator {
        return this.undoBar.getByRole('button', { name: 'Undo', exact: true });
    }

    /** The bar over the tabs while a workout's going. */
    get runBar(): Locator {
        return this.page.getByRole('complementary', { name: 'Workout in progress' });
    }

    /** The link at the top of a page that slid in, back to where it came from: ‹ Workouts. */
    backLink(name: string | RegExp): Locator {
        return this.page.locator('app-back-link').getByRole('link', { name });
    }

    /** What's focused, to check focus with `toBeFocused` on a locator, or read its name. */
    focusedName(): Promise<string> {
        return this.page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            return (el?.getAttribute('aria-label') ?? el?.textContent ?? '').trim();
        });
    }

    /** Everything the app's live regions have said since the page loaded, in order. */
    announcements(): Promise<string[]> {
        return this.page.evaluate(() => window.__announced ?? []);
    }

    /**
     * Waits for the app's history to have loaded and saved what was seeded (`history-pending`
     * is emptied once IndexedDB has it), so a reload doesn't race it.
     */
    async historySaved() {
        await expect
            .poll(async () => String(await this.storageItem('history-pending')))
            .toMatch(/^(null|\[\])$/);
    }
}

declare global {
    interface Window {
        __announced?: string[];
    }
}

/**
 * Runs in the page before the app: records the text of each live region (`aria-live`, or a
 * role of status or alert) as it changes, as a screen reader would hear it.
 */
function recordAnnouncements() {
    const heard: string[] = [];
    window.__announced = heard;
    const live = (node: Node | null): Element | null => {
        for (
            let el = node instanceof Element ? node : node?.parentElement;
            el;
            el = el.parentElement
        ) {
            const role = el.getAttribute('role');
            const polite = el.getAttribute('aria-live');
            if ((polite && polite !== 'off') || role === 'status' || role === 'alert') {
                return el;
            }
        }
        return null;
    };
    const observer = new MutationObserver((mutations) => {
        const regions = new Set<Element>();
        for (const mutation of mutations) {
            const region = live(mutation.target);
            if (region) {
                regions.add(region);
            }
        }
        for (const region of regions) {
            const text = (region.textContent ?? '').replace(/\s+/g, ' ').trim();
            if (text && heard.at(-1) !== text) {
                heard.push(text);
            }
        }
    });
    const start = () =>
        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
        });
    if (document.documentElement) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start);
    }
}

export const test = base.extend<AppOptions & AppFixtures>({
    onboarding: ['skip', { option: true }],
    storage: [{}, { option: true }],
    failOnPageError: [true, { option: true }],
    now: [NOW, { option: true }],
    deviceApis: [{ audio: 'allowed', vibrate: true, wakeLock: true }, { option: true }],

    // The app's localStorage as the test starts, given to the browser before any page loads
    storageState: async ({ onboarding, storage, baseURL }, use) => {
        const items = { ...(onboarding === 'skip' ? ONBOARDED : {}), ...storage };
        await use({
            cookies: [],
            origins: [
                {
                    origin: new URL(baseURL!).origin,
                    localStorage: Object.entries(items).map(([name, value]) => ({ name, value })),
                },
            ],
        });
    },

    network: async ({}, use) => {
        await use(new Network());
    },

    // Nothing leaves the app's own server. A test that needs Supabase to answer stubs it with
    // page.route(SUPABASE, ...), which Playwright tries before these context routes.
    context: async ({ context, baseURL, network }, use) => {
        const origin = new URL(baseURL!).origin;
        await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.origin === origin) {
                // Vercel's analytics scripts (/_vercel/insights, /_vercel/speed-insights) are
                // only there on Vercel: an empty script, so the production build doesn't 404
                return url.pathname.startsWith('/_vercel/')
                    ? route.fulfill({ contentType: 'text/javascript', body: '' })
                    : route.fallback();
            }
            network.blocked.push(url.href);
            // Google Fonts too: the build inlines their CSS, so it's the font files from
            // fonts.gstatic.com that are stopped. The page falls back to the system's font, and
            // icons show as their names (they're aria-hidden, so locators don't see them).
            return route.abort('blockedbyclient');
        });
        await context.routeWebSocket(/.*/, (socket) => {
            network.blocked.push(socket.url());
            void socket.close();
        });
        await use(context);
    },

    page: async ({ page, failOnPageError, now, deviceApis }, use) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
        if (now) {
            await page.clock.install({ time: new Date(now) });
        }
        await Device.install(page, deviceApis);
        await page.addInitScript(recordAnnouncements);
        await use(page);
        if (failOnPageError) {
            expect(errors, 'uncaught errors on the page').toEqual([]);
        }
    },

    app: async ({ page }, use) => {
        await use(new App(page));
    },

    device: async ({ page }, use) => {
        await use(new Device(page));
    },
});

export { expect };
export * from './seed';
export { ALARM } from './device';
