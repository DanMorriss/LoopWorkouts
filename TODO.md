# Loop Workouts to-do

Open work, highest priority first. Delete items once they're done, rather than ticking them: what's built is described in `docs/features/`, and git history has the rest. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Launch

Promoting the app: a free web beta for home kettlebell and circuit trainers now, for feedback and testimonials, then a paid app in the stores (about £2.99 a month or £24.99 a year). The strategy, the words to use, what's true to say and the plan are in [docs/marketing.md](docs/marketing.md). Shared links already show a description and `public/share.png`.

- [ ] **Change the sign-in emails in Supabase to the code only,** as the app no longer offers the link (since 2026-11-23): paste `supabase/email-templates/` into Authentication → Emails → Templates (Magic link and Confirm signup), and check Email OTP Length is 6 (Authentication → Providers → Email). Until then the emails still have a link, which opens Safari, and a code that may not be 6 digits. Delete this once done.
- [ ] **Finish the legal review first** (the Privacy notice and Terms of use, in Known issues), so new users' first visit goes well. Dan read both on 2026-11-08, and the gaps UK GDPR asks about were filled the same day (who's responsible, why data is used, health details, who else handles it and where, how long it's kept, age, rights and the ICO, and the governing law). Left, for Dan: register with the ICO and pay its data protection fee; check there's a data processing agreement with Supabase (Vercel's and Resend's are part of their terms), and how long its backups keep a deleted account; and decide whether a solicitor should look over both.
- [ ] **Soft launch, then communities,** with the beta invitation in docs/marketing.md, and short screen-recorded videos for Reels, TikTok and Shorts along the way. Collect testimonials, with permission, from the people who keep coming back (aim for 10 before the store launch).
- [ ] **The store apps, paid:** the iPhone app with the Apple Developer account (which Sign in with Apple needs too), and Google Play. Before charging, change the terms of use (they say it's free), and decide whether the web version stays free, on a trial or free tier, and when the beta ends. Founding members (anyone who signed in during the beta) are to get their first year free: that's the plan, but not publicised yet in case it changes, so decide when to announce it (then add it to the terms) and how they'll claim their year. See To decide before charging in docs/marketing.md. The iPhone app is also the way to keep alarms sounding on a locked phone, which web audio can't do (ALM-2 in `docs/features/alarms.md`).

### Speed (Lighthouse, 2026-11-07)

Measured on loopworkouts.com with Lighthouse 12.8, the middle of three runs, on its test phone (slow 4G, CPU slowed 4×). Mobile performance: Welcome 89 (desktop 98), Today 81, Workouts 88, Exercises 97, Progress 88, an exercise's page (push-up) 59. Accessibility and best practices 100, SEO 92. To measure again, Lighthouse a production build or the live site, as a guest already welcomed (`welcomed` set to `guest`), and compare total blocking time, as it's what most of these change; the lab can't stand in for real phones, so for those, see Vercel Speed Insights below.

- [ ] **Measure the smaller painting for the 3D demo:** since 2026-11-12 it's 1024 rather than 2048 square (`PAINT_SIZE` in `figure-body.ts`). Lighthouse an exercise's page on the live site (push-up was 59) once it's released.

### Progress

- [ ] **Stretch what you worked, a setting:** for the hold's length, or to turn the card off, if wanted.
- [ ] **More charts, if wanted:** e.g. workouts per week (the same chart could switch between time and workouts), or a range to look further back than 12 weeks.

### Sync

Accounts and sync are built and working (SYN-3, SYN-4, SYN-7 with Google, SYN-8, SYN-9); how they work is in `docs/features/backup-and-sync.md`. Worth knowing when planning: Supabase's free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused (Pro is $25 a month, checked 2026-10-28). loopworkouts.com's DNS is at GoDaddy, with Microsoft 365 for Dan's email on the bare domain and Resend's records on the `mail` subdomain.

- [ ] **Sign in with Apple (SYN-7):** the button is built but hidden, waiting on an Apple Developer account (paid). Then: an App ID and a Services ID with Sign in with Apple (domain `cpgacyzlfyskifzhkotu.supabase.co`, return URL `https://cpgacyzlfyskifzhkotu.supabase.co/auth/v1/callback`), a key (.p8), and Apple turned on in Supabase (Authentication → Providers) with the Services ID and a secret made from the key. Add `'apple'` to `SIGN_IN_PROVIDERS` in `account-client.ts`, and Apple back to the privacy notice. The secret lasts 6 months at most, so add a reminder to renew it.
- [ ] **Show Loop Workouts on Google's sign-in screen:** it says "to continue to cpgacyzlfyskifzhkotu.supabase.co", as signing in goes by Supabase's address. Showing loopworkouts.com (e.g. auth.loopworkouts.com) needs Supabase's custom domain add-on (paid), then the new callback URL in Google Cloud's client and in Supabase. Left for now (Dan, 2026-10-30).
- [ ] **Finish moving everyone off loop-workouts.vercel.app:** since 2026-10-30 the app there moves itself to loopworkouts.com once nothing would be left behind (nothing saved, or signed in and synced), and otherwise says it's moved and asks a guest to sign in (see Where the app opens in `docs/features/home-and-navigation.md`). Signing in there still needs it in Supabase's Redirect URLs. Once no one's left on it (a few weeks, say), redirect it in Vercel (Settings → Domains), take it out of Supabase's Redirect URLs, and remove `AddressMove`.

### Exercise demos (EXR-13)

Every built-in exercise has an animated figure, first under its name (see The animated demo in `docs/features/exercises.md`), and Dan has checked every one's movement in 3D (done 2026-11-02, PR #219). To look at a demo closely, `tools/shoot-demos.mjs` screenshots them from `ng serve --port 4400`: `--stills` shows every key position, `--still=2` one of them as large as the moving figure, `--flat` the flat figure drawn without WebGL, `--big` and `--drag` a close look from any side. Still to do:

- [ ] **3D figure, still to do:** the drawings only show each part's width, so its depth front to back is a guess (`DEPTH` in `figure-body.ts`, and for the torso `TORSO_DEPTH` in `torso-depth.ts`, a bust and seat as mounds on it), and seen from the side a part shows the drawings' edges wrapped round it; every figure is posed on one skeleton, of the male figure's proportions (`SHOULDER_SPREAD`, `HIP_SPREAD`, `BODY`), so the female figure's torso is stretched a little wider to reach its arms and her legs a little further apart than drawn; her ponytail turns with her head rather than hanging, so lying down it stands out behind; the flat figure, kept for browsers without WebGL, ignores the other 3D-only fields (hands placed across or forwards, which hand holds a kettlebell, the back's arch), so the plank pull-through's hand reaches straight down there rather than under the body, which a side view can't show, and the cat-cow's back stays straight, only its hips, shoulders and head moving. Since 2026-11-13 it takes the 3D figure's arms in motions with a twist (`flatPose()` in `exercise-skeleton.ts`), so the Russian twist turns and the stretches' far hands stay on the floor; using them for every 3D-only field made the halo and the presses worse flat, as their drawn arms are posed for it.

### Ready-made workouts (LIB-6)

Twenty-three ready-made workouts are listed on Workouts, under your own (see `docs/features/library.md`), written in `src/app/models/built-in-workouts.ts`.

- [ ] **More batches, once there are exercises for them:** rings, which need new built-in exercises first (see `docs/writing-exercises.md`). Each must pass `built-in-workouts.spec.ts`.

### Help (NAV-7)

- [ ] **Watch which questions people email about,** and add them to Help (`src/app/help/help-topics.ts`), most asked first.
- [ ] **The ? links left:** the tours replaced the Plan page's, and the workout page's by Tap to turn on sound stays (it's about sound after a reload, which the tour doesn't cover). Still there: Today's week (beside From next week, which REG-NAV-06 uses) and the welcome screen (Why might I lose my workouts?). Decide whether they go; if so, update NAV-7 in `docs/features/home-and-navigation.md`.

### Calories (CAL)

How the estimate works, and why the body weight stays on the device, is in `docs/features/calories.md`.

- [ ] **The week's calories on Progress** (CAL-3): beside the time per week's bars, or as a second chart they switch to.
- [ ] **How hard an exercise of your own is** (CAL-4): Light, Moderate or Hard on its page, for its MET, rather than 3.5 for all of them.
- [ ] **Heart rate from a watch** (CAL-5): on iOS, HealthKit's active energy instead of the estimate.

### Setup and profile (NAV-4, SET-7)

The setup after the welcome screen and the synced profile are in `docs/features/home-and-navigation.md` and `docs/features/settings.md`.

- [ ] **More goals, once there are more workouts:** Training for is only Muscle or Fitness (Dan, 2026-11-02). A goal such as "Get stronger" or "Lose weight" needs its own weekly aims (`WEEKLY_AIMS`) and its own ready-made plans (`goals` in `models/built-in-plans.ts`).
- [ ] **Devices from before the setup:** they're never asked, so they have no name to greet by unless it's given on You → Profile. If that's wanted, a card on Today ("Add your name") that can be closed.

### Code health

How to keep the codebase from degrading is in `CLAUDE.md`.

- [ ] **`WorkoutView` is still large** (636 lines, up from 518 with waiting for Start and doing a skipped exercise later): it's signals built on one another, so it'd split only into services handing those back and forth. (`WorkoutSetupForm`, 860 lines on 2026-11-19, is about 210 since 2026-11-20, its parts in `SetupRows`, `SetupSteps`, `SetupSave`, `SetupView`, `SetupText` and `setup-checks.ts`.)
- [ ] **`help-link`, the last of `shared/`'s imports from a feature** (`help/help-topics`): it goes once the tours replace the ? links (see Help). `PageSlide` and the helpers it uses moved to `shared/navigation/`, and `AUTH_STORAGE_KEY` to `shared/state/auth-storage-key.ts` (2026-11-11). The test fakes in `shared/testing/` import what they fake, which is fine.

## 2. Known issues

- [ ] **Try a dialog sheet's drag from its content on an iPhone:** as with the summary's, it's only been tested with Chromium's touch, which isn't Safari's (REG-GES-06).
- [ ] **At the largest text sizes, Up next starts under Pause and Skip:** at 200% text on a phone the ring shrinks as far as it can (240px) and the controls stay in reach at the bottom, but the Up next card, which is also a rep step's Done, starts partly under them and has to be scrolled to. Shrinking the face further, or Up next joining the controls there, would fix it.
- [ ] **A dialog closed with a button can't be caught as it goes:** on a phone, a sheet dragged away can be grabbed on its way down and brought back, but one closed with ‹ Back, Escape, a click outside or one of its own buttons can't. Angular takes it off the page as soon as it's closed; letting it be caught would mean saying it's closed only once it's gone, which changes when every dialog's `closed` fires and what its tests expect.
- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact, and on 2026-10-30 for the weekly plan and signing in with Google, and on 2026-11-01 for Vercel Web Analytics, and on 2026-11-07 for Vercel Speed Insights, and on 2026-11-08 for what UK GDPR asks a notice to say (Dan Morriss as controller, the lawful bases, transfers to the US, retention, age 13, rights and the ICO) and England and Wales as the terms' law, and on 2026-11-10 to take out Google Fonts, now served from the app.
- [ ] **No hip flexor muscle group:** the body map has no shape for the hip flexors, so the kneeling hip flexor stretch (and the back leg of the pigeon and world's greatest stretch) lists the quads, the closest group, at the front of the hip and thigh.
- [ ] **Dumbbell row needs a bench:** so with only dumbbells (or kettlebells) picked as your equipment, Swap finds no other row for a chainsaw row, and offers ones needing other equipment (#214), though a dumbbell row can be done braced on a knee or a box. Making the bench optional for it is Dan's call, as it's the exercise's content.
