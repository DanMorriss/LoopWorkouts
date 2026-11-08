import { test as base, expect, type Locator, type Page } from '@playwright/test';

// The `test` every e2e spec imports instead of Playwright's: each test starts on a device new to
// the app (Playwright gives each its own browser context, so its localStorage and IndexedDB
// start empty), already past the welcome screen, the setup and the tours unless it asks for
// them, and with no request leaving the app's own server. See e2e/README.md.

/** What the app keeps in localStorage to know a device has been through its first steps. */
const ONBOARDED: Record<string, string> = {
    // The welcome screen's answer (NAV-3): going on as a guest. With no `setup` key, Home
    // doesn't open the setup (NAV-4) either.
    welcomed: 'guest',
    // The tours of the app (NAV-8) and of Create (BLD-17), counted as seen
    tour: 'seen',
    'tour-create': 'seen',
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
}

export interface AppFixtures {
    /** The requests the test stopped from leaving the app's server. */
    network: Network;
    /** Helpers for getting about the app. */
    app: App;
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
        await expect(this.page.locator('app-root main > router-outlet + *').first()).toBeAttached();
    }

    /** What the app has saved in localStorage under `key`, or null. */
    storageItem(key: string): Promise<string | null> {
        return this.page.evaluate((k) => localStorage.getItem(k), key);
    }
}

export const test = base.extend<AppOptions & AppFixtures>({
    onboarding: ['skip', { option: true }],
    storage: [{}, { option: true }],
    failOnPageError: [true, { option: true }],

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

    page: async ({ page, failOnPageError }, use) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
        await use(page);
        if (failOnPageError) {
            expect(errors, 'uncaught errors on the page').toEqual([]);
        }
    },

    app: async ({ page }, use) => {
        await use(new App(page));
    },
});

export { expect };
