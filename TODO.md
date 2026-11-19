# Loop Workouts to-do

Open work, highest priority first. Delete items once they're done, rather than ticking them: what's built is described in `docs/features/`, and git history has the rest. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Launch

Promoting the app: a free web beta for home kettlebell and circuit trainers now, for feedback and testimonials, then a paid app in the stores (about £2.99 a month or £24.99 a year). The strategy, the words to use, what's true to say and the plan are in [docs/marketing.md](docs/marketing.md). Shared links already show a description and `public/share.png`.

- [ ] **Finish the legal review first** (the Privacy notice and Terms of use, in Known issues), so new users' first visit goes well. Dan read both on 2026-11-08, and the gaps UK GDPR asks about were filled the same day (who's responsible, why data is used, health details, who else handles it and where, how long it's kept, age, rights and the ICO, and the governing law). Left, for Dan: register with the ICO and pay its data protection fee; check there's a data processing agreement with Supabase (Vercel's and Resend's are part of their terms), and how long its backups keep a deleted account; and decide whether a solicitor should look over both.
- [ ] **Soft launch, then communities,** with the beta invitation in docs/marketing.md, and short screen-recorded videos for Reels, TikTok and Shorts along the way. Collect testimonials, with permission, from the people who keep coming back (aim for 10 before the store launch).
- [ ] **The store apps, paid:** the iPhone app with the Apple Developer account (which Sign in with Apple needs too), and Google Play. Before charging, change the terms of use (they say it's free), and decide whether the web version stays free, on a trial or free tier, and when the beta ends. Founding members (anyone who signed in during the beta) are to get their first year free: that's the plan, but not publicised yet in case it changes, so decide when to announce it (then add it to the terms) and how they'll claim their year. See To decide before charging in docs/marketing.md. The iPhone app is also the way to keep alarms sounding on a locked phone, which web audio can't do (ALM-2 in `docs/features/alarms.md`).

### Speed (Lighthouse, 2026-11-07)

Measured on loopworkouts.com with Lighthouse 12.8, the middle of three runs, on its test phone (slow 4G, CPU slowed 4×). Mobile performance: Welcome 89 (desktop 98), Today 81, Workouts 88, Exercises 97, Progress 88, an exercise's page (push-up) 59. Accessibility and best practices 100, SEO 92. To measure again, Lighthouse a production build or the live site, as a guest already welcomed (`welcomed` set to `guest`), and compare total blocking time, as it's what most of these change; the lab can't stand in for real phones, so for those, see Vercel Speed Insights below.

- [ ] **Measure the smaller painting for the 3D demo:** since 2026-11-12 it's 1024 rather than 2048 square (`PAINT_SIZE` in `figure-body.ts`). Lighthouse an exercise's page on the live site (push-up was 59) once it's released.

### Progress

- [ ] **Less rest as a step-up, beyond kettlebell ladders** (PRG-15): only a kettlebell step whose sets vary gets "try resting 40 seconds between sets" in Next time so far. Other conditioning workouts with sets that vary, or a time limit, could have it too.
- [ ] **For Dan to look at, the stretches after a workout** (PRG-16): the nine stretches of batch 12's demos in the posing tool (reposed after Dan's first look, 2026-11-18: the doorway chest stretch one arm at a time against a door frame's post, the cross-body arm in front of the chest, the wrist flexor stretch's fingers drawn back, the upper trap stretch with only the head moving, arms by the sides, the IT band stretch's back leg behind, and the butterfly's feet out in front; the wrist and feet with two new 3D-only fields, `wristBend` and `feetForward`); the hold (30 seconds) and the most stretches (5); and the holds and order of **Upper-body stretch** and **Lower-body stretch**.
- [ ] **Stretch what you worked, a setting:** for the hold's length, or to turn the card off, if wanted.
- [ ] **More charts, if wanted:** e.g. workouts per week (the same chart could switch between time and workouts), or a range to look further back than 12 weeks.

### Planning your own week

- [ ] **Swipe through the plans with nothing planned:** This week with workouts of your own but no plan still offers just the first plan; it could swipe as Get started's does (NAV-6, PLN-7).
- [ ] **Do it today from Today:** Due today could list this week's missed workouts with Do today, as well as the Plan page's menu.
- [ ] **Offer to plan a new workout:** after Save in Create for a new workout that isn't planned, "Saved" could offer **Add to plan**. Probably not needed now that Add to plan is on the new workout's card and Details; only if people miss it.

