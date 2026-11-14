# Sets and supersets

Agreed with Dan on 2026-10-29, and built (all six steps below). Its rules now live in [build-a-workout](build-a-workout.md), [run-a-workout](run-a-workout.md), [history](history.md), [progress](progress.md), [settings](settings.md) and [data](data.md), which are the ones to go by where they differ from this plan. This file is kept as the plan as agreed, and for the shape of the data's version 5 (linked from the code). What's left over is in TODO.md's Known issues: the history doesn't name supersets, and a superset moves by its buttons rather than by dragging.

Today a workout is one list of steps that loops as a whole. A gym plan is written differently: each exercise has its own sets, with a rest between them, e.g.

> **Warmup**
> Exercise bike: 5 minutes
>
> **Knee rehabilitation**
> Single leg press: 3 × 10, 60 seconds rest between sets
> Low step down: 2 × 10 each leg, 45 seconds rest
> Seated hamstring curl: 3 × 12, 45 seconds rest
>
> **Upper body**
> Dumbbell bench press: 3 × 10, 60 seconds rest
> Seated cable row: 3 × 10, 60 seconds rest
> Dumbbell shoulder press: 2 × 10, 45 seconds rest

This adds what that needs: sets and rest on an exercise, exercises done one side at a time, sets that differ, supersets, and headings.

## Stories

- **BLD-9** As a user I want to give an exercise a number of sets and a rest between them (e.g. 3 × 10 with 60 seconds rest), so a gym plan goes in as it's written.
- **BLD-10** As a user I want an exercise done one side at a time (e.g. 10 reps each leg), so it runs the left, then the right, before the rest.
- **BLD-11** As a user I want each set of an exercise to have its own reps and weight (e.g. 12 @ 40 kg, 10 @ 45 kg, 8 @ 50 kg), for a pyramid or warm-up sets.
- **BLD-12** As a user I want a superset (or, of three or more, a giant set): exercises done one after another, then a rest, for a number of rounds.
- **BLD-13** As a user I want to add headings to a workout (e.g. "Warmup", "Upper body"), so a long workout is easy to follow.
- **RUN-10** As a user I want the workout to show which set, side or round I'm on, and the section I'm in, so I know where I am in a long gym workout.

## Rules

### A workout

- A workout is a list of **exercises**, **supersets** and **headings**, in order, and its whole-workout **Repeat** (rounds or a time limit) as now. Repeat starts at 1 round, so most gym workouts run once.
- An **exercise** is a step as now (Reps, Timed or Rest), plus **Sets** and **Rest after each set**, and the **Each side** and **Vary each set** switches.
- A **superset** is two or more steps done in order, then **Rest after each round**, for a number of **rounds**. Its steps can be any kind, so rest steps can go in the middle of it as well (e.g. bench, rest 0:15, row).
- A **heading** is a label only: it doesn't loop and takes no time.
- Every saved workout from before this becomes one group of its steps, run once a round, so it runs exactly as it did (see Data).

### Sets and rest (BLD-9)

- **Sets: 1 to 30**, on a wheel. A new exercise has 1 set.
- **Rest after each set**: 0:00 to 99:59, on Minutes and Seconds wheels, shown once Sets is above 1. It starts at **1:00** the first time Sets goes above 1.
- The rest comes **after each set, the last included**: 3 sets is set, rest, set, rest, set, rest, then what's next. It's skipped at the end of the workout, and when a rest step comes next (which takes its place).
- Nothing is added between one exercise and the next. A rep step waits for Done anyway, so the next exercise starts when the user is ready; a rest between exercises is a Rest step of its own.
- A **Rest step** has no Sets or Rest after each set: it's just a time, as now.
- Timed exercises have sets too, e.g. "Plank: 3 × 0:45, rest 0:30".

### Each side (BLD-10)

