# End-to-end tests

Playwright drives the production build in Chromium, as someone would use it: at phone size
(a Pixel 7, with touch) and at desktop size. They're apart from the unit tests in `src/`, which
`ng test` runs with Vitest, and test what those can't: whole journeys across pages, reloads,
deep links and the real build.

## Running them

```sh
npx playwright install --with-deps chromium   # once
npm run e2e                                   # build, serve and run them all, headless
E2E_NO_BUILD=1 npm run e2e                    # reuse the last build (only the tests changed)
npm run e2e:ui                                # Playwright's UI: pick, watch and step through
npx playwright test --project=phone smoke     # one project, files matching "smoke"
npx playwright show-report                    # the last run's report, with failures' traces
```

`npm run e2e` type-checks `e2e/` (`tsc -p e2e`) first, with the app's strict options. Playwright
builds the app (`npm run build`) and serves `dist/` on <http://127.0.0.1:4300> with
`e2e/serve.mts`, which answers any page with `index.html` and adds `vercel.json`'s headers, as
Vercel does. Locally, a server already on that port is reused, so stop it after rebuilding. On
CI, the `e2e` job runs them with two retries, and keeps the report when they fail.

The production build, rather than `ng serve`, as it's what ships (its Content-Security-Policy,
inlined fonts, analytics and preloads), takes about 15 seconds, and is then served instantly and
the same every time, without a dev server's rebuilds, websocket or second copy of Angular.

## Writing them

A spec is `e2e/<area>.e2e.ts` (not `.spec.ts`: those are the unit tests', and `ng test` looks
for them everywhere). Import `test` and `expect` from `./fixtures`, never from
`@playwright/test`:

```ts
import { expect, test } from './fixtures';

test('Progress opens from the tab bar', async ({ app, page }) => {
    await app.goto('/home');
    await app.tab('Progress').click();
    await expect(page.getByRole('heading', { level: 2, name: 'Progress' })).toBeVisible();
});
```

### What each test starts with

- **A device new to the app.** Each test has its own browser context, so its localStorage and
  IndexedDB (where the history is) start empty, and nothing carries over from another test.
- **Past the first steps.** The `onboarding` option, `'skip'` by default, sets what the app
  saves once the welcome screen's answered as a guest and both tours are seen, so Home opens
  Today. `test.use({ onboarding: 'show' })` starts on the welcome screen instead (see
  `welcome.e2e.ts`).
- **Seeded storage, if asked.** `test.use({ storage: { settings: JSON.stringify({ theme:
  'light' }) } })` adds localStorage before the first page loads (once, so a test that clears
  the device sees it cleared). Prefer making data through the app; seed it when that isn't what's
  being tested, using the same shapes the stores save.
- **No network.** Only the app's own server is reached. Supabase (sign-in, sync), Google Fonts
  and anything else are blocked, with the system font and icons' names showing instead (they're
  `aria-hidden`); web sockets are closed; Vercel's analytics scripts get an empty one. The
  `network` fixture lists what was blocked: `expect(network.supabase).toEqual([])` checks a guest
  never talks to Supabase. To test signing in or sync, stub Supabase in the test with
  `page.route(SUPABASE, ...)` (exported from `fixtures.ts`), which Playwright tries before the
  block. Unstubbed, a blocked request looks to the app like being offline (signing in by email
  says the email couldn't be sent). Its sign-in is kept under
  `sb-cpgacyzlfyskifzhkotu-auth-token` in localStorage, and a device with that key starts
  syncing as it opens, so seed it only with Supabase stubbed.
- **Reduced motion, a fixed locale and time zone** (`en-GB`, `Europe/London`), and no service
  workers. A test of motion opts in with `test.use({ reducedMotion: 'no-preference' })`.
- **Failing on uncaught errors.** An uncaught exception on the page fails the test, after it's
  run; `test.use({ failOnPageError: false })` for a test that expects one.

### The `app` fixture

| | |
| --- | --- |
| `app.goto(path)` | Opens a page and waits for the router to have drawn it |
| `app.reload()` | Reloads, as after a refresh, and waits again |
| `app.ready()` | Waits for the app to have drawn a page, after a navigation of its own |
| `app.tabBar` | The tab bar (`navigation "Main"`), not on the welcome screen |
| `app.tab(label)` | A tab by its label: Today, Workouts, Exercises, Progress or You |
| `app.storageItem(key)` | What the app has saved in localStorage under `key` |
| `app.page` | The page, for anything else |

Add helpers here as journeys repeat (opening a workout, running a step), rather than copying
steps between specs: the same rule against duplication as the rest of the code (CLAUDE.md).

### Conventions

- **Find things as a person would:** `getByRole` with the accessible name, then `getByLabel` and
  `getByText`. A CSS class or `data-` attribute is a last resort: the app's classes aren't an
  interface. A control that can't be found by role and name is worth a look as an accessibility
  bug.
- **No fixed waits.** `expect(...)` retries until it passes, as do clicks; wait on what the person
  would see (`toBeVisible`, `toHaveURL`, `toHaveAttribute('aria-current', 'page')`), never
  `waitForTimeout`. For time in the app (a workout's countdown, a date), use
  [`page.clock`](https://playwright.dev/docs/clock) rather than waiting for it.
- **Wheels:** CLAUDE.md's notes on zoneless tests apply here too: a wheel's first jump to its
  value scrolls a frame later, and a smooth glide can be cut short, which reduced motion (the
  default here) avoids. Set a wheel by its keys or by tapping a value, and check what it shows.
- **Drag and drop** (reordering steps) is checked here rather than in Vitest, whose simulated
  drags are unreliable: use `locator.dragTo()` or `page.mouse` with steps.
- **Phone and desktop:** every test runs on both projects. A test about one layout only says
  so: `test.skip(({ isMobile }) => !isMobile, 'phone layout only')`. On the phone project,
  `locator.tap()` sends a touch; `click()` a mouse click.
- **Ids are fixed:** built-in workouts, plans and exercises keep their ids once released
  (`docs/writing-exercises.md`), so linking to `/exercises/<id>` is safe.
- **Keep each test independent,** and name it for what someone does and sees.
