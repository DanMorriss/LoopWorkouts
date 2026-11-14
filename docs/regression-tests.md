# Loop Workouts: regression test list (end-to-end)

Written 2026-11-08 against `main` at `f9998e9`, from `docs/features/`, `TODO.md`, `docs/direction.md`, `src/app/app.routes.ts` and the components behind them. First written as the list to automate; it's now the Playwright pack in `e2e/`, one spec per area (`e2e/nav.e2e.ts`, `plan`, `build`, `library`, `run`, `history`, `progress`, `exercises`, `settings`, `data`, `account`, `a11y`, `gestures`), each test titled with its id and tagged with its priority (`npm run e2e:p1` runs the P1 set). Brought up to date with the app on 2026-11-08, where it had moved on since `f9998e9` (one list of your own and the ready-made workouts, Missing muscle groups on the Plan page, and so on): where a test below differs from the first list, it says what the app does, and **In the pack** notes how it's checked. See `e2e/README.md` for running and writing them.

## Purpose

To catch a broken user journey before Dan merges a PR. The Vitest component tests (`ng test`, real Chromium) already cover each component and the pure maths in `models/` in detail. This pack checks that the pages work **together**, through the router, storage, the run service, and real navigation and focus, the way someone uses the app on a phone.

## Scope

**In the e2e pack:**

- Whole journeys across pages: onboarding, building and editing a workout, running it, the summary, history, progress, exercises, the library and ready-made workouts, planning, settings and theme, backup and import, clearing the device, and signing in against a stubbed Supabase.
- What only shows up end to end: route guards (`welcomeFirst`, `historyLoaded`, `confirmLeaving`), storage surviving a reload, the run carrying on across pages and reloads, focus moving across a page change, the tab bar's current tab, and the Undo bar across pages.
- Accessibility at journey level: axe on each main page in both themes, focus as dialogs open and close, Escape and ‹ Back, keyboard-only running, reduced motion and live announcements.