- An **Each side** switch on Reps and Timed steps, off to start with.
- Each set runs **both sides, the first side first**, then the rest between sets. The face says which, e.g. "Low step down" with "Left side" under it.
- **Which side goes first** is a setting: **Start with**, Left or Right, Left to begin with. It applies to every exercise done each side.
- On a rep step, the second side waits for Done like any rep step, so nothing extra runs between sides.
- On a timed step (e.g. side plank), a **"Switch sides" countdown** runs between the two, in the rest colour. It isn't a set and isn't logged. How long it is, is a setting: **Switch sides**, Off or 1 to 30 seconds, **5 seconds** to begin with. Off goes straight from one side to the other.
- Both settings are in Settings under a new **Workouts** heading, are kept per device as other settings are, and go in backups (see [settings](settings.md) once built).
- The reps (or time) and weight are for **each side**: "2 × 10 each side" is 10 left and 10 right per set.
- A left and right together count as **one set** wherever sets are counted (e.g. "2 × 10 each side", the muscle bars' sets a week, PRG-8), though each side is logged on its own (see [history](history.md)).

### Vary each set (BLD-11)

- A **Vary each set** switch on a rep or timed step with more than 1 set. Off, every set has the step's one Reps and Weight (or time), as now.
- On, the sets are listed as rows under it: "Set 1 · 12 × 40 kg", "Set 2 · 10 × 45 kg"… for reps, or "Set 1 · 0:30", "Set 2 · 0:45"… for a timed step. Tapping a row opens its **Reps and Weight wheels**, or its **Minutes and Seconds wheels**, one row at a time, closing the others; the rows slide as steps do when they open and close.
- Turning it on starts every row at the step's Reps and Weight (or time). Turning it off sets every set back to set 1's.
- Raising Sets adds a row **copied from the last set**; lowering it removes rows from the end.
- In a superset, the switch is **Vary each round**, with a row per round.
- For an exercise done each side, a row is for both sides.

### Supersets (BLD-12)

- **What it's called goes by how many exercises are in it:** a **superset** with 2, a **giant set** with 3 or more (rest steps don't count). It's one thing either way, and the name changes by itself as exercises are joined or taken out, wherever it shows (Create, the run screen, the history). There's no "circuit": going round the whole workout is Repeat the whole workout, as now.
- Made by **Join with next** on an exercise, which joins it and the next exercise into a superset with the first one's Sets as its rounds, and its Rest after each set as the Rest after each round. Doing it again on the superset adds the next exercise to it, making it a giant set.
- A superset shows as one card: a heading line "Superset" (or "Giant set"), a **Rounds** wheel (1 to 30), **Rest after each round** (as Rest after each set), and its steps inside it, each as a step is now, with Each side and Vary each round, but no Sets of its own.
- **+ Step** inside it adds a rep step at its end. Its steps move up and down within it.
- **Take out** on one of its steps makes it an exercise of its own again, just after the superset, with the superset's rounds as its sets. A superset left with one step becomes that exercise, the same way.
- Rest after each round comes after each round, the last included, as for sets.

### Headings (BLD-13)

- **+ Heading** adds a heading at the end, opened with the cursor in its box: "Heading", e.g. "Warmup", up to 40 characters, trimmed when saved. One left empty is left out when the workout's saved.
- A heading moves, collapses and is deleted (with Undo) as a step is. Up to **10 headings**, which don't count towards the steps.
- A heading collapsed shows its text in the style of a section title, so a collapsed workout reads as its plan.

### Building it in Create

- **+ Step** stays the main button and adds a rep exercise with 1 set. **+ Heading** sits beside it.
- **Up to 20 steps**, as now, counting each step once however many sets, sides or rounds it has, and each step in a superset. His plan above is 7.
- A collapsed exercise says what it does, as the history would: "Single leg press · 3 × 10 @ 40 kg · rest 1:00", "Low step down · 2 × 10 each side · rest 0:45", "Leg press · 12, 10, 8 @ 40–50 kg · rest 1:00". A collapsed superset lists its steps' names and "3 rounds · rest 1:00".
- Rounds or Time limit is now headed **Repeat the whole workout**, and stays at the bottom.
- A workout needs **some work**, as now. Steps at 0:00 or 0 reps are still left out when saved, and a superset or exercise left with nothing in it goes with them.

