# Loop Workouts to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Launch

Promoting the app to new users. The words to use, what's true to say, and the plan are in [docs/marketing.md](docs/marketing.md). Shared links already show a description and `public/share.png`.

- [ ] **Clear the iPhone checks and the legal review in Known issues first** (the Content-Security-Policy check, `push_records()`, the privacy notice), so new users' first visit goes well.
- [ ] **Soft launch, then communities, then Show HN or Product Hunt**, with the posts in docs/marketing.md. Short screen-recorded videos for Reels, TikTok and Shorts along the way.
- [ ] **App stores, later:** Google Play through a Trusted Web Activity, and the App Store with the Apple Developer account (which Sign in with Apple needs too).

### Tidying up (Dan, 2026-11-06)

What Dan found using the app, by page. The tour (see Help) waits on this.

**Workouts page**

- [ ] **Saving an edit should get back smoothly:** from Workouts, into a workout, then editing and saving, jumps to Workouts with the edited workout in the middle (`/library?saved=<id>`). Make that a smooth transition; going back to the workout's details instead may be the better answer.
- [x] **Search and filters** (LIB-8, 2026-11-06): a search by name or exercise, Favourites (a heart on each card and in Details, synced with the workout), and under More filters the muscles and Only what I have. Dragging and Move up/down are off while any workout is hidden. "My own workouts" comes with the ready-made workouts listed, below.
- [x] **List the ready-made workouts on the page** (LIB-6, 2026-11-06): under your own, in their groups, leaving out any already in your workouts; a card opens its page, to add it. All, My own and Ready-made over the filters, which cut down both. The Ready-made workouts page and link are gone, and Missing muscle groups is on the Plan page.

**During a workout**

- [ ] **Make the bubble look 3D:** slightly convex, like a real bubble, and the timer bar that goes round it 3D too, with curved ends rather than flat ones. The ring is two rotating half-circles (`workout/workout-ring/`), which is why its ends are flat, so curved ends mean adding end caps or redrawing it. It's on screen for the whole workout, so check it stays smooth on a phone, in both themes and with reduced motion.

**Today and Plan**

- [ ] **Suggest a workout on a day with none planned:** Today only suggests one with history and no week planned (`home.component.html`), so a rest day in a planned week shows nothing. Use the existing suggestion (`suggestNextWorkout` in `models/muscle-balance.ts`), but also look at the next workout planned this week and avoid overlapping its muscles too much. It needs to say why it's picking that, and not to feel like a rest day is being told off.
- [ ] **The body map on the Plan page:** at the bottom of `plan/`, shaded for what the plan works across the week (`app-body-map`).
- [x] **Move Missing muscle groups to the Plan page** (LIB-5, LIB-7, 2026-11-06): at its bottom, for the workouts in the plan; its ready-made suggestion adds to your workouts, to plan from there.
- [ ] **Decide: Muscles this week on Today?** Today is where most people land, so it needs to be exciting. The body map is only on Progress for now (`app-muscles-this-week`), and would need thought for someone who's done nothing yet this week, when it's blank.

**Progress page**

- [ ] **Rework the workout cards:** the other pages have had a revamp and this one's falling behind (`history/history-entry/`).
- [ ] **Add charts:** which ones is still to be decided, e.g. workouts or time per week. Only each exercise's page has a chart so far (`exercise-progress`).

### Sync

Accounts and sync are built and working (SYN-3, SYN-4, SYN-7 with Google, SYN-8, SYN-9); how they work is in `docs/features/backup-and-sync.md`. Worth knowing when planning: Supabase's free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused (Pro is $25 a month, checked 2026-10-28). loopworkouts.com's DNS is at GoDaddy, with Microsoft 365 for Dan's email on the bare domain and Resend's records on the `mail` subdomain.

- [ ] **Sign in with Apple (SYN-7):** the button is built but hidden, waiting on an Apple Developer account (paid). Then: an App ID and a Services ID with Sign in with Apple (domain `cpgacyzlfyskifzhkotu.supabase.co`, return URL `https://cpgacyzlfyskifzhkotu.supabase.co/auth/v1/callback`), a key (.p8), and Apple turned on in Supabase (Authentication → Providers) with the Services ID and a secret made from the key. Add `'apple'` to `SIGN_IN_PROVIDERS` in `account-client.ts`, and Apple back to the privacy notice. The secret lasts 6 months at most, so add a reminder to renew it.
- [ ] **Show Loop Workouts on Google's sign-in screen:** it says "to continue to cpgacyzlfyskifzhkotu.supabase.co", as signing in goes by Supabase's address. Showing loopworkouts.com (e.g. auth.loopworkouts.com) needs Supabase's custom domain add-on (paid), then the new callback URL in Google Cloud's client and in Supabase. Left for now (Dan, 2026-10-30).
- [ ] **Finish moving everyone off loop-workouts.vercel.app:** since 2026-10-30 the app there moves itself to loopworkouts.com once nothing would be left behind (nothing saved, or signed in and synced), and otherwise says it's moved and asks a guest to sign in (see Where the app opens in `docs/features/home-and-navigation.md`). Signing in there still needs it in Supabase's Redirect URLs. Once no one's left on it (a few weeks, say), redirect it in Vercel (Settings → Domains), take it out of Supabase's Redirect URLs, and remove `AddressMove`.

