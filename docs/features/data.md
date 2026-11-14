# Data

What the app saves, and in what shape. Everything is on the device. Signed in, the workouts, the library's order, the history, your own exercises, notes, hidden exercises, ready-made favourites and your reps and weights on ready-made workouts, deletions and the profile are kept with the account too, as rows of one table on the server, in the same shapes as here (see [backup-and-sync](backup-and-sync.md), Sync); the other settings and the run in progress aren't.

**Ready for sync:** every workout and history entry has an id that can't clash with another device's (random, not 1, 2, 3) and an `updatedAt`, the time it last changed in ms since 1970. Deleting one leaves a marker in `deleted`. Merging two copies (a backup now, another device later) goes by id: the most recent change to each record wins, and a deletion wins over changes made before it. See [backup-and-sync](backup-and-sync.md).

## Saved for good (`localStorage` on the web, the history in IndexedDB)

### `workouts`: the library

A JSON list of workouts:

```json
[
    {
        "id": "5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "title": "Circuit",
        "updatedAt": 1760952000000,
        "repeats": 5,
        "blocks": [
            { "kind": "heading", "text": "Circuit" },
            {
                "kind": "group",
                "rounds": 1,
                "restSeconds": 0,
                "steps": [
                    { "kind": "work", "seconds": 45, "name": "Squats" },
                    { "kind": "rest", "seconds": 15, "name": "" },
                    { "kind": "reps", "reps": 20, "name": "Push-ups" }
                ]
            }
        ]
    }
]
```

- `id`: a random UUID, given when the workout is made and never changed.
- `updatedAt`: when it was made or last changed (edited, or its reps or weight changed mid-workout).
- `repeats`: 1–30, or **0 for until stopped**.
- `blocks`: the workout in order (see [sets-and-supersets](sets-and-supersets.md)), each a **group** or a **heading**, with at least one group.
    - A group: `rounds`, how many times its `steps` run, 1–30 (an exercise's sets, or a superset's rounds: a group of two or more steps is a superset, made in Create with Join with next, BLD-12); `restSeconds`, the rest after each of its rounds, 0–5999 (0 for none, and none with one round): after the last round too, unless the next group is only rest (which takes its place) or it ends the workout; and `steps`, at least one, as below. A broken one (or a block of any other `kind`) makes the workout unusable.
    - A heading: `text`, a label, trimmed, 1–40 characters, which takes no time (BLD-13). Up to 10; a broken one, or any past 10, is dropped, keeping the workout.
    - A workout's steps are numbered in order across its groups, from 0, each once however many rounds its group has: that's a set's `step` in the history.
- `timeLimitSeconds` (optional): a time limit, 1–5999 (99:59), for as many rounds as fit in it (BLD-8). Only with `repeats` 0, so a copy of the app from before time limits runs it until stopped. Missing for none; one that's broken, or with `repeats` above 0, is dropped when loading, leaving the workout as it was set to repeat.
- `favourite` (optional): `true` for a workout marked with its heart on Workouts, to filter by (since 2026-11-06). Missing for not; anything else saved there is dropped when loading. Marking or unmarking one is a change to the workout, so it moves `updatedAt` on and syncs with it; editing it in Create keeps it. A copy of the app from before it reads the workout without it.
- `seconds`: 1–5999 (99:59). `reps`: 1–100. `name`: may be empty.
- `weight` (rep steps only, optional): in **kg whatever unit is shown**, to the gram, more than 0 and up to 300. Missing for none. A weight picked in lb is converted (1 lb = 0.45359237 kg), so 45 lb saves as 20.412 kg.
- `exerciseId` (work and rep steps, optional): the exercise the step is, e.g. `builtin:back-squat`, or one of your own. Set by picking an exercise in setup (EXR-2). When a workout is saved, a step keeps its exercise while that exercise is still there; any other named work step is linked by its name, as the conversion to version 3 does (below). Typing over a step's name in setup drops its link, so a renamed step follows its name. Missing for a rest or an unnamed step.
- `eachSide` (work and rep steps, optional): `true` for a step done one side at a time (BLD-10), its reps or time for each side. Missing for not; anything else saved there, or on a rest step, is dropped when loading.
- `sets` (work and rep steps in a group of more than one round, optional): Vary each set (BLD-11), one `{ "reps": 12, "weight": 40 }` (rep steps; `weight` in kg, missing for none) or `{ "seconds": 30 }` (work steps) per round of its group, in order. The step's own `reps` and `weight`, or `seconds`, are set 1's, so it reads as a whole step. Missing for every set alike. One whose length isn't the group's `rounds`, or with a broken set, or on a rest step, is dropped when loading, leaving every set the step's own.
- A workout with no work (no timed step with time, and no rep step) isn't valid.
- **Before groups** (data version 4, backup version 7): a list of `steps` in place of `blocks`. It's read as one group of them, run once a round, so it runs exactly as before; the conversion to version 5 saves it that way.
- **Older format:** workouts saved before steps existed (when they were timers of one work and one rest time) have `timerMinutes`, `timerSeconds`, `restMinutes`, `restSeconds` in place of `steps`. They're read as a timed step plus a rest step (left out if 0), and saved in the new format the next time anything changes.