### Running it (RUN-10)

- The workout runs in this order: for each round of the whole workout, each exercise or superset in turn; for each of its sets (or rounds), each of its steps; for each side, left then right; then the rest after each set, except at the end of the workout or before a rest step.
- **Rest at the very end of the workout is skipped**, as now, so the last set's rest and any rest steps after the last work never run.
- **The section line**, above the ring: the heading of the part it's in, if there's one before it, and how far through the workout's exercises it is, e.g. "Knee rehabilitation · 2 of 7". Supersets count as one, and Rest steps and headings don't count. Screen readers hear "Knee rehabilitation, exercise 2 of 7" as each exercise starts.
- **The round line** is the exercise's or superset's:
    - "set 2 of 3" for an exercise of more than one set, and "round 2 of 3" for a superset, with a dot per set or round when there are 15 or fewer.
    - Nothing for an exercise of one set.
    - When the whole workout repeats, its round follows, e.g. "set 2 of 3 · round 1 of 2". With a time limit, it's "round 3" and the time left, as now.
- **The face** has "Left side" or "Right side" under the name for an exercise done each side.
- **Next**: during the rest between sets, what's after it says which set, e.g. "then Single leg press · set 3 of 3 · 10 reps @ 40 kg". "Next:" on a rep step says the rest, the other side ("Next: Right side · 10 reps"), or the next exercise.
- **The step strip** shows the steps of the current set or round, as it shows a round now, only for a superset with more than one work or rep step.
- **Moving on**: a new set or round turns the face's drum right to left, as a new round does now; a new exercise, or the other side, rolls up from below as a new step does.
- **Time left of the whole workout** works as now: shown only when every step is timed and the workout has a set number of rounds.
- **Time limit**: the score counts steps as before, every set and every side of a step being a step, rests left out ("7 rounds + 3").

### Changing reps or weight mid-workout (RUN-6)

- On an exercise whose sets are the same, a change applies to **this set and the sets still to come**, and to the saved workout, as it does to the rest of the rounds now.
- On one with **Vary each set** on, it applies to **this set only**, in this workout and the saved one.
- For an exercise done each side, it applies to both sides of the set.

### The history, summary and progress

- Each side is **logged as its own set**, with which side it was, so a weaker side shows up in its reps.
- The history's lines, and the summary's:
    - "Low step down: 2 × 10 each side", or "Low step down: left 10, 8 · right 2 × 10" if the sides differ.
    - Varied sets read as they do now when sets differ: "Single leg press: 12 @ 40, 10 @ 45, 8 @ 50 kg", or "Plank: 0:30, 0:45, 1:00".
- **Headings in the history:** an entry's lines are grouped under the workout's headings as they were when it ran, in order, e.g. "Warmup", then "Exercise bike: 5:00"; "Knee rehabilitation", then its three lines. Lines before the first heading come first, with none over them. A heading with no sets under it (e.g. a section stopped before) isn't shown. Renaming or deleting a heading later doesn't change past entries. The workout summary's sets are grouped the same way. Screen readers hear them as headings within the entry.
- **"Use these settings next time?"** (RUN-7): Yes puts each set's reps and weight back on the step as done. Sets that all came out the same stay one Reps and Weight; sets that differ turn on Vary each set, so a pyramid worked out mid-workout is kept.
- **Last time** (PRG-1) on a rep step: for a step with Vary each set on, the same set last time, e.g. "Last time: 10 @ 45 kg" on set 2; otherwise as now.
- **Next time** (PRG-10): when every set (both sides) got its reps. For varied sets, the step up is the same for every set, so the shape stays, e.g. "Single leg press: try 2.5 kg more on each set", and Apply adds it to every set.
- **Suggested next weight** (PRG-5) mid-workout, on a step with Vary each set on:
    - Each set of last time is judged against **its own reps**, not just the heaviest: where every set (both sides) got its reps, the whole step moves up one step, 2.5 kg or 5 lb, as now. Where any set fell short, nothing's suggested.
    - It shows **once, on set 1**, under Last time: "↑ Try 2.5 kg more on each set". Pressing it adds that to set 1, every set still to come and the saved workout, so the pyramid keeps its shape.
    - As now, it goes once a weight on the step has been changed, by the button, a wheel or in setup, and shows nothing for sets with no weight.
    - There's no suggestion per set: moving some sets up and not others would change the shape the user built. It agrees with Next time on the summary, which steps up every set alike.
    - On a step whose sets are the same, it's as now.
