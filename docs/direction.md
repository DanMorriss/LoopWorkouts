# Where Loop Workouts is going

Agreed October 2026. This sets the direction; the stories are in [features](features/README.md) and the order of work is in [TODO.md](../TODO.md).

## What it's for

**A workout helper that shows you how you're improving.** You run a workout, it logs what you did, and next time it tells you what to beat.

- **Running a workout** is the everyday job: the countdown, rep steps, Done, changing the weight mid-set. That stays the heart of the app.
- **Tracking progress** is the payoff: each exercise has a history, personal bests and a trend.
- **Planning** comes later and stays simple: which workout on which day, and what's due today. No multi-week programmes.

## What changes

### Workouts, made of exercises

- **"Workouts" become "Workouts"** throughout the app (the library, Create, the history). The app itself is now **Loop Workouts** (it was LoopTimer until October 2026).
- **Exercises are things in their own right.** "Squats" is one exercise, used in any number of workouts, and its sets are logged against it, not against a step name that happens to match. Renaming an exercise renames it everywhere; its history stays together.
- **A built-in list of common exercises** to pick from, each with a description, how to do it, and a **body map** shaded for the muscles it works. You can also **make your own**, with its own description and muscles. See [exercises](features/exercises.md).
- A step in a workout is an exercise (timed or reps, with a weight) or a rest. Rest isn't an exercise.
- Existing data moves across on load: step names are matched up (ignoring case and spaces) into exercises, and past logged sets are linked to them.

### Progress, in the workout and after it

1. **In the workout:** each rep step shows what you did last time ("Last time: 8 × 60 kg"), and the workout summary calls out new personal bests.
2. **Progress pages:** a body map of the muscles worked this week, a list of exercises, and a page per exercise with a chart over time, its bests (heaviest weight, most reps at a weight, and the longest hold for timed exercises), and recent sessions.
3. **Suggested next weight** comes later, once there's history to base it on.

### Data that doesn't get lost, on every device

- **Backup first:** export everything to a file and import it again. This comes early, because the history is now worth keeping: iOS Safari can clear a website's storage after about 7 days without a visit, unless the app has been added to the Home Screen.
- **Sync soon after:** an account, so a phone and a laptop share the same workouts and history. That needs a backend; picking one is its own piece of work.
- **The data is made ready for sync up front:** IDs that can't clash across devices (not 1, 2, 3), a changed-at time on every record, and deletions kept as markers so they sync too. The history needs more room than `localStorage`'s 500-entry cap allows.

### Not now

- Full programmes (phases, deloads), social features, and an iPhone app. The [feature docs](features/README.md) keep the iPhone app possible; it would build on sync.

## Order of work

1. **Foundations:** exercises (built-in and your own, with descriptions and the body map), the data reshaped for sync, Workouts naming, export/import.
2. **Feedback in the workout:** last time and personal bests.
3. **Progress pages.**
4. **Sync:** pick a backend, accounts, sync.
5. **Simple planning:** a weekly plan and "Due today".
6. **Suggested next weight.**

Sync sits after the progress pages so the app's most useful features arrive first, but its groundwork is in step 1, so nothing needs reshaping again.

Where it's got to (October 2026): steps 1–6 are done, with sync on Supabase in Europe, signing in by email or Google. Gym plans as they're written (sets, each side, varied sets, supersets and headings; see [sets-and-supersets](features/sets-and-supersets.md)) came in out of order, from a friend's plan, and are done too. Simple planning (step 5) followed: a weekly plan, with what's due today on Home. Google sign-in followed; Apple waits on an Apple Developer account.
