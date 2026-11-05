# Loop Workouts

A workout app built around an interval timer, for phones first: Angular 22, signals, Signal Forms, Tailwind and SCSS, with Supabase for accounts and sync. It's zoneless and tested in a real browser (Vitest with Playwright).

These rules apply wherever Claude runs: on any machine, in the cloud or on a phone. Keep anything true of only one machine out of this file.

## Commands

Node is pinned in `.nvmrc`. CI (`.github/workflows/ci.yml`) runs these, and all must pass before a PR can merge:

```sh
npm ci
npx playwright install --with-deps chromium   # for the tests
npm run format:check                          # npm run format to fix
npm run lint                                  # component size
npm run unused                                # exports and dependencies nothing uses
npx ng test --watch=false --no-progress
npm run build
```

The compiler fails on unused locals and parameters, and the build on its budgets.

## Where things are

- **What to work on:** `TODO.md`, highest priority first; `docs/direction.md` explains the order.
- **What the app does:** `docs/features/`, with stories by stable id (e.g. `ALM-2`), rules, acceptance criteria and web and iOS notes.
- **Code:** `src/app/models/` is pure logic and data with no Angular in it; `src/app/shared/` is what several features use, and must not import from a feature; each other folder is a feature.

## Reuse before you write

Duplication is the main way this codebase degrades, usually as one feature copying another. Before adding a component, style block or helper, look in these places. When something you need nearly exists, extend it. On writing the second copy of anything over a few lines, extract it in the same PR instead.