**Left to Vitest (don't repeat it here):**

- The timing and alarm maths (`workoutStateAt()`, `alarmEvents()`), set and progress maths (`progress.ts`, `muscle-balance.ts`, `fill-gaps.ts`), the history's wording (`history-format.ts`), migrations between data versions (EXR-4, `migrate.ts`), the merge rules for import and sync (`mergeRecords()`), backup parsing edge cases, wheel physics, spring curves, and the built-in content checks (`built-in-workouts.spec.ts`, `built-in-plans.spec.ts`, `help-topics.spec.ts`).
- The full axe sweep of every state (`a11y.spec.ts`) and theme contrast (`theme-contrast.spec.ts`). The e2e axe test here is a lighter, page-level check.
- Every acceptance criterion's edge cases. Each e2e test picks the one or two cases that prove the journey is wired up, and leaves the rest to the component spec.

## Assumptions and test harness

How the pack does it, in short (the bullets below were the plan, and mostly still hold):

- **The production build**, served by `e2e/serve.mts` with `vercel.json`'s headers (its Content-Security-Policy included), in Chromium as a Pixel 7 (`phone`, with touch) and at desktop size (`desktop`). Every test runs on both, unless it says it's for one.
- **`e2e/fixtures.ts`**: a new device per test, past the welcome screen and tours unless `onboarding: 'show'`; storage seeded with the helpers in `e2e/seed.ts` (`seed.workouts`, `seed.history` through `history-pending`, `seed.settings`, `seed.plan`, `seed.notes`, `seed.hidden`, `seed.deleted`); `page.clock` installed at `NOW`, Wednesday 11 November 2026 09:00 (UK time), running on as usual, moved on with `runFor`; the device stand-ins in `e2e/device.ts` (Web Audio, vibration, wake lock) recording what's asked of them; live regions recorded as announced (`app.announcements()`); no network beyond the app's own server.
- **Supabase** is answered by `FakeSupabase` in `e2e/supabase.ts` for the account tests, and never reached otherwise.
- **Page helpers**: `workout-page.ts` (the workout page, its summary, and `setWheel`), `create-page.ts`, `library-page.ts`, `history-page.ts`, `axe.ts` and `touch.ts` (a finger, by Chromium's own touch events, each given its time).
- **Timings are longer than the docs' examples** where a test checks a phase (0:30 and 0:20 rather than 0:03 and 0:02): the clock runs on between checks, and a busy machine mustn't miss a phase.

- **Hermetic.** No real network. Supabase (`https://cpgacyzlfyskifzhkotu.supabase.co/**`) is always routed: by default to a stub that fails the test if it's called, so guest tests prove they never touch it, and in the Account tests to a stub per test (see REG-ACC). Vercel Web Analytics (`/_vercel/insights/**`) is routed to empty 200s. The fonts and icons are the app's own, so they load as they do for anyone.
- **Fresh storage per test.** A new browser context each test (Playwright's default), so `localStorage`, `sessionStorage` and IndexedDB start empty.
- **Phone viewport.** `devices['Pixel 7']`-like: 412 × 915 (or 390 × 844), `isMobile: true`, `hasTouch: true` only where a test needs touch. One project in Chromium; a WebKit project is worth running for the P1 tests, since most of the Known issues are Safari ones.
- **Locale and time.** `locale: 'en-GB'` (so the setup starts on kg), `timezoneId: 'Europe/London'`. Unless a test says otherwise, `page.clock.install({ time: new Date('2026-11-11T09:00:00') })`, a **Wednesday** morning, before `page.goto`. The app's dates use Angular's `DatePipe` with the default `en-US` locale, so times read "9:05 AM".
- **Reduced motion by default.** `reducedMotion: 'reduce'` on the context except in the tests about motion. It makes wheels jump, pages cross-fade and the summary appear at once, which removes most waiting. CLAUDE.md's zoneless notes still apply: wait two `requestAnimationFrame`s before pressing a wheel that's just been shown.
- **Server.** `ng serve` for speed in development; CI should also run the P1 tests against `ng build` served statically with an SPA fallback, as that's the build with the Content-Security-Policy (`security.autoCsp`), and fail on any CSP violation in the console.
- **Device APIs stubbed** with `page.addInitScript` before the app loads:
    - `AudioContext`: a recorder that logs each note's frequency and start time (`osc.frequency.value`, `osc.start(when)` against the stub's own `currentTime`, which follows `Date.now()` so `page.clock` moves it). Its `state` starts `'running'`; set it to `'suspended'` to test **Tap to turn on sound**.
    - `navigator.vibrate`: records each pattern; delete it to test "This device can't vibrate".
    - `navigator.wakeLock.request`: records requests and releases; delete it to test "This browser can't keep the screen on".
    - Clipboard: `context.grantPermissions(['clipboard-read', 'clipboard-write'])`.
- **Seeding helpers** (write them once, in a `seed.ts` fixture, applied by `addInitScript` so they're there before the app's first read):
    - `guest()`: `welcomed = "guest"`, no `setup` key, `data-version = "5"`. Every test that isn't about onboarding starts here.
    - `workouts([...])`: `workouts` in the `blocks` shape in `docs/features/data.md` (groups of steps, headings, `repeats` 0 for until stopped, `timeLimitSeconds`, `exerciseId` such as `builtin:back-squat`, `weight` in kg).
    - `history([...])`: write entries to `history-pending` in localStorage. The history store saves anything there to IndexedDB on load (`history-store.service.ts`), which is simpler than writing IndexedDB from the test. An entry's `id` is `<startedAt>-<workoutId>`; sets are `RepSet` or `TimedSet` (`models/history.ts`).
    - `settings({...})`: `settings` as in data.md (theme, sound, weightUnit, bodyFigure, myEquipment, onlyMyEquipment, eachSideFirst, switchSidesSeconds, name, trainingFor).
    - `plan(days)`: `week-plan` with `days` (seven lists of workout ids, Monday first) and no `plannedAt`, so every workout counts this week.
    - `signedIn(email)`: a Supabase session under `sb-cpgacyzlfyskifzhkotu-auth-token`, with `welcomed = "signed-in"`.
- **Ids** in the steps below are the real ones: built-in exercises are `builtin:<kebab name>` (117 of them today, e.g. `back-squat`, `bench-press`, `push-up`, `goblet-squat`, `plank`, `seated-cable-row`, `dumbbell-shoulder-press`, `leg-press`, `side-plank`, `chainsaw-row`); ready-made workouts `builtin:gym-legs` and so on; plans `builtin-plan:no-equipment-3-day` and so on.

### Tags used below

- **[Gesture]**: touch or pointer gestures. Automatable with `hasTouch` and CDP `Input.dispatchTouchEvent` (or a run of `pointerdown`/`pointermove`/`pointerup` with `pointerType: 'touch'` and timestamps), but give them fake timestamps rather than real time (as `wheel-picker.component.spec.ts` now does), and keep a manual iPhone check.
- **[Drag]**: the CDK drop list. CLAUDE.md: check real drags with Playwright against `ng serve`; simulated drags in Vitest are unreliable. Use `page.mouse.down()`, wait out the hold (`HOLD_MS`), then `mouse.move` in 10+ steps.
- **[Clock]**: needs `page.clock` (`runFor`, `fastForward`). The run works from `Date.now()` and ticks on `setTimeout`, so the fake clock drives it fully. Don't wait in real time.
- **[Audio] / [Device]**: uses the stubs above. Real sound, vibration, the screen staying on and the lock screen stay **manual on a phone**.
- **[Known issue]**: listed in TODO.md's Known issues. Mark with `test.fixme()` (or skip in that browser project) and a link to the TODO line, so it's picked up once fixed.

---

## 1. Onboarding and navigation (`home-and-navigation.md`)

### REG-NAV-01 · First visit: welcome screen, then the setup

- **Stories:** NAV-3, NAV-4 · **Priority:** P1
- **Preconditions:** empty storage (don't use `guest()`).
- **Steps:**
    1. Open `/`.
    2. Press **Continue as guest**.
- **Expected:**
    1. `/` redirects to `/home`, which redirects to `/welcome`: the ∞ logo, "Welcome to Loop Workouts", the sign-in (Continue with Google, Email, Email me a sign-in link) and **Continue as guest**, with no tab bar.
    2. localStorage has `setup = "due"` once the welcome screen is shown.
    3. After Continue as guest: `welcomed = "guest"`, and Today's guard sends it on to `/welcome/setup`, showing "Question 1 of 5" and "What should we call you?" with that heading focused, no Back button, Next, and Skip for now. No tab bar.
- **Variants (same test file):**
    - A device with a saved workout but no `welcomed` key (in use before the welcome screen) opens `/home` straight away, and `welcomed` becomes `"guest"`.
    - A new device opening `/exercises/back-squat` directly gets that page, not the welcome screen.

### REG-NAV-02 · The setup, answered all the way through

- **Stories:** NAV-4, NAV-6, SET-4, SET-5, SET-7, PRG-8, PLN-7 · **Priority:** P1
- **Preconditions:** as REG-NAV-01, on question 1. Clock at 09:00.
- **Steps:**
    1. Type "Sam" and press Enter (Enter is Next).
    2. Pick **Fitness**, Next.
    3. Pick the **Kettlebell** chip, Next.
    4. Pick **Female**, Next.
    5. Leave **Kilograms**, press **Done**.
    6. Reload. Open You.
- **Expected:**
    1. Each question's heading takes focus as it shows, and "Question N of 5" counts up. Back, Next and Skip for now have the same bounding boxes on every question (they're fixed to the bottom).
    2. After Done, `/home` opens with "Good morning, Sam" and the Undo bar showing "You're all set, Sam. Change any of it on You, under Profile." with no Undo; the `setup` key is gone.
    3. Today shows **Get started** offering a ready-made plan. For Fitness with a kettlebell that's **Fitness, 4 days** (`firstPlan()`), not a single workout: see mismatch M3.
    4. After reload, Today opens again (not the setup). You → Profile shows Name "Sam", Sex Female, Training for Fitness, Weight units kg. The Exercises page has **Only what I have** on with "My equipment: 1 piece".

### REG-NAV-03 · Skipping the setup

- **Stories:** NAV-4 · **Priority:** P2
- **Preconditions:** as REG-NAV-01, on question 1.
- **Steps:** Press **Skip for now**. Reload `/home`.
- **Expected:** Today opens with no "all set" notice; the `setup` key is gone; the reload opens Today, not the setup. The profile's defaults are unchanged (Male, Muscle, kg, no name: greeting is just "Good morning").

### REG-NAV-04 · Tabs, where pages open, and coming back

- **Stories:** NAV-1, NAV-2, NAV-5 · **Priority:** P1
- **Preconditions:** `guest()`, one saved workout.
- **Steps:**
    1. Open `/`. Read the tab bar.
    2. Visit each tab in turn, then Settings (You → Settings), `/plan` (Today → Edit plan or Make your own plan), `/setup` (Workouts → New) and `/ready-made`.
    3. On Exercises, scroll to the bottom, open an exercise near it, press **‹ Exercises**.
    4. Scroll Progress down, then press the Workouts tab.
- **Expected:**
    1. The "Main" navigation has Today, Workouts, Exercises, Progress and You, with Today `aria-current="page"`.
    2. The current tab is marked as the current page on its own page, and as the current item on pages under it: You for Settings, Help, Privacy, Terms; Today for `/plan` and `/ready-made-plans`; Workouts for `/setup`, `/ready-made` and `/library/<id>`.
    3. The exercise page opens at its top; ‹ Exercises brings the list back scrolled where it was.
    4. Workouts opens at its top.
    5. Each tab is at least 44px wide at 320px viewport width.
- **In the pack:** a page under a tab marks it `aria-current="true"` (its own page, `"page"`). `/ready-made` now redirects to `/library`, so it isn't in the list. Coming back to Exercises also puts focus back on the card.

### REG-NAV-05 · The run bar, and back to the workout

- **Stories:** NAV-1, CTL-4, RUN-4 · **Priority:** P1 · **[Clock]**
- **Preconditions:** `guest()`, a workout "Circuit" of Squats (timed 0:30, `builtin:bodyweight-squat`), rest 0:10, 2 rounds.
- **Steps:**
    1. On Workouts, press **Start Circuit**. Press **⌄** (named "Back to Workouts").
    2. Press the bar's **Pause**; then the bar's **Resume**.
    3. Go to Progress. `runFor` 80 s.
    4. Press the bar.
    5. Separately: open `/workout` with nothing running, and `/timer`.
- **Expected:**
    1. The workout page has no tab bar; ⌄ goes back to Workouts, where the bar above the tabs reads "Circuit" and "Squats · 00:2x", ticking down.
    2. Pausing shows "Paused · Squats · …" and the button is named Resume; resuming carries on.
    3. On Progress, the workout finishes without its page open: the bar says "Finished: see how it went" with no Pause, and Progress's log now has Circuit, "2 rounds" (logged while on another page).
    4. The bar opens the workout page with its summary, "Workout finished".
    5. `/workout` with no run says "No workout selected." with "Choose one from your workouts" (to `/library`); `/timer` redirects to `/workout`.
- **In the pack:** the link with no run reads **Choose a workout**.

### REG-NAV-06 · Help, its search, and a ? link

- **Stories:** NAV-7 · **Priority:** P2
- **Preconditions:** `guest()`, clock Wednesday, one workout planned on Monday only, with its `plannedAt` set to today (`"0:<id>": <now>`), so Today says **Your plan starts next week** with its ? link.
- **Steps:**
    1. You → **Help**.
    2. Type "iphone" in **Search help**.
    3. Type "zzzz".
    4. Open Today; press the ? beside **Your plan starts next week**.
- **Expected:**
    1. Help slides in at `/help` with every section closed and ‹ You; You stays current in the tab bar.
    2. Only the three questions mentioning iPhones show, opened, and a status says "3 answers".
    3. 'Nothing matches "zzzz". Try other words, or email us below.'
    4. Help opens on "Why does Today say my plan starts next week?", opened, scrolled to and focused. The link's accessible name starts "Help:".
- **In the pack:** the topics are `<details>` (role group); the opened one is checked by its `open` attribute and its question's focus.

---

## 2. Today and planning (`planning.md`)

### REG-PLAN-01 · Get started: use a ready-made week, then Undo

- **Stories:** PLN-6, PLN-7, NAV-6 · **Priority:** P1
- **Preconditions:** `guest()`, no workouts, default settings (Muscle, no equipment).
- **Steps:**
    1. Open Today.
    2. Press **Use this plan**.
    3. Press **Undo**.
- **Expected:**
    1. No This week card and no logo; **Get started** shows "No equipment, 3 days" with its days ("Mon Bodyweight basics", …), **Use this plan** (the main button), **More plans** and **Make your own plan** (to `/plan`).
    2. Workouts now has Bodyweight basics, Cardio intervals, Core in 15 and Tabata; Get started is replaced by This week, with dots on Mon, Wed and Fri and Wednesday outlined as today; Due today lists Cardio intervals with Start; the Undo bar says "Your week is planned: No equipment, 3 days"; focus is on **Edit plan**.
    3. The four workouts are gone, `week-plan` is back to empty, and Get started is back.
- **In the pack:** Use this plan plans the ready-made workouts **as they are** (nothing is copied into your workouts), and as it's planned on a Wednesday, Monday's says "from next week" (PLN-3) and Friday's "to come". Focus ends on Edit plan, with Undo still in the bar (B1, fixed 2026-11-10).

### REG-PLAN-02 · Plan the week by hand

- **Stories:** PLN-1, PLN-4, PLN-5 · **Priority:** P1
- **Preconditions:** `guest()`, workouts Legs and Push, nothing planned.
- **Steps:**
    1. Open Today. Press **Make your own plan**.
    2. Press **Add** on Thursday. Press Escape.
    3. Press Add on Thursday again and pick **Push**.
    4. Press Add on Thursday again.
    5. Pick nothing: press ‹ Back. Then press the ✕ named "Take Push off Thursday".
    6. Press Add on Thursday, then **Make a new workout**.
- **Expected:**
    1. Today's This week says "Nothing planned yet." with a ready-made plan's **Use this plan** as the main button and **More plans** and **Make your own plan** under it. The Plan page slides in at `/plan` with ‹ Today, the title Plan, and every day saying "Nothing planned"; Today stays current in the tab bar.
    2. A dialog "Plan on Thursday" opens with **Make a new workout** first, then Legs and Push; Escape closes it and focus is back on Thursday's Add.
    3. Thursday lists Push; focus is on Thursday's Add; a live region says "Push planned on Thursday".
    4. Push says "Planned" and can't be picked.
    5. Thursday says "Nothing planned"; focus on its Add; "Push taken off Thursday" is announced.
    6. Create opens at `/setup?planOn=3&from=/plan` with ‹ Plan, and nothing has been planned.
- **In the pack:** the Add dialog starts with ‹ Back, then Make a new workout, your workouts, then the ready-made ones with their badge.

### REG-PLAN-03 · Due today

- **Stories:** PLN-2 · **Priority:** P1
- **Preconditions:** `guest()`, workouts Push and Legs, both planned on Wednesday (Push first), clock Wednesday.
- **Steps:**
    1. Open Today.
    2. Seed a finished Legs entry today at 08:00 (or run Legs), reload.
    3. Add a finished Push entry today, reload.
- **Expected:**
    1. Due today lists Push, then Legs, each with Start; Push's is the page's main button. There's no suggested next workout.
    2. Only Push is listed, with "Done today: Legs".
    3. "✓ All done: Push, Legs" in place of the list, and still **no** suggested next workout, as a week is planned (`hasHistory() && !hasPlan()` in `home.component.html`; see mismatch M4).
    4. Pressing a Start starts that workout (the workout page opens on its first step).

### REG-PLAN-04 · How this week is going, on the Plan page and Today

- **Stories:** PLN-3, PLN-4 · **Priority:** P2
- **Preconditions:** `guest()`, clock Wednesday 11 Nov. Workouts Legs, Push, Pull. Plan (no `plannedAt`): Legs Mon, Push Tue, Legs Wed, Pull Fri. History: Legs finished Mon 9 Nov 18:00.
- **Steps:**
    1. Open Today.
    2. Press **Edit plan**.
    3. On the Plan page, add Push to **Monday**.
- **Expected:**
    1. The week strip: Mon ✓ on a tinted tile, Tue an empty ring, Wed a dot and outlined as today with a bold letter, Fri a dot, the rest blank; "1 of 4 done this week · Next: Pull on Friday". Screen readers get a list, e.g. "Tuesday: Push, missed", "Wednesday, today: Legs, due today".
    2. Monday's Legs "✓ Done", Tuesday's Push "Missed" and dimmed, Wednesday's Legs "Due", Friday's Pull nothing; "1 of 3 done so far this week".
    3. Monday's Push says "From next week", dimmed, and the count doesn't change.
- **Variant:** with only Monday's workout planned today (via the UI on a Wednesday), Today says "Your plan starts next week" with its ? link, and the days show free.

### REG-PLAN-05 · The ready-made plans page, and a plan's workouts

- **Stories:** PLN-6, LIB-6 · **Priority:** P2
- **Preconditions:** `guest()`, `settings({ trainingFor: 'fitness' })`, one saved workout, nothing planned.
- **Steps:**
    1. Today → **More plans**.
    2. Turn **Only what I have** on (no equipment picked).
    3. On No equipment, 3 days' card, press the link for Tabata. Then an exercise in its What's in it. Then ‹ back twice.
- **Expected:**
    1. `/ready-made-plans`, with ‹ Today; Today stays current. The cards are in the order Fitness, 4 days, then Kettlebell, 3 days and No equipment, 3 days, then the three muscle-only plans.
    2. Only No equipment, 3 days shows, with "5 more need equipment you haven't picked."
    3. `/ready-made-plans/tabata` shows the workout's page without **Add and start** or **Add to my workouts**; the exercise opens at `/ready-made-plans/tabata/<exercise>` with ‹ and Tabata at its top; the ‹ links go back to the workout, then to the plans page where the card was.
    4. **[Known issue]** "Focus isn't put back after a page slides back": focus should land back on the Tabata link on the card. Mark that one assertion `test.fixme`.
- **In the pack:** focus is put back on the Tabata link (fixed in `aef2211`), so it's asserted rather than a fixme.

### REG-PLAN-06 · Using a ready-made plan over an existing one

- **Stories:** PLN-6 · **Priority:** P2
- **Preconditions:** `guest()`, workouts Legs and **Dumbbell upper** (a workout of your own with that title), Legs planned on Saturday.
- **Steps:**
    1. Open `/ready-made-plans`, press **Use this plan** on Dumbbells at home, 4 days.
    2. Press **Undo**.
- **Expected:**
    1. Today opens; the Undo bar says "Your week is planned: Dumbbells at home, 4 days"; Workouts gains only **Dumbbell lower** (your own Dumbbell upper is reused, not copied); the plan is upper on Mon and Thu, lower on Tue and Fri, and Saturday's Legs is off.
    2. Legs is back on Saturday, Dumbbell lower is gone, and your Dumbbell upper is still there.
- **In the pack:** the plan is `builtin:dumbbell-upper` and `builtin:dumbbell-lower` as they are, and nothing is added to your workouts (no Dumbbell lower copy).

### REG-PLAN-07 · Make a new workout for a day, and come back to the plan

- **Stories:** PLN-5 · **Priority:** P1
- **Preconditions:** `guest()`, workouts Legs and Push, nothing planned.
- **Steps:**
    1. Open `/plan`, press Add on Thursday, then **Make a new workout**.
    2. Build Sprints (one timed step of 0:30) and press **Save**.
- **Expected:**
    1. Create slides in with ‹ Plan.
    2. The Plan page slides back at `/plan?saved=<id>`; Thursday lists Sprints, pointed out; focus is on Thursday's Add; "Saved Sprints, planned on Thursday" is announced.

### REG-PLAN-08 · Add to plan from a workout

- **Stories:** PLN-1 · **Priority:** P1
- **Preconditions:** `guest()`, workouts Legs and Push, nothing planned.
- **Steps:**
    1. Open Workouts, open Legs's options (⋮) and press **Add to plan**.
    2. Choose Monday and Thursday, then press **Done**.
    3. Open Legs's Details.
    4. Press **Change days**, unchoose Monday, press Done.
    5. Press **Undo**.
- **Expected:**
    1. A dialog "Plan Legs on…" lists the seven days, none chosen, with **Done**.
    2. Each day pressed is ticked (`aria-pressed`); the dialog closes and the Undo bar says "Legs planned on Monday and Thursday".
    3. It says "On your plan: Mon, Thu".
    4. "On your plan: Thu"; the Undo bar says "Legs taken off Monday".
    5. "On your plan: Mon, Thu" again; focus on Change days; `week-plan` has Legs on Monday and Thursday.

---

## 3. Building a workout (`build-a-workout.md`, `sets-and-supersets.md`, `exercises.md`)

### REG-BLD-01 · Build and start a new workout

- **Stories:** BLD-1, BLD-3, BLD-4, BLD-5 · **Priority:** P1
- **Preconditions:** `guest()`, one workout so that Workouts shows New.
- **Steps:**
    1. Workouts → **New**.
    2. Without changing anything, look at the form.
    3. Title "Sprints". On step 1, open its kind pill ("Reps, change type of step 1") and pick **Timed**. Set its seconds to 30 (type "30" on the focused Seconds spin button, or ArrowUp). Name it "Jog".
    4. Press **+ Step** (named "Add step"); name it "Push-ups", reps 20.
    5.  - Step again; change it to Rest; 0:15.
    6. Set rounds to 3. Press **Start workout**.
- **Expected:**
    1. `/setup` slides in with ‹ Workouts; Workouts is current in the tab bar.
    2. One open rep step at 0 reps, 1 round, no error shown, and Start doesn't start it.
    3. The step becomes timed with Minutes and Seconds wheels, and focus is back on the kind pill.
    4. The new step opens (closing the others) with the cursor in its name box.
    5. The workout page opens, running "Jog" at 00:30, "round 1 of 3"; `workouts` in localStorage has Sprints with three steps in one group and `repeats: 3`, its `id` a UUID.
- **In the pack:** a step's name is its **Exercise (optional)** box (there's no separate name box), so "Jog" and "Push-ups" are typed there; Create saves each step as a group of its own; the title box is "Workout Title".

### REG-BLD-02 · Save without starting, then edit

- **Stories:** BLD-15, BLD-6, LIB-1 · **Priority:** P1
- **Preconditions:** `guest()`, workout "Legs" saved.
- **Steps:**
    1. Workouts → New. Title "Sprints", one timed step at 0:30. Press **Save**.
    2. Open Sprints' ⋮ (named "Open options for Sprints") → **Edit**.
    3. Rename it "Sprints 2" and press **Save**.
- **Expected:**
    1. `/library?saved=<id>`: Sprints is highlighted (tinted, with a bar down its left), scrolled into view, focused, and "Saved Sprints" is announced. No run bar: nothing is running.
    2. Create opens with every step collapsed; the main button says **Save & start workout**.
    3. Workouts has one Sprints 2 (no extra copy), with the same id; nothing running.
- **In the pack:** focus lands on the saved card's play button ("Start Sprints"). It's scrolled into view, on a phone too (B2, fixed 2026-11-10).

### REG-BLD-03 · What can't be saved or started

- **Stories:** BLD-1, BLD-8, BLD-15 · **Priority:** P2
- **Preconditions:** `guest()`.
- **Steps:**
    1. New workout; type a name in the rep step, leave it at 0 reps, press Start workout.
    2. Change the step to Rest at 0:20.
    3. Change it to Timed 0:45, add a Rest step left at 0:00, press Start workout.
    4. New workout with a valid step; pick **Time limit**, set it to 00:00, press Start.
- **Expected:**
    1. It doesn't start, and says "Workout needs a timed step or some reps".
    2. **Save** and Start are both disabled.
    3. It starts, and the saved workout has only the timed step (the empty rest is left out).
    4. "Time limit needs to be longer than 00:00", and nothing starts.
- **In the pack:** Start (and Save) are disabled, with "Workout needs a timed step or some reps" or "Time limit needs to be longer than 00:00" shown beside them, rather than a press saying so.

### REG-BLD-04 · Steps: move, delete with Undo, change kind, the limits

- **Stories:** BLD-5, BLD-3, BLD-4 · **Priority:** P2
- **Preconditions:** `guest()`, workout "ABC" of timed steps A, B, C (0:30 each), and a workout "Full" of 20 steps.
- **Steps:**
    1. Edit ABC. Open C, press its Move up.
    2. Delete B (named, 0:30).
    3. Press **Undo**.
    4. On A, change kind to Reps, then back to Timed.
    5. Delete every step.
    6. Edit Full.
- **Expected:**
    1. The order is A, C, B; C keeps its name and time; "Moved C to step 2" (or similar) is announced.
    2. B goes at once; the Undo bar says "Deleted Step 3, B, 00:30", with focus on Undo.
    3. B is back third.
    4. A is timed at 00:30 again.
    5. "Add a step to start." shows, and focus is on **+ Step** ("Add step").
    6.  - Step is disabled, with "That's the most steps a workout can have (20)."
- **In the pack:** a step's Move and Delete are on its open row. Deleting the only step of a new workout puts focus on + Step; deleting while an Undo bar is already showing leaves it on Undo, so the step-by-step case isn't asserted.

### REG-BLD-05 · Sets, each side and varying each set

- **Stories:** BLD-9, BLD-10, BLD-11, BLD-7 · **Priority:** P2
- **Preconditions:** `guest()`, new workout, the rep step named "Leg press" (`builtin:leg-press`), 10 reps at 40 kg.
- **Steps:**
    1. Set **Sets** to 3. Collapse the step.
    2. Open it; turn **Vary each set** on.
    3. Open Set 3's row and set reps to 8; set Sets to 4.
    4. Turn Vary each set off.
    5. Turn **Each side** on; collapse.
- **Expected:**
    1. **Rest after each set** appears at 01:00; collapsed it reads "3 × 10 @ 40 kg · rest 01:00".
    2. Three rows "Set 1 · 10 × 40 kg" … "Set 3 · 10 × 40 kg".
    3. A fourth row copies the third: "Set 4 · 8 × 40 kg".
    4. Every set is 10 again (set 1's).
    5. Collapsed, it says each side, e.g. "4 × 10 @ 40 kg each side · rest 01:00". The docs only give the form without a weight ("2 × 10 each side · rest 00:45"), so take the exact order of the weight and "each side" from `setup-step-header` before hard-coding it.
- **In the pack:** the row reads "3 × 10 @ 40 kg · rest 01:00", the set rows "Set 1 · 10 × 40 kg", and with each side "4 × 10 @ 40 kg each side · rest 01:00".

### REG-BLD-06 · Supersets and headings

- **Stories:** BLD-12, BLD-13 · **Priority:** P2
- **Preconditions:** `guest()`, new workout with Bench press (3 sets, 10 reps, rest 1:00), Seated cable row, then Dumbbell shoulder press, all linked to their built-in exercises.
- **Steps:**
    1. On Bench press, press **Join with next**.
    2. On the superset, Join with next again.
    3. On the shoulder press, press **Take out**.
    4. Press **+ Heading**, type " Warmup ", collapse all, press Save.
- **Expected:**
    1. A "SUPERSET" row heads both steps, with Rounds 3 and Rest after each round 01:00; focus is on it, and "Superset, steps 1 to 2, 3 rounds · rest 01:00: Bench press, Seated cable row" is announced.
    2. It's "GIANT SET".
    3. It's a superset again, and the shoulder press is the step after it with 3 sets.
    4. The heading is added at the end with the cursor in its box. Collapsed, the superset reads "Bench press, Seated cable row" and "3 rounds · rest 01:00", its steps hidden. Saved, `workouts` has a heading `"Warmup"` (trimmed) and the superset as one group of two steps with `rounds: 3`, `restSeconds: 60`.
- **In the pack:** + Heading adds it after the last group, and it's saved there.

### REG-BLD-07 · Time limit

- **Stories:** BLD-8 · **Priority:** P2
- **Preconditions:** `guest()`, new workout with one timed step at 0:30.
- **Steps:**
    1. Set rounds to 5; pick **Time limit**; pick **Rounds** again.
    2. Pick Time limit; set 12:30; press Start workout. End it, Done.
    3. Edit it.
- **Expected:**
    1. Time limit shows Minutes and Seconds at 20:00 and "As many rounds as you can before time's up."; back on Rounds, it's still 5.
    2. Saved with `timeLimitSeconds: 750` and `repeats: 0`; the card reads "… in 12:30".
    3. Create opens on Time limit at 12:30.

### REG-BLD-08 · Leaving with unsaved changes

- **Stories:** BLD-6 · **Priority:** P1
- **Preconditions:** `guest()`, workout "Legs".
- **Steps:**
    1. Workouts → New, then ‹ Workouts without changing anything.
    2. Edit Legs; change its title; press ‹.
    3. Press Escape. Press the Today tab. Press **Discard changes**.
    4. Edit Legs again; change the title; press the browser's Back.
- **Expected:**
    1. No question; Workouts opens.
    2. A dialog "Discard your changes?" with "Your changes to Legs haven't been saved.", focus on **Keep editing**.
    3. Escape keeps editing (still on `/setup`, the change still there). The tab bar asks again; Discard changes goes to Today, and Legs is unchanged in storage.
    4. The dialog shows again for the browser's Back (`confirmLeaving`).
- **Note:** the dialog has an untitled edited workout's wording too, "Your changes haven't been saved.", which the docs don't mention (M7).
- **In the pack:** the Discard dialog is an `alertdialog`, and names the workout as it's been changed to ("Your changes to Legs 2 haven't been saved."): see M7.

### REG-BLD-09 · Picking an exercise, its details, Browse and Swap

- **Stories:** EXR-2, EXR-11, BLD-16, BLD-14 · **Priority:** P2
- **Preconditions:** `guest()`; history with goblet squats done at 24 kg last week (`exerciseId: builtin:goblet-squat`).
- **Steps:**
    1. New workout. In step 1's **Exercise (optional)** box type "squat".
    2. Pick **Back squat**; set 10 reps at 60 kg.
    3. Press **Details**; press ‹ Back.
    4. Press **Swap**; type "goblet"; pick Goblet squat. Press Undo.
    5. Press **Browse** ("Browse exercises for step 1"); pick the Quads chip; pick Plank.
    6. Add a rep step and type "Sled drag"; pick **Make "Sled drag"**. Open the Exercises tab without saving (Discard); then do it again and Save.
- **Expected:**
    1. A list of up to 8, Back squat first (its other name is "Squat"), each with its muscles and kit, e.g. "Quads, glutes · Barbell, rack".
    2. Under the box: "Built-in exercise".
    3. A dialog titled Back squat, with its description, body map and How to do it; ‹ Back closes it and focus is back on Details.
    4. "Swap Back squat" with "Same muscles"; picking makes the step Goblet squat at **24 kg** with its 10 reps kept; the Undo bar says "Swapped to Goblet squat"; Undo puts Back squat at 60 kg back.
    5. "Browse exercises", "Pick one for step 1.", with a count that changes and is read out; picking Plank closes it, says "Step 1 is now Plank", and the step becomes **timed at 00:30**, saying "Plank is timed, so this step is now 00:30".
    6. Discarded, there's no Sled drag on the Exercises list; saved, there is, marked Your own.
- **[Known issue]** "Enter in a step's name box may save before its kind follows the exercise": Safari only. In the WebKit project, add a case pressing Enter right after typing "Plank" and mark it `test.fixme`.
- **In the pack:** the picker's options read e.g. "Back squat , Also called Squat , Quads, glutes · Barbell, rack". The "Make "Sled drag"" case isn't in the pack (REG-EXR-04 covers your own exercises). The Safari Enter case is gone: TODO.md cleared it (Safari settles the kind first).

---

## 4. Workouts library and ready-made workouts (`library.md`)

### REG-BLD-10 · A tip the first time Join with next shows

- **Stories:** BLD-12, BLD-17 · **Priority:** P2
- **Preconditions:** `guest()` with `tip-join` removed (the fixtures mark it seen), Create on a new workout (the tour of Create seen).
- **Steps:**
    1. Press **+ Step**, then open step 1 again by its row (+ Step closes it).
    2. Press **Done**.
    3. Close and open step 1 again.
- **Expected:**
    1. A card "Supersets" over the page, lighting up step 1's Join with next: "Join with next makes this step and the next a superset…", with Done and no count.
    2. It goes, focus is back on step 1's row, and `tip-join` is `seen`.
    3. No tip.

### REG-LIB-01 · No workouts of my own

- **Stories:** LIB-1, LIB-6 · **Priority:** P1
- **Preconditions:** `guest()`, no workouts.
- **Steps:** Open Workouts; press **New**.
- **Expected:** "Workouts" with **New**; "Start any of these, or make your own with New."; the 18 ready-made workouts, A to Z, each with its Ready-made badge. New opens `/setup`.
- **In the pack:** the empty list of the first version is gone: since 2026-11-06 the ready-made workouts are on the same list (LIB-6).

### REG-LIB-02 · What a card says, opening it and starting it

- **Stories:** LIB-1, LIB-4 · **Priority:** P1
- **Preconditions:** `guest()`, workouts: "Intervals" (unnamed timed 1:05, rest 0:20, 3 rounds); "Gym" (Squats `builtin:back-squat`, Bench press, Rows `builtin:barbell-row`, a rest; 1 round); "Forever" (one timed step, `repeats: 0`); "AMRAP" (Squats, Push-ups, `repeats: 0`, `timeLimitSeconds: 1200`).
- **Steps:**
    1. Open Workouts.
    2. Press the Intervals card (not its play button).
    3. Press ‹ Workouts.
    4. Press the play button named "Start Intervals".
- **Expected:**
    1. Intervals reads "01:05 - 00:20" and 3; Gym "Squats, Bench press + 1 more", with its muscles and kit tags and "3 exercises"; Forever ∞; AMRAP "Squats, Push-ups in 20:00".
    2. The workout's **details** open at `/library/<id>`; nothing starts. (library.md's acceptance criterion still says a tap starts it: mismatch M1.)
    3. Back on the list, focus is on the Intervals card (via `?details=<id>`).
    4. The workout page opens, running.
- **In the pack:** the card's text is checked as it's drawn (`01:05 - 00:20`, "Squats, Bench press + 1 more", ∞, "in 20:00"); ‹ Workouts puts focus back on the card's Details link. M1 is fixed in library.md.

### REG-LIB-03 · A workout's details

- **Stories:** LIB-4 · **Priority:** P1
- **Preconditions:** `guest()`, workout "Legs": 2 rounds, a heading "Main", Back squat 3 × 10 resting 1:00, and an unnamed 0:30 timed step; two finished runs of it in the history (Mon and Tue this week).
- **Steps:**
    1. Open `/library/<id>`.
    2. Press the Back squat line.
    3. Press ‹ Legs. Press **Edit**.
    4. Open `/library/not-a-workout`.
- **Expected:**
    1. The title; **Muscles it works** shading Quads and Glutes as Main and Hamstrings, Adductors and Lower back as Supporting; **History** "Done 2 times" and both runs, newest first, each linking to `/history?run=<id>`; **What's in it** last: "2 rounds of all of it", "Main", "Back squat 3 × 10, rest 1:00", "Work 0:30".
    2. The exercise page slides in at `/library/<id>/back-squat`, with ‹ Legs at its top; Workouts stays current.
    3. Back on the details; Edit opens Create on Legs.
    4. "Workout not found".
- **In the pack:** the runs read e.g. "Tue 10 Nov …"; What's in it is the last region.

### REG-LIB-04 · Delete from the menu, and Undo

- **Stories:** LIB-2, NAV-1 (Undo) · **Priority:** P1 · **[Clock]**
- **Preconditions:** `guest()`, workouts "Legs day" and "Arms", plus two history entries of Legs day.
- **Steps:**
    1. Open Legs day's ⋮; press **Delete**.
    2. `fastForward` 2 minutes.
    3. Press **Undo**.
    4. Delete Legs day again; press Escape.
    5. Delete Arms; open Progress.
- **Expected:**
    1. It's gone at once with no "Are you sure?"; the Undo bar says `Deleted "Legs day"`, with focus on Undo.
    2. The Undo bar is still there (no timer).
    3. Legs day is back first, focus on its ⋮.
    4. Escape closes the bar without undoing.
    5. Going to another page removes the bar. With every workout gone, Workouts shows the empty message. Legs day's history entries are still on Progress, under that title.

### REG-LIB-05 · The order: A to Z

- **Stories:** LIB-3 · **Priority:** P2
- **Preconditions:** `guest()`, workouts "Zone 2", "arms" and "Bench".
- **Steps:** Open Workouts, pick **My own**; open Bench's ⋮.
- **Expected:** arms, Bench, Zone 2 (A to Z, ignoring case); the options are Edit, Make a copy and Delete, with no Move up or down.
- **In the pack:** moving workouts went with the one list (2026-11-06); an order from another device still merges (`library-moved-at`), which is Vitest's.

### REG-LIB-06 · Missing muscle groups and the workout to fill them, on the Plan page

- **Stories:** LIB-5, LIB-7 · **Priority:** P2
- **Preconditions:** `guest()`, workouts "Squat day" (Back squat) and "Bench day" (Bench press), planned Monday and Thursday.
- **Steps:** Open the Plan page; press the Calves link.
- **Expected:** Missing muscle groups lists Biceps, Forearms, Abs, Obliques, Traps, Upper back, Abductors, Calves, Shins and Neck; What your plan works lists Shoulders, Triceps, Lower back, Adductors and Hamstrings as Supporting; Band full body is suggested, "Adds Shoulders, Biceps, Triceps and 7 more."; Calves opens `/exercises?muscles=calves` (with `&from=plan`) with the Calves chip pressed.
- **In the pack:** moved from Workouts to the Plan page on 2026-11-06, and it counts only planned workouts. Adding the suggestion to days is REG-LIB-09.

### REG-LIB-07 · Ready-made workouts: filter, look, copy, start as they are

- **Stories:** LIB-6, LIB-8 · **Priority:** P1
- **Preconditions:** `guest()`, one workout of your own.
- **Steps:**
    1. On Workouts pick **Ready-made**; under More filters turn **Only what I have** on and pick only Kettlebell.
    2. Turn it off; open **Gym legs**; press **Make a copy**.
    3. Back on Workouts, press **Start Tabata**.
    4. Open `/ready-made/gym-legs`, `/ready-made` and `/library/builtin:nope`.
- **Expected:**
    1. Only the 21 ready-made; then only those needing nothing or a kettlebell (Kettlebell AMRAP, Tabata, not Gym legs).
    2. `/library/builtin:gym-legs` with its badge, "Back squat 3 sets: 12, 10, 8, rest 2:30", Muscles it works, and Make a copy where Edit would be; the copy is "Gym legs (copy)", saved and open in Create.
    3. Tabata starts as it is: no copy in your workouts.
    4. The old addresses go to `/library/builtin:gym-legs` and `/library`; the last says "Workout not found".

### REG-LIB-08 · Deleting the workout that's running

- **Stories:** LIB-2, CTL-4 · **Priority:** P3
- **Preconditions:** `guest()`, workout "Legs" running (start it, ⌄ back).
- **Steps:** Delete Legs from its ⋮. Then reload.
- **Expected (records today's behaviour, an open question in library.md):** the run carries on in the bar until the reload, after which it's gone. If that's decided otherwise, change this test.

### REG-LIB-09 · Add to a day: the suggestion on several days at once, with Undo

- **Stories:** LIB-7, PLN-1 · **Priority:** P2
- **Preconditions:** as REG-LIB-06: "Squat day" on Monday and "Bench day" on Thursday.
- **Steps:**
    1. Open the Plan page. Under Missing muscle groups, press **Add to a day** on Band full body.
    2. Choose Tuesday and Saturday, then press **Done**.
    3. Press **Undo**.
- **Expected:**
    1. A dialog "Plan Band full body on…" lists the seven days, Monday saying "Squat day: Glutes, Quads", with **Done**.
    2. Each day pressed is ticked (`aria-pressed`); the dialog closes; the Undo bar says "Band full body planned on Tuesday and Saturday"; both days list Band full body (`builtin:band-full-body`, as it is), and another workout is suggested.
    3. Band full body is off both days and suggested again; focus is on Tuesday's Add; `week-plan` is back to Squat day and Bench day.
- **In the pack:** since 2026-11-10 it's the same dialog as a workout's Add to plan (REG-PLAN-08), and takes several days at once.

### REG-LIB-10 · A ready-made workout's reps and weights, set on its Details

- **Stories:** LIB-6 · **Priority:** P1
- **Preconditions:** `guest()`, nothing of your own.
- **Steps:**
    1. Open Gym legs's Details (`/library/builtin:gym-legs`). Under Your reps and weights, press Back squat.
    2. Set each set's Weight wheel to 60 kg, and press **Save**.
    3. Press **Start workout**.
- **Expected:**
    1. The row is "Change Back squat, 12, 10, 8"; a dialog "Back squat" opens with Set 1–3, each with Reps and Weight wheels.
    2. The dialog closes; the row is "Change Back squat, 12, 10, 8 @ 60 kg"; the Undo bar says "Back squat: 12, 10, 8 @ 60 kg"; "With your own reps and weights." shows.
    3. The workout page opens on Back squat with its Weight wheel at 60; nothing was copied into your workouts (`workouts` isn't saved).
- **In the pack, a timed exercise too:** on Core in 15 the heading is "Your reps, weights and times"; Plank ("Change Plank, 3 × 0:45") set to 0:30 for each round is "3 × 0:30", still after a reload, kept as `{ "step": 4, "exerciseId": "builtin:plank", "seconds": 30 }`.

---

## 5. Running a workout (`run-a-workout.md`, `pause-and-stop.md`, `alarms.md`)

All timer tests: `guest()`, `page.clock` installed, reduced motion, the AudioContext, vibrate and wake-lock stubs, and the workout started from its card's play button.

### REG-RUN-01 · A simple workout from start to finish

- **Stories:** BLD-1, RUN-1, RUN-2, RUN-4, ALM-1 · **Priority:** P1 · **[Clock] [Audio]**
- **Preconditions:** workout "Short": timed "Squats" 0:03, rest 0:02, 2 rounds; countdown beeps off.
- **Steps:**
    1. Start it. Read the page.
    2. `runFor` 3000, 2000, 3000, reading the page after each.
- **Expected:**
    1. Title "Short" in the header; the face shows the stopwatch icon, "Squats", "00:03"; "round 1 of 2" with two dots; "Next: Rest · 00:02"; only **Pause** and **Skip** under the ring.
    2. At 3 s it's rest ("Rest", 00:02, "then Squats · 00:03"); at 5 s round 2 with "Last round!"; at 8 s "You're finished!", with no rest after the last work, and the summary opens: "Workout finished", "Short", Time 0:08, "2 rounds", no **Back to workout**.
    3. The audio stub recorded the work alarm (880 Hz ×2) at 0 s and 5 s, the rest (440 Hz) at 3 s, and the finish (523/659/784 Hz) at 8 s; the vibrate stub recorded `[150,100,150]`, `[500]`, … in the same order.
    4. Pressing **Done** opens Progress with Short highlighted under Today: "9:00 AM · 0:08 · 2 rounds".
- **In the pack:** work 0:30 and rest 0:20 (alarms at 0, 30, 50 and 80 s), so a busy machine can't miss a phase; the log reads "9:00 AM · 2 rounds · …".

### REG-RUN-02 · Rep steps wait for Done

- **Stories:** RUN-3, RUN-2 · **Priority:** P1 · **[Clock]**
- **Preconditions:** workout: timed "Jog" 0:03, "Push-ups" (`builtin:push-up`) 10 reps at 20 kg, rest 0:10, then "Squats" 5 reps (no weight); 1 round.
- **Steps:**
    1. Start; `runFor` 3000.
    2. `fastForward` one hour.
    3. Focus nothing in particular and press Space.
    4. `runFor` 10000; press the Done pill with the mouse.
- **Expected:**
    1. The face shows "10 reps" and "20 kg" (as wheels: spin buttons "reps" and "Weight, kg"), the ring full and violet; the Done pill reads "Next: Rest · 00:10 →" and is named "Done. Next: Rest · 00:10". Pause and Skip are still under the ring.
    2. Still waiting on Push-ups.
    3. Space presses Done: rest starts from its **full** 00:10.
    4. At Squats (the last step, a rep step) it waits; it finishes only after Done. The history entry has "Push-ups: 10 reps @ 20 kg" and "Squats: 5 reps"; time spent includes the hour on the push-ups.

### REG-RUN-03 · Pause and resume

- **Stories:** CTL-1 · **Priority:** P1 · **[Clock] [Audio]**
- **Preconditions:** workout: timed "Plank" (`builtin:plank`) 0:30, rest 0:10, 1 round.
- **Steps:**
    1. Start; `runFor` 1500; press **Pause**.
    2. `fastForward` 10 minutes.
    3. Press **Resume**.
    4. Press Space; press Escape.
    5. `runFor` past the end of Plank, so the rest starts; within 500 ms press Pause and Resume.
- **Expected:**
    1. The ring greys; over it: "Plank" with its (i), "Paused · 00:29" (assert what it shows, then that it doesn't change), a big **Resume** (focused) and **End workout**. Pause and Skip are gone. "Paused" is announced.
    2. Still the same time.
    3. Focus moves to Pause; it counts on from there, not from 10 minutes later. Time spent in the history later leaves the pause out.
    4. Space pauses, Escape resumes.
    5. The rest alarm isn't played a second time on resume (the stub has one 440 Hz note).
- **In the pack:** 2 rounds, so the rest after the plank runs (the last round's would be skipped).

### REG-RUN-04 · End a workout early, go back to it, then finish with Done

- **Stories:** CTL-2, RUN-7 · **Priority:** P1 · **[Clock]**
- **Preconditions:** workout "Rounds": timed 0:10, rest 0:05, 3 rounds; a second workout "Other".
- **Steps:**
    1. Start Rounds; immediately Pause → **End workout**. Press Done.
    2. Start Rounds again; `runFor` into round 2; Pause → End workout.
    3. Press **Back to workout**.
    4. Pause → End workout → **Done**.
    5. Start Rounds, `runFor` into round 2; ⌄ back; start Other from its card.
- **Expected:**
    1. The summary says "Nothing to log: no step was done before it ended.", with no note box; Done opens Progress with nothing logged.
    2. "Workout ended", "1 of 3 rounds · stopped" with Time less pauses.
    3. The run is paused where it was ended, focus on Resume.
    4. Progress has one entry (not two), "1 of 3 rounds · stopped", highlighted.
    5. Rounds is logged as stopped and Other is running.

### REG-RUN-05 · Skip a step

- **Stories:** RUN-12 · **Priority:** P1 · **[Clock]**
- **Preconditions:** workout A: timed 0:30, rest 0:10, 2 rounds. Workout B: "Plank" (`builtin:plank`) 0:45 then rest 0:15, 1 round.
- **Steps:**
    1. Start A; `runFor` 5000; press **Skip** (named "Skip step").
    2. Press Skip again (now named "Skip rest").
    3. Start B; `runFor` 20000; press Skip.
- **Expected:**
    1. The rest starts from 00:10, and its alarm sounds at once.
    2. Round 2 starts.
    3. B finishes at once (the rest after the last step is skipped), and the history has "Plank: 0:20" and 0:20 spent.

### REG-RUN-06 · A reload carries on

- **Stories:** CTL-3, RUN-5, ALM-1 · **Priority:** P1 · **[Clock] [Audio]**
- **Preconditions:** workout: timed 0:10, rest 0:05, 2 rounds.
- **Steps:**
    1. Start; `runFor` 4500; reload.
    2. With the AudioContext stub's `state` set to `'suspended'` for this load, check the page.
    3. Pause; reload.
    4. Resume; close the page with `page.close({ runBeforeUnload: true })`; open a new page in the same context on `/history`.
    5. In a new run, reload mid-run (the reload's `pagehide` logs it as stopped), then let it run to its end.
- **Expected:**
    1. It carries on from 4.5 s (00:06 left), not from the start; no alarm already past is replayed.
    2. **Tap to turn on sound** shows, with its ? link ("Help: Why is there no sound?"); a tap anywhere makes it go.
    3. Still paused at the same point.
    4. The closed run is in the history as stopped (a new tab has its own `sessionStorage`, so there's no run bar).
    5. One entry for that run, now finished, not two.
- **In the pack:** work 0:30 and rest 0:10. A run left before any step is done logs nothing ("Nothing to log"), so the tab is closed in the rest; it's left by navigating away (its `pagehide`), then closed.

### REG-RUN-07 · Sets, sections and what's next

- **Stories:** RUN-10, BLD-9, BLD-13 · **Priority:** P2 · **[Clock]**
- **Preconditions:** workout: heading "Warmup", timed "Exercise bike" 0:05; heading "Legs", Leg press (`builtin:leg-press`) 3 × 10, rest 1:00, then Plank 0:30.
- **Steps:** Start; go through, pressing Done on each leg press set and `runFor` through the rests.
- **Expected:**
    1. On the bike: section line "Warmup · 1 of 3".
    2. Leg press set 1: "Legs · 2 of 3", "set 1 of 3" with dots; "Legs, exercise 2 of 3" announced once.
    3. Its rest: still "set 1 of 3", and "then Leg press · set 2 of 3 · 10 reps".
    4. Set 3: "set 3 of 3", with no "Last round!"; its rest says "set 3 of 3" too; then Plank, "Legs · 3 of 3". The announcement for exercise 2 isn't repeated on its sets.

### REG-RUN-08 · Change reps or weight mid-workout

- **Stories:** RUN-6 · **Priority:** P2 · **[Clock]**
- **Preconditions:** workout "Push": "Push-ups" (`builtin:push-up`) 20 reps, rest 0:05, 2 rounds.
- **Steps:**
    1. Start. Open the reps wheel on the face; set 15. Open the weight wheel ("+"); set 22.5.
    2. Press Done; `runFor` the rest.
    3. Set the weight back to none ("+").
- **Expected:**
    1. The face shows 15 and 22.5 kg; `workouts` has the step at 15 reps, `weight: 22.5`.
    2. Round 2 starts from 15 at 22.5 kg.
    3. The saved step has no weight.
- **In the pack, a ready-made workout too:** start Gym legs, set Back squat's weight to 40 kg, and reload: it's still 40, kept in `ready-made-changes` (a Known issue until 2026-11-10, found already fixed).

### REG-RUN-09 · The summary: correct a set, note, next time

- **Stories:** RUN-7, HIS-3, PRG-10 · **Priority:** P2 · **[Clock]**
- **Preconditions:** workout "Push": "Push-ups" 20 reps at 40 kg, rest 0:05, 3 rounds.
- **Steps:**
    1. Start; Done in round 1; `runFor` into round 2; Pause → End workout.
    2. Press **Change reps or weight**; set round 1's set to 18.
    3. Press **Yes, use next time**.
    4. Type a note "felt strong"; press Done.
- **Expected:**
    1. The summary lists "Push-ups: 20 reps @ 40 kg".
    2. "Use these settings next time?" appears; the history entry already has 18.
    3. "Saved: next time starts from these."; the saved step is 18 reps at 40 kg. (Run it again with **No, just this time** in a second case: the saved step stays 20.)
    4. Progress shows the entry with "felt strong" under it.

### REG-RUN-10 · A time limit, including running out during a rep step

- **Stories:** RUN-8, BLD-8, ALM-1 · **Priority:** P2 · **[Clock] [Audio]**
- **Preconditions:** workout A: timed 0:03, rest 0:02, time limit 1:04. Workout B: timed 0:03, "Push-ups" 10 reps, time limit 0:20.
- **Steps:**
    1. Start A; read; `runFor` 12000; read; `runFor` to 64 s.
    2. Start B; `runFor` 3000; wait on the push-ups past the limit (`runFor` 20000).
    3. On the summary, set the Reps wheel to 6, press **Add set**.
- **Expected:**
    1. At the start, "round 1" and "01:04 left"; at 12 s, "round 3" and "00:52 left". At 64 s it finishes: "Time's up" and "12 rounds + 1 in 1:04" (check the limit's formatting against the history's "in 20:00" style). The audio stub has ticks at 54, 61, 62 and 63 s and the finish at 64 s.
    2. "Time's up" with "Time ran out during Push-ups. How many reps did you get?" and a Reps wheel at 10.
    3. A set of 6 push-ups is logged; the score stays as it was (no "+ 1").
- **In the pack:** the summary says "12 rounds + 1 in 1:04", so M10 is settled.

### REG-RUN-11 · An exercise's details and Swap, mid-workout

- **Stories:** RUN-9, RUN-11 · **Priority:** P2 · **[Clock]**
- **Preconditions:** history: goblet squats at 24 kg last week. Workout "Legs": timed "Jog" (no exercise) 0:03, "Back squat" (`builtin:back-squat`) 10 at 60 kg, rest 0:05, 2 rounds.
- **Steps:**
    1. Start; on Jog, look for an (i). `runFor` 3000.
    2. Press the (i) named "Details of Back squat"; press Space; press ‹ Back.
    3. Open it again, press **Swap exercise**, type "goblet", pick Goblet squat.
    4. Reload.
    5. Done; `runFor` the rest; Done again (finish).
    6. On the summary's Swapped, press **No, just this time**.
- **Expected:**
    1. Jog has no (i).
    2. The details open over the workout, which still waits; Space doesn't press Done; ‹ Back closes them with focus back on the (i).
    3. "Swap Back squat", "For the rest of this workout. Sets done so far stay.", focus in **Search exercises**; after picking, the face says Goblet squat at 24 kg, the Undo bar "Swapped to Goblet squat", focus on the (i).
    4. Still Goblet squat (swaps are kept for the tab).
    5. Round 2 is goblet squats too.
    6. The summary lists "Back squat for Goblet squat"; No says "Next time it's Back squat again."; the saved workout still has Back squat at 60 kg, and there's no Next time step-up for it. The history logs the sets as Goblet squat.
- **In the pack:** the summary lists "Goblet squat: 2 × 10 @ 24 kg". Focus after the swap is on the (i), with Undo still in the bar (B1, fixed 2026-11-10), a test of its own. Type into the search only once it has focus (`WorkoutPage.swapTo()`): the dialog takes focus a moment after it opens, and on the test's clock, keys pressed sooner went to Swap exercise, leaving only "t" in the box (it failed about 1 run in 25 until 2026-11-11).

### REG-RUN-12 · Swap the next exercise while paused in a rest

- **Stories:** RUN-11 · **Priority:** P3
- **Preconditions:** workout "Pair": Back squat (`builtin:back-squat`) 10 reps at 60 kg, Rest 0:30, Deadlift (`builtin:deadlift`) 10 reps at 80 kg.
- **Steps:** Start; Done; Pause in the rest. Press the (i) beside "Rest, then Deadlift", then Swap exercise; type "romanian" and pick Romanian deadlift.
- **Expected:** paused, the ring says "Rest, then Deadlift" with an (i) named "Details of Deadlift, next". After the swap it's still paused, says "Rest, then Romanian deadlift", and focus is on "Details of Romanian deadlift, next".
- **In the pack:** a Known issue until 2026-11-10, when the paused ring got the next exercise's (i).

### REG-RUN-13 · Last time, a suggested weight, personal bests

- **Stories:** PRG-1, PRG-5, PRG-2, PRG-10, PRG-11 · **Priority:** P2 · **[Clock]**
- **Preconditions:** history last week: Back squat 10, 10, 12 at 60 kg. Workout "Squats": Back squat 3 × 10 at 60 kg, rest 0:05.
- **Steps:**
    1. Start. Read under the reps.
    2. Press **↑ Try 62.5 kg**.
    3. Done three times (with the rests) to finish.
    4. On the summary's Next time, press **Apply**.
- **Expected:**
    1. "Last time: 10, 10, 12 @ 60 kg" and a button "↑ Try 62.5 kg".
    2. The weight wheel is 62.5 kg and the button goes; the saved workout is 62.5 kg.
    3. The summary lists Personal bests with "Heaviest: 62.5 kg × 10"; Next time "Back squat: try 65 kg, up from 62.5 kg"; Muscles worked shades Quads and Glutes as main.
    4. The line says Applied, with focus on it; the saved step is 65 kg.

### REG-RUN-14 · One side at a time

- **Stories:** BLD-10, RUN-10 · **Priority:** P3 · **[Clock]**
- **Preconditions:** `settings({ eachSideFirst: 'right', switchSidesSeconds: 5 })`; workout: Side plank (`builtin:side-plank`) 0:10 each side, 1 round.
- **Steps:** Start; `runFor` 10 s, 5 s, 10 s. Midway, change Switch sides to Off in Settings.
- **Expected:** "Right side" first; then **Switch sides**, 00:05 in the rest colour; then "Left side"; then finished. The setting changed mid-run doesn't change this run (it's taken when the run starts). History: "Side plank: 0:10 each side" (or the per-side form).
- **In the pack:** changing Switch sides mid-run isn't checked.

### REG-RUN-15 · Sound, countdown beeps, vibration and the screen, mid-workout

- **Stories:** ALM-1, ALM-3, ALM-5, SET-2 · **Priority:** P2 · **[Clock] [Audio] [Device]**
- **Preconditions:** workout: timed 0:30, rest 0:10, 2 rounds; default settings.
- **Steps:**
    1. Start; `runFor` 30000.
    2. ⌄ back; You → Settings; turn **Countdown beeps** off; back to the workout; `runFor` to the end.
    3. Separately: run with **Sound** off, and with **Keep screen on** off.
    4. Pause and finish a run with Keep screen on.
- **Expected:**
    1. Ticks (660 Hz) at 27, 28 and 29 s, then the rest at 30 s.
    2. No ticks after the switch (37–39 s and 67–69 s are gone); the step alarms still play.
    3. Sound off: no notes. Keep screen on off: no wake lock requested.
    4. A wake lock is requested while running and released on pause and on finish.
- **Manual:** real beeps, vibration (Android), and the screen staying on, on a phone; alarms with the phone locked (ALM-2) don't work on iPhone (a known web limit).

---

## 6. History, on the Progress tab (`history.md`)

### REG-HIS-01 · The log

- **Stories:** HIS-1, HIS-2, HIS-5 · **Priority:** P1
- **Preconditions:** `guest()`, clock Wed 11 Nov 2026 09:00. History:
    - "Sprints", today 08:00, finished, 3 of 3 rounds, `activeSeconds` 750, sets Back squat 3 × 10 @ 60 kg.
    - "Legs", yesterday, stopped with 2 of 5 rounds done, 1200 s, sets Back squat 10 @ 60 then 8 @ 62.5 kg.
    - "Gym", Mon 9 Nov 18:00, finished, 1800 s, with a heading "Warmup" (over its first step) and a superset of Bench press and Barbell row.
    - "AMRAP", Tue 3 Nov (more than 7 days ago), finished, `totalRounds` 0, `timeLimitSeconds` 1200, `roundsCompleted` 7, `stepsIntoRound` 3.
- **Steps:** Open Progress. Then set Weight units to Pounds and open it again.
- **Expected:**
    1. "Last 7 days: 3 workouts · 1:02:30" (AMRAP is outside the last 7 × 24 hours).
    2. Under Log: "Today", "Yesterday", "Monday 9 November", then "Tuesday 3 November", newest first.
    3. Sprints: "8:00 AM · 12:30 · 3 rounds", "Back squat: 3 × 10 @ 60 kg", its name a link to `/exercises/back-squat`. Legs: "2 of 5 rounds · stopped", "Back squat: 10 @ 60, 8 @ 62.5 kg". AMRAP: "7 rounds + 3 in 20:00".
    4. Gym's lines sit under "Warmup", and its superset's under "Superset", as a list of their own.
    5. In pounds, 60 kg shows as 132.5 lb.
- **Empty state (separate case):** with no history, "Nothing here yet. Do a workout, and how your week is going and what you've done show up here." with **Go to your workouts**.
- **In the pack:** a run's line reads "8:00 AM · 3 rounds · 12:30 spent"; the empty state's link is **Go to workouts**.

### REG-HIS-02 · Notes

- **Stories:** HIS-3 · **Priority:** P1
- **Preconditions:** `guest()`, one history entry, no note.
- **Steps:**
    1. Its ⋮ → **Add note**; paste 200 characters; save.
    2. ⋮ → **Edit note**; change it; **Cancel**.
    3. ⋮ → Edit note; clear it; save.
- **Expected:**
    1. The note shows under the entry, 120 characters long.
    2. Unchanged.
    3. The note is gone; the menu offers Add note again.

### REG-HIS-03 · Delete an entry, and Undo

- **Stories:** HIS-4 · **Priority:** P1
- **Preconditions:** `guest()`, entries "Sprints" (with a note) and "Legs".
- **Steps:**
    1. Sprints' ⋮ → **Delete**.
    2. Undo.
    3. Delete it again; reload.
- **Expected:**
    1. Gone at once; the Undo bar says "Deleted Sprints" with focus on Undo.
    2. Back in place, with its note.
    3. Still gone after the reload (its deletion is kept in `deleted`).
- **In the pack:** with a workout going, the last entry's options open above its ⋮, clear of the run bar and tab bar, so Delete can be pressed (B3, fixed by `a866f45` on 2026-11-08); REG-HIS-04 seeds an older run so its entry isn't last.

### REG-HIS-04 · A deleted entry doesn't come back when its run finishes

- **Stories:** HIS-4, CTL-3 · **Priority:** P3 · **[Clock]**
- **Preconditions:** a workout of 2 rounds running; ended and taken back up, so it has an entry.
- **Steps:** ⌄ back; delete its entry on Progress; open the workout, let it finish; reload.
- **Expected:** No entry for the run, before or after the reload.
- **In the pack:** a 3-round 1:00 workout, ended in its rest and taken up again, so it has an entry and can't finish while the test deletes it.

---

## 7. Progress (`progress.md`)

### REG-PRG-01 · Muscles worked this week

- **Stories:** PRG-6, PRG-8 · **Priority:** P2
- **Preconditions:** `guest()`; history in the last 7 days: two sets of Back squat and one of Bench press; a Plank 9 days ago.
- **Steps:** Open Progress. Then You → Profile → Training for **Fitness**, and open Progress again.
- **Expected:**
    1. "Muscles worked this week" with the body map and 18 bars, starting Glutes (2 sets, under 10), Quads (2 sets, under 10), Adductors (1 set, under 4).
    2. Under Fitness the aims move down (the Profile hint says 6 to 12 sets a week).

### REG-PRG-02 · An exercise's progress, and its card on the list

- **Stories:** PRG-3, PRG-4 · **Priority:** P2
- **Preconditions:** `guest()`, clock Wed 11 Nov. History of Back squat: 100 kg × 5 on 1 Nov; 80 kg × 10 then 60 kg × 12 on 9 Nov; and 5 lighter sessions in August and September (all under 80 kg and under 10 reps), so there are 7 and the latest is 9 Nov.
- **Steps:**
    1. Open Exercises; find Back squat's card.
    2. Open it; read Progress.
    3. Focus the chart; press Home, ArrowRight.
    4. Pick **4 weeks**; then **Show as a table**.
    5. Press **Show all 7**.
    6. Switch to pounds.
- **Expected:**
    1. The card says "Latest 10 @ 80, 12 @ 60 kg · 9 Nov" (the history's set wording) and "Best 100 kg".
    2. Bests: Heaviest "100 kg × 5", Estimated one-rep max "116.5 kg" from 100 kg × 5, Most reps "12 @ 60 kg"; a chart "Estimated one-rep max".
    3. Focus starts on the latest point, read out as value, date and workout; Home goes to the first.
    4. Two points (1 Nov and 9 Nov); the table lists date, workout and value.
    5. All seven sessions, each linking to `/history?run=<id>`.
    6. Heaviest reads "220.5 lb × 5".
- **Not done yet:** an exercise never done says "Nothing logged yet. Do it in a workout and its bests and progress show up here."
- **In the pack:** the bests read "100 kg × 5", "116.5 kg from 100 kg × 5" and "12 @ 60 kg" (with the date); 4 weeks has two workouts, and Show as a table swaps the chart for a table of them.

### REG-PRG-03 · The suggested next workout on Today

- **Stories:** PRG-9 · **Priority:** P2
- **Preconditions:** `guest()`, workouts Legs (Back squat) and Push (Bench press), nothing planned, two sets of back squats this week.
- **Steps:** Open Today; press the suggestion's Start.
- **Expected:** Under the week: Push, "For Chest (0 of 10 sets), the least worked this week."; Start starts Push. With a plan this week the card isn't there (REG-PLAN-03).

### REG-PRG-04 · The week's exercises, with their new bests

- **Stories:** PRG-13 · **Priority:** P2
- **Preconditions:** `guest()`, clock Wed 11 Nov. History on 10 Nov: Back squat 2 × 10 at 62.5 kg, a 1:00 Plank, and Dumbbell lunge 2 × 10 each side; on 2 Nov (9 days before): Back squat 10 at 60 kg and a 0:45 Plank.
- **Steps:** Open Progress; read Exercises this week; press Back squat.
- **Expected:**
    1. Three rows, those with a new best first: Back squat, "20 reps in 2 sets", "New best, heaviest: 62.5 kg for 10 reps"; Plank, "1 minute in 1 set", "New best, longest: 1 minute"; then Dumbbell lunge, "20 reps each side in 2 sets", with no best, as it's the first time.
    2. Back squat goes to `/exercises/back-squat`.
- **In the pack:** as above (the screen reader wording, which says the same as what's shown).

---

## 8. Exercises (`exercises.md`)

### REG-EXR-01 · The list: search, muscles, equipment

- **Stories:** EXR-6, EXR-8 · **Priority:** P1
- **Preconditions:** `guest()`.
- **Steps:**
    1. Open Exercises.
    2. Search "press-up".
    3. Clear the search; press the **Quads** chip, then Glutes on the body map.
    4. Open a card; press ‹ Exercises; press the browser's Back and Forward.
    5. Turn **Only what I have** on with nothing picked; then pick Barbell and Rack.
    6. Search "zzzz"; press **Clear search and filters**.
    7. Open `/exercises?muscles=quads,notamuscle`.
- **Expected:**
    1. "Exercises" with **New**; "117 exercises" (read the number from `BUILT_IN_EXERCISES` rather than hard-coding it), A to Z.
    2. Push-up first, saying "Also called Press-up".
    3. The address is `/exercises?muscles=quads,glutes`; both chips pressed, both shaded on the map and listed with × buttons; the count drops and is read out.
    4. The exercise page keeps the muscles for its ‹ link: the list comes back still filtered.
    5. Only no-equipment exercises; then barbell-and-rack ones too ("My equipment: 2 pieces").
    6. "No exercises match." then everything back.
    7. Only Quads picked; the unknown one is ignored.
- **In the pack:** the count is read from the page's status ("117 exercises") rather than hard-coded; the body map's Glutes is pressed by its keys, as a click in the middle of its box lands on the drawing around the shape.

### REG-EXR-02 · An exercise's page and its demo

- **Stories:** EXR-7, EXR-8, EXR-13 · **Priority:** P1
- **Preconditions:** `guest()`. Run once with reduced motion and once without.
- **Steps:**
    1. Open `/exercises/back-squat`.
    2. Without reduced motion: press **Pause the demo**, then **Play the demo**.
    3. Open `/exercises/plank`, `/exercises/inverted-row` and `/exercises/nope`.
- **Expected:**
    1. ‹ Exercises; "Back squat"; chips for its kit and **Reps**; the description; **Add to workout** and **Add note**; Muscles worked with Quads and Glutes as Main, Hamstrings and Lower back as Supporting; How to do it with numbered steps and Tips. With reduced motion, the demo shows its stills side by side, labelled "Standing" and "Bottom", with no Pause.
    2. Pause becomes Play and back. (The 3D figure needs WebGL: headless Chromium falls back to software rendering, which is slow, so keep this to one page; CLAUDE.md warns the 3D demos starve other tests of frames.)
    3. Plank's demo is one still labelled "Hold" with no Pause; inverted row's kit reads "Barbell and rack, Smith machine, or rings"; the last says "Exercise not found" with a link to all exercises.
- **Manual:** dragging the 3D figure and **Turn the figure**; the look of the figure.
- **In the pack:** the 3D figure is played and paused once without reduced motion; dragging and turning it are a manual `test.skip`.

### REG-EXR-03 · Notes, and hiding from the picker

- **Stories:** EXR-10, EXR-2 · **Priority:** P2
- **Preconditions:** `guest()`.
- **Steps:**
    1. On Back squat's page, **Add note**: "Pause at the bottom"; save.
    2. On Plank's page, **Hide from the picker**.
    3. Open Exercises; scroll to the end.
    4. In Create, type "plan" in a timed step's box; then "plank".
    5. Start a workout with a Back squat rep step.
- **Expected:**
    1. "Your note" shows under the description; the button is **Edit note**; focus is back on it after the dialog closes.
    2. "Hidden from the picker in Create."; the button says **Show in the picker**.
    3. Plank isn't in the main list; "Hidden from the picker (1)" opens it.
    4. "plan" doesn't offer Plank; "plank" does.
    5. The note "Pause at the bottom" shows under the ring.

### REG-EXR-04 · Your own exercises: make, rename, delete

- **Stories:** EXR-9, EXR-3 · **Priority:** P2
- **Preconditions:** `guest()`.
- **Steps:**
    1. Exercises → **New** ("New exercise"); name "Sled push"; tap the quads on the figure in the dialog once; save.
    2. Use it in a workout "Legs" and run one set to the history; then press **Delete** on its page.
    3. Take it out of Legs (edit, save); press Delete.
    4. Make another, "Sled drag", in no workout and never done; Delete it; press Undo.
    5. Rename Sled push to "Prowler push" with Edit.
- **Expected:**
    1. Its page opens, marked Your own, with Quads as main, "No how-to steps or tips yet. Add them with Edit." and no demo.
    2. "Sled push is in Legs, so it can't be deleted. Take it out of that workout first, or hide it from the picker."
    3. It's in the history, so it's hidden instead: "Sled push is in your history, so it's hidden from the picker instead", with Undo.
    4. It's deleted, the list shows with "Deleted Sled drag" and Undo; Undo opens its page again.
    5. The history line now says "Prowler push".
- **In the pack:** made, deleted with Undo, renamed with Edit; one in a workout can't be deleted; one in the history is hidden instead. The renamed history line isn't checked.

### REG-EXR-05 · Add an exercise to a workout from its page

- **Stories:** EXR-12 · **Priority:** P2
- **Preconditions:** `guest()`, workouts "Legs" (6 steps) and "Arms" (20 steps).
- **Steps:**
    1. Back squat's page → **Add to workout**. Press Escape. Open it again.
    2. Pick Legs.
    3. Reload.
    4. Go back, and pick **New workout** instead; then on Plank's page, New workout.
- **Expected:**
    1. "Add Back squat to", "It goes at the end with 3 sets, to change before you save.", focus on **New workout**; Arms says "Full, 20 steps" and can't be picked. Escape closes it with focus on Add to workout.
    2. Create opens on Legs with Back squat as step 7, 3 × 10, rest 1:00, open and focused, and "Added Back squat, step 7" announced; the back link says ‹ Exercise. Nothing is saved yet (the saved Legs still has 6 steps).
    3. Legs opens as saved, without Back squat added again (`add` is gone from the address).
    4. A new workout with only Back squat; Plank's is 3 × 0:30.

### REG-EXR-06 · The tour of an exercise's page

- **Stories:** EXR-6, EXR-10, EXR-12, EXR-13 · **Priority:** P2
- **Preconditions:** `guest()` with `tour-exercise` removed (the fixtures mark it seen).
- **Steps:** From the Exercises list, open Back squat. Press Next three times, then Done. Then open Plank.
- **Expected:** "1 of 4", then Add to workout, Your note, Muscles worked and How to do it; after Done the card's gone, focus is on the name "Back squat", and `tour-exercise` is `seen`. Plank's page opens with no tour.

---

## 9. Settings and profile (`settings.md`)

### REG-SET-01 · Theme

- **Stories:** SET-1 · **Priority:** P1
- **Preconditions:** `guest()`. A second case seeds `settings` as `"not json"`.
- **Steps:**
    1. Open You → Settings.
    2. Pick **Light**. Reload.
    3. Pick **System**; `page.emulateMedia({ colorScheme: 'dark' })`, then `'light'`.
- **Expected:**
    1. Settings slides in with ‹ You; Theme is **Dark**; Sound, Countdown beeps, Vibration and Keep screen on are on (where the device supports them); You is current.
    2. The page turns light at once (body background and `<meta name="theme-color">` change); after reload it's still Light.
    3. The app follows the device each time, without a reload.
    4. With broken saved settings, the app loads with the defaults.

### REG-SET-02 · Alarm previews, and what the device can't do

- **Stories:** SET-3, SET-2, ALM-3 · **Priority:** P2 · **[Audio] [Device]**
- **Preconditions:** `guest()`, Sound off. A second case without `navigator.vibrate` and `navigator.wakeLock`.
- **Steps:** Press Play on each of Timed, Rest, Finish, Countdown ("Play the rest alarm" and so on).
- **Expected:** The audio stub records each alarm at once, even with Sound off (Rest is one 440 Hz note). Without the APIs, Vibration is disabled saying "This device can't vibrate" and Keep screen on "This browser can't keep the screen on".
- **In the pack:** previews are checked by the notes the audio stand-in records.

### REG-SET-03 · Profile: name, sex, units, training for

- **Stories:** SET-7, SET-5, SET-4, PRG-8, BLD-7 · **Priority:** P1
- **Preconditions:** `guest()`, clock 19:00. A workout with a rep step at `weight: 61.235`, and one at `20.412`.
- **Steps:**
    1. You → Profile: type " Sam " in Name; tab away. Open Today.
    2. Pick Sex **Female**; reload; open an exercise's page.
    3. Pick **Pounds**. Open the workout in Create; start it.
    4. In Create, set a new rep step's weight to 135 lb and save. Edit the 20.412 workout's title only and save.
    5. Pick Training for **Fitness**.
- **Expected:**
    1. The box shows "Sam"; Today says "Good evening, Sam".
    2. Female is still chosen; the body map draws the female figure (the 3D demo stays male for now, see TODO).
    3. The weight shows as 135 lb in Create ("Weight (lb)") and on the workout face.
    4. The new step is saved as 61.235 kg; the 20.412 kg step is still exactly 20.412.
    5. The hint says 6 to 12 sets a week.

### REG-SET-04 · About, privacy and terms

- **Stories:** SET-6 · **Priority:** P3
- **Preconditions:** `guest()`.
- **Steps:** On You, find About; press **Privacy notice**, ‹ You, **Terms of use**, ‹ You.
- **Expected:** The logo, "Loop Workouts: build a workout, then let it loop.", a `mailto:dan@loopworkouts.com` link with the subject "Loop Workouts feedback"; `/privacy` and `/terms` slide in with ‹ You and You current.

---

## 10. Your data, offline and the device (`backup-and-sync.md`, `data.md`)

### REG-DATA-01 · Export a backup

- **Stories:** SYN-1 · **Priority:** P1
- **Preconditions:** `guest()`, clock 11 Nov 2026; 2 workouts, 5 history entries, one deleted workout in `deleted`, a note on Back squat, Plank hidden, a plan.
- **Steps:** You → **Export backup**; catch the download.
- **Expected:** A file `loop-workouts-2026-11-11.json`; "Backup saved as loop-workouts-2026-11-11.json." under the buttons; the JSON has `app`, `version`, both workouts, all 5 history entries (the history is read from IndexedDB, so this proves the wait for it), the deletion, the note, the hidden exercise, the plan and the settings.

### REG-DATA-02 · Import a backup, and the AI prompt

- **Stories:** SYN-2, SYN-6 · **Priority:** P1
- **Preconditions:** `guest()`, Dark theme, workout "Legs". Fixture files: (a) a backup with 2 workouts not here and `settings.theme: "light"`; (b) a text file; (c) `{"app":"something-else"}`; (d) a backup with `version` above the app's; (e) a hand-written file with workout "Legs 2" (8 reps "Back squat", 30 s "Sled push"), no ids, no history, and an exercise "Sled push".
- **Steps:**
    1. **Import backup** with (a) via `setInputFiles` on the hidden file input.
    2. Press **View workouts** in the bar.
    3. Import (b), (c), (d).
    4. Import (e) twice.
    5. Press **Copy AI prompt**; read the clipboard.
- **Expected:**
    1. "Added 2 workouts." under the buttons and in the bar at the bottom, with **View workouts**; the theme stays Dark.
    2. Workouts opens, with the two new ones; the bar goes.
    3. (b) "That file couldn't be read. Is it a Loop Workouts backup?"; (c) "That file isn't a Loop Workouts backup."; (d) "That backup is from a newer version of Loop Workouts. Update the app and try again." Nothing changes.
    4. "Legs 2" is added with step 1 linked to `builtin:back-squat` and step 2 to a new own exercise "Sled push"; the second import adds nothing.
    5. "Prompt copied. Paste it into an AI chat, then add your plan."; the clipboard text ends with "MY PLAN" and names built-in exercises.
- **In the pack:** files are picked through the Import backup's file chooser, made in the test.

### REG-DATA-03 · Clear this device

- **Stories:** SYN-9 · **Priority:** P1 · **[Clock]**
- **Preconditions:** `guest()` with workouts, history, Light theme; a workout running. A second page in the same context open on `/history`.
- **Steps:**
    1. You → **Clear this device**. Press **Cancel**.
    2. Press it again, then **Clear everything**.
    3. Look at the second page. Open Today.
- **Expected:**
    1. The warning ("This removes your workouts, history, exercises and settings from this device. It can't be undone, …") with **Clear everything** and Cancel, focus on the warning; Cancel puts it back on the button and nothing changes.
    2. The app restarts empty on `/account`; the theme is back to Dark; there's no run bar, and the running workout isn't in the history.
    3. The other page has restarted empty too. Today opens the welcome screen.

### REG-DATA-04 · Working with no connection, as a guest

- **Stories:** SYN-4 · **Priority:** P1 · **[Clock]**
- **Preconditions:** `guest()`; the Supabase route set to fail the test if called.
- **Steps:**
    1. Load the app and open each tab once (so the lazy pages' code is loaded).
    2. `context.setOffline(true)`.
    3. Build and save a workout; run it to the end (fake clock); add a note; change the theme; plan it on Thursday.
    4. Go back online and reload.
- **Expected:**
    1. Every step works offline; nothing waits on the network.
    2. After the reload everything made offline is there.
    3. No request to Supabase at any point (a guest never loads its code).
- **Note:** there's no service worker, so the app can't be **opened** offline: a reload while offline fails. That's expected today, and why step 4 goes back online first. A page not yet opened before going offline can't load its code either; record that as expected, or note it if a service worker comes.
- **In the pack:** each page's code is loaded by going to it in the app (a full page load would drop the rest), then the device goes offline.

### REG-DATA-06 · An old device brought up to date, linked to the built-in exercises

- **Stories:** EXR-4 · **Priority:** P1
- **Preconditions:** `guest()`, `data-version` 2, and a workout "Squat day" saved as version 2 did: a list of `steps`, one rep step named "Back squat" with no `exerciseId`.
- **Steps:** Open its Details (`/library/squat-day`).
- **Expected:** Its muscles show (not "None of its steps is an exercise yet."); the saved step's `exerciseId` is `builtin:back-squat`; no exercise of your own was made (`exercises` isn't saved); `data-version` is 5.
- **In the pack:** the built-in exercises aren't in the first download, so this device loads them before the app starts (`prepareSavedData()`); without them, the conversion would make an exercise of your own called Back squat.

### REG-DATA-05 · Years of history

- **Stories:** SYN-5 · **Priority:** P3
- **Preconditions:** `guest()`; 600 history entries via `history-pending`.
- **Steps:** Open Progress; reload.
- **Expected:** All 600 are kept after the reload (count the entries, or export and count); the page opens within a few seconds on the phone viewport.

---

## 11. Account and sign-in, with Supabase stubbed (`backup-and-sync.md`)

How to stub: `page.route('https://cpgacyzlfyskifzhkotu.supabase.co/**', handler)`, answering as GoTrue and PostgREST do:

- `POST /auth/v1/otp` → `200 {}` (assert the body's `email`), or `429` for too many.
- `POST /auth/v1/verify` → `200` with a session (`access_token`, `refresh_token`, `expires_in`, `token_type: "bearer"`, `user: { id, email }`), or `403` for a bad code.
- `GET /auth/v1/user` → the user.
- `POST /rest/v1/rpc/pull_records` → `{ "now": <ms>, "records": [...] }` (see `readPage()` in `sync/sync.service.ts` and `supabase/schema.sql`); `POST /rest/v1/rpc/push_records` → a number (the server's time); `POST /rest/v1/rpc/delete_my_account` → `204`.
- `GET /auth/v1/authorize?provider=google…` → abort, or fulfil with a redirect back to `/account#error=access_denied&error_description=…`.
- An alternative is a test build that provides the fake `ACCOUNT_CLIENT` from `shared/testing/`, but routing exercises the real client, which is what broke last (CSP, redirects).

### REG-ACC-01 · Signing in by email: validation and errors

- **Stories:** SYN-3, SYN-10 · **Priority:** P1
- **Preconditions:** `guest()`, stub as above.
- **Steps:** 0. Open You. Type "me@example.com" and press **Email me a sign-in link** without ticking the consent box; then tick it.
    1. Empty the field and press **Email me a sign-in link**.
    2. Type "nope"; press it.
    3. With `otp` answering 429, type "me@example.com"; press it.
    4. With `otp` aborted (offline), press it.
- **Expected:** 0. "Tick the box to agree before signing in." under the box, focus on it, no request; ticked, the message goes. (Every sign-in below ticks it first; Continue with Google unticked does the same and goes nowhere.)
    1. The signed-out text, **Continue with Google** (no Apple button), "or", Email. "Enter your email address." on the field, focus on it; no request sent.
    2. "That isn't an email address. Check it and try again."; no request.
    3. "Too many sign-in emails for now. Wait a while, then try again."
    4. "The email couldn't be sent. Check your connection and try again."

### REG-ACC-02 · Signing in with the code

- **Stories:** SYN-3, SYN-4 · **Priority:** P1
- **Preconditions:** `guest()` with workout "Legs"; stubs answering `otp`, `verify` and an empty pull.
- **Steps:**
    1. Type " me@example.com " and press Email me a sign-in link.
    2. Type "12a" as the code; press **Sign in**.
    3. With `verify` answering 403, type 123456; Sign in.
    4. With `verify` answering 200, Sign in again.
    5. Open You.
- **Expected:**
    1. The request's email is trimmed; "We've sent a sign-in link to me@example.com. Open it on this device, or type the code from the email here." with focus on it; Code, Sign in, **Use another email**.
    2. "The code is the number in the email, e.g. 123456."
    3. "That code didn't work: it may be wrong, or expired. Check it, or send another email."
    4. Today opens with "Signed in as me@example.com." in the bar; `pull_records` then `push_records` are called, and the push includes Legs.
    5. "Signed in as me@example.com.", what syncs, and "Synced at <time>.", **Sign out** and **Delete account**.

### REG-ACC-03 · Google, and links that come back with an error

- **Stories:** SYN-7, SYN-3 · **Priority:** P2
- **Preconditions:** `guest()`.
- **Steps:**
    1. Press **Continue with Google** with the authorize request aborted.
    2. Open `/account#error=access_denied&error_description=cancelled`.
    3. Open `/account#error=access_denied&error_code=otp_expired&error_description=expired`.
    4. Open `/home#error=access_denied&error_code=otp_expired` (landing on the wrong page).
- **Expected:**
    1. "Going to Google…", then the browser goes to the authorize URL; aborted, "Couldn't reach Google. Check your connection and try again."
    2. "Signing in didn't finish. Try again, or sign in another way." above the buttons; the error is taken out of the address.
    3. "That sign-in link has expired or was used already. Send yourself another."; the address is cleaned.
    4. It goes on to `/account` (`sendSignInToAccount()`) and shows the same message.
- **Manual:** a real Google sign-in on the Vercel preview (TODO: CSP check on an iPhone).

### REG-ACC-04 · Signing in from the welcome screen, with and without a profile

- **Stories:** NAV-3, NAV-4, SET-7 · **Priority:** P1
- **Preconditions:** empty storage; stubs for `otp`, `verify`. Case A: pull returns no profile record. Case B: pull returns a `profile` record (name "Sam", Fitness, lb).
- **Steps:** On the welcome screen, sign in with the code.
- **Expected:** "Getting your profile…" shows (a status). A: the setup asks its questions from question 1. B: Today opens with "Good morning, Sam", asking nothing, and You → Profile shows Fitness and Pounds. (A slow pull, over 8 s by `page.clock`, makes it ask anyway.)
- **In the pack:** the slow pull (over 8 s) isn't in the pack.

### REG-ACC-05 · Signing out

- **Stories:** SYN-3, SYN-8 · **Priority:** P1
- **Preconditions:** `signedIn('me@example.com')`, workouts and history here, Light theme, name "Sam"; stubs answering pull and push.
- **Steps:**
    1. You → **Sign out**.
    2. Open Today.
    3. Case B: offline (`push_records` aborted) with a change not synced; press Sign out; **Cancel**; Sign out again; **Sign out anyway**.
    4. Case C: `GET /auth/v1/user` and the token refresh answer 401 on load.
- **Expected:**
    1. "Syncing before signing out…", then the app reloads on You with "Signed out. Your data was removed from this device; your account keeps it."; no workouts or history; the theme is still Light; the name is gone; the auth token, `sync` and `synced-at` keys are gone.
    2. The welcome screen opens.
    3. "Some changes on this device haven't synced, maybe because you're offline. …" with **Sign out anyway** and Cancel; Cancel leaves you signed in with focus back on Sign out; Sign out anyway signs out and removes the change.
    4. The device is cleared (settings kept) and says "You were signed out, so your data was removed from this device. Signing in again brings back what your account has."
- **In the pack:** "signed out by the server" is a session that's expired and whose refresh is turned down (GoTrue's 400), as the app doesn't check a saved session that's still in date.

### REG-ACC-06 · Deleting the account, and sync status

- **Stories:** SYN-8, SYN-4 · **Priority:** P2
- **Preconditions:** `signedIn(...)`, stubs.
- **Steps:**
    1. Press **Delete account**; **Cancel**.
    2. With `delete_my_account` failing (500), press Delete account → **Delete my account**.
    3. With it succeeding, again.
    4. Separately: signed in, go offline, edit a workout, look at You; go online.
    5. With `pull_records` answering 500, reload You.
- **Expected:**
    1. The warning ("This deletes your account and everything of yours, …") with focus on it; Cancel puts focus back on Delete account and calls nothing.
    2. "Your account couldn't be deleted. Check your connection and try again.", still signed in.
    3. `delete_my_account` is called; the app reloads saying "Your account has been deleted, and its data removed from this device."; settings kept.
    4. "You're offline: it'll sync when you're back online."; back online, a `push_records` call carries the edited workout.
    5. "It couldn't sync just now, and will try again in a minute."

### REG-ACC-07 · Consent to keeping notes that may mention health

- **Stories:** SYN-10 · **Priority:** P1 (asked and agreeing), P2 (shown, and not looked up)
- **Preconditions:** `signedIn(...)`; `give_health_consent` and `my_health_consent` stubbed, keeping the consent as the server does. Signing in with the tick (REG-ACC-02) saves it with `notice_date` set to the privacy notice's date (2026-11-10), and You then says when.
- **Steps:**
    1. With none on record, open You. Press **Agree** unticked.
    2. Offline, tick and press Agree.
    3. Online, press Agree.
    4. Separately, with consent on record from 9 Nov, open You; then reload with the lookup failing.
- **Expected:**
    1. "Notes you write may mention your health, which needs your consent to keep them with your account.", the tick and Agree; "Tick the box to agree.", focus on the box.
    2. "That couldn't be saved. Check your connection and try again."
    3. "On 11 November 2026 you agreed that notes you write, …", with focus on it; the tick and Agree go.
    4. "On 9 November 2026 you agreed … (under the privacy notice of 8 November 2026). To withdraw, delete those notes, or your account."; with the lookup failing, nothing about consent, and no Agree.

---

## 12. Accessibility at journey level (`accessibility.md`)

### REG-A11Y-01 · axe on each main page, in both themes

- **Stories:** A11Y-1 · **Priority:** P1
- **Preconditions:** `guest()` with seeded workouts, history and a plan; `@axe-core/playwright`. Exclude a closed wheel's off-screen numbers, as `a11y.spec.ts` does.
- **Steps:** For Dark and Light, run axe (WCAG 2.1 A and AA tags) on: the welcome screen, a setup question, Today (Get started, then with a week), Plan with its Add dialog open, Workouts, a workout's details, Create with an open step, the workout page running, paused and on a rep step, the summary, Progress, Exercises, an exercise page, Ready-made workouts, Ready-made plans, You (signed out), Settings and Help.
- **Expected:** No violations. Keep it to one pass per page (the full state sweep is `a11y.spec.ts`), so the pack stays quick.
- **In the pack:** axe (WCAG 2.1 A and AA, and best practice, document rules included) on each page in both themes; the Ready-made workouts page is gone (the one list).

### REG-A11Y-02 · Dialogs: where focus starts, Escape, ‹ Back, a tap outside

- **Stories:** A11Y-1 · **Priority:** P1
- **Preconditions:** `guest()` with workouts.
- **Steps:** For each of: Plan's Add (start: first option), an exercise's Add to workout (New workout), Create's Details (‹ Back), Create's Swap and Browse (the search box), the Discard dialog (Keep editing), and the mid-workout details and Swap dialogs:
    1. Open it with the keyboard; note `document.activeElement`.
    2. Press Tab past the last control.
    3. Close it with Escape; reopen and close with ‹ Back (or ✕); reopen and click the backdrop.
- **Expected:**
    1. Focus starts on the element named.
    2. Focus stays inside the dialog.
    3. Each way closes it and puts focus back on the button that opened it (the mid-workout ones on the (i)). For the workout page, Escape only closes the dialog: it doesn't also resume or pause the run.
- **In the pack:** focus starts on the exercise details dialog's title (both in Create and mid-workout); a phone shows Browse full screen, so there's no outside to tap.

### REG-A11Y-03 · A workout with only a keyboard

- **Stories:** A11Y-1, CTL-1, RUN-3 · **Priority:** P1 · **[Clock]**
- **Preconditions:** `guest()`, workout "Push": "Push-ups" 10 reps, rest 0:05, 2 rounds.
- **Steps:**
    1. On Workouts, Tab to "Start Push"; Enter.
    2. Press Space (Done); Space again during the rest (pause); Escape (resume).
    3. Press Shift+Space; hold Space down (repeat).
    4. Tab to the reps wheel on the face in round 2; press ArrowUp, then Space.
- **Expected:**
    1. The run starts.
    2. Done, then Paused with focus on Resume, then resumed with focus on Pause.
    3. Shift+Space is ignored; a held Space toggles once.
    4. ArrowUp changes reps to 11; Space on the wheel doesn't press Done.
- **In the pack:** Shift+Space is checked with nothing focused, as a focused button takes Space (and Shift+Space) itself. A held Space pauses once, and its repeats are swallowed till it's let go (B4, fixed 2026-11-10).

### REG-A11Y-04 · Reduced motion

- **Stories:** A11Y-1, EXR-13 · **Priority:** P2 · **[Clock]**
- **Preconditions:** `guest()`, workout timed 0:20, rest 0:10. Contexts with `reducedMotion: 'reduce'` and `'no-preference'`.
- **Steps:** Start; `runFor` 16 s (into the last 5 s); then into the rest. Read `document.getAnimations()`. Also: switch theme; open an exercise page.
- **Expected:** With reduce, no animation with infinite iterations runs (no "Next:" pulse, no face flare, no breathing in rest), the theme changes without a fade (no view transition), and the exercise page appears without sliding. With no-preference, the "Next:" pulse is running in the last 5 s (a sanity check that the test can see it).

### REG-A11Y-05 · What screen readers hear during a run

- **Stories:** A11Y-1, RUN-1 · **Priority:** P2 · **[Clock]**
- **Preconditions:** `guest()`, workout unnamed timed 0:03, rest 0:02, 3 rounds. A `MutationObserver` on the live regions, added by `addInitScript`, records each text.
- **Steps:** Start; `runFor` to the end; pause and resume once in round 2.
- **Expected:** "Timed, round 1 of 3", "Rest", "Timed, round 2 of 3", "Paused", the phase it's back in, …, "Timed, last round", "Finished", and nothing every second in between.

### REG-A11Y-06 · Phone widths, both themes, touch targets

- **Stories:** A11Y-1, NAV-5 · **Priority:** P2
- **Preconditions:** `guest()` with seeded data. Viewports 320 × 640 and 390 × 844; Dark and Light.
- **Steps:** Visit each main page (as REG-A11Y-01's list), including the workout page with a long name ("Single-leg Romanian deadlift").
- **Expected:** No horizontal scroll (`scrollWidth <= innerWidth`); the last content scrolls clear of the tab bar and run bar; the long name fits in up to three lines, never below 70% size. Small controls (the (i), ? links, chips, step-kind pill) take a press 44px across: `document.elementFromPoint` 20px out from their centre still hits them. Optional: screenshot comparisons per page and theme, reviewed by eye, as CLAUDE.md asks for any visual change.
- **In the pack:** on the phone project only. The long name's lines and its size aren't measured; the touch targets checked are a ? link, the step-kind pill and the step's (i).

---

## 13. Touch gestures and dragging

### REG-GES-01 · Swipe back, and swiping the run bar to end

- **Stories:** NAV-1, CTL-2 · **Priority:** P3 · **[Gesture]**
- **Preconditions:** `guest()`, `hasTouch: true`, reduced motion off; a workout running.
- **Steps:**
    1. On Exercises → Back squat, swipe right past halfway; then a short slow swipe.
    2. On Progress, swipe the run bar right past halfway; then (with a new run) a short swipe; then drag it with the mouse.
- **Expected:**
    1. Past halfway the page slides off and the list is back; short, it springs back and stays.
    2. Past halfway: the bar slides off, the workout ends and its summary opens, with Back to workout. Short: it springs back and the run carries on. A mouse drag does nothing.
- **Manual (Known issues):** "Try a tap and a swipe mid page-slide on an iPhone" and "Try the summary's drag from its content on an iPhone": both tested only in Chromium; keep them as manual Safari checks.

### REG-GES-02 · Library cards: swipe to delete, hold for options

- **Stories:** LIB-2, LIB-3 · **Priority:** P3 · **[Gesture]**
- **Preconditions:** `guest()`, `hasTouch: true`, three workouts.
- **Steps:**
    1. Swipe a card left past halfway; Undo. Swipe it left a little and let go slowly.
    2. Hold a card still for over half a second, then let go without moving.
- **Expected:**
    1. Deleted with the Undo bar, and back on Undo; the short swipe springs back. Neither starts the workout or opens its details.
    2. It lifts, then its options open; it doesn't start or open.
- **In the pack:** touch by Chromium's touch events with their own times, so the speed is the test's, not the machine's. The unit tests' swipes give their events times too (`GestureClock` in `shared/testing/gesture-clock.ts`), fixed 2026-11-11.

### REG-GES-03 · Dragging to reorder: library cards and Create's steps

- **Stories:** LIB-3, BLD-5, BLD-12 · **Priority:** P3 · **[Drag]**
- **Preconditions:** `guest()`; workouts A, B, C; a workout with a superset of Bench and Row, then Plank.
- **Steps:**
    1. Hold A (past `HOLD_MS`) and drag it below C; reload.
    2. In Create, drag C's step handle above A.
    3. Drag the superset by its row's handle past Plank.
- **Expected:**
    1. A is last, and stays last after reload.
    2. The order is C, A, B; "Moved C to step 1" is announced.
    3. Plank first, then the superset with Bench and Row still in it, open as before; "Moved superset to the end" is announced.
- **In the pack:** the library's cards no longer drag (A to Z), so only Create's steps are dragged, with the mouse; an open superset stays put as its handle is pressed, then drags whole past Plank (fixed 2026-11-11).

---

## Known issues: what to skip or mark

| TODO.md Known issue                                                                | Where it lands here                                  | How                                                                                              |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Focus isn't put back after a page slides back (`PageSlide`)                        | REG-PLAN-05, REG-LIB-02                              | Fixed (`aef2211`) and gone from TODO.md: asserted                                                |
| No swapping the next exercise while paused in a rest                               | REG-RUN-12                                           | Fixed 2026-11-10 and gone from TODO.md: asserted                                                 |
| Enter in a step's name box may save before its kind follows the exercise (Safari)  | —                                                    | Cleared from TODO.md (Safari settles the kind first); no WebKit project                          |
| An open superset folds as its handle is pressed                                    | REG-GES-03                                           | Fixed 2026-11-11 and gone from TODO.md: asserted                                                 |
| Card swipe tests still use real clock time                                         | REG-GES-02                                           | Fixed 2026-11-11 and gone from TODO.md (`GestureClock`); the e2e swipes time each touch          |
| Check the setup's buttons with an iPhone's keyboard                                | REG-NAV-02 checks the fixed buttons in Chromium only | Manual on an iPhone                                                                              |
| Try a tap and a swipe mid page-slide on an iPhone; the summary's drag on an iPhone | REG-GES-01                                           | Manual in Safari                                                                                 |
| Check the Content-Security-Policy on an iPhone                                     | All P1 tests on the production build                 | Fail on CSP console errors; real Safari manual                                                   |
| Leaving Create may be slow                                                         | —                                                    | No timing assertions on leaving `/setup`                                                         |
| Run `supabase/schema.sql` again before deploying the setup                         | —                                                    | Server-side; out of scope with Supabase stubbed                                                  |
| Keep the initial load under its 500 kB budget                                      | —                                                    | The build's budget, not e2e                                                                      |
| Dan to check the exercises' movements; Dumbbell row needs a bench                  | —                                                    | Content decisions; don't assert Swap's exact ranking beyond the documented cases                 |
| Watch how long CI takes with 2 test workers                                        | —                                                    | Run this pack as its own CI job with its own worker count, so it doesn't add to `ng test`'s time |

---

## Coverage

| Area                      | Tests            | Stories covered                                                                                                               |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Onboarding and navigation | REG-NAV-01 – 06  | NAV-1, NAV-2, NAV-3, NAV-4, NAV-5, NAV-6, NAV-7, CTL-4, RUN-4, SET-4, SET-5, SET-7, PRG-8, PLN-7                              |
| Today and planning        | REG-PLAN-01 – 08 | PLN-1 – PLN-7, NAV-6, LIB-6                                                                                                   |
| Building a workout        | REG-BLD-01 – 10  | BLD-1, BLD-3 – BLD-17, EXR-2, EXR-11, LIB-1                                                                                   |
| Workouts and ready-made   | REG-LIB-01 – 10  | LIB-1 – LIB-7, CTL-4                                                                                                          |
| Running a workout         | REG-RUN-01 – 15  | RUN-1 – RUN-12, CTL-1 – CTL-4, ALM-1, ALM-3, ALM-5, BLD-8 – BLD-10, BLD-13, PRG-1, PRG-2, PRG-5, PRG-10, PRG-11, HIS-3, SET-2 |
| History                   | REG-HIS-01 – 04  | HIS-1 – HIS-5, CTL-3                                                                                                          |
| Progress                  | REG-PRG-01 – 04  | PRG-3, PRG-4, PRG-6, PRG-8, PRG-9, PRG-13                                                                                     |
| Exercises                 | REG-EXR-01 – 06  | EXR-1 (via REG-EXR-04's rename across history and REG-RUN-11), EXR-2, EXR-3, EXR-6 – EXR-10, EXR-12, EXR-13                   |
| Settings and profile      | REG-SET-01 – 04  | SET-1 – SET-7, ALM-3, PRG-8, BLD-7                                                                                            |
| Your data and offline     | REG-DATA-01 – 06 | SYN-1, SYN-2, SYN-4, SYN-5, SYN-6, SYN-9, EXR-4                                                                               |
| Account (stubbed)         | REG-ACC-01 – 07  | SYN-3, SYN-4, SYN-7 (Google only), SYN-8, SYN-10, NAV-3, NAV-4, SET-7                                                         |
| Accessibility             | REG-A11Y-01 – 06 | A11Y-1, CTL-1, RUN-1, RUN-3, NAV-5, EXR-13                                                                                    |
| Gestures and dragging     | REG-GES-01 – 03  | NAV-1, CTL-2, LIB-2, LIB-3, BLD-5, BLD-12                                                                                     |

**Count:** 82 tests: 40 P1, 33 P2, 9 P3.

| Area      | P1     | P2     | P3    | Total  |
| --------- | ------ | ------ | ----- | ------ |
| NAV       | 4      | 2      | 0     | 6      |
| PLAN      | 3      | 3      | 0     | 6      |
| BLD       | 3      | 6      | 0     | 9      |
| LIB       | 5      | 2      | 1     | 8      |
| RUN       | 6      | 7      | 2     | 15     |
| HIS       | 3      | 0      | 1     | 4      |
| PRG       | 0      | 4      | 0     | 4      |
| EXR       | 2      | 3      | 0     | 5      |
| SET       | 2      | 1      | 1     | 4      |
| DATA      | 4      | 0      | 1     | 5      |
| ACC       | 5      | 2      | 0     | 7      |
| A11Y      | 3      | 3      | 0     | 6      |
| GES       | 0      | 0      | 3     | 3      |
| **Total** | **40** | **33** | **9** | **82** |

### In the pack

Tests per project (each runs on `phone` and `desktop`); some ids have more than one test, and a `test.fixme` or `test.skip` counts as one.

| Area | Spec                   | Tests | fixme                           | skip                                                  |
| ---- | ---------------------- | ----- | ------------------------------- | ----------------------------------------------------- |
| NAV  | `e2e/nav.e2e.ts`       | 10    | 0                               | 0                                                     |
| PLAN | `e2e/plan.e2e.ts`      | 11    | 0                               | 0                                                     |
| BLD  | `e2e/build.e2e.ts`     | 13    | 0                               | 0                                                     |
| LIB  | `e2e/library.e2e.ts`   | 11    | 0                               | 0                                                     |
| RUN  | `e2e/run.e2e.ts`       | 23    | 0                               | 1 (real sound, manual)                                |
| HIS  | `e2e/history.e2e.ts`   | 6     | 0                               | 0                                                     |
| PRG  | `e2e/progress.e2e.ts`  | 5     | 0                               | 0                                                     |
| EXR  | `e2e/exercises.e2e.ts` | 9     | 0                               | 1 (3D figure, manual)                                 |
| SET  | `e2e/settings.e2e.ts`  | 6     | 0                               | 0                                                     |
| DATA | `e2e/data.e2e.ts`      | 6     | 0                               | 0                                                     |
| ACC  | `e2e/account.e2e.ts`   | 17    | 0                               | 1 (real Google, manual)                               |
| A11Y | `e2e/a11y.e2e.ts`      | 21    | 0                               | 0 (the 4 phone-width tests skip on `desktop`)         |
| GES  | `e2e/gestures.e2e.ts`  | 7     | 1 (Known issue: superset folds) | 1 (iPhone, manual); the touch tests skip on `desktop` |

### Left out on purpose

| Story                                                       | Why                                                                                                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BLD-2 (until stopped)                                       | Only in passing (REG-LIB-02's ∞ card). Its run never finishes, so its timing is a Vitest case (`workoutStateAt()`). Add an e2e test if until-stopped runs ever break end to end. |
| ALM-2 (alarms with the phone locked)                        | Can't work on iPhone web (Known: Safari suspends audio when locked); nothing to automate. Manual on Android.                                                                     |
| ALM-4 (choose the sound for each step)                      | Not built.                                                                                                                                                                       |
| SYN-7, Apple                                                | The button is hidden until `'apple'` is in `SIGN_IN_PROVIDERS`. Add a case to REG-ACC-03 then.                                                                                   |
| EXR-4 (carrying old data over)                              | Data migrations are pure and covered by `migrate.ts`'s Vitest specs; an e2e run would only repeat them.                                                                          |
| EXR-5 ("Workouts", not "Timers")                            | Wording; covered by every test's labels, and `/timer` redirecting in REG-NAV-05.                                                                                                 |
| Moving off loop-workouts.vercel.app (`AddressMove`)         | Depends on the page's host name; temporary, and due to be removed. Possible with a hosts mapping, but not worth it.                                                              |
| A tab left open across an update (`reloadOnStaleCode`)      | Needs two deployed versions; manual, or a Vitest case for the handler.                                                                                                           |
| Multi-device sync merges (SYN-3's two-device cases, clocks) | The merge is `mergeRecords()` in Vitest; e2e checks only that pull and push are called with the right records (REG-ACC-02, -06).                                                 |
| Hover dimming, press feedback, springs and the morph's look | Visual only; check by eye in both themes (CLAUDE.md "Look at it").                                                                                                               |

---

## Docs and code that don't agree

Found while checking the docs against the code. None is fixed here.

- **M1. A library card's tap.** _Settled: library.md now says a tap opens the details._ `library.md`'s acceptance criterion "Given a card, when I tap it, then that workout starts and the workout page opens" is out of date: its own rule (and `workout-card.component.html`) say a tap opens the details at `/library/<id>`, and the play button starts it.
- **M2. New workout ids.** `build-a-workout.md` says "Saving a new workout gives it the next id (one more than the highest saved)". The code uses `crypto.randomUUID()` (`newId()` in `models/sync.ts`), as `data.md` says.
- **M3. What Today offers after the setup.** `home-and-navigation.md`'s acceptance criterion for the setup ends "offering Kettlebell full body to add". Since 2026-11-03, Get started offers a ready-made plan (`firstPlan()`): for Fitness with a kettlebell, Fitness, 4 days.
- **M4. The suggested workout once today's are done.** `planning.md`'s criterion "when I've run both, then it says All done: Push, Legs and the suggested workout is back" contradicts its own rule and `home.component.html` (`hasHistory() && !hasPlan()`): with a week planned, the suggestion never shows.
- **M5. A planning criterion that doesn't add up.** `planning.md`: Wednesday, with Push planned Tuesday "run on Wednesday instead" and Push also planned today, gives "1 of 4 done so far this week". A Push run on Wednesday should count for Wednesday's Push, making 2 of 4, unless the run is meant to be before it was planned. REG-PLAN-04 uses an unambiguous seed instead; worth checking which is meant.
- **M6. The options button's name.** `accessibility.md` names it "Options for …"; the code's is "Open options for <name>".
- **M7. Two strings longer in the code than the docs.** _Also: the Discard dialog names the workout by its edited title ("Your changes to Legs 2…"), not as saved._ The summary says "Nothing to log: no step was done before it ended." (docs: "Nothing to log"); the Discard dialog has a third wording for an untitled edited workout, "Your changes haven't been saved.", which `build-a-workout.md` leaves out.
- **M8. Focus after sliding back.** _Settled: fixed in `aef2211`, and asserted in REG-PLAN-05 and REG-LIB-02._ `library.md` and `accessibility.md` say focus goes back onto the card when a page slides back; TODO's Known issues says `PageSlide` doesn't do that (ready-made and plan cards). The library's own cards seem to get it from `?details=<id>`. Not confirmed in the running app.
- **M9. A stale note.** `exercises.md` says of the body map, "it goes on the exercise pages when they're built": they are.
- **M10. Settled: the summary says "12 rounds + 1 in 1:04".** `run-a-workout.md`'s time-limit criterion writes the score as "12 rounds + 1 in 1:04", while the history's format is "7 rounds + 3 in 20:00" (mm:ss). Check which the summary shows before hard-coding it (REG-RUN-10).
- **M11. A ready-made plan's Monday on a Wednesday.** home-and-navigation.md's criterion has the week planned with "Mon, Wed and Fri" when Use this plan is pressed; pressed on a Wednesday, Monday's counts only from next week (PLN-3), so Today says "from next week" for it.
- **M12. The options' names.** A history entry's ⋮ is "Options for <title> at <time>"; a card's is "Open options for <title>", its menu the group "Options for <title>".

## App bugs found by the pack

Each was a `test.fixme` with the reason, to pass once fixed. All four are fixed, and their tests are on.

- **B1. Focus ends on Undo, not where the page puts it.** After **Use this plan** on Today, focus should move to Edit plan (`injectUsePlanOnToday()`, home-and-navigation.md), and after a Swap mid-workout to the step's (i) (`WorkoutSwap.swapFor()`); in both, the Undo bar's effect focuses Undo after the next render, later. REG-PLAN-01, REG-RUN-11. _Fixed 2026-11-10: an offer can keep focus where the page puts it (`keepFocus`), and both do._
- **B2. A saved workout isn't scrolled into view.** After Save in Create on a new workout, Workouts highlights its card and focuses its play button but stays scrolled to the top, so on a phone the card is out of view (library.md: "in view and focused"). REG-BLD-02. _Fixed 2026-11-10: the slide back scrolled the page to its top after the card was scrolled to; it's now scrolled two frames later, once the ready-made workouts are listed too._
- **B3. The last log entry's options open under the run bar.** With a workout going, ⋮ on the last entry of the log opens its menu downwards, under the run bar and tab bar, and the page can't scroll it clear, so Delete can't be pressed (desktop, a short log). REG-HIS-03. _Fixed by `a866f45` (2026-11-08), which opens a menu above its button when the bars would cover it; the test passed from then, but its `fixme` was only taken off on 2026-11-10._
- **B4. A held Space pauses, then resumes.** pause-and-stop.md says a held Space is ignored; holding it with nothing focused pauses, which moves focus to Resume, and the key's repeats then reach that button (`onSpace()` leaves Space on a button to it, without preventing it), so letting go presses Resume. REG-A11Y-03. _Fixed 2026-11-10: once Space has paused, resumed or pressed Done, its repeats are swallowed until it's let go._