### `library-moved-at`: when the library was last reordered

When a workout was last moved in the library (LIB-3), in ms since 1970, or missing if none has been. Since 2026-11-06 the list is A to Z and nothing moves a workout here, but an order from another device or a backup still merges in as below. `workouts` is saved in the library's order, and with this the order merges as a record of its own: `{ "ids": [...], "updatedAt": … }`, the workouts' ids in order and this time. Another copy's order is taken only if it was moved more recently (see [backup-and-sync](backup-and-sync.md)).

### `week-plan`: the weekly plan

The weekly plan (PLN-1, see [planning](planning.md)): `{ "days": [[…], …], "updatedAt": …, "plannedAt": { "0:<workout id>": …, … } }`, seven lists of workout ids (yours, or ready-made ones' `builtin:` ids since 2026-11-06), Monday first, up to 10 each, when it last changed in ms since 1970 (0 if it never has), and, optionally, when each workout was put on its day, by the device's clock, keyed by the day (0 for Monday) and the workout's id (PLN-3, since 2026-11-04). `plannedAt` leaves out workouts planned before it came in; it's dropped for any no longer planned, and any time that isn't one. It syncs and backs up with the plan; a copy of the app from before it reads the plan without it. It merges as a record of its own: another copy's plan is taken only if it changed more recently. A broken one is read as an empty plan.

### `history`: the history

In IndexedDB on the web: the `history` store of the `loop-workouts` database, one record per entry keyed by its `id`, with no limit on how many. Shown here as a list, as in a backup:

```json
[
    {
        "id": "1760952300000-5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "workoutId": "5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "title": "Circuit",
        "startedAt": 1760952300000,
        "endedAt": 1760953050000,
        "updatedAt": 1760953050000,
        "activeSeconds": 750,
        "roundsCompleted": 5,
        "totalRounds": 5,
        "outcome": "finished",
        "note": "felt strong",
        "headings": [{ "text": "Circuit", "step": 0 }],
        "repSeconds": 310,
        "sets": [
            { "round": 0, "step": 0, "name": "Squats", "reps": 10, "weight": 60 },
            {
                "round": 0,
                "step": 1,
                "name": "Plank",
                "seconds": 45,
                "exerciseId": "builtin:plank"
            },
            { "round": 1, "step": 0, "name": "Squats", "reps": 8, "weight": 62.5 },
            { "round": 1, "step": 1, "name": "Plank", "seconds": 45, "exerciseId": "builtin:plank" }
        ]
    }
]
```

- Times are ms since 1970 (UTC).
- `id` is `<startedAt>-<workoutId>`: unique per run, so the same run logged again replaces its entry, and the same run matches across copies.
- `updatedAt`: when it was last logged or its note changed.
- `totalRounds` is 0 for a workout that runs until stopped or to a time limit. `outcome` is `finished` or `stopped`; a time limit that ran out is `finished`.
- `timeLimitSeconds` (optional): the workout's time limit, when it had one. `stepsIntoRound` (optional): when the time limit ran out, how many steps of the round it ran out in were done, rests left out, so "7 rounds + 3" is `roundsCompleted` 7 and `stepsIntoRound` 3. Both are dropped when broken, and `stepsIntoRound` is missing for a run stopped before its time limit. `note` is missing when there isn't one (up to 120 characters).
- `sets` (missing when there were none), in order: one per Done on a rep step, and one per timed work step of an exercise that ran to its end or was skipped part-way (RUN-12). `round` (of the whole workout) and `step` (of the workout's steps, each counted once; see `blocks`) count from 0. `set` (optional) is which round of its group it was in, from 0, and is missing for 0, as in every entry from before groups. `side` (optional) is `left` or `right`, for a step done each side, each side being a set of its own. A rep set has `reps`, at least 1, and `weight` in kg (missing for none); a timed set has `seconds` (1–5999, the step's length, or up to where it was skipped) and no `reps` or `weight`. Entries from before timed sets were logged have rep sets only. `exerciseId` is the exercise it was, from its step (missing for an unnamed step). A broken set is dropped when loading, keeping the rest of the entry.
- `headings` (optional): the workout's headings when it ran (BLD-13), in order, each `text` (trimmed, not empty) and `step`, the number of the first step after it, counted as a set's `step` is. The history groups an entry's sets under them. Missing for none, as in every entry from before headings; a broken one is dropped when loading, keeping the rest.
- `supersets` (optional): the workout's supersets and giant sets when it ran (BLD-12), in order, each `kind` (`"superset"` or `"giant set"`), `step`, the number of its first step, counted as a set's `step` is, and `steps`, how many steps it has, rests included (at least 1). The history groups the lines of its steps together. Missing for none, as in every entry from before; a broken one is dropped when loading, keeping the rest.

- `repSeconds` (optional, since 2026-11-14): the time spent on rep steps, in whole seconds, pauses left out. Against a guess for the sets of reps logged, it's your pace on the workout, for the estimate of how long it takes (see How long it takes in [library](library.md), LIB-9). Missing for a run with no sets of reps, and in entries from before; a broken one is dropped when loading, keeping the entry. An older app keeps it as it is, so the backup's version didn't change. For a short time before it, runs logged `expected` (`timedSeconds` and `repSeconds`, what the run was expected to take) for the same reason; it's dropped when loading.

**`history-pending` (`localStorage`):** each change to the history is kept here too until IndexedDB confirms it, as a JSON list of entries, since a write started as the page closes (logging a run left mid-way) may never finish. On the next load anything still here is saved to IndexedDB, the most recent change to each entry winning, and a deletion made after an entry's last change (in `deleted`) wins over it. If IndexedDB can't be used at all, the history stays here.

**Moving in:** until October 2026 the history was a JSON list in `localStorage` under `history`, at most 500 entries. On load it's moved into IndexedDB, the same way, and the key removed once it's saved there.

### `exercises`: your own exercises

A JSON list of the exercises you've made (EXR-9); the built-in ones come with the app and aren't saved. Each has the built-in ones' fields ([exercises](exercises.md)), most of them empty until you fill them in, plus an `id` (random) and `updatedAt`:

```json
[
    {
        "id": "71652dd3-bf96-4c6b-9ebd-8d9052e2ba0a",
        "updatedAt": 1761060000000,
        "name": "Wall sit hold",
        "otherNames": [],
        "equipment": [],
        "measuredBy": "timed",
        "mainMuscles": [],
        "supportingMuscles": [],
        "description": "",
        "steps": [],
        "tips": []
    }
]
```

- `measuredBy` is `reps` or `timed`. One needs an `id` (never starting `builtin:`), a `name` and a date; missing or broken lists read as empty, and unknown muscles are dropped.

### `exercise-notes`: your notes on exercises

A JSON list of `{ "id": "<exercise id>", "text": "Pause at the bottom", "updatedAt": … }`, one per exercise with a note (EXR-10), built-in or your own. `text` is up to 200 characters. Removing a note leaves a deletion.

### `hidden-exercises`: exercises hidden from the picker

A JSON list of `{ "id": "<exercise id>", "updatedAt": … }`, one per exercise hidden from the picker in Create, built-in or your own. Showing one again removes it and leaves a deletion.

### `ready-made-favourites`: ready-made workouts made favourites

A JSON list of `{ "id": "builtin:<its name>", "updatedAt": … }`, one per ready-made workout (LIB-6) with its heart pressed (LIB-8, since 2026-11-06), as a ready-made workout isn't your data to mark. Taking the heart off removes it and leaves a deletion, of the kind `ready-made-favourite`, as hidden exercises do. One whose id isn't a ready-made one's is dropped when loading. Your own workouts' hearts are `favourite` on the workout.

### `ready-made-changes`: your reps, weights and times on ready-made workouts

A JSON list of `{ "id": "builtin:<its name>", "updatedAt": …, "steps": [{ "step": 1, "exerciseId": "builtin:romanian-deadlift", "reps": 8, "weight": 60 }, …] }`, one per ready-made workout (LIB-6) whose reps or weights you've changed (since 2026-11-08). Each step is a rep step's place in the workout (counted as a logged set's `step` is), the exercise it was, and its reps, weight in kg (missing for none) and `sets` where they vary, as on a step (BLD-11). A timed exercise's step (since data version 16, 2026-11-11) has `seconds` and `sets` of `{ "seconds": … }` where they vary, in place of reps and weight, e.g. `{ "step": 4, "exerciseId": "builtin:plank", "seconds": 30 }`. Only its reps, weights and times: its exercises and everything else stay as the app has them. A step that isn't that exercise in the app any more is left as it comes, as are `sets` that don't fit its sets now. A step put back as it came is dropped, and once none are left, the record is removed, leaving a deletion of the kind `ready-made-change`, as is Reset reps and weights. One whose id isn't a ready-made one's, or with no `steps`, is dropped when loading, as is any step that isn't usable.

### `deleted`

The last 5,000 workouts, history entries, exercises of your own, notes and hidden exercises deleted (shown again), oldest first, so a deletion reaches other copies and a run still going can't log itself back in (see [history](history.md)):

```json
[
    {
        "kind": "history",
        "id": "1760952300000-5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "deletedAt": 1760960000000
    }
]
```

`kind` is `workout`, `history`, `exercise`, `exercise-note` or `hidden-exercise` (whose `id`s are the exercise's). Undo in the history takes its marker away.

### `data-version`

Which shape the rest is in: `5`. Missing means 1, from before it was saved. On load, older data is converted once, a version at a time, before anything reads it. The step to version 4 only changes names, so it goes first, and the steps below are described with the names as they are now.

**4 → 5, groups:** each workout's `steps` become `blocks` of one group of them, with `rounds` 1 and `restSeconds` 0, so it runs exactly as before. The history doesn't change: a set's `step` already counts the workout's steps from the start.

**1 → 2, ready for sync:**

- each workout's number id becomes a new random one, and it gets `updatedAt` (the time of the conversion)
- each history entry's `workoutId` becomes its workout's new id (or, for a workout since deleted, the old number as text), and it gets `updatedAt` (when it ended); its own `id` stays
- `history-deleted`, version 1's list of deleted history ids, becomes markers in `deleted`

`legacy-workout-ids` keeps each old number and its new id, so a workout in progress when the app updated still finds its workout.

**3 → 4, workouts, not timers (EXR-5):** what were called timers are called workouts, in the saved data too:

- `timers` moves to `workouts`, and `legacy-timer-ids` to `legacy-workout-ids`
- each history entry's `timerId` becomes `workoutId`
- a deletion of kind `timer` becomes kind `workout`

The run in progress in a tab moves too (`activeTimerId`, `activeTimerStartedAt` and `activeTimerPausedAt` become the `activeWorkout…` keys below). That's done whenever a tab loads rather than once, since each tab has its own.

**2 → 3, exercises (EXR-4):** each named work step in a workout, and each named set in the history, gets the `exerciseId` its name means: a built-in exercise where the name, or one of its other names, matches (ignoring case, spaces and a plural "s"), and otherwise a new exercise of your own, one per name, measured by reps for a rep step and by time for a timed one. Rest and unnamed steps aren't linked. As the built-in exercises aren't in the first download (since 2026-11-10), a device with workouts or history to convert this way loads them before the app starts (`prepareSavedData()` in `migrate.ts`); the conversion never runs without them, as it would make an exercise of your own for every built-in name. Other devices don't wait.

### `settings`

```json
{
    "theme": "dark",
    "sound": true,
    "vibration": true,
    "countdownBeeps": true,
    "keepScreenOn": true,
    "weightUnit": "kg",
    "bodyFigure": "male",
    "myEquipment": ["barbell", "rack"],
    "onlyMyEquipment": false,
    "eachSideFirst": "left",
    "switchSidesSeconds": 5,
    "name": "Sam",
    "profileUpdatedAt": 1793000000000
}
```

`theme` is `dark`, `light` or `system`. `countdownBeeps` is the Countdown beeps switch (ALM-5), on by default. `weightUnit` is `kg` or `lb`. `bodyFigure` is `male` or `female`. `myEquipment` is the equipment you have, picked in the setup or on the Exercises page, in the order it's offered there (unknown pieces are dropped), or `["none"]` for **No equipment** (since 2026-11-06), which is dropped if saved beside any piece; `[]` is none picked yet; `onlyMyEquipment` is its Only what I have switch, which filters both. `eachSideFirst` is `left` (the default) or `right`, and `switchSidesSeconds` 0 (Off) to 30, 5 by default (BLD-10); anything else is the default. `name` is what Today greets you by (SET-7), trimmed and at most 40 characters, `''` if not given. `name`, `bodyFigure`, `trainingGoal`, `weightUnit` and `myEquipment` are the profile, which syncs as one record (kind `profile`, id `me`, with those fields and `updatedAt`); `profileUpdatedAt` is when any of them last changed, by the sync clock, or 0 if never here (a device not set up, or signed out of), when it isn't sent. A backup's `settings` has `name` but not `profileUpdatedAt`.

### `sb-cpgacyzlfyskifzhkotu-auth-token`: who's signed in

Kept by Supabase's client while you're signed in (SYN-3): the sign-in tokens and the account's id and email. Signing out removes it; so does Clear this device, which signs the device out.

### `sync`: what's been synced

While signed in (SYN-3): the account's user id, the last `seq` fetched from the server, and each record's last change sent or fetched (`"workout:<id>": "<updatedAt>"`, or `"d<deletedAt>"` for a deletion), so only what's changed since is sent. Signing out removes it.

### `synced-at`: when this device last synced

In ms since the epoch, by the device's clock, for the You tab. Signing out removes it.

### `welcomed`: the welcome screen's been answered

`guest` or `signed-in` once the welcome screen (NAV-3) has been answered on this device, or set to `guest` for a device that already had workouts or history when it came in. Missing on a device new to the app, which opens the welcome screen. Signing out, deleting the account and Clear this device remove it.

### `setup`: the setup's still to do

`due` once a device new to the app is sent to the welcome screen, and `asking` once the setup's questions (NAV-4) start: while it's there, Today opens the setup. Finishing or skipping it removes it. Missing on a device in use before the setup came in, which isn't asked. Signing out and Clear this device remove it.

### `tour`: the tour's been taken or turned down

`seen` once the tour of the app (NAV-8) has been started, from Today or Help, or Today's offer of it turned down with Not now. While it's missing, Today offers the tour. Not synced or backed up, as it's about this device. Signing out and Clear this device remove it, so a device set up again is offered it again.

### `tour-create`: the tour of Create's been shown

`seen` once the tour of Create (BLD-17) has started, the first time Create opened for a new workout on this device. While it's missing, the next new workout shows it. Not synced or backed up, and removed by signing out and Clear this device, as `tour` is.

### `tip-join`: the tip on Join with next's been shown

`seen` once the tip on Create's first Join with next (BLD-12) has shown on this device. While it's missing, the next Join with next to show on an open step shows it. Not synced or backed up, and removed by signing out and Clear this device, as `tour` is.

### `tour-workout`: the tour of the workout page's been shown

`seen` once the tour of the workout page (RUN-13) has started, as the first workout on this device began. While it's missing, the next workout started shows it, if the history is still empty. Not synced or backed up, and removed by signing out and Clear this device, as `tour` is.

### `tour-exercise`: the tour of an exercise's page's been shown

`seen` once the tour of an exercise's page has started, the first time one opened on this device. While it's missing, the next exercise's page shows it. Not synced or backed up, and removed by signing out and Clear this device, as `tour` is.

### `tour-plan`: the tour of the Plan page's been shown

`seen` once the tour of the Plan page (PLN-8) has started, the first time the page opened on this device. While it's missing, the next visit shows it. Not synced or backed up, and removed by signing out and Clear this device, as `tour` is.

### `clock-offset`: how far this device's clock is from the server's

In ms, added to the device's clock to date changes (see [backup and sync](backup-and-sync.md), Sync). Kept after signing out, as the clock's no less off; so are the settings, which are this device's, less the name, and with `profileUpdatedAt` 0. Signing out removes everything else.

## Saved for the run in progress (`sessionStorage` on the web, per tab)

| Key                      | What                                                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeWorkoutId`        | The workout being run.                                                                                                                                                                                                                                                        |
| `activeRunStartedAt`     | When the run really began. Never moves; it dates the run and makes its history id.                                                                                                                                                                                            |
| `activeWorkoutStartedAt` | When the run began on the countdown's clock: moved on by every pause and every rep step, and back by every skip, so elapsed time is simply now minus this.                                                                                                                    |
| `activeWorkoutPausedAt`  | When it was paused, if it is.                                                                                                                                                                                                                                                 |
| `activeRepStepsDone`     | How many rep steps have been done, counting across rounds.                                                                                                                                                                                                                    |
| `activeRepMs`            | Time spent on rep steps so far, which counts as time spent in the history.                                                                                                                                                                                                    |
| `activeSets`             | The rep sets done so far. The timed ones are worked out from the clock.                                                                                                                                                                                                       |
| `activeSides`            | How exercises done each side run, as the settings were when the run started, e.g. `{ "first": "left", "switchSeconds": 5 }`, so a refresh runs the same. Broken or missing, the defaults.                                                                                     |
| `activeSkips`            | Timed steps and rests skipped part-way (RUN-12), in order: each with its `round`, its place in the round (`stepIndex`) and how much of it was left (`skippedMs`). Missing for none; broken ones are left out.                                                                 |
| `activeSwaps`            | Exercises swapped for others in this run (RUN-11), in order: each with its step (in `allSteps()`), where in the run it was swapped (`from`: rounds before it × the round's steps, plus its place), and the step before and after. Missing for none; broken ones are left out. |

From these, everything on the workout page is worked out (see [run-a-workout](run-a-workout.md)).

## Backup file

**Export backup** on You saves everything as one JSON file, e.g. `loop-workouts-2026-10-21.json`; **Import backup** reads one back (see [backup-and-sync](backup-and-sync.md) for how it merges):

```json
{
    "app": "Loop Workouts",
    "version": 16,
    "exportedAt": 1761055200000,
    "workouts": [],
    "history": [],
    "exercises": [],
    "exerciseNotes": [],
    "hiddenExercises": [],
    "readyMadeFavourites": [],
    "readyMadeChanges": [],
    "libraryOrder": { "ids": [], "updatedAt": 0 },
    "plan": { "days": [[], [], [], [], [], [], []], "updatedAt": 0 },
    "deleted": [],
    "settings": {
        "theme": "dark",
        "sound": true,
        "vibration": true,
        "countdownBeeps": true,
        "keepScreenOn": true,
        "weightUnit": "kg",
        "bodyFigure": "male",
        "myEquipment": [],
        "onlyMyEquipment": false,
        "eachSideFirst": "left",
        "switchSidesSeconds": 5
    }
}
```

- `workouts`, `history`, `exercises`, `exerciseNotes` (as `exercise-notes`), `hiddenExercises` (as `hidden-exercises`), `readyMadeFavourites` (as `ready-made-favourites`), `readyMadeChanges` (as `ready-made-changes`), `deleted` and `settings` are in the same shapes as above, `libraryOrder` is the library's order (see `library-moved-at`) and `plan` the weekly plan (see `week-plan`); `exportedAt` is ms since 1970.
- `version` goes up whenever the file's shape changes. A file from an older version is converted when imported; one from a newer version is turned down.
- **Version 1** files (from before random ids) have number workout ids, no `updatedAt` and no `deleted`. They're converted as saved data is: their workouts get new random ids, so they're matched on what they are (title, steps and rounds) rather than by id.
- **Version 3 and older** files call workouts timers: a `timers` list in place of `workouts`, `timerId` in the history and the kind `timer` in `deleted`. They're renamed as they're read.
- **Version 14 and older** files have no `readyMadeChanges`: nothing to convert. An older app turns a version 15 file down rather than leaving them out.
- **Version 15 and older** files have no times in `readyMadeChanges`: nothing to convert. An older app turns a version 16 file down, and leaves synced records written by version 16 alone until it's updated, rather than dropping the times and writing the record back without them.
- **Version 13 and older** files have no `readyMadeFavourites`, and no ready-made workouts (`builtin:` ids) in their plan: nothing to convert. An older app turns a version 14 file down rather than planning workouts it can't find.
- **Version 12 and older** files have no `plan`, so the plan here stays as it is.
- **Version 11 and older** files have no `supersets` on history entries: nothing to convert.
- **Version 10 and older** files have no steps whose sets vary: nothing to convert.
- **Version 9 and older** files have no `headings` on history entries: nothing to convert.
- **Version 8 and older** files have no steps done each side, nor sides on sets: nothing to convert.
- **Version 7 and older** files have workouts with `steps` in place of `blocks`, read as one group as saved data is.
- **Version 6 and older** files have no `libraryOrder`, so the library's order here stays as it is.
- **Version 5 and older** files have no time limits, so nothing needs converting.
- **Version 4 and older** files have no `hiddenExercises`, so nothing in them is hidden.
- **Version 2** files (from before exercises) have no `exercises` or `exerciseNotes`, and their steps and sets aren't linked; they're linked by name as they're imported.
- **A file written by hand** (e.g. by an AI from a plan, with the prompt on You) can leave out everything but `app`, `version` and `workouts` (`libraryOrder` and `plan` too), and its workouts and exercises of your own can leave out `id` and `updatedAt`: one with no id is new, and is given a random id and dated now when it's imported (see [backup-and-sync](backup-and-sync.md#bringing-in-a-plan-with-ai-syn-6)). Its steps need no `exerciseId`, since they're linked by name.
- A file that isn't JSON, doesn't say `"app": "Loop Workouts"`, lacks a `workouts` list, has a `history` that isn't a list, or is over 50 MB isn't a backup.

## Broken data

Saved data that's broken or unexpected never stops the app starting: unusable workouts and history entries are dropped and the rest kept; broken settings fall back to the defaults; a saved run with impossible times starts again from now. A backup file is read the same way.

## Platform notes

- **iOS:** reading and writing the same backup file lets workouts and history move between the web app and an iPhone app. Keep the "drop what's broken, keep the rest" rule when reading.