- Bests, charts, the body map and the muscle bars go by exercise, as now (with a left and right counting as one set).

### Limits

| What                          | Limit                                  |
| ----------------------------- | -------------------------------------- |
| Sets on an exercise           | 1–30                                   |
| Rounds of a superset          | 1–30                                   |
| Rest after each set or round  | 0:00–99:59                             |
| Steps in a workout            | 20, as now                             |
| Steps in a superset           | 2 up to the 20                         |
| Headings                      | 10, up to 40 characters each           |
| Switch sides, on a timed step | Off, or 1–30 seconds (5 to begin with) |

## Acceptance criteria

- Given single leg press at 10 reps, 3 sets and 1:00 rest, then it runs set 1 (waiting for Done), rest 1:00, set 2, rest 1:00, set 3, and straight on to the next exercise with no rest.
- Given an exercise of 3 sets, when Sets goes from 1 to 3, then Rest after each set shows at 1:00.
- Given an exercise of 3 sets as the last thing in a workout, then the workout finishes on the last set's Done.
- Given low step down at 10 reps, each side, 2 sets and 0:45 rest, then it runs Left side, Right side, rest 0:45, Left side, Right side; the history says "Low step down: 2 × 10 each side", and the muscle bars count 2 sets.
- Given a 0:30 side plank done each side, then a 0:05 "Switch sides" runs between the left and right, and neither it nor any rest is logged.
- Given Start with set to Right, then low step down runs Right side, then Left side; given Switch sides set to Off, then a side plank goes straight from one side to the other.
- Given a plank of 3 sets with Vary each set on at 0:30, 0:45 and 1:00, then each set counts down its own time, and the history says "Plank: 0:30, 0:45, 1:00".
- Given a workout with headings "Warmup" and "Knee rehabilitation", when it's done, then its history entry shows the bike's line under "Warmup" and the three knee lines under "Knee rehabilitation"; when the heading is renamed afterwards, then the entry still says "Knee rehabilitation".
- Given 3 sets of 10 @ 40 kg, when Vary each set is turned on, then there are 3 rows of 10 × 40 kg; when Sets goes to 4, then a 4th row copies the 3rd.
- Given sets of 12 @ 40, 10 @ 45 and 8 @ 50 kg, when I change set 2 to 47.5 kg mid-workout, then only set 2 changes, here and in the saved workout.
- Given 3 equal sets of 10 @ 40 kg, when I change set 2 to 45 kg mid-workout, then sets 2 and 3 run at 45 kg and the saved workout has 45 kg.
- Given sets done at 12 @ 40, 10 @ 45 and 8 @ 50 kg on a step of equal sets, when I answer "Yes, use next time", then the step has Vary each set on with those three sets.
- Given bench press and seated cable row, when I pick Join with next on bench press (3 sets, 1:00 rest), then they're a superset of 3 rounds with 1:00 rest between rounds; it runs bench, row, rest, bench, row, rest, bench, row, rest, then what's next.
- Given that superset, when I join shoulder press to it, then it's called a giant set; when I take shoulder press out again, then it's a superset.
- Given a superset of two steps, when I take one out, then both are exercises of their own, each with the superset's rounds as its sets.
- Given last time's sets of 12 @ 40, 10 @ 45 and 8 @ 50 kg all got their reps, then set 1 shows "↑ Try 2.5 kg more on each set"; pressing it makes them 42.5, 47.5 and 52.5 kg, here and in the saved workout. Given set 3 got 7, then nothing's suggested.
- Given headings "Warmup" and "Knee rehabilitation", then while on single leg press the section line says "Knee rehabilitation · 2 of 7".
- Given a heading left empty, when I save, then it's left out.
- Given a workout saved before this, then it runs, logs and shows in the history exactly as it did.
- Given the plan at the top of this file, when it's built, then it fits in 7 steps and 3 headings, and runs as written.
- Given a step with Vary each set on and 3 rows, when a backup sets its group to 4 rounds, then the rows are dropped on loading and every set has the step's reps and weight.

