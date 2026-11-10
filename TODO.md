# Loop Workouts to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Launch

Promoting the app: a free web beta for home kettlebell and circuit trainers now, for feedback and testimonials, then a paid app in the stores (about £2.99 a month or £24.99 a year). The strategy, the words to use, what's true to say and the plan are in [docs/marketing.md](docs/marketing.md). Shared links already show a description and `public/share.png`.

- [ ] **Finish the legal review first** (the Privacy notice and Terms of use, in Known issues), so new users' first visit goes well. Dan read both on 2026-11-08, and the gaps UK GDPR asks about were filled the same day (who's responsible, why data is used, health details, who else handles it and where, how long it's kept, age, rights and the ICO, and the governing law). Left, for Dan: register with the ICO and pay its data protection fee; check there's a data processing agreement with Supabase (Vercel's and Resend's are part of their terms), and how long its backups keep a deleted account; and decide whether a solicitor should look over both. The iPhone checks are done: Dan went through the app on an iPhone on 2026-11-08 (the 3D demo in its worker, running smoothly, stopping when paused or scrolled away and turning without swiping the page back, the setup's buttons with the keyboard up, the Content-Security-Policy with both sign-ins, a tap and a swipe mid-slide, the summary's drag, the 3D bubble, and Enter in a step's name box, which settles the step's kind before the workout starts, as in Chrome; and leaving Create, which is as quick as leaving a workout's Details on the live site, so its slowness was the dev server's), and `push_records()` is done, as `supabase/schema.sql` was run on 2026-11-06 (and again on 2026-11-08, for the consent tick).
- [ ] **Soft launch, then communities,** with the beta invitation in docs/marketing.md, and short screen-recorded videos for Reels, TikTok and Shorts along the way. Collect testimonials, with permission, from the people who keep coming back (aim for 10 before the store launch).
- [ ] **The store apps, paid:** the iPhone app with the Apple Developer account (which Sign in with Apple needs too), and Google Play. Before charging, change the terms of use (they say it's free), and decide whether the web version stays free, on a trial or free tier, and when the beta ends. Founding members (anyone who signed in during the beta) are to get their first year free: that's the plan, but not publicised yet in case it changes, so decide when to announce it (then add it to the terms) and how they'll claim their year. See To decide before charging in docs/marketing.md. The iPhone app is also the way to keep alarms sounding on a locked phone, which web audio can't do (ALM-2 in `docs/features/alarms.md`).

### Speed (Lighthouse, 2026-11-07)

Measured on loopworkouts.com with Lighthouse 12.8, the middle of three runs, on its test phone (slow 4G, CPU slowed 4×). Mobile performance: Welcome 89 (desktop 98), Today 81, Workouts 88, Exercises 97, Progress 88, an exercise's page (push-up) 59. Accessibility and best practices 100, SEO 92. To measure again, Lighthouse a production build or the live site, as a guest already welcomed (`welcomed` set to `guest`), and compare total blocking time, as it's what most of these change; the lab can't stand in for real phones, so for those, see Vercel Speed Insights below.

- [ ] **A smaller painting for the 3D demo:** 1024 rather than 2048 square (`PAINT_SIZE` in `figure-body.ts`) would paint and upload in about a quarter of the time. It changes how sharp the muscles are, so for Dan to look at first.

### Progress

- [ ] **More charts, if wanted:** e.g. workouts per week (the same chart could switch between time and workouts), or a range to look further back than 12 weeks.

### Planning your own week

- [ ] **Offer to plan a new workout:** after Save in Create for a new workout that isn't planned, "Saved" could offer **Add to plan**. Probably not needed now that Add to plan is on the new workout's card and Details; only if people miss it.

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

### Ready-made workouts (LIB-6)

Eighteen ready-made workouts are listed on Workouts, under your own (see `docs/features/library.md`), written in `src/app/models/built-in-workouts.ts`.

- [ ] **Change a ready-made workout's timed steps before running it:** Your reps and weights on its Details covers rep steps only, so a plank's time, say, still changes only from a run.
- [ ] **Mobility days in the ready-made plans,** once there are mobility workouts: rest days are left empty for now.
- [ ] **More batches, once there are exercises for them:** a band workout (only Band pull-apart uses a band so far), rings, and mobility or stretching (there are no stretches yet), which need new built-in exercises first (see `docs/writing-exercises.md`). Each must pass `built-in-workouts.spec.ts`.

### Help (NAV-7)

- [ ] **Watch which questions people email about,** and add them to Help (`src/app/help/help-topics.ts`), most asked first.
- [ ] **The ? links left:** the tours replaced the Plan page's, and the workout page's by Tap to turn on sound stays (it's about sound after a reload, which the tour doesn't cover). Still there: Today's week (beside From next week, which REG-NAV-06 uses) and the welcome screen (Why might I lose my workouts?). Decide whether they go; if so, update NAV-7 in `docs/features/home-and-navigation.md`.
- [ ] **Tour of Create, point at Join with next where it is:** the Supersets stop can only light up + Step, as Join with next shows only on a step with one after it, and a new workout has one step. A one-off tip on the first Join with next to appear (once a second step is added) would show it in place.
- [ ] **Tour of Create, light up all of Rounds:** the Rounds stop lights up the Rounds or Time limit switch only, not the wheels and Until stopped under it, as nothing holds them all. An element round them, with the `data-tour="repeat"` on it, would.
- [ ] **More tours, if wanted** (each a `TOURS` entry, shown once by `startOnce`):
    - **An exercise's page** (EXR), on the first one opened: turning the 3D demo with a finger, the muscles it works, your own note (EXR-10) and Add to workout (EXR-12).

### Setup and profile (NAV-4, SET-7)

The setup after the welcome screen and the synced profile are in `docs/features/home-and-navigation.md` and `docs/features/settings.md`.

- [ ] **More goals, once there are more workouts:** Training for is only Muscle or Fitness (Dan, 2026-11-02). A goal such as "Get stronger" or "Lose weight" needs its own weekly aims (`WEEKLY_AIMS`) and its own ready-made plans (`goals` in `models/built-in-plans.ts`).
- [ ] **Devices from before the setup:** they're never asked, so they have no name to greet by unless it's given on You → Profile. If that's wanted, a card on Today ("Add your name") that can be closed.
- [ ] **The female 3D figure:** picking Female in the setup changes the body map, but the 3D demos still draw the male figure (see Exercise demos).

### Code health

From the review of 2026-11-05; how to keep it from coming back is in `CLAUDE.md`.

- [ ] **Share the swipe gesture:** `RunBarComponent` and `SwipeBackDirective` are nearly the same code, and `CardGestures` a variant of it. Needs an iPhone check once shared, as it's all touch.
- [ ] **Split `WorkoutSetupForm` (about 950 lines) and `WorkoutView` (about 585):** services aren't under the 300 line limit, but both are large. `WorkoutSetupForm` could lose what a row says (`stepTitle()`, `amountText()` and so on) to plain functions in `step-model.ts`.
- [ ] **Share the rest of an exercise list:** the Exercises page and Browse in Create repeat their count, empty message and list styles, and how they filter.
- [ ] **Move `shared/` off the `workout/` folder:** `AlarmService`, `ActiveRunService` and `WorkoutStore` import from `workout/alarm-schedule` and `workout/workout-state`, which belong in `models/` or `shared/run/`.

## 2. Known issues

- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact, and on 2026-10-30 for the weekly plan and signing in with Google, and on 2026-11-01 for Vercel Web Analytics, and on 2026-11-07 for Vercel Speed Insights, and on 2026-11-08 for what UK GDPR asks a notice to say (Dan Morriss as controller, the lawful bases, transfers to the US, retention, age 13, rights and the ICO) and England and Wales as the terms' law, and on 2026-11-10 to take out Google Fonts, now served from the app.
- [ ] **Keep the initial load under its 500 kB budget:** it's 475.09 kB (2026-11-10), since the built-in exercises' list came out of the first download (`ExerciseStore.load()`, with the pages that need it waiting on `exercisesLoaded` in `app.routes.ts`). It had crept up to 502 kB before; what keeps it down: anything on every page uses `app-icon`, not `mat-icon`, and each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment).
    - **The exercises' list still downloads on every page, just after the start:** `WorkoutStore` loads the ready-made workouts as the app starts, and they use the list. So it no longer holds up the first draw, but a phone downloads as much as before. Loading the ready-made workouts only when a page needs them would save it on pages such as the welcome screen, Settings and Help.