### Sync

Accounts and sync are built and working (SYN-3, SYN-4, SYN-7 with Google, SYN-8, SYN-9); how they work is in `docs/features/backup-and-sync.md`. Worth knowing when planning: Supabase's free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused (Pro is $25 a month, checked 2026-10-28). loopworkouts.com's DNS is at GoDaddy, with Microsoft 365 for Dan's email on the bare domain and Resend's records on the `mail` subdomain.

- [ ] **Sign in with Apple (SYN-7):** the button is built but hidden, waiting on an Apple Developer account (paid). Then: an App ID and a Services ID with Sign in with Apple (domain `cpgacyzlfyskifzhkotu.supabase.co`, return URL `https://cpgacyzlfyskifzhkotu.supabase.co/auth/v1/callback`), a key (.p8), and Apple turned on in Supabase (Authentication → Providers) with the Services ID and a secret made from the key. Add `'apple'` to `SIGN_IN_PROVIDERS` in `account-client.ts`, and Apple back to the privacy notice. The secret lasts 6 months at most, so add a reminder to renew it.
- [ ] **Show Loop Workouts on Google's sign-in screen:** it says "to continue to cpgacyzlfyskifzhkotu.supabase.co", as signing in goes by Supabase's address. Showing loopworkouts.com (e.g. auth.loopworkouts.com) needs Supabase's custom domain add-on (paid), then the new callback URL in Google Cloud's client and in Supabase. Left for now (Dan, 2026-10-30).
- [ ] **Finish moving everyone off loop-workouts.vercel.app:** since 2026-10-30 the app there moves itself to loopworkouts.com once nothing would be left behind (nothing saved, or signed in and synced), and otherwise says it's moved and asks a guest to sign in (see Where the app opens in `docs/features/home-and-navigation.md`). Signing in there still needs it in Supabase's Redirect URLs. Once no one's left on it (a few weeks, say), redirect it in Vercel (Settings → Domains), take it out of Supabase's Redirect URLs, and remove `AddressMove`.

### Exercise demos (EXR-13)

Every built-in exercise has an animated figure, first under its name (see The animated demo in `docs/features/exercises.md`), and Dan has checked every one's movement in 3D (done 2026-11-02, PR #219). To look at a demo closely, `tools/shoot-demos.mjs` screenshots them from `ng serve --port 4400`: `--stills` shows every key position, `--still=2` one of them as large as the moving figure, `--flat` the flat figure drawn without WebGL, `--big` and `--drag` a close look from any side. Still to do:

- [ ] **A female 3D figure:** the 3D demo always draws the male figure for now, as the female one built the same way didn't look right (Dan, 2026-11-01). `body-model.ts` has her measurements already, and `FigureScene` takes the figure, so it's her shape (depths, torso profile, hair over the head) to work on; then pass `SettingsStore.bodyFigure()` in `ExerciseDemoComponent` again. The body map draws her as before.
- [ ] **3D figure, still to do:** the drawings only show each part's width, so its depth front to back is a guess (`DEPTH`, and for the torso `TORSO_FRONT` and `TORSO_BACK`, in `figure-body.ts`), and seen from the side a part shows the drawings' edges wrapped round it; the flat figure, kept for browsers without WebGL, ignores the other 3D-only fields (hands placed across or forwards, which hand holds a kettlebell), so the plank pull-through's hand reaches straight down there rather than under the body, which a side view can't show. Since 2026-11-13 it takes the 3D figure's arms in motions with a twist (`flatPose()` in `exercise-skeleton.ts`), so the Russian twist turns and the stretches' far hands stay on the floor; using them for every 3D-only field made the halo and the presses worse flat, as their drawn arms are posed for it.
- [ ] **Cat-cow's back is one piece,** so its demo can't round or dip.
- [ ] **Dan to try the posing tool locally:** run `npm start` (or `ng serve`) and open `/dev/pose?exercise=push-up`. Change a position with the sliders, switch a limb between Angles, Reach and Touch, press Play, and Copy pose into `built-in-exercise-motion.ts` (then `npm run format`) to see the demo change. Note anything awkward, missing or wrong, such as a slider's range, a 3D-only setting that isn't there, or the figure leaving the frame, for a follow-up.

