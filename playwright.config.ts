import { defineConfig, devices } from '@playwright/test';

// End-to-end tests: the production build in a real Chromium, at phone size first. They're in
// e2e/ (see e2e/README.md), apart from the unit tests, which `ng test` runs with Vitest.

const PORT = 4300;
const ci = !!process.env['CI'];

export default defineConfig({
    testDir: 'e2e',
    // *.e2e.ts, not *.spec.ts, which are the unit tests' (`ng test` looks for those everywhere)
    testMatch: '**/*.e2e.ts',
    fullyParallel: true,
    forbidOnly: ci,
    retries: ci ? 2 : 0,
    // CI's runners have two cores, as does Vitest's maxWorkers (see vitest-base.config.mts)
    workers: ci ? 2 : undefined,
    reporter: ci
        ? [['github'], ['html', { open: 'never' }]]
        : [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // A wheel's smooth glide can be cut short in a test browser (see CLAUDE.md), so motion
        // is reduced unless a test asks for it: test.use({ reducedMotion: 'no-preference' })
        reducedMotion: 'reduce',
        // Dates and numbers the same on every machine
        locale: 'en-GB',
        timezoneId: 'Europe/London',
        serviceWorkers: 'block',
    },
    projects: [
        // Phone first: Chromium on an Android phone, with touch
        { name: 'phone', use: { ...devices['Pixel 7'] } },
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        // The production build, as it ships (its CSP, budgets and analytics included), served
        // by a small static server. E2E_NO_BUILD=1 serves the last build instead, to rerun
        // tests quickly when only the tests have changed.
        command: process.env['E2E_NO_BUILD']
            ? `node e2e/serve.mts ${PORT}`
            : `npm run build && node e2e/serve.mts ${PORT}`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !ci,
        timeout: 5 * 60 * 1000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
