# Telling people about Loop Workouts

The strategy, the words to use, and the plan for promoting the app. Reworked on 2026-11-09 from the [market research](market-research.md). The launch steps still to do are in [TODO.md](../TODO.md) under Launch.

## The strategy

Decided by Dan on 2026-11-09.

- **Who it's for first: home kettlebell and circuit trainers.** They get the most from a timer that knows reps and weights: timer apps forget, and gym logs can't run a circuit. Other groups (gym-goers following a plan, HIIT and CrossFit fans) come later, once there's a decent user base.
- **What it is: a workout timer first.** It runs the whole workout, reps and rests included, so you don't hold your phone.
- **The selling point beyond a timer: it remembers what you did and suggests how to improve.** It shows last time, celebrates personal bests, and suggests when to add weight or a rep. No timer does this.
- **The business: a paid app in the App Store and Google Play,** at about £2.99 a month or £24.99 a year. It gets there in two stages:
    1. **A free web beta, now.** Free users while the iPhone app is built, to get feedback, iron out the kinks, and collect testimonials.
    2. **The store launch, paid,** with the beta's testimonials and fixes.

### Pricing next to the rivals

£24.99 a year is about what Hevy ($23.99) and Strong ($29.99) charge for a gym log. It's more than most timers, which are free or a few pounds once (SmartWOD Timer is $12.49 a year), so the price has to be earned by the memory and suggestions, not the timer. Store apps at this price usually offer a free trial (7 days is common), and Hevy and Strong also sell a lifetime option ($75–100).

### To decide before charging

- **What beta users get for helping.** Recommended: they become **founding members**, with something concrete, such as a free first year in the store app or a lower price for good. Say what it is in the beta invitation. "Free while in beta, and you'll get X" is honest, and it explains why it's free.
- **Whether the web version stays free.** If the store app is paid and the web app isn't, most people will use the web app. The options are to make the web app paid too, give it a free tier with limits, or close it once the store apps are out.
- **A free tier or a trial in the store.** A trial is simpler. A free tier (say, the timer without the memory) brings more people in, but it gives away what makes the app worth having.
- **The terms of use.** They say the app is free, so they'll need to change before charging, along with the privacy notice if payments bring in a new provider.

## The free beta

### What it's for

1. **Feedback:** what's confusing, what's missing for how people train, and what breaks.
2. **Ironing out the kinks** before the store launch, where a 1-star review is hard to undo.
3. **Testimonials** for the store listings and the site.

### Who to find

Home kettlebell and circuit trainers, in this order:

1. **Friends and the gym.** Watch a few people use it without helping, and note where they get stuck.
2. **Communities:** r/kettlebell, r/bodyweightfitness, r/homegym, and kettlebell forums and Discords. Read each one's self-promotion rules first.
3. **Short videos** of a kettlebell workout running.

### Telling beta users

Say plainly that it's a beta, that it's free for now, that a paid store app is coming, and what they'll get for helping. Ask for feedback at the moments it's freshest: after their first workout and after their first week.

### Collecting testimonials

- **Ask** after a few weeks of use, from people who've come back. "Would you write a line about what it's like to use?"
- **Get permission** to quote, and ask how to name them (first name, initial, or anonymous). Keep a record of who agreed to what.
- **Quote them as written.** Don't tidy them into marketing copy.
- **Look for specifics,** like "my swing ladders" or "I finally know what I lifted last week". They beat "great app".

### Knowing it's working

Use Vercel Web Analytics with `?ref=` on each link, the feedback email under You → About, and the beta users themselves.

- **Do people come back?** People who run a second workout within a week.
- **Feedback themes:** what keeps coming up.
- **Testimonials:** aim for 10 good ones before the store launch.

## Who it's for

1. **Home kettlebell trainers.** One or two bells, and workouts like "15 swings, 8 presses each side, rest 60s". Today they use a timer app and paper, or remember what they lifted.
2. **Circuit trainers at home,** with bodyweight or a little kit, who want the workout run for them.
3. **Later:** gym-goers following a plan, and HIIT, EMOM and AMRAP fans.

**What they use now:** a plain interval timer, a gym log with no proper timer, or a notes app and memory. Say what Loop Workouts does. Don't name or knock other apps.