### Ready-made workouts (LIB-6)

Twenty-three ready-made workouts are listed on Workouts, under your own (see `docs/features/library.md`), written in `src/app/models/built-in-workouts.ts`.

- [ ] **For Dan to look at:** the mobility days' holds, order and which days they're on in each ready-made plan (`built-in-plans.ts`), and **Band full body**'s reps, rests and order.
- [ ] **Search the ready-made workouts' descriptions too,** with "HIIT" in Tabata's and Cardio intervals', so a search for HIIT finds them.
- [ ] **More batches, once there are exercises for them:** rings, which need new built-in exercises first (see `docs/writing-exercises.md`). Each must pass `built-in-workouts.spec.ts`.

### How long a workout takes (LIB-9)

- [ ] **For Dan to look at:** the guess's 3 seconds a rep and 5 a set (`workout-estimate.ts`), against how long the ready-made workouts really take: Gym legs comes out at about 30 minutes, Core in 15 at 15. A workout you've not finished yet could also start from your pace on other workouts, rather than the guess.

### Help (NAV-7)

- [ ] **Watch which questions people email about,** and add them to Help (`src/app/help/help-topics.ts`), most asked first.
- [ ] **The ? links left:** the tours replaced the Plan page's, and the workout page's by Tap to turn on sound stays (it's about sound after a reload, which the tour doesn't cover). Still there: Today's week (beside From next week, which REG-NAV-06 uses) and the welcome screen (Why might I lose my workouts?). Decide whether they go; if so, update NAV-7 in `docs/features/home-and-navigation.md`.

### Calories (CAL)

How the estimate works, and why the body weight stays on the device, is in `docs/features/calories.md`.

- [ ] **Dan: run `supabase/schema.sql` again in the SQL editor before releasing #324.** It adds the `body_weight_consents` table and its three functions, and lets `push_records()` take `body-weight` records. Until then, ticking to keep the body weight with the account fails to save.
- [ ] **For Dan to look at:** the METs per movement and their exceptions (`models/calories.ts`), against the Compendium of Physical Activities, and whether resting at 1.5 METs is fair.
- [ ] **The week's calories on Progress** (CAL-3): beside the time per week's bars, or as a second chart they switch to.
- [ ] **How hard an exercise of your own is** (CAL-4): Light, Moderate or Hard on its page, for its MET, rather than 3.5 for all of them.
- [ ] **Heart rate from a watch** (CAL-5): on iOS, HealthKit's active energy instead of the estimate.

### Setup and profile (NAV-4, SET-7)

The setup after the welcome screen and the synced profile are in `docs/features/home-and-navigation.md` and `docs/features/settings.md`.

- [ ] **More goals, once there are more workouts:** Training for is only Muscle or Fitness (Dan, 2026-11-02). A goal such as "Get stronger" or "Lose weight" needs its own weekly aims (`WEEKLY_AIMS`) and its own ready-made plans (`goals` in `models/built-in-plans.ts`).
- [ ] **Devices from before the setup:** they're never asked, so they have no name to greet by unless it's given on You → Profile. If that's wanted, a card on Today ("Add your name") that can be closed.

### Running a workout

- [ ] **Skipped exercises left at the finish:** anything still put aside when the workout finishes isn't offered. Skipping the last exercise finishes the workout at once (RUN-12), so one skipped there can't be done later. If that's wanted, the finish could ask first ("Do Plank before you finish?").
- [ ] **For Dan to look at on a phone, mid-workout:** the Up next card's size beside the ring, and whether the dotted line under a step's name says "tap me" enough (RUN-2, RUN-11).
- [ ] **For Dan to look at:** the 30 seconds that makes a rest long enough to wait after (`WAIT_AFTER_REST_SECONDS` in `models/wait-to-start.ts`). Among the ready-made workouts, Dumbbell lower waits before its farmer's carry and side planks, and Gym full body before its plank (Kettlebell full body's farmer's carry became a floor press on 2026-11-17, so it no longer waits). And whether a change that moves the run's clock (a step added, say) should still apply to the steps not reached yet, rather than only next time.

### Code health

