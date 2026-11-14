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

- [x] **A smaller painting for the 3D demo** (2026-11-12): 1024 rather than 2048 square (`PAINT_SIZE` in `figure-body.ts`), a quarter of the pixels to paint and upload. Side by side at the largest size the figure is shown, at twice the screen's pixels, only the outlines are a little softer. Not measured on the live site yet: Lighthouse an exercise's page (push-up was 59) once it's released.

### Progress

- [x] **Each exercise's week** (2026-11-14): Exercises this week on Progress (PRG-13), each exercise's reps (or time) and sets in the last 7 days, each side counted once, with its new bests (heaviest, most reps, longest) tagged. "This week" on Progress and Today now always means the last 7 days, so the time per week's bars are named by their days rather than "This week" and "Last week". See Exercises this week in `docs/features/progress.md`. An exercise's page opened from Progress (this card or a set in the log) now goes back there with ‹ Progress, not to the Exercises list.
- [x] **Volume for weighted exercises** (2026-11-14): "1,680 kg lifted" beside the reps and sets in Exercises this week (PRG-13), weight × reps over the sets with a weight, both sides together.
- [ ] **More charts, if wanted:** e.g. workouts per week (the same chart could switch between time and workouts), or a range to look further back than 12 weeks.

### Planning your own week

- [x] **Active rest** (2026-11-12): a workout of only stretches (`isActiveRest()` in `models/active-rest.ts`), such as the ready-made plans' mobility days, is optional. It's never marked Missed (a day gone by without it says Rested, and shows as free on Today), isn't counted in the week's tally or a plan's days a week ("3 days a week, + 2 active rest"), is offered on Today rather than due ("Active rest today", with a quieter Start), and is drawn as an empty ring on a dashed day in a plan's week, its workouts under "On rest days".
- [x] **Let people choose whether to have active rest** (2026-11-13): a plan's card has **Include active rest days**, on as it comes; off, the card shows the plan without its mobility days, and Use this plan plans it so (`withoutActiveRest()` in `models/built-in-plans.ts`). Only for that card, so it's on again next time: if people turn it off every time, it could be remembered as a setting.
- [ ] **Offer to plan a new workout:** after Save in Create for a new workout that isn't planned, "Saved" could offer **Add to plan**. Probably not needed now that Add to plan is on the new workout's card and Details; only if people miss it.

### Sync

Accounts and sync are built and working (SYN-3, SYN-4, SYN-7 with Google, SYN-8, SYN-9); how they work is in `docs/features/backup-and-sync.md`. Worth knowing when planning: Supabase's free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused (Pro is $25 a month, checked 2026-10-28). loopworkouts.com's DNS is at GoDaddy, with Microsoft 365 for Dan's email on the bare domain and Resend's records on the `mail` subdomain.

- [ ] **Sign in with Apple (SYN-7):** the button is built but hidden, waiting on an Apple Developer account (paid). Then: an App ID and a Services ID with Sign in with Apple (domain `cpgacyzlfyskifzhkotu.supabase.co`, return URL `https://cpgacyzlfyskifzhkotu.supabase.co/auth/v1/callback`), a key (.p8), and Apple turned on in Supabase (Authentication → Providers) with the Services ID and a secret made from the key. Add `'apple'` to `SIGN_IN_PROVIDERS` in `account-client.ts`, and Apple back to the privacy notice. The secret lasts 6 months at most, so add a reminder to renew it.
- [ ] **Show Loop Workouts on Google's sign-in screen:** it says "to continue to cpgacyzlfyskifzhkotu.supabase.co", as signing in goes by Supabase's address. Showing loopworkouts.com (e.g. auth.loopworkouts.com) needs Supabase's custom domain add-on (paid), then the new callback URL in Google Cloud's client and in Supabase. Left for now (Dan, 2026-10-30).
- [ ] **Finish moving everyone off loop-workouts.vercel.app:** since 2026-10-30 the app there moves itself to loopworkouts.com once nothing would be left behind (nothing saved, or signed in and synced), and otherwise says it's moved and asks a guest to sign in (see Where the app opens in `docs/features/home-and-navigation.md`). Signing in there still needs it in Supabase's Redirect URLs. Once no one's left on it (a few weeks, say), redirect it in Vercel (Settings → Domains), take it out of Supabase's Redirect URLs, and remove `AddressMove`.