## Data

The new shape, when it's all built. Groups and headings came in with `data-version` 5 and backup file version 8 (step 1 below, and in [data](data.md)); each later step that adds a field (`eachSide`, `sets`, `side`, a history entry's `headings`) raises the backup version again, so an older copy of the app turns a workout with it down, or leaves it on the server, rather than saving it back without it:

```json
{
    "id": "5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
    "title": "Knee and upper body",
    "updatedAt": 1761735600000,
    "repeats": 1,
    "blocks": [
        { "kind": "heading", "text": "Warmup" },
        {
            "kind": "group",
            "rounds": 1,
            "restSeconds": 0,
            "steps": [{ "kind": "work", "seconds": 300, "name": "Exercise bike" }]
        },
        { "kind": "heading", "text": "Knee rehabilitation" },
        {
            "kind": "group",
            "rounds": 3,
            "restSeconds": 60,
            "steps": [
                {
                    "kind": "reps",
                    "reps": 12,
                    "weight": 40,
                    "name": "Single leg press",
                    "sets": [
                        { "reps": 12, "weight": 40 },
                        { "reps": 10, "weight": 45 },
                        { "reps": 8, "weight": 50 }
                    ]
                }
            ]
        },
        {
            "kind": "group",
            "rounds": 2,
            "restSeconds": 45,
            "steps": [{ "kind": "reps", "reps": 10, "name": "Low step down", "eachSide": true }]
        },
        { "kind": "heading", "text": "Upper body" },
        {
            "kind": "group",
            "rounds": 3,
            "restSeconds": 60,
            "steps": [
                { "kind": "reps", "reps": 10, "weight": 20, "name": "Dumbbell bench press" },
                { "kind": "reps", "reps": 10, "weight": 35, "name": "Seated cable row" }
            ]
        }
    ]
}
```

- `blocks` takes the place of `steps`. A **group** with one step is an exercise (its `rounds` are its sets); with two or more, a superset. A group's `steps` are steps as now, with `exerciseId` and the rest.
- `restSeconds`: after each round, the last included unless it ends the workout or a rest group comes next; 0 for none.
- `eachSide` (Reps and Timed steps, optional): `true` for each side; missing for not.
- `sets` (rep and timed steps in a group of more than one round, optional): one `{ reps, weight? }` (rep steps) or `{ seconds }` (timed steps) per round, for Vary each set. Its length is the group's `rounds`; one that isn't is dropped when loading, leaving the step's own reps and weight or time. The step's `reps` and `weight`, or `seconds`, are set 1's, so a step always reads as a whole one.
- **4 → 5**: each workout's `steps` become one group of `rounds` 1 and `restSeconds` 0, with no headings, and its `repeats` and `timeLimitSeconds` stay as they are. So it runs exactly as before.
- A **logged set** gets two optional fields: `set`, which set or round of its group it was, from 0 (missing means 0), and `side`, `"left"` or `"right"` (missing for neither). `round` stays the round of the whole workout, and `step` becomes the step's place among all the workout's steps, counting each step once from the start, across groups. A workout from before this is one group, so its old sets' numbers already mean the same: **the history needs no conversion.**
- A **history entry** gets `headings` (optional): the workout's headings when it ran, as `{ "text": "Knee rehabilitation", "step": 1 }`, where `step` is the number of the first step after it (counted as a set's `step` is). Missing for none, as in every entry from before this.
- **Settings** get `eachSideFirst` (`"left"` or `"right"`, `"left"` when missing) and `switchSidesSeconds` (0 for Off, up to 30; 5 when missing).
- **Version 7 and older backup files** have workouts with `steps`, and are converted as saved data is. A file from version 8 is turned down by an older copy of the app, as any newer file is.
- **Sync**: a workout written in version 5 is left alone by a copy of the app that's older, until it's updated (as now for any newer row).
- **The AI prompt** (SYN-6) writes the new shape: sets, rests, each side, varied sets, supersets and headings, straight from the plan, in place of today's advice on turning sets into rounds or steps.

