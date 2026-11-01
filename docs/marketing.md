# Telling people about Loop Workouts

The words to describe the app, at each length, and the plan for promoting it. Started on 2026-11-01. The launch steps still to do are in [TODO.md](../TODO.md) under Launch.

## What's true to say

Check a claim here before using it anywhere new.

- **Free:** the terms of use say so.
- **No app store, works offline:** it runs in the browser and can be added to the home screen. Everything is saved on the device first.
- **No account needed:** signing in (email or Google) is optional, and only syncs between devices. Data is kept in Europe (Supabase and Resend).
- **Nearly 100 built-in exercises**, each with an animated 3D demo that can be turned round, and 10 ready-made workouts.
- **Accessible:** every page passes axe (WCAG 2.1 AA) in both themes, and works by keyboard and screen reader.
- **Don't say it works in your pocket or on a locked phone.** On an iPhone the beeps stop when the phone is locked by hand (ALM-2). Say "keeps your screen on" instead.
- **No vibration on iPhones** (Safari doesn't support it), so don't promise it there.

## Taglines

- **Build it. Run it. Beat it next time.** (the one in use: `share.png`, `og:title`)
- The interval timer that remembers what you lifted.
- Your workout, on a loop.

## Short versions

**Search results and shared links** (`<meta name="description">` in `src/index.html`, about 155 characters):

> A free interval timer and gym log: build a workout, run it with a clear timer and beeps, and see what to beat next time. Works offline, no app store needed.

**One line** (`manifest.webmanifest`, or a Play Store short description, 80 characters at most):

> Interval timer and workout log that shows you how you're improving

**A bio or a post's opening:**

> Loop Workouts is a workout timer and log in one. Build a workout from timed sets, reps and rests, then run it: a ring counts you through each step, beeps tell you when to switch, and it waits for you on rep sets. Every set is logged, so next time it tells you what to beat. Free, works offline, and you don't need an account.

## Long version

For a landing page or a store listing.

> **Stop juggling a timer, a notes app and your memory.**
>
> Loop Workouts runs your workout and remembers it for you.
>
> **Build any workout.** Timed intervals, rep sets with weights, rests, supersets and giant sets, exercises done each side. Pick a number of rounds, go until you stop, or race the clock for as many rounds as you can in 20 minutes.
>
> **Run it without looking.** A big ring fills as each step goes by, in a different colour for work and rest. Distinct beeps mark each change, and the screen stays on. On rep sets the timer waits until you tap Done. Going up a weight mid-workout takes one tap.
>
> **See yourself improve.** Every set is logged. The app shows what you did last time, celebrates personal bests, and suggests when to add weight or a rep. Each exercise has its own chart and bests, and a body map shows which muscles you've worked this week.
>
> **Know how to do every move.** Nearly 100 built-in exercises, each with an animated 3D demo you can turn round. Or start from a ready-made workout for bodyweight, kettlebell, dumbbells or the gym.
>
> **Plan your week.** Choose which workout goes on which day, and Home shows what's due today.
>
> **Yours, on every device.** No account needed: it works offline in your browser and can be added to your home screen. Sign in with email or Google and your workouts and history sync across devices, stored in Europe.
>
> **Built for everyone.** Works fully by keyboard and screen reader, respects reduced motion, and has light and dark themes.
>
> Free. Open loopworkouts.com and press start.

## Posts

**Reddit (e.g. r/kettlebell).** Read each subreddit's self-promotion rules first. Post as the person who built it, and ask for feedback rather than advertising:

> **I built a free workout timer that handles rep sets _and_ intervals. Looking for feedback.**
>
> Every interval timer I tried was either pure countdowns (useless for "10 swings, then rest 30s") or a gym log with no timer. So I made one that does both: timed steps, rep steps that wait for you to hit Done, weights you can change mid-set, and a log that tells you what to beat next time. There are 17 kettlebell exercises with 3D demos and a couple of ready-made kettlebell workouts. It runs in the browser and works offline: loopworkouts.com. I'd love to know what's missing for how you train.

Change the middle for each community: time-limit rounds and "7 rounds + 3" for CrossFit, no equipment and the ready-made bodyweight workouts for r/bodyweightfitness, and supersets and the suggested next weight for gym communities.

**Show HN.** Lead with how it's built: the countdown is worked out from the clock, so it stays right in a background tab; beeps are booked ahead on the audio clock; it's offline-first with sync; and it passes axe on every page. Few fitness apps can claim accessibility.

**Tags** (Product Hunt and the like): interval timer · HIIT · EMOM/AMRAP · gym log · progressive overload · offline-first · accessible

## Pictures and video

- **Shared links:** `public/share.png`, made by `tools/build-share-image.mjs` (see Web, shared links in [home and navigation](features/home-and-navigation.md)).
- **Short videos** (Reels, TikTok, Shorts), 15 seconds and no voiceover needed: the ring filling and a step rolling in, a 3D demo turning round, and changing the weight mid-set.

## The plan

In order. Each step's to-do is in TODO.md under Launch.

1. **Shared links show a picture and a description.** Done (this file's PR).
2. **Know whether it's working:** privacy-friendly analytics (e.g. Plausible or Vercel Analytics), named in the privacy notice, and a way to send feedback from the app (done: an email link under Account → About).
3. **Clear the iPhone checks and the legal review** in Known issues, so first visits go well.
4. **Soft launch:** friends and the gym. Watch a few people use it without helping.
5. **Communities:** Reddit and others where it solves a real problem, with the posts above.
6. **Short videos.**
7. **Show HN or Product Hunt**, once the basics are solid.
8. **App stores later:** Google Play through a Trusted Web Activity ($25 once), and the App Store with the Apple Developer account ($99 a year), which also unlocks Sign in with Apple.
