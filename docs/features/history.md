# History (the log on Progress)

## Stories

- **HIS-1** As a user I want to see the workouts I've done, grouped by day, so I can look back on them.
- **HIS-2** As a user I want to see how much I've done in the last week.
- **HIS-3** As a user I want to add a short note to a workout (e.g. "felt strong").
- **HIS-4** As a user I want to delete a workout from the history, and undo it if I didn't mean to.
- **HIS-5** As a user I want to see the sets I did in each workout, reps and weight (or time for a timed exercise), so I can see my improvements over time.

## Rules

### What's logged

- Every **finished** workout, and every **stopped** one where at least one step was done (see [pause-and-stop](pause-and-stop.md)). That includes one ended by starting another workout, or by closing the app.
- Each entry keeps:
    - the workout's title **as it ran** (renaming or deleting the workout later doesn't change it)
    - when it started, and when it ended
    - the **time spent**, in whole seconds: pauses don't count, time on rep steps does. A finished workout counts its full length plus rep time, and one whose time limit ran out counts the time limit.
    - the full **rounds done**, and the rounds it was set to (or "until stopped"), or its **time limit**, and when that ran out, the steps done of the round it ran out in (RUN-8)
    - finished or stopped
    - an optional note
    - the workout's **headings** as it ran (BLD-13), each with the number of the step after it, so its sets can be grouped under them. Renaming or deleting a heading later doesn't change past entries. Workouts logged before this have none.
    - the workout's **supersets and giant sets** as it ran (BLD-12), each with the steps it covers, so their sets can be grouped together. Workouts logged before this have none, and their lines show one by one.
    - the **sets** done (HIS-5), in order:
        - for each Done on a rep step: the round, the step, its name, the reps and the weight. A set is only logged on Done, so a workout stopped mid-set doesn't log that set.
        - for each timed work step of an exercise that ran to its end: the round, the step, its name and its length in seconds; one skipped part-way (RUN-12), with the seconds it ran. One stopped part-way isn't a set, and nor is a rest or an unnamed step. Workouts logged before this have no timed sets.
- **One entry per run**: logging the same run again (e.g. stopped when the app closed, then finished after a reload) updates its entry, keeping any note added meanwhile.
- **All are kept**, however many: years of them (SYN-5).

### The page

- It's the **Progress** tab (at `/history`; the History tab until 2026-11-03), titled "Progress": at the top, "Last 7 days" (below), then the **time per week** (PRG-12), then the **muscles worked this week** (PRG-6, PRG-8), then the **exercises this week** (PRG-13, since 2026-11-14; all three in [progress](progress.md)), then the **log**, under the heading "Log": every workout done, as below. The suggested next workout was here too, under the muscles, until 2026-11-03; it's on Today now. Each day's label is a heading under Log.
- Newest first, grouped by the day they started: "**Today**", "**Yesterday**", then the date, e.g. "Saturday 17 October".
- At the top: "**Last 7 days:** 4 workouts · 1:15:30": the count and total time spent of workouts started in the last 7 × 24 hours.
- Each entry is a **card** in the same family as the cards on Workouts and Plan (since 2026-11-06): its title (or "Untitled workout", greyed) in the display face, under it a line of start time · rounds, e.g. "9:05 AM · 3 rounds", and at its right the **time spent** as the card's big number, over "time", then its ⋮. Screen readers hear the time at the end of the line: "9:05 AM · 3 rounds · 12:30 spent".
    - Under that, **Works** and the main muscles its sets worked, as a workout's card names them (up to four, in the app's order, then "+2 more"). Sets with no exercise, or of one since deleted, don't count; with none that do, there's no line.
    - Time spent is m:ss, or h:mm:ss over an hour.
    - Rounds: "3 rounds" when finished, "2 of 5 rounds · stopped" when stopped, "12 rounds · until stopped" for a workout that runs until stopped. With a time limit, "7 rounds + 3 in 20:00" (the steps done of the next round, if any), or "4 rounds · stopped before 20:00" when ended before time was up.
- **Sets**, one line per step, under a faint rule, in the unit chosen in You → Profile, e.g.:
    - "Squats: 3 × 10 @ 60 kg": the same every set
    - "Squats: 10, 10, 8 @ 60 kg": the reps changed
    - "Squats: 10 @ 60, 8 @ 62.5 kg": the weight changed
    - "Push-ups: 3 × 20", or "Push-ups: 20 reps" for one set: no weight. An unnamed step is called "Reps".
    - "Plank: 3 × 0:45", "Plank: 0:45" for one set, or "Plank: 1:00, 0:45" if the lengths differ: a timed step. Screen readers hear "Plank, 3 sets of 45 seconds".
    - "Step-up: 2 × 10 each side" for a step done each side (BLD-10) whose sides went alike, a left and a right being one set; or each side's sets, left first, when they didn't: "Step-up: left 10, 8 · right 2 × 10". A workout ended between the sides says the one done: "left 10 reps". Each side is logged as a set of its own, with its `side`.
    - The name links to its exercise's page (PRG-4), where the line is linked to an exercise that's still there.
    - A line is named as the step was when it ran, except for an exercise of your own, which shows its name now, so renaming it (EXR-3) renames it here too. Built-in exercises can't be renamed, so a set from a step called "Squats" stays "Squats".
    - Screen readers hear words, e.g. "Squats, 3 sets of 10 reps at 60 kg".
    - **Under the workout's headings** as they were when it ran (BLD-13), in order: e.g. "Warmup", then "Exercise bike: 5:00"; "Knee rehabilitation", then its lines. Lines before the first heading come first, with none over them, and a heading with no sets under it (e.g. a part stopped before) isn't shown. Screen readers hear them as headings within the entry. The workout summary's sets are grouped the same way.
    - **With its supersets** as they were when it ran (BLD-12): the lines of a superset's (or giant set's) steps go together under "Superset" (or "Giant set"), in a list of their own, set in a little with a line down their left. A superset with sets on only one of its steps (stopped before the second) shows that line on its own. The workout summary's sets are grouped the same way, and so is its Change reps or weight view.