- [ ] **An open superset folds as its handle is pressed:** in Create, pressing a superset's drag handle hides its steps straight away (so the drag measures the list without them), before the drag starts, so the list below jumps up under the finger. Folding them only once the drag starts would need the drop list to measure itself again after (the CDK caches the rows' places at the start).
- [ ] **Dan to check the exercises' movements (RUN-11, BLD-14):** each built-in exercise's movement, which Swap ranks by first, is in `src/app/models/built-in-exercise-movements.ts` (#213), picked by Claude. The least sure: farmer's carry (a movement of its own), kettlebell halo and around the world (both "circle", so each is offered for the other), wall sit (a squat), and the kettlebell thruster, clean and press, snatch, sumo high pull and Turkish get-up (all "whole body").
- [ ] **Dumbbell row needs a bench:** so with only dumbbells (or kettlebells) picked as your equipment, Swap finds no other row for a chainsaw row, and offers ones needing other equipment (#214), though a dumbbell row can be done braced on a knee or a box. Making the bench optional for it is Dan's call, as it's the exercise's content.
- [ ] **No swapping the next exercise while paused in a rest (RUN-11):** the (i) for the exercise after a rest, with its Swap, is on the face only; paused, the greyed ring shows the rest's name, which has no (i).
- [ ] **A favourite marked on one device and an edit on another can lose one:** a workout syncs as one record, the latest change winning (see `mergeRecords()`), so a heart pressed on a phone and an edit saved on a laptop before they sync keeps only the later of the two. Rare enough to leave; keeping favourites as records of their own would fix it.
- [ ] **A ready-made workout's mid-run changes go on a reload:** a run keeps only the workout's id in the tab, and a ready-made one is reloaded as it comes with the app, so a weight changed mid-run is lost if the page reloads part-way through (your own keep it, as it's saved on the workout). The sets already done are kept.
- [ ] **Card swipe tests still use real clock time:** they measure real time, so a busy machine could still fail them, even with `maxWorkers` at 2. The wheel flick test did just that on CI on 2026-11-05 and now has fake timestamps (the `mouse()` helper in `wheel-picker.component.spec.ts`), so do the same if a swipe test fails. They passed in all six full local runs on 2 workers.
- [ ] **Watch how long CI takes with 2 test workers:** the job took 8m37s on #241's PR, 5m54s on `main` after it merged and 6m52s on a run that failed its tests, against 4m31s to 6m27s on recent PRs, with a limit of 15 minutes. If it stays slow, CI could use a higher cap than local runs, but that needs checking for random failures again.