## Building it

Each a PR of its own, in this order, each updating the AI prompt and the feature docs for what it adds:

1. ✅ **The new shape, with nothing to see:** `blocks` (groups and headings), the 4 → 5 conversion, backup version 8, `set` on logged sets, and one place that turns a workout into its run order (`runPlan()`). Every workout is one group, so the app works exactly as it did. Until step 2, Create edits a workout as one list of steps, so saving a workout with groups or headings from Create (only possible from a file written by hand) makes it one group again.
2. ✅ **Sets and rest between sets (BLD-9)**, in Create and the run, with the round line, the history, the summary, Last time and Next time. Its rules are now in [build-a-workout](build-a-workout.md) and [run-a-workout](run-a-workout.md). Create saves each step as a group of its own; until supersets (step 6), a workout from a file with a group of several steps is saved as a group of each when edited there.
3. ✅ **Each side (BLD-10)**, with its two settings, and backup version 9. Its rules are now in [build-a-workout](build-a-workout.md), [run-a-workout](run-a-workout.md), [history](history.md) and [settings](settings.md).
4. ✅ **Headings (BLD-13)**, the section line (RUN-10), headings in the history and summary, and backup version 10. Its rules are now in [build-a-workout](build-a-workout.md), [run-a-workout](run-a-workout.md), [history](history.md) and [data](data.md).
5. ✅ **Vary each set (BLD-11)**, and the mid-workout, "Use next time" and suggested next weight rules for it, and backup version 11. Its rules are now in [build-a-workout](build-a-workout.md), [run-a-workout](run-a-workout.md), [progress](progress.md) and [data](data.md).
6. ✅ **Supersets and giant sets (BLD-12)**, in Create and the run, with no new data (a group of several steps was already its shape), so no new backup version. Its rules are now in [build-a-workout](build-a-workout.md) and [run-a-workout](run-a-workout.md). A superset was moved only by its buttons at first, and has been dragged whole by its handle since 2026-10-30. The history and the summary have named supersets since backup version 12, when entries got `supersets`.

After step 2, the plan at the top can be built with sets (each leg as 20 reps for now); after step 4, as written.

## Platform notes

- **Run order, once:** the clock (`workoutStateAt()` in `src/app/models/workout-state.ts`), the alarms and `setsDone()` work on one flat round of steps now. A pure function can turn a workout into that flat order, each entry carrying its group, set, step and side, with group rests as rest entries and Switch sides as its own. The maths then works as it does, and the round line, the history's sets and Next all read from the entries. Everything else that walks a workout's steps (the library card, the muscles a workout works, links to exercises, the AI prompt, backups) goes through helpers in `src/app/models/workout.ts` for all steps rather than reading `steps`.
- **History lines** already group sets by `step`, so numbering steps across the whole workout keeps that code working, and old entries keep their meaning.
- **iOS:** the same shape and run order. A superset in Create can be a `Section` of a `List`, with its Rounds and Rest in the section's header.