### Exercise demos (EXR-13)

Every built-in exercise has an animated figure, at the top of How to do it (see The animated demo in `docs/features/exercises.md`), and Dan has checked every one's movement in 3D (done 2026-11-02, PR #219). To look at a demo closely, `tools/shoot-demos.mjs` screenshots them from `ng serve --port 4300`: `--stills` shows every key position, `--still=2` one of them as large as the moving figure, `--big` and `--drag` a close look from any side. Still to do:

- [ ] **A female 3D figure:** the 3D demo always draws the male figure for now, as the female one built the same way didn't look right (Dan, 2026-11-01). `body-model.ts` has her measurements already, and `FigureScene` takes the figure, so it's her shape (depths, torso profile, hair over the head) to work on; then pass `SettingsStore.bodyFigure()` in `ExerciseDemoComponent` again. The body map draws her as before.
- [ ] **3D figure, still to do:** the drawings only show each part's width, so its depth front to back is a guess (`DEPTH`, and for the torso `TORSO_FRONT` and `TORSO_BACK`, in `figure-body.ts`), and seen from the side a part shows the drawings' edges wrapped round it; the flat figure, kept for browsers without WebGL, ignores the 3D-only fields (twists, hands placed across or forwards, which hand holds a kettlebell), so the Russian twist stands still there and the plank pull-through's hand reaches forwards rather than under the body.
- [ ] **A posing tool:** a page only in development builds, with sliders for each joint and the figure drawn live, that prints the pose to paste into `built-in-exercise-motion.ts`. Each pose is written by hand as numbers for now, which is slow (the push-up's were worked out with a calculator).
- [ ] **Check it on an iPhone:** that the 3D figure runs smoothly (three.js, with a shadow, drawn each frame), stops when paused or scrolled away, and that dragging it turns it without swiping the page back.

### Ready-made workouts (LIB-6)

Eighteen ready-made workouts are listed on Workouts, under your own (see `docs/features/library.md`), written in `src/app/models/built-in-workouts.ts`.

- [ ] **Dan to review the first batch:** the exercises, sets, reps and rests of each, and their descriptions. Ids are fixed once released, so rename before merging if a title changes.
- [ ] **Dan to review the second batch** (2026-11-03): Tabata, Kettlebell AMRAP, Dumbbell upper and lower, Gym full body, Gym extras, Pull-up bar and dips, and Step circuit. As for the first, ids are fixed once released.
- [ ] **Dan to review the ready-made plans** (2026-11-03): the six in `src/app/models/built-in-plans.ts`. Ids are fixed once released.
- [ ] **Mobility days in the ready-made plans,** once there are mobility workouts: rest days are left empty for now.
- [ ] **More batches, once there are exercises for them:** a band workout (only Band pull-apart uses a band so far), rings, and mobility or stretching (there are no stretches yet), which need new built-in exercises first (see `docs/writing-exercises.md`). Each must pass `built-in-workouts.spec.ts`.

### Help (NAV-7)

- [ ] **Watch which questions people email about,** and add them to Help (`src/app/help/help-topics.ts`), most asked first.
- [ ] **A tour of the app** (Dan, 2026-11-04), once the tidying up is done: a short walk through Today, Workouts, Exercises, Progress and You, pointing at each tab and its main parts.
    - **Runs once, the first time:** straight after the setup (NAV-4), as the welcome screen and setup do, finishing on Today. It can be skipped, and isn't shown again once finished or skipped (a flag in localStorage, as `welcomed` and `setup` are; see `docs/features/data.md`).
    - **Can be run again from You,** e.g. a "Take the tour" row beside Help.
    - **When it's in, remove the ? links** (`HelpLinkComponent`, `src/app/shared/components/help-link/`) from the workout page, the Plan page, Today's week and the welcome screen. The tour does their job, and Help stays on You. Update NAV-7 in `docs/features/home-and-navigation.md` to match.

### Setup and profile (NAV-4, SET-7)

The setup after the welcome screen and the synced profile are in `docs/features/home-and-navigation.md` and `docs/features/settings.md`.

- [ ] **More goals, once there are more workouts:** Training for is only Muscle or Fitness (Dan, 2026-11-02). A goal such as "Get stronger" or "Lose weight" needs its own weekly aims (`WEEKLY_AIMS`) and its own ready-made plans (`goals` in `models/built-in-plans.ts`).
- [ ] **Devices from before the setup:** they're never asked, so they have no name to greet by unless it's given on You → Profile. If that's wanted, a card on Today ("Add your name") that can be closed.
- [ ] **The female 3D figure:** picking Female in the setup changes the body map, but the 3D demos still draw the male figure (see Exercise demos).

### Alarms (any time)

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarm order setting (ALM-4):** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend (possible now that sync has one, in Supabase). Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).