### Exercise demos (EXR-13)

Every built-in exercise has an animated figure, at the top of How to do it (see The animated demo in `docs/features/exercises.md`), and Dan has checked every one's movement in 3D (done 2026-11-02, PR #219). To look at a demo closely, `tools/shoot-demos.mjs` screenshots them from `ng serve --port 4400`: `--stills` shows every key position, `--still=2` one of them as large as the moving figure, `--flat` the flat figure drawn without WebGL, `--big` and `--drag` a close look from any side. Still to do:

- [ ] **A female 3D figure:** the 3D demo always draws the male figure for now, as the female one built the same way didn't look right (Dan, 2026-11-01). `body-model.ts` has her measurements already, and `FigureScene` takes the figure, so it's her shape (depths, torso profile, hair over the head) to work on; then pass `SettingsStore.bodyFigure()` in `ExerciseDemoComponent` again. The body map draws her as before.
- [ ] **3D figure, still to do:** the drawings only show each part's width, so its depth front to back is a guess (`DEPTH`, and for the torso `TORSO_FRONT` and `TORSO_BACK`, in `figure-body.ts`), and seen from the side a part shows the drawings' edges wrapped round it; the flat figure, kept for browsers without WebGL, ignores the other 3D-only fields (hands placed across or forwards, which hand holds a kettlebell), so the plank pull-through's hand reaches straight down there rather than under the body, which a side view can't show. Since 2026-11-13 it takes the 3D figure's arms in motions with a twist (`flatPose()` in `exercise-skeleton.ts`), so the Russian twist turns and the stretches' far hands stay on the floor; using them for every 3D-only field made the halo and the presses worse flat, as their drawn arms are posed for it.
- [x] **A posing tool** (2026-11-11): `/dev/pose` on `ng serve`, only in development builds, with a slider for each number of a position, the 3D and flat figures drawn as they move, Play, and Copy pose or Copy motion to paste into `built-in-exercise-motion.ts` (`src/app/dev/pose-tool/`). It writes poses out whole, so a pose built from the file's shared constants (`STANDING`, `ON_BAR`, …) comes back spelled out: paste only what changed if you'd rather keep them.
- [x] **Dan checked the stretches' demos (batch 10)** (2026-11-12) in the posing tool, and reposed child's pose, the standing quad stretch, pigeon, thread the needle and the world's greatest stretch. Where an arm went through a leg or the chest, the hands were moved out to the side (pigeon's `handsApart`, the world's greatest stretch's near hand outside the front foot), and thread the needle's hand passes down by the shoulder on its way under. The world's greatest stretch's raised arm passes straight out to the side on the way up and down, so its elbow points back the whole way. Still true: cat-cow's back is one piece, so it can't round or dip. (Flat, without WebGL, their far hands lifted off the floor as the chest turned, until 2026-11-13.)
- [ ] **Dan to try the posing tool locally:** run `npm start` (or `ng serve`) and open `/dev/pose?exercise=push-up`. Change a position with the sliders, switch a limb between Angles, Reach and Touch, press Play, and Copy pose into `built-in-exercise-motion.ts` (then `npm run format`) to see the demo change. Note anything awkward, missing or wrong, such as a slider's range, a 3D-only setting that isn't there, or the figure leaving the frame, for a follow-up.

### Ready-made workouts (LIB-6)

Twenty-one ready-made workouts are listed on Workouts, under your own (see `docs/features/library.md`), written in `src/app/models/built-in-workouts.ts`.

- [x] **Change a ready-made workout's timed steps before running it** (2026-11-11): its Details lists timed exercises too, with Minutes and Seconds wheels for each set, kept in the same `ready-made-change` record (`seconds`, data version 16).
- [x] **Mobility days in the ready-made plans** (2026-11-12): two mobility workouts of the batch 10 stretches, **Mobility flow** (about ten minutes, moving) and **Full-body stretch** (longer holds), and every ready-made plan has the flow early in the week and the stretch near the end, with at least one empty rest day left. A plan card's "days a week" counts only training days. Stretches no longer count as sets on Progress, and a workout of only stretches is never suggested (PRG-6, PRG-9). For Dan to look at: the holds' lengths and the order, and which days they're on (`built-in-plans.ts`).
- [x] **A band workout** (2026-11-13): **Band full body**, in Other kit, of all eleven band exercises (batch 11 and the band pull-apart), needing only a band and a post or door anchor to tie it to. For Dan to look at: the reps, rests and order.
- [ ] **More batches, once there are exercises for them:** rings, which need new built-in exercises first (see `docs/writing-exercises.md`). Each must pass `built-in-workouts.spec.ts`.