How to keep the codebase from degrading is in `CLAUDE.md`.

- [ ] **Check the swipes on an iPhone,** as they're all touch and the touch tests run only in Chromium:
    - Swiping a page back, and swiping the run bar away (`RunBarComponent` and `SwipeBackDirective` share `SideSwipe`, `shared/side-swipe.ts`).
    - The carousels (`shared/components/carousel/`): Today's suggested workouts, the plans on Get started, and the chart and table on Progress's time per week and on an exercise's page. Each should swipe sideways without the page scrolling or swiping back, and its dots should follow.
    - On an exercise's page, swiping right from the progress table back to the chart: it swiped the page back to the list before 2026-11-19's fix.
    - A tap on a chart's bar or point still chooses it, rather than swiping.
- [ ] **`WorkoutSetupForm` is still large** (about 860 lines on 2026-11-19, up from 780): it keeps the form, the steps' rows and opening them, and loading and saving. Turning a saved workout into rows and back (`stepModels()`, `stepModel()`) could go next. `WorkoutView` (636, up from 518 with waiting for Start and doing a skipped exercise later) is signals built on one another, so it'd split only into services handing those back and forth.
- [ ] **`help-link`, the last of `shared/`'s imports from a feature** (`help/help-topics`): it goes once the tours replace the ? links (see Help). `PageSlide` and the helpers it uses moved to `shared/navigation/`, and `AUTH_STORAGE_KEY` to `shared/state/auth-storage-key.ts` (2026-11-11). The test fakes in `shared/testing/` import what they fake, which is fine.

## 2. Known issues

- [ ] **REG-BLD-10 fails now and then:** "a tip the first time Join with next shows" (`e2e/build.e2e.ts`) finds step 2 not opened (`aria-expanded` false) about one run in three, on `main` as well (2026-11-19, 4 of 12 with `--repeat-each 6`), on phone and desktop. Not looked into yet.

- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact, and on 2026-10-30 for the weekly plan and signing in with Google, and on 2026-11-01 for Vercel Web Analytics, and on 2026-11-07 for Vercel Speed Insights, and on 2026-11-08 for what UK GDPR asks a notice to say (Dan Morriss as controller, the lawful bases, transfers to the US, retention, age 13, rights and the ICO) and England and Wales as the terms' law, and on 2026-11-10 to take out Google Fonts, now served from the app.
- [ ] **Keep the initial load under its 500 kB budget:** it's 496.56 kB (2026-11-19), so only 3.4 kB is left. The run's clock and alarms, the settings, and the workout and plan stores are on every page, so features that touch them add to it. It had crept up to 502 kB before; what keeps it down: anything on every page uses `app-icon`, not `mat-icon`, and each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment). Watch imports from `models/` too: importing a type from `workout-filter.ts` once brought the ready-made workouts into the first download (36 kB).
    - **Only the pages that need them download the exercises' list and the ready-made workouts** (2026-11-11): `WorkoutStore.loadReadyMade()` loads the ready-made workouts when a page that shows, plans or runs workouts opens (`readyMadeLoaded` in `app.routes.ts`), so the welcome screen, Settings and Help download neither.
- [ ] **Dan to check the exercises' movements (RUN-11, BLD-14):** each built-in exercise's movement, which Swap ranks by first, is in `src/app/models/built-in-exercise-movements.ts` (#213), picked by Claude. The least sure: farmer's carry (a movement of its own), kettlebell halo and around the world (both "circle", so each is offered for the other), wall sit (a squat), and the kettlebell thruster, clean and press, snatch, sumo high pull and Turkish get-up (all "whole body"). The ten stretches (batch 10) are all "stretch", a movement of their own, and Swap only offers a stretch for a stretch.
- [ ] **No hip flexor muscle group:** the body map has no shape for the hip flexors, so the kneeling hip flexor stretch (and the back leg of the pigeon and world's greatest stretch) lists the quads, the closest group, at the front of the hip and thigh.
- [ ] **Dumbbell row needs a bench:** so with only dumbbells (or kettlebells) picked as your equipment, Swap finds no other row for a chainsaw row, and offers ones needing other equipment (#214), though a dumbbell row can be done braced on a knee or a box. Making the bench optional for it is Dan's call, as it's the exercise's content.