### Code health

From the review of 2026-11-05; how to keep it from coming back is in `CLAUDE.md`.

- [ ] **Share the swipe gesture:** `RunBarComponent` and `SwipeBackDirective` are nearly the same code, and `CardGestures` a variant of it. Needs an iPhone check once shared, as it's all touch.
- [ ] **Split `WorkoutSetupForm` (about 950 lines) and `WorkoutView` (about 585):** services aren't under the 300 line limit, but both are large. `WorkoutSetupForm` could lose what a row says (`stepTitle()`, `amountText()` and so on) to plain functions in `step-model.ts`.
- [ ] **Share the rest of an exercise list:** the Exercises page and Browse in Create repeat their count, empty message and list styles, and how they filter.
- [ ] **Move `shared/` off the `workout/` folder:** `AlarmService`, `ActiveRunService` and `WorkoutStore` import from `workout/alarm-schedule` and `workout/workout-state`, which belong in `models/` or `shared/run/`.

## 2. Known issues

- [ ] **Check the setup's buttons with an iPhone's keyboard:** they're fixed to the bottom of the screen (since 2026-11-06), and tested in Chromium only. In Safari they should sit clear of the home bar, and with the keyboard up on the name question they'll probably sit behind it, leaving its Go key as the way on, which is Next.
- [ ] **Leaving Create may be slow:** on the dev server, leaving `/setup` took about 1.5s before the next page came, by ‹ or the tab bar alike, against 0.35s from a workout's details, with almost no long tasks, so something seems to be waiting (measured 2026-11-05; the browser may have been throttling some of those timings). Check it on a Vercel preview, and find the cause if it's there too.
- [ ] **Focus isn't put back after a page slides back:** going back from a page that slid in (`PageSlide`) doesn't return focus to what opened it, such as a ready-made workout's card or a workout on a ready-made plan's card, so a keyboard or screen reader user starts again from the top of the page. Fix it in `PageSlide`, for every page, rather than page by page.
- [ ] **Enter in a step's name box may save before its kind follows the exercise:** a step becomes the kind its exercise is measured by when the box is left or Enter is pressed (the input's `change` event). Enter with nothing highlighted in the list also submits the form; Chrome fires `change` first, so the step saves as its new kind, but other browsers may save the old one. Check in Safari; if it saves the old kind, have the picker settle the step on Enter before letting the submit through.
- [ ] **Run `supabase/schema.sql` again in Supabase before deploying the setup (NAV-4):** run the file in the project's SQL editor. One run brings in both of these changes to the server's `push_records()`:
    - **The profile (added 2026-11-02):** it syncs as a new record kind, `profile`, which the server only keeps after this run. Until then a profile sent is quietly dropped and marked as sent, so it doesn't reach the account until it's next changed, and a new device signing in is asked the setup again.
    - **Limits on what one account can store (added 2026-10-30, tested against PGlite):** 500 changes a call, 64 kB a record, 20,000 records and 20 MB an account. Over a limit the push is refused whole and the Account tab shows the usual "couldn't sync" message, retrying each time; no one's workouts come near it, so there's no message of its own.