### How long a workout takes (LIB-9)

- [x] **An estimate on the workout cards and pages** (2026-11-14): "About 25 min" on each card, its Details and a ready-made plan's workout's page, from its clock and a guess at its rep steps (3 seconds a rep, 5 to get ready for each set), then from your own pace on its rep steps once you've done some (the middle of its last 3 runs), so a change to the workout changes it at once, keeping your pace. Each run now logs its time on rep steps (`repSeconds` in the history), set against the guess for the sets of reps it logged, so skipped steps and stopped runs count only what was done. See How long it takes in `docs/features/library.md`.
- [x] **In Create too** (2026-11-14): above Save, changing as the workout's set up.
- [ ] **For Dan to look at:** the guess's 3 seconds a rep and 5 a set (`workout-estimate.ts`), against how long the ready-made workouts really take: Gym legs comes out at about 30 minutes, Core in 15 at 15. A workout you've not finished yet could also start from your pace on other workouts, rather than the guess.

### Help (NAV-7)

- [ ] **Watch which questions people email about,** and add them to Help (`src/app/help/help-topics.ts`), most asked first.
- [ ] **The ? links left:** the tours replaced the Plan page's, and the workout page's by Tap to turn on sound stays (it's about sound after a reload, which the tour doesn't cover). Still there: Today's week (beside From next week, which REG-NAV-06 uses) and the welcome screen (Why might I lose my workouts?). Decide whether they go; if so, update NAV-7 in `docs/features/home-and-navigation.md`.
- [x] **Tour of Create, point at Join with next where it is** (2026-11-11): a tip of one card, the first time a Join with next shows on an open step (`TOURS.join`, `tip-join`), with focus back where it was after (`returnFocus`).
- [x] **Tour of Create, light up all of Rounds** (2026-11-11): `data-tour="repeat"` is on an element round the switch and what's under it.
- [x] **A tour of an exercise's page** (2026-11-11): on the first one opened, four stops (Add to workout, your note, the muscles it works and the demo, turned with a finger), and in Help's Tours (`TOURS.exercise`, `tour-exercise`).

### Calories (CAL)

How the estimate works, and why the body weight stays on the device, is in `docs/features/calories.md`.

- [x] **An estimate of each workout's calories** (CAL-1, 2026-11-14): "About 210 kcal" on the workout summary and in the history, from each exercise's movement (a MET each), the time on its sets, and rest at 1.5 METs.
- [x] **Body weight, on this device only** (CAL-2, 2026-11-14): a sixth question in the setup, and Body weight on You → Profile. It's not part of the synced profile, as weight is health data.
- [ ] **For Dan to look at:** the METs per movement and their exceptions (`models/calories.ts`), against the Compendium of Physical Activities, and whether resting at 1.5 METs is fair.
- [ ] **The week's calories on Progress** (CAL-3): beside the time per week's bars, or as a second chart they switch to.
- [ ] **How hard an exercise of your own is** (CAL-4): Light, Moderate or Hard on its page, for its MET, rather than 3.5 for all of them.
- [ ] **Sync the body weight, with consent** (open question): as notes are (SYN-10), so it needn't be given on each device. Needs the privacy notice and the consent wording changing.
- [ ] **Heart rate from a watch** (CAL-5): on iOS, HealthKit's active energy instead of the estimate.

### Setup and profile (NAV-4, SET-7)

The setup after the welcome screen and the synced profile are in `docs/features/home-and-navigation.md` and `docs/features/settings.md`.

- [ ] **More goals, once there are more workouts:** Training for is only Muscle or Fitness (Dan, 2026-11-02). A goal such as "Get stronger" or "Lose weight" needs its own weekly aims (`WEEKLY_AIMS`) and its own ready-made plans (`goals` in `models/built-in-plans.ts`).
- [ ] **Devices from before the setup:** they're never asked, so they have no name to greet by unless it's given on You → Profile. If that's wanted, a card on Today ("Add your name") that can be closed.
- [ ] **The female 3D figure:** picking Female in the setup changes the body map, but the 3D demos still draw the male figure (see Exercise demos).

