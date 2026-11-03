# Planning

Built (PLN-1–5): a weekly plan of which workouts you do on which days, the same every week, on a Plan page opened from Today; this week's progress on it there; what's due today on Today; and the week at a glance at the top of Today, the way in to the plan. Kept simple on purpose: no multi-week programmes.

## Stories

- **PLN-1** As a user I want to set which workouts I do on which days of the week.
- **PLN-2** As a user I want Today to show what's due today, ready to start.
- **PLN-3** As a user I want to see whether I kept to the plan this week.
- **PLN-4** As a user I want to see my week at a glance where I see what to do today, and change the plan from there, as the plan is my schedule rather than part of my workouts.
- **PLN-5** As a user planning my week, I want a way to add new workouts when the ones I have aren't enough.

## Rules

### The plan (PLN-1)

- One plan, of seven days, **Monday to Sunday**, each with any number of your workouts (up to 10), in the order they were added. A workout can be on several days, but only once on each.
- It's the same every week: nothing moves or carries over.
- **Edit plan** on Today's week (or **Plan your week**, with nothing planned; see PLN-4) opens the **Plan page** at `/plan`. It slides in over Today, as an exercise does over the Exercises list; **‹ Today** or a swipe right goes back. The Today tab stays chosen while it's open. Until 2026-11-03 it was opened by a **Plan** button beside + New on the Library, and went back to it.
- Top to bottom: ‹ Today, the title **Plan**, "Which workouts you do on which days, the same every week. Your week and what's due show on Today.", how this week's going (see below), then a section per day, each with its name (today's says "· today"), **Add**, and its workouts, or "Nothing planned".
- **Add** opens a dialog, "Plan on Thursday": first **Add new workouts** (PLN-5), which closes it and goes to the **Workouts** tab, where workouts are made or added from the ready-made ones (nothing's planned; the plan's a tap away on Today again); then your workouts, in their order on Workouts; one already planned that day says "Planned" and can't be picked. Picking a workout adds it to the end of the day, and focus goes back to that day's Add. ✕, Escape or a tap outside close it, focus back on Add.
- **✕** by a workout ("Take Legs off Saturday" to screen readers) takes it off that day straight away; focus goes to that day's Add.
- Screen readers hear each change: "Push planned on Thursday", "Legs taken off Saturday".
- With no workouts, it says "Make a workout in Workouts first, then plan it here." with **Go to your workouts**, and there's no Add.
- A deleted workout drops out of the plan wherever it was.
- The plan is your data: saved on the device, in backups, and synced, as one record of its own (like the workouts' order), so planning on one device and editing a workout on another don't overwrite each other. The plan changed most recently wins.

### This week (PLN-3)

- Each workout on the Plan page says where it is this week, Monday to Sunday by the device's calendar:
    - **✓ Done**: it was run on that day, finished or stopped.
    - **Missed**: its day has gone by without it; its name is dimmed. A missed workout stays missed: it doesn't move to the next day.
    - **Due**: it's today's, and not run yet today.
    - Nothing: its day is still to come.
- Running a workout on a different day from the one it's planned on doesn't count for its planned day.
- Above the days: "**1 of 4 done so far this week**", counting the workouts planned up to and including today. Nothing's said with none planned so far this week.

### The week on Today (PLN-4)

- At the top of **Today**, under the greeting, once there's a workout to plan: a **This week** card.
- With something planned this week: **Edit plan** at its top right (a link, opening the Plan page), then the seven days, Monday first, as a row of tiles, each with its first letter and a mark:
    - **✓** on a tinted tile: everything planned that day was done.
    - **An empty ring**: something planned that day was missed.
    - **A dot**: something's planned that day, still to do (today's, or a day to come).
    - **Nothing**: a free day.
    - **Today** is outlined, in the accent colour, and its letter is bold.