## Brand voice

The marketing skills (`/draft-content`, `/brand-review`, `/email-sequence`, `/campaign-plan`) apply this, the strategy above and "What's true to say" below automatically. Change it here, not in a prompt.

**How it sounds:**

- **Plain.** Short sentences and everyday words, as a friend who trains would say it. "Beeps tell you when to switch", not "audio cues optimise transitions".
- **Concrete.** Show a real workout ("15 swings, then rest 30s", "7 rounds + 3") rather than an adjective.
- **Honest.** Only what's in "What's true to say". No "best", "#1" or "revolutionary", and no health, weight-loss or body-image promises.
- **Encouraging, never pushy.** Progress is about beating your last time, not anyone else. No "crush it", "beast mode", "no excuses" or guilt.
- **From the maker,** in community posts and to beta users: "I built…", asking for feedback.

**Style:**

- British English (colour, programme, kg first), sentence case for headings, and no exclamation marks except "Last one!", which is the app's own.
- The name is **Loop Workouts** (two words, both capitals), never LoopTimer or "Loop". The site is **loopworkouts.com**, lower case.
- The app's words: workout, exercise, step (timed, rep or rest), round, set, rep, ready-made workout, plan, the log, personal best. Not "routine", "session" or "WOD", except in a community that uses them.
- Calls to action are an action: "Open loopworkouts.com and press start." Tag links with `?ref=`.

## What's true to say

Check a claim here before using it anywhere new.

