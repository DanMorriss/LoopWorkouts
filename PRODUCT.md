# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

This repository is the web app, an installable PWA built for phones first. A native iPhone app (SwiftUI) is planned as a separate codebase built from `docs/features/`, and will have its own product record.

## Users

**First: home kettlebell and circuit trainers.** They have one or two bells, or bodyweight and a little kit, and run workouts like "15 swings, 8 presses each side, rest 60s". Today they use a plain interval timer and paper, a gym log with no proper timer, or a notes app and their memory.

**Later:** gym-goers following a plan, and HIIT and AMRAP fans. Don't design for them ahead of the first group.

**The scene during a workout:** the phone is propped on the floor or a bench a metre or two away. People glance at it between sets and tap it with chalky or sweaty hands, and beeps do most of the work. Building workouts, planning the week and reading progress happen at rest, phone in hand.

## Product Purpose

A workout helper that shows you how you're improving. It runs the whole workout so you don't hold your phone, logs what you did, and next time tells you what to beat. Success means people come back, measured by whether they run a second workout within a week.

## Positioning

**The workout timer that remembers what you lifted.** It's a timer first: timed steps, rep steps that wait for you to tap Done, rests, sets, supersets, rounds and time limits. The memory is the reason to choose it: last time on each rep step, personal bests in the summary, and suggestions for when to add weight or a rep. Interval timers don't remember what you did, and gym logs can't run a circuit.

## Operating Context

- **Running a workout** is the everyday job and the heart of the app: the ring and countdown, Done on rep steps, changing the weight mid-set, the mini player that keeps a workout going while you look at other tabs.
- **Tracking progress** is the payoff: the log, each exercise's chart and bests, and the body map of muscles worked.
- **Planning** is kept simple: which workout goes on which day, and what's due on Today. There are no multi-week programmes.
- There are five tabs: Today, Workouts, Exercises, Progress and You.
- It works offline and stores data on the device first. Signing in (email code or Google) is optional and only syncs devices. The data is kept in Europe.

## Capabilities and Constraints

- Angular 22 (zoneless, signals), Tailwind and SCSS, and Supabase. The rules for code, tokens, budgets and reuse are in `CLAUDE.md` and bind all design work: every colour is a theme token for both dark and light, a component's styles are capped at 4 kB and the initial bundle at 500 kB, and the icon font holds only the icons the app uses.
- The words used for things: workout, exercise, step (timed, rep or rest), round, set, rep, ready-made workout, plan, the log, personal best. Not "routine", "session" or "WOD".
- Feature truth, by story id, is in `docs/features/`. What's true to say about the app is in `docs/marketing.md` under "What's true to say".
- Limitations: on iPhone the beeps stop when the phone is locked by hand, and there's no vibration, so the app keeps the screen on instead. There's no EMOM mode.
- Business: a free web beta now, then paid App Store and Google Play apps. Undecided: whether the web app stays free, a trial or a free tier, and when the beta ends. Don't mention the founding members' offer anywhere until it's announced.

## Brand Commitments

- **Name:** Loop Workouts (two words, both capitals), and loopworkouts.com in lower case.
- **Voice:** set in `docs/marketing.md` under "Brand voice": plain, concrete, honest, and encouraging without pushing. It uses British English and sentence case. There are no exclamation marks except "Last round!", and no "crush it" or guilt.
- **Kept by decision (2026-11-23):**
  - The ∞ logo and its light, the artwork for the favicon and app icon (`public/favicon.svg`, drawn by `tools/build-favicon.mjs`).
  - The ring's phase colours: pink for timed steps, blue for rest, violet for reps.
  - Audiowide as the display font.

## Evidence on Hand

- 126 built-in exercises, each with an animated 3D demo, plus 23 ready-made workouts and 6 ready-made weekly plans.
- The shared-link image `public/share.png` and the screenshots made by `tools/shoot-demos.mjs`.
- **No testimonials, user counts or reviews yet.** The beta is collecting them. Don't invent any.

## Product Principles

1. **Readable at a glance, from a distance.** On the workout screen, the step, the time and what's next must read from across a room and need nothing more than one tap.
2. **The memory is the reason to choose it.** Last time, personal bests and what to step up next should be easy to find, not hidden in a log.
3. **Progress means beating your last time,** not anyone else's numbers.
4. **Simple over complete.** Planning stays simple; leave out what a home trainer doesn't need.
5. **Yours and dependable:** offline, no account needed, and nothing lost.

## Accessibility & Inclusion

WCAG 2.1 AA on every page in both themes, checked by axe. Everything works by keyboard and screen reader (Space pauses and resumes), with 44px touch targets and announcements as each phase starts. Anything that moves respects reduced motion. Every text and control colour is checked for contrast against the surfaces it sits on (`theme-contrast.spec.ts`).