- **Components:** `shared/components/`: `dialog` (every dialog over the page), `search-field`, `equipment-chips`, `equipment-filter`, `showcase` (a card's count, muscles and kit), `wheel-picker` and `labelled-wheel`, `help-link`, `icon`, `infinity-switch`, `toggle-switch`, `wheel-picker`, `workout-choice-dialog`, `workout-outline`, `body-map` and more; `nav/back-link`; `exercises/exercise-card`; `exercises/muscle-chips`; `history/set-lines`.
- **Styles:** `src/styles/`: `_buttons` (`.btn-main`, `.btn-pill`, `.btn-icon`), `_forms` (`.picker-field`), `_menu`, `_segmented`, `_info`, `_dialog`; and these mixins: `_type` (`display`, `small-type`, `page-title`, `page-hint`, `dialog-title`), `_interaction` (`hover`, `pressed`, `hit-area`, `link-button`), `_chip`, `_showcase-card`. Don't write new button, chip or menu styles in a component.
- **Helpers:** `shared/format-time.ts` (`formatSeconds`), `shared/format-count.ts` (`counted`), `shared/focus-after-render.ts`, `shared/reduced-motion.ts`, `shared/gesture.ts`, `shared/spring.ts`, `ExerciseStore.shownFor`, `models/` (e.g. `stepKindName`, `exerciseHint`).
- **Tests:** `shared/testing/` (`makeWorkout`, `fakeReducedMotion`, fake sync, account and audio).

Helpers that aren't about one component don't belong in a component's file, as importing it from elsewhere ties the two together.

## Angular and TypeScript

- Standalone components only. Don't set `standalone: true` or `changeDetection: OnPush`: both are the default in Angular 22.
- `input()`, `output()`, `model()` for two-way binding, and `viewChild()`, never the decorators. `inject()`, never constructor injection. `host: {}`, never `@HostBinding` or `@HostListener`.
- `@Service()` for new singletons, rather than `@Injectable({ providedIn: 'root' })`.
- Signals for state, `computed()` for what's derived, `linkedSignal()` for state that follows another source, and `set` or `update`, never `mutate`.
- Signal Forms (`@angular/forms/signals`) for forms.
- `@if`, `@for`, `@switch`; `[class]` and `[style]`, never `ngClass`, `ngStyle` or `CommonModule`. Keep logic out of templates, and don't assume globals such as `new Date()` are there.
- Lazy-load feature routes. Use `NgOptimizedImage` for static images.
- Strict TypeScript, no `any` (use `unknown`), and small components with one job. A component that's grown large should lose parts when next changed, not gain more. `npm run lint` fails a component or directive, or its template, over 300 lines of code. Split it rather than raising the limit or adding an exception: logic that only reads goes to a service for the page or plain functions, a gesture to a plain class beside the component (e.g. `card-gestures.ts`), and markup to a child with its styles, whose host can be `display: contents` to keep the layout.
- Inline templates for small components. Paths to external files are relative to the component.

## Styling

- **Every colour is a token** in `src/styles.scss`, set for both dark and light themes; `theme-contrast.spec.ts` checks them. For a see-through version use `color-mix(in srgb, var(--token) 30%, transparent)`. No raw hex or `rgba()` in a component's styles.
- **Each class means one thing in a file.** A class name is on one kind of element, and defined in one place. Using the same name for two things lets the styles of one leak onto the other, and a parent's class beats a child's `:host` styles. The same goes for classes on a child component's element: only set spacing there.
- **Mixins, not global classes,** for what only some pages need: the global styles are part of the first download.
- **Budgets:** a component's styles fail the build over 4 kB, and the initial bundle over 500 kB. Fix that by moving a part into a child component rather than raising the limit. Anything on every page uses `app-icon`, not `mat-icon`.

## Accessibility

It must pass axe and meet WCAG AA: focus management, contrast, ARIA, and 44px touch targets (`hit-area`). Dialogs use `app-dialog`, which traps focus and closes by ‹ Back, Escape and a click outside; give them a sensible element to start on (`cdkFocusInitial`). When something opens, closes or disappears, say where focus goes, and test it. Respect reduced motion in anything that moves. `a11y.spec.ts` holds the axe checks: keep new ones light, as they run under a time limit.

## Before raising a PR

Check the diff, not only that it works:

1. **Duplication:** does this repeat something that exists? Search for it, and for what it's similar to.
2. **Leftovers:** anything now unused, including exports only their own test uses. Search the whole repo, not only `src/app` (`src/test-setup.ts` and `tools/` use things too).
3. **The rules above,** especially colours, one meaning per class, and no build warnings.
4. **Look at it:** for a visual change, run the app and look, in both themes and at phone width. Tests don't see layout.
5. **Docs in the same PR:** `TODO.md` (tick what's done; add any limitation to Known issues) and `docs/features/` (the feature's file and its status in the README) if behaviour changed. Search `README.md` and `docs/` for anything now out of date.

## Pull requests

- One batch of work, one branch off the latest `main`, one PR with `gh pr create --base main`. Don't stack PRs: Dan merges quickly, and a stacked one lands in the wrong branch.
- Dan merges. Don't merge, and once a PR is handed over don't add to it (`gh pr view <n> --json state` first if unsure); put follow-ups on a new branch.
- Describe it for a reviewer: summary, what changed, testing and known issues.
- `main` is protected. Watch `gh pr checks <n> --watch` and fix what fails. If CI hasn't started after a few minutes, closing and reopening the PR starts it.

## Things that have caught us out

- **Zoneless tests:** a wheel's first jump to its value fires its scroll a frame later, so wait two `requestAnimationFrame`s before pressing a freshly shown wheel. A smooth glide can be cut short in the test browser, so use `fakeReducedMotion(true)` when a test changes a wheel from code and then saves.
- **Signal Forms:** array rows are tracked by a hidden symbol on each object, which spreading copies, so a new row made with `{...otherRow}` shares its identity (NG01904): copy named fields instead. Closing a form inside its submission action leaves it stuck submitting.
- **Full test runs:** `maxWorkers` is 2 in `vitest-base.config.mts` on purpose: with more pages, the 3D demos' software WebGL starves the others of frames, and timing tests fail at random, without the run getting any quicker. Don't raise it. If a timing test fails anyway, look for a new cause before rerunning. Don't kill a running `ng test` and start another straight away.
- **Dev server:** a new Angular entry-point import can give lazy pages a second copy of Angular (NG0203). Restart `ng serve` before debugging that.
- **Drag and drop:** the CDK sorts by top edge, so hide a row by shrinking it in place, not with `display: none`. Check real drags with Playwright against `ng serve`, as simulated drags in Vitest are unreliable.
- **Built-in content:** ids of ready-made workouts, plans and exercises are fixed once released. See `docs/writing-exercises.md`.
- **Searching on a Mac:** `git grep -E` there doesn't understand `\s` or `\b`, so a pattern can find nothing without saying so. Use `[[:space:]]`.

## Reviewing the whole codebase

When asked for a review: search for what the rules ban; run the unused-code check above, whose `knip.json` skips test helpers and doesn't count tests as a use; look for blocks repeated across files, including SCSS and templates, not just TypeScript; check every build warning; and read what changed most since the last review. Check each finding by reading the code, and confirm a suspected visual bug in the running app. Report findings by value, and don't change code until asked.