### Code health

How to keep the codebase from degrading is in `CLAUDE.md`.

- [ ] **Check the shared swipe on an iPhone:** `RunBarComponent` and `SwipeBackDirective` now follow a finger with one class, `SideSwipe` (`shared/side-swipe.ts`). Check swiping a page back and swiping the run bar away, as it's all touch; the touch tests pass in Chromium.
- [ ] **`WorkoutSetupForm` is still large** (about 780 lines): it keeps the form, the steps' rows and opening them, and loading and saving. If it grows again, turning a saved workout into rows and back (`stepModels()`, `stepModel()`) could go next. `WorkoutView` (518) is signals built on one another, so it'd split only into services handing those back and forth.
- [ ] **`help-link`, the last of `shared/`'s imports from a feature** (`help/help-topics`): it goes once the tours replace the ? links (see Help). `PageSlide` and the helpers it uses moved to `shared/navigation/`, and `AUTH_STORAGE_KEY` to `shared/state/auth-storage-key.ts` (2026-11-11). The test fakes in `shared/testing/` import what they fake, which is fine.

## 2. Known issues

- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact, and on 2026-10-30 for the weekly plan and signing in with Google, and on 2026-11-01 for Vercel Web Analytics, and on 2026-11-07 for Vercel Speed Insights, and on 2026-11-08 for what UK GDPR asks a notice to say (Dan Morriss as controller, the lawful bases, transfers to the US, retention, age 13, rights and the ICO) and England and Wales as the terms' law, and on 2026-11-10 to take out Google Fonts, now served from the app.
- [ ] **Keep the initial load under its 500 kB budget:** it's 479.37 kB (2026-11-14, up 0.4 kB for logging each run's time on rep steps, then 0.65 kB for the body weight setting, CAL-2), since the built-in exercises' list came out of the first download (`ExerciseStore.load()`, with the pages that need it waiting on `exercisesLoaded` in `app.routes.ts`). It had crept up to 502 kB before; what keeps it down: anything on every page uses `app-icon`, not `mat-icon`, and each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment).
    - **Only the pages that need them download the exercises' list and the ready-made workouts** (2026-11-11): `WorkoutStore.loadReadyMade()` loads the ready-made workouts when a page that shows, plans or runs workouts opens (`readyMadeLoaded` in `app.routes.ts`), so the welcome screen, Settings and Help download neither.
- [ ] **Dan to check the exercises' movements (RUN-11, BLD-14):** each built-in exercise's movement, which Swap ranks by first, is in `src/app/models/built-in-exercise-movements.ts` (#213), picked by Claude. The least sure: farmer's carry (a movement of its own), kettlebell halo and around the world (both "circle", so each is offered for the other), wall sit (a squat), and the kettlebell thruster, clean and press, snatch, sumo high pull and Turkish get-up (all "whole body"). The ten stretches (batch 10) are all "stretch", a movement of their own, and Swap only offers a stretch for a stretch.
- [ ] **No hip flexor muscle group:** the body map has no shape for the hip flexors, so the kneeling hip flexor stretch (and the back leg of the pigeon and world's greatest stretch) lists the quads, the closest group, at the front of the hip and thigh.
- [ ] **Dumbbell row needs a bench:** so with only dumbbells (or kettlebells) picked as your equipment, Swap finds no other row for a chainsaw row, and offers ones needing other equipment (#214), though a dumbbell row can be done braced on a knee or a box. Making the bench optional for it is Dan's call, as it's the exercise's content.
- [ ] **A favourite marked on one device and an edit on another can lose one:** a workout syncs as one record, the latest change winning (see `mergeRecords()`), so a heart pressed on a phone and an edit saved on a laptop before they sync keeps only the later of the two. Rare enough to leave; keeping favourites as records of their own would fix it.
- [ ] **Watch how long CI takes with 2 test workers:** the job took 8m37s on #241's PR, 5m54s on `main` after it merged and 6m52s on a run that failed its tests, against 4m31s to 6m27s on recent PRs, with a limit of 15 minutes. If it stays slow, CI could use a higher cap than local runs, but that needs checking for random failures again.