- The note, if any, sits under the sets, in italics with a line down its left.
- **Pressing a card** (since 2026-11-08) slides in its workout's **Details** (LIB-4, see [library](library.md)), to make it a favourite or make a copy to change, with **‹ Progress** at the top, or a swipe right, sliding back to the log with that run marked, in view and focused, as arriving from the workout summary does. The card is one link, "Details of Sprints", with its exercise links, ⋮ and note box over it, and it dips as it's pressed. A workout deleted since (or an example while the tour shows the page) has no link. Not while its note is being written, so a slip doesn't lose it.
- The run arrived at from the workout summary is tinted, with a bar down its left, as Workouts marks a workout just saved.
- With no workouts: "Nothing here yet. Do a workout, and how your week is going and what you've done show up here." with **Go to workouts** (until 2026-11-08 "Go to your workouts": Workouts has the ready-made ones too now).

### Notes

- Each entry's **⋮ menu** offers **Add note** (or **Edit note** and **Remove note** once there is one) and **Delete**. One menu open at a time. It opens above the ⋮ where the tab bar would cover it below, as on the last card (since 2026-11-08).
- A note is up to **120 characters**, trimmed. Saving an empty note removes it. Cancel keeps the note as it was.
- The workout summary's **Done** opens Progress with that workout highlighted in the log and in view. (`?note=<id>` does the same with its note box open and focused; nothing links there since the note box moved onto the summary.)

### Delete and Undo

- **Delete** removes the entry at once, and the **Undo bar** says "Deleted Sprints" with **Undo** (see [home-and-navigation](home-and-navigation.md#undo)). Undo puts it back, note and all.
- The entries and days after it **slide** up to close the gap, and back down on Undo as it fades back in (at once with reduced motion, the fade staying).
- A deleted entry **stays deleted** even if its run is still going and later finishes, or the app is closed (which would otherwise log it again). Only Undo brings it back.

## Acceptance criteria

- Given 3 sets of 10 squats at 60 kg, then the entry shows "Squats: 3 × 10 @ 60 kg"; given 10 then 8 at 62.5 kg, then "Squats: 10 @ 60, 8 @ 62.5 kg".
- Given weights in lb, then a set saved at 61.235 kg shows as 135 lb.
- Given a workout with headings "Warmup" and "Knee rehabilitation", when it's done, then its entry shows the bike's line under "Warmup" and the knee lines under "Knee rehabilitation"; when the heading is renamed afterwards, then the entry still says "Knee rehabilitation".
- Given a workout with squats, then a superset of bench press and rows, when it's done, then its entry shows "Squats: 3 × 10" on its own, then "Superset" with "Bench press: 3 × 8" and "Row: 3 × 8" under it; the workout summary shows the same.
- Given a 45-second plank step in a workout of 3 rounds, when it finishes, then the entry shows "Plank: 3 × 0:45"; when it's ended 20 seconds into the third plank, then "Plank: 2 × 0:45".
- Given an unnamed 30-second work step, then no set is logged for it.
- Given workouts today, yesterday and last Tuesday, then they're grouped under Today, Yesterday and the date, newest first.
- Given a finished 3-round workout of 12:30 started at 9:05 AM, then it shows "9:05 AM · 12:30 · 3 rounds".
- Given a 20:00 time limit that ran out 3 steps into round 8, then it shows "7 rounds + 3 in 20:00"; ended after 4 rounds, "4 rounds · stopped before 20:00".
- Given a workout stopped in round 3 of 5, then it shows "2 of 5 rounds · stopped".
- Given three workouts this week totalling 45 minutes and one 8 days ago, then the summary says "3 workouts · 45:00".
- Given a note of 200 characters, then it's cut to 120.
- Given an entry with a note, when I save it empty, then the note is removed.
- Given I delete an entry, when I press Undo, then it's back with its note.
- Given a run still going whose entry I delete, when the run finishes, then the entry doesn't come back, even after a reload.
- Given a run I leave by closing the tab, when I open the app again, then it's in the history as stopped.
- Given a run of Sprints, when I press its card, then Sprints' Details slide in, with its heart and Make a copy; when I press ‹ Progress, then I'm back on the log with that run in view and focused. Given Sprints is deleted since, then its card isn't a link.

## Platform notes

- **Web:** `HistoryStore` (`src/app/shared/state/history-store.service.ts`) and `HistoryComponent` (`src/app/history/`), at `/history`. The history is saved in IndexedDB (`history-database.ts`; see [data](data.md#history-the-history)) and loads in the background, so `/history` and `/exercises/:id` wait for it to open, and a backup waits for it too; `?run=<id>` comes from the workout summary, and from ‹ Progress on a workout's Details opened from an entry (`HistoryEntryComponent`'s `workoutUrl`, `/library/<workout>?run=<id>`). Formatting is in `src/app/history/history-format.ts`. The list closes up and opens out around a deleted entry with `captureLayout()` (`src/app/shared/layout-change.ts`).
- **iOS:** SwiftData (or a JSON file) for entries, with no cap. Swipe to delete with an Undo toast is the iOS habit. The date groups should follow the user's locale, as they do on the web.