- **Free, for now:** the terms of use say so. Don't promise it'll always be free: a paid store app is planned. "Free while in beta" is safe.
- **Runs the whole workout:** timed steps, rep steps that wait for you to tap Done, rests, sets, supersets, rounds or "until I stop", and a time limit for as many rounds as possible, with your score at the end.
- **Remembers and suggests:** every set is logged; a rep step shows what you did last time; the summary celebrates personal bests and suggests what to step up next time (more weight, or another rep); each exercise has a chart and its bests; and it suggests a next workout for the muscles you've worked least.
- **For kettlebells:** 21 built-in exercises use a kettlebell, and there are 3 ready-made kettlebell workouts (full body, a swing ladder and an AMRAP) and a 3-day kettlebell plan.
- **Built in:** 97 exercises, each with an animated 3D demo you can turn round, 18 ready-made workouts and 6 ready-made weekly plans.
- **No app store, works offline:** it runs in the browser and can be added to the home screen. Everything is saved on the device first.
- **No account needed:** signing in (email or Google) is optional, and only syncs between devices. Data is kept in Europe (Supabase and Resend).
- **Accessible:** every page passes axe (WCAG 2.1 AA) in both themes, and works by keyboard and screen reader.
- **Don't say it works in your pocket or on a locked phone.** On an iPhone the beeps stop when the phone is locked by hand (ALM-2). Say "keeps your screen on" instead. The iPhone app should fix this, so it may become a selling point there.
- **No vibration on iPhones** (Safari doesn't support it), so don't promise it there.
- **Don't call it EMOM.** There's no EMOM mode, though timed steps can make one.

## Taglines

- **The workout timer that remembers what you lifted.** (Recommended: it says "timer" first, and the memory is the reason to choose it.)
- **Build it. Run it. Beat it next time.** (In use now in `share.png` and `og:title`. It still fits, as a second line.)
- Your workout, on a loop.

## Short versions

These are drafts for the new positioning. The app's own copy (`src/index.html`, `manifest.webmanifest`, `share.png`) still uses the old "interval timer and gym log" words until it's updated.

**Search results and shared links** (about 155 characters):

> A workout timer for kettlebells and circuits that remembers what you lifted. Reps, rests and rounds, run for you, and what to beat next time. Free in beta.

**One line** (80 characters at most):

> The workout timer that remembers what you lifted, and what to beat next time

**A bio or a post's opening:**

> Loop Workouts is a workout timer that remembers. Build a kettlebell or circuit workout from timed steps, reps and rests, then run it: a ring counts you through, beeps tell you when to switch, and on rep sets it waits for you to tap Done. It logs every set, so next time it shows what you did and suggests what to step up. Free while in beta.

## Long version

For a landing page, and later a store listing (drop "in the browser" and "beta" there).

> **The workout timer that remembers what you lifted.**
>
> Stop juggling a timer, a notebook and your memory. Loop Workouts runs your workout and remembers it for you.
>
> **Runs the whole workout.** Timed intervals, rep sets with weights, rests, sets and supersets, exercises done each side. Pick a number of rounds, go until you stop, or race the clock for as many rounds as you can in 20 minutes. On rep sets the timer waits until you tap Done.
>
> **Run it without looking.** A big ring fills as each step goes by, in a different colour for work and rest. Distinct beeps mark each change, and the screen stays on. Going up a bell mid-workout takes one tap.
>
> **Beat it next time.** Every set is logged. Each step shows what you did last time, the summary celebrates personal bests, and it suggests when to add weight or a rep. Each exercise has its own chart and bests.
>
> **Made for kettlebells and circuits.** Ready-made kettlebell workouts (a full body session, a swing ladder and an AMRAP), a 3-day kettlebell plan, and nearly 100 exercises, each with an animated 3D demo you can turn round.
>
> **Plan your week.** Choose which workout goes on which day, and Today shows your week and what's due.
>
> **Yours, on every device.** It works offline and needs no account. Sign in with email or Google to sync your workouts and history across devices, stored in Europe.
>
> **Built for everyone.** Works fully by keyboard and screen reader, respects reduced motion, and has light and dark themes.
>
> Free while in beta. Open loopworkouts.com and press start.

## Posts

**A beta invitation** (r/kettlebell and the like). Post as the person who built it, and ask for testers rather than advertising:

> **I built a workout timer for kettlebell circuits that remembers what you lifted. Looking for beta testers.**
>
> Every timer I tried was pure countdowns, useless for "15 swings, 8 presses each side, rest 60s", and I kept forgetting which bell I'd used last week. So I made one that does both: timed steps, rep steps that wait for you to tap Done, and a log that shows what you did last time and suggests when to go up a bell. There are 21 kettlebell exercises with 3D demos, a swing ladder, an AMRAP and a 3-day plan built in. It runs in the browser and works offline: loopworkouts.com. It's free while in beta, as I'm building the iPhone app. I'd love to know what's missing for how you train.

Change the middle for each community: no equipment and the ready-made bodyweight workouts for r/bodyweightfitness, and home circuits and the weekly plan for r/homegym.

**Show HN** (later). Lead with how it's built: the countdown is worked out from the clock, so it stays right in a background tab; beeps are booked ahead on the audio clock; it's offline-first with sync; and it passes axe on every page.

**Tags:** workout timer · interval timer · kettlebell · circuit training · workout log · progressive overload · offline · accessible

## Pictures and video

- **Shared links:** `public/share.png`, made by `tools/build-share-image.mjs` (see Web, shared links in [home and navigation](features/home-and-navigation.md)). Update it with the new tagline.
- **Short videos** (Reels, TikTok, Shorts), 15 seconds with no voiceover needed: a kettlebell workout running (the ring filling, Done on a set of swings), "last time" on a step and the personal best at the end, and a 3D demo turning round.
- **The store listing** will need screenshots and a preview video. Plan them from the same shots.

## The plan

In order. Each step's to-do is in TODO.md under Launch.

1. **Shared links show a picture and a description.** Done; the words change with step 4.
2. **Know whether it's working:** Vercel Web Analytics (tag links with `?ref=`), Speed Insights, and an email link under You → About. Done.
3. **Clear the iPhone checks and the legal review.** The iPhone checks are done (2026-11-08); the legal review is left.
4. **Ready the beta:** decide what founding members get, then update the app's own words (`index.html`, the manifest, `share.png`, Welcome) for the new positioning and say "beta" in it.
5. **Soft launch:** friends and the gym. Watch a few people use it without helping.
6. **Communities,** with the beta invitation above, and short videos along the way.
7. **Collect testimonials** from the people who keep coming back.
8. **The store apps, paid:** the iPhone app with the Apple Developer account ($99 a year), which also unlocks Sign in with Apple, and Google Play. First change the terms of use, and decide on the web version, the trial and the founding members' offer.
9. **Branch out** to gym-goers and HIIT once there's a decent user base. Show HN or Product Hunt fit around here.