- [ ] **Check the Content-Security-Policy on an iPhone:** added on 2026-10-30 (`security.autoCsp` in `angular.json` writes a `<meta>` policy with the inline scripts' hashes on each build; `vercel.json` adds `frame-ancestors 'none'` and the other headers). On the Vercel preview, check in Safari that the app loads styled, signing in with an email link and with Google still works, and buttons still darken while pressed (the empty `touchstart` listener moved from `<body ontouchstart>`, which the policy blocks, into the theme script in `index.html`).
- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact, and on 2026-10-30 for the weekly plan and signing in with Google, and on 2026-11-01 for Vercel Web Analytics. They name no country's law, nor who's responsible for the data (as the UK and EU GDPR ask); decide whether they should, now that data leaves the device.
- [ ] **Try a tap and a swipe mid page-slide on an iPhone:** added on 2026-10-30 (`letInputThrough`, `src/app/nav/let-input-through.ts`). Mid view transition the browser sends every press to `<html>`, so a press ends the transition and is sent on to what it was over; tested in Chromium only (a real click, and a touch drag). Check in Safari that, as an exercise's page slides in, a tap on ‹ Exercises goes back, a swipe right takes the page from where it was seen, and an up-and-down move still scrolls; and that a tap mid-way through the workout opening from its bar lands.
- [ ] **Try the summary's drag from its content on an iPhone:** added on 2026-10-25 with touch events (Safari has no `touch-action: pan-down`), and tested only in Chromium with simulated touches. Check that, scrolled to the top, a finger moving down on the stats drags the sheet; moving up scrolls; a scrolled-down wheel in the sets still turns; and the button a drag starts on isn't pressed.
- [ ] **Keep the initial load under its 500 kB budget:** it reached 499.3 kB on 2026-10-26; dropping zone.js (PR #133) took it to 461 kB (117 kB transferred), the library order (PR #138) to 462.5 kB, and it was 487 kB on 2026-10-30, after the weekly plan, the welcome screen and the move off vercel.app, and 491.5 kB after the 17 kettlebell exercises (they add 4.3 kB), and 496.3 kB after the Apple-design motion fixes on 2026-10-30 (catching pages and bars mid-move, the drop spring, the step rolls), and 496.6 kB with the exercise demos' loader on 2026-10-31 (the demos themselves load with an exercise's details), and 496.8 kB with the ready-made workouts' route (the workouts load with their page), and 496.85 kB with the 3D demo figure (three.js, 116 kB over the network, loads with the first demo), and 497.2 kB with countdown beeps on 2026-11-01, and 499.8 kB with swapping an exercise (RUN-11; it was 500.7 kB until the suggestions and the last-time lookup moved out to load with the workout page), and 499.87 kB with swapping in Create too (BLD-14), and 499.90 kB with Save in Create (BLD-15), unchanged by Browse in Create (BLD-16), which loads with Create, and by a step taking its exercise's kind, then 501.31 kB with Skip (RUN-12) and 502.01 kB by the swap follow-ups (#213, #214) on 2026-11-01, 2 kB over. Then the header, tab bar, back link, run bar and undo bar swapped `mat-icon` for our own `app-icon` (`shared/components/icon`), which took Material's icon module out of the first load: 486.96 kB on 2026-11-01. Vercel Web Analytics added 2.25 kB (489.21 kB). Taking the Material button, FAB and tooltip themes out, which nothing used, brought it from 496.55 kB to 481.08 kB on 2026-11-05. The pages loaded later still use `mat-icon`; anything on every page should use `app-icon`. Each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment). One more saving was found, for when it's needed again:
    - **Load the built-in exercises on demand (about 20 kB):** their words already do; the list itself (`models/built-in-exercises.ts`) still loads at start, because the stores pull it in. Load it the first time the Exercises page, the exercise picker or a workout needs it.
- [ ] **An open superset folds as its handle is pressed:** in Create, pressing a superset's drag handle hides its steps straight away (so the drag measures the list without them), before the drag starts, so the list below jumps up under the finger. Folding them only once the drag starts would need the drop list to measure itself again after (the CDK caches the rows' places at the start).
- [ ] **Dan to check the exercises' movements (RUN-11, BLD-14):** each built-in exercise's movement, which Swap ranks by first, is in `src/app/models/built-in-exercise-movements.ts` (#213), picked by Claude. The least sure: farmer's carry (a movement of its own), kettlebell halo and around the world (both "circle", so each is offered for the other), wall sit (a squat), and the kettlebell thruster, clean and press, snatch, sumo high pull and Turkish get-up (all "whole body").
- [ ] **Dumbbell row needs a bench:** so with only dumbbells (or kettlebells) picked as your equipment, Swap finds no other row for a chainsaw row, and offers ones needing other equipment (#214), though a dumbbell row can be done braced on a knee or a box. Making the bench optional for it is Dan's call, as it's the exercise's content.
- [ ] **No swapping the next exercise while paused in a rest (RUN-11):** the (i) for the exercise after a rest, with its Swap, is on the face only; paused, the greyed ring shows the rest's name, which has no (i).
- [ ] **A favourite marked on one device and an edit on another can lose one:** a workout syncs as one record, the latest change winning (see `mergeRecords()`), so a heart pressed on a phone and an edit saved on a laptop before they sync keeps only the later of the two. Rare enough to leave; keeping favourites as records of their own would fix it.
- [ ] **Card swipe tests still use real clock time:** they measure real time, so a busy machine could still fail them, even with `maxWorkers` at 2. The wheel flick test did just that on CI on 2026-11-05 and now has fake timestamps (the `mouse()` helper in `wheel-picker.component.spec.ts`), so do the same if a swipe test fails. They passed in all six full local runs on 2 workers.
- [ ] **Watch how long CI takes with 2 test workers:** the job took 8m37s on #241's PR, 5m54s on `main` after it merged and 6m52s on a run that failed its tests, against 4m31s to 6m27s on recent PRs, with a limit of 15 minutes. If it stays slow, CI could use a higher cap than local runs, but that needs checking for random failures again.