- Under the days: "**2 of 5 done this week · Next: Pull on Thursday**", counting every workout planned this week, and naming the first workout on the next day after today with something planned (none on Sunday, or with nothing after today). Once every one is done: "**All 5 done this week**", or "**Done for the week**" with just one.
- Screen readers hear the days as a list, each day in full, e.g. "Monday: Legs, missed", "Wednesday, today: Push, due today", "Saturday: nothing planned"; today is the list's current date.
- With nothing planned: "Nothing planned yet. Choose which days you do your workouts, and Today shows what's due each day." and **Plan your week**, the page's main button, opening the Plan page (NAV-6).
- With no workouts at all, there's no week: Today's **Get started** card offers workouts to add first (NAV-6, see [home-and-navigation](home-and-navigation.md)).

### Due today (PLN-2)

- On **Today**, under the week: a **Due today** card listing today's planned workouts not yet run today, in the plan's order, each with **Start**. The first's Start is the page's main button; the others' are smaller.
- When some have been run today: "Done today: Legs" under the list. When all have: "✓ All done: Push, Legs" in place of the list.
- While any are due, the **suggested next workout** isn't shown: the plan says what's next. It's back once they're all done, or on a day with nothing planned.
- With nothing planned today, there's no card, and Today is as it was.

## Acceptance criteria

- Given Legs and Push in my workouts, when I press Edit plan (or Plan your week) on Today, then the Plan page slides in with ‹ Today; when I press Add on Thursday and pick Push, then Thursday lists Push, focus is on Thursday's Add, and screen readers hear "Push planned on Thursday".
- Given Legs planned on Thursday, when I press Add on Thursday, then Legs says "Planned" and can't be picked.
- Given the Plan page, when I press Add on Thursday, then Add new workouts is first; when I press it, then Workouts opens and nothing's planned.
- Given no workouts, when I open Plan, then it says to make one first, with Go to your workouts, and no Add.
- Given Legs planned on Saturday, when I press its ✕, then Saturday says "Nothing planned".
- Given today is Wednesday and Legs on Monday (run Monday evening), Push on Tuesday (run on Wednesday instead), and Legs and Push today, when I open Plan, then Monday's Legs is Done, Tuesday's Push is Missed, today's Legs is Due, and it says "1 of 4 done so far this week".
- Given Legs planned on Friday and then deleted, then Friday says "Nothing planned".
- Given Push and Legs planned today, when I open Today, then Due today lists Push then Legs, each with Start (Push's the main button), and there's no suggested workout; when I've run Legs, then only Push is listed, with "Done today: Legs"; when I've run both, then it says "All done: Push, Legs" and the suggested workout is back.
- Given nothing planned today, when I open Today, then there's no Due today.
- Given a workout and nothing planned, when I open Today, then This week says "Nothing planned yet." with Plan your week as the main button.
- Given today is Sunday, Legs on Monday (not run), Push on Wednesday (run), and Legs and Push today, when I open Today, then the week shows Monday missed, Wednesday done, Sunday planned and outlined as today, the other days free, and "1 of 4 done this week".
- Given today is Thursday, Legs on Thursday and Saturday, none run, then it says "0 of 2 done this week · Next: Legs on Saturday".
- Given a plan changed on this device after one on my other device, when they sync, then both have this one.

## Platform notes

- **Web:** the plan is `WeekPlan` in `src/app/models/plan.ts`, with `thisWeek()` and `dueToday()` working out where each planned workout is from the history, by the device's calendar (`weekdayOf()`, `startOfWeek()`). It's kept by `PlanStore` (`src/app/shared/state/plan-store.service.ts`) in localStorage as `week-plan`, each change dated by the sync clock. It syncs as the record of kind `plan`, id `week` (`src/app/sync/sync-records.ts`), and is `plan` in backups from version 13. The page is `PlanComponent` (`src/app/plan/`), and Today's cards `WeekStripComponent` (`src/app/home/week-strip/`, a day's mark from `markFor()`) and `DueTodayComponent` (`src/app/home/due-today/`). Picking a workout uses `WorkoutChoiceDialogComponent` (`src/app/shared/components/workout-choice-dialog/`), shared with an exercise's Add to workout.
- **iOS:** the page maps onto a `List` with a `Section` per day and `.swipeActions` (or an ✕ button) to take a workout off; Add onto a `.sheet` or `Menu` of your workouts. The week starts on Monday whatever the device's `Calendar` says, as on the web. The week is a row of seven views at the top of the Today tab, with Edit plan pushing the plan; Due today is a section under it.
