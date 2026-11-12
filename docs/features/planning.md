# Planning

Built (PLN-1–8): a weekly plan of which workouts you do on which days, the same every week, on a Plan page opened from Today; this week's progress on it there; what's due today on Today; and the week at a glance at the top of Today, the way in to the plan; and a tour of the Plan page on its first visit. Kept simple on purpose: no multi-week programmes.

## Stories

- **PLN-1** As a user I want to set which workouts I do on which days of the week.
- **PLN-2** As a user I want Today to show what's due today, ready to start.
- **PLN-3** As a user I want to see whether I kept to the plan this week.
- **PLN-4** As a user I want to see my week at a glance where I see what to do today, and change the plan from there, as the plan is my schedule rather than part of my workouts.
- **PLN-5** As a user planning my week, I want a way to add new workouts when the ones I have aren't enough.
- **PLN-6** As a user I want to start from a ready-made week, so my workouts and my plan are set up in one go.
- **PLN-7** As a new user I want Today to offer me a ready-made week for my goal and equipment, to use in one tap.
- **PLN-8** As a new user I want a short tour of the Plan page the first time I open it, so I know what the statuses mean and find the ready-made plans and the muscles at the bottom.

## Rules

### The plan (PLN-1)

- One plan, of seven days, **Monday to Sunday**, each with any number of workouts (up to 10), yours or ready-made (since 2026-11-06), in the order they were added. A workout can be on several days, but only once on each.
- It's the same every week: nothing moves or carries over.
- **Edit plan** on Today's week (or **Plan your week**, with nothing planned; see PLN-4) opens the **Plan page** at `/plan`. It slides in over Today, as an exercise does over the Exercises list; **‹ Today** or a swipe right goes back. The Today tab stays chosen while it's open. Until 2026-11-03 it was opened by a **Plan** button beside + New on the Library, and went back to it.
- Top to bottom: ‹ Today, the title **Plan**, "Which workouts you do on which days, the same every week. Your week and what's due show on Today.", **Start from a ready-made plan** (PLN-6), how this week's going (see below), then a section per day, each with its name (today's says "· today"), **Add**, and its workouts, or "Nothing planned".
- **Add** opens a dialog, "Plan on Thursday": first **Make a new workout** (PLN-5, since 2026-11-10; until then **Add new workouts**, which went to the Workouts tab and left you there), which slides Create in (`/setup?planOn=3&from=/plan`), with **‹ Plan** at its top; then your workouts, A to Z, then the ready-made ones, A to Z, each with the Ready-made badge (since 2026-11-06); one already planned that day says "Planned" and can't be picked. Picking a workout adds it to the end of the day, and focus goes back to that day's Add. **‹ Back** at its top, Escape or a tap outside close it, focus back on Add.
- **Made for a day** (PLN-5, since 2026-11-10): Create's **Save** plans the new workout on that day, at its end, and slides back to the Plan page with it pointed out on that day (tinted, with an accent edge, as Workouts points out a new workout), focus on that day's Add, and screen readers hearing "Saved Sprints, planned on Thursday". **Start** plans it on that day too, then starts it. Leaving Create without saving plans nothing.
- **✕** by a workout ("Take Legs off Saturday" to screen readers) takes it off that day straight away; focus goes to that day's Add.
- Screen readers hear each change: "Push planned on Thursday", "Legs taken off Saturday".
- There are always workouts to plan, as the ready-made ones are there from the start; until 2026-11-06, with none of your own, it said "Make a workout in Workouts first" and had no Add.
- **Add to plan from a workout** (since 2026-11-10): a workout's options (⋮) on Workouts and its Details, yours or ready-made, have **Add to plan** (Details says **Change days** once it's planned, with "On your plan: Mon, Thu" beside it). It opens "Plan Legs on…", "Pick as many days as you like. Each says what's on it already, and the muscles those work.", then the seven days, Monday first, today marked "(today)", each with what else is planned on it ("Push: Chest", or "Nothing planned"), and **Done**. Each day is pressed to choose it or not (a tick, and `aria-pressed`); the days it's on already start chosen, so unchoosing one takes it off. A full day it isn't on says "Full" and can't be chosen. **Done** plans it on the days newly chosen, at their end, and takes it off those unchosen, in one change; the Undo bar says what changed ("Legs planned on Monday and Thursday", "Legs taken off Friday", or "Legs planned on Tuesday, and taken off Friday"), and **Undo** puts the plan back. Focus goes to Undo, and back to Add to plan (or the card's ⋮) once the bar's closed or used; ‹ Back, Escape or a tap outside change nothing, focus back where it was. With nothing changed, there's no Undo.
- A deleted workout drops out of the plan wherever it was.
- The plan is your data: saved on the device, in backups, and synced, as one record of its own (like the workouts' order), so planning on one device and editing a workout on another don't overwrite each other. The plan changed most recently wins.

### This week (PLN-3)

- Each workout on the Plan page says where it is this week, Monday to Sunday by the device's calendar:
    - **✓ Done**: it was run on that day, finished or stopped.
    - **Missed**: its day has gone by without it; its name is dimmed. A missed workout stays missed: it doesn't move to the next day.
    - **Due**: it's today's, and not run yet today.
    - Nothing: its day is still to come.
    - **From next week**: its day had already gone by this week when it was planned (since 2026-11-04), e.g. Monday's workout planned on a Tuesday, or a ready-made plan used mid-week; its name is dimmed, and it isn't counted this week. One run that day still counts as done.
- Running a workout on a different day from the one it's planned on doesn't count for its planned day.
- Above the days: "**1 of 4 done so far this week**", counting the workouts planned up to and including today, but not those from next week. Nothing's said with none planned so far this week.
- **When each was planned** is kept with the plan, by the device's clock: adding one dates it now, taking it off forgets it, and replacing the week (a ready-made plan) keeps the dates of those already on their day and dates the rest now. Undo puts the dates back with the plan. Workouts planned before this came in have no date, and count as they always did.

### The week on Today (PLN-4)

- At the top of **Today**, under the greeting, once there's a workout to plan: a **This week** card.
- With something planned this week: **Edit plan** at its top right (a link, opening the Plan page), then the seven days, Monday first, as a row of tiles, each with its first letter and a mark:
    - **✓** on a tinted tile: everything planned that day was done.
    - **An empty ring**: something planned that day was missed.
    - **A dot**: something's planned that day, still to do (today's, or a day to come).
    - **Nothing**: a free day.
    - **Today** is outlined, in the accent colour, and its letter is bold.
- Under the days: "**2 of 5 done this week · Next: Pull on Thursday**", counting every workout planned this week (but not those from next week, PLN-3), and naming the first workout on the next day after today with something planned (none on Sunday, or with nothing after today). Once every one is done: "**All 5 done this week**", or "**Done for the week**" with just one. With everything planned once its day had gone by (a plan started late in the week): "**Your plan starts next week**", and those days show as free; screen readers hear e.g. "Monday: Legs, from next week".
- Screen readers hear the days as a list, each day in full, e.g. "Monday: Legs, missed", "Wednesday, today: Push, due today", "Saturday: nothing planned"; today is the list's current date.
- With nothing planned: "Nothing planned yet. Here's a week of ready-made workouts for your goal and equipment, or plan your own and Today shows what's due each day." The ready-made plan for your goal and equipment (as Get started picks, PLN-7) follows as a card, with **Use this plan** as the page's main button: one tap plans the week with its workouts, with Undo, and focus moves to Edit plan. The card then shrinks into the week rather than the page jumping (since 2026-11-04): on Apple's no-bounce spring for moving things (a 0.4s response), its old content fading out as the week fades in, with the cards under it gliding up and Due today fading in once there's room; Get started's Use this plan does the same. With reduced motion it's a short cross-fade. Under it, side by side, **More plans** (the Ready-made plans page, PLN-6) and **Make your own plan** (the Plan page, NAV-6). Until 2026-11-04 it was **Plan your week**, the main button, with "Or use a ready-made plan" as a link beside it.
- With no workouts at all, there's no week: Today's **Get started** card offers workouts to add first (NAV-6, see [home-and-navigation](home-and-navigation.md)).

### Ready-made plans (PLN-6, PLN-7)

- A **ready-made plan** is a week of ready-made workouts (LIB-6, see [library](library.md)), the same every week. Each has two mobility days (since 2026-11-12) between its training days: **Mobility flow** early in the week and **Full-body stretch** near the end. Days with nothing on are rest days, at least one a week.
- The first six, each made for building muscle, fitness, or both:

    | Plan                      | Goal    | Training days                                                                | Mobility days                          |
    | ------------------------- | ------- | ---------------------------------------------------------------------------- | -------------------------------------- |
    | 3-day beginner gym        | Muscle  | Gym full body Mon, Wed and Fri                                               | Mobility flow Tue, Full-body stretch Sat |
    | Push, pull, legs          | Muscle  | Gym push Mon, Gym pull Wed, Gym legs Fri, Gym extras Sat                     | Mobility flow Tue, Full-body stretch Sun |
    | Dumbbells at home, 4 days | Muscle  | Dumbbell upper Mon and Thu, Dumbbell lower Tue and Fri                       | Mobility flow Wed, Full-body stretch Sat |
    | Kettlebell, 3 days        | Both    | Kettlebell full body Mon and Fri; Kettlebell swing ladder and Core in 15 Wed | Mobility flow Tue, Full-body stretch Sat |
    | No equipment, 3 days      | Both    | Bodyweight basics Mon, Cardio intervals Wed, Core in 15 and Tabata Fri       | Mobility flow Tue, Full-body stretch Sat |
    | Fitness, 4 days           | Fitness | Tabata Mon, Kettlebell AMRAP Tue, 20-minute AMRAP Thu, Cardio intervals Sat  | Mobility flow Wed, Full-body stretch Sun |

- **The Ready-made plans page** (`/ready-made-plans`), from Today's **More plans** (with nothing planned), Get started's **More plans**, or the Plan page's **Start from a ready-made plan**, under its hint. It slides in over the page it came from, with ‹ Today or ‹ Plan to go back (or a swipe right); the Today tab stays chosen.
    - "A week of ready-made workouts, the same every week. Using one replaces your plan with it, with Undo; its workouts are ready to start as they are." (until 2026-11-06 it said using one added the workouts you hadn't got), then **Only what I have** and **My equipment**, as on the Exercises list and ready-made workouts (one setting), and how many it hides ("5 more need equipment you haven't picked.").
    - The plans, as cards: those made for your goal (Training for) alone first, then those that suit it among others, then the rest, each in the order above. Each card: its title, what it's for, how many days a week it trains (not counting the mobility days, since 2026-11-12), the week as a strip of days with each workout numbered and coloured, those workouts with the days they're on, what it needs, and **Use this plan**.
- **Seeing a plan's workouts** (since 2026-11-05): on any plan's card, here or on Today, each of its workouts is a link to its page (`/ready-made-plans/gym-legs`), which slides in from the right as other pages do: the ready-made workout's page (LIB-6), its title, what it's for and needs, whether you have a workout called this already, every exercise with its sets, and the muscles it works, but without Add and start and Add to my workouts, as the workouts come with **Use this plan**. **‹ Today** or **‹ Plans**, or a swipe right, slides it back off to where the card was; the Today tab stays chosen. Each exercise in **What's in it** is a link, its whole line pressable: its page slides in at `/ready-made-plans/<workout>/<its name>`, with **‹** and the workout's title at its top, or a swipe right, back to the workout's page, which still goes back to where the card was.
- **Using a plan** **replaces your plan** with its week of ready-made workouts, as they are (since 2026-11-06; until then it copied each into your workouts, using one of yours of the same title instead), dated now, so it syncs as the latest. From the page, Today opens to show the week. The Undo bar says "Your week is planned: Push, pull, legs", and **Undo** puts back the plan it replaced. There's no "Are you sure?", as elsewhere.
- **On Today with no workouts** (PLN-7), Get started offers the first plan for your goal that your equipment allows (see [home-and-navigation](home-and-navigation.md)). No-equipment plans suit both goals, so there's always one.
- Nothing new is saved: using a plan makes an ordinary plan, which syncs and backs up as it always has.

### What your plan works, and Missing muscle groups (LIB-5, LIB-7)

- **What your plan works** (since 2026-11-06), first: "Supporting ones are only worked lightly. Pick a muscle to find exercises for it.", then the body map, shaded for the main and supporting muscles of the workouts in the plan, each counted once however many days it's on, with the muscles listed under it as Main and Supporting, as a workout's Details shows its own. A muscle that's main in one and supporting in another counts as main. Each listed muscle is a link to the Exercises list cut down to it (`/exercises?muscles=triceps&from=plan`), its whole chip pressable. It shows once a planned workout has a step linked to an exercise, as Missing muscle groups does.

At the bottom of the Plan page (since 2026-11-06; under the cards on Workouts until then, for the whole library: see [library](library.md)), once a workout in the plan has a step linked to an exercise:

- The muscle groups that no exercise in a planned workout works, even as a supporting muscle: "None of the workouts in your plan work these. Pick one to find exercises for it." Each workout counts once, however many days it's on; workouts not in the plan don't count.
- Each is a link to the Exercises list cut down to that muscle (`/exercises?muscles=calves&from=plan`).
- **Back from those links** (since 2026-11-06): the Exercises list slides in over the Plan page, with **‹ Plan** at its top (and a swipe right) sliding back to it, scrolled where it was left. An exercise opened from there keeps it: its ‹ Exercises goes back to the list as it was, with ‹ Plan still at its top. Until then the links went to the Exercises tab, with no way back but the tab bar.
- Those only worked as a supporting muscle are the map's Supporting ones, above, so they aren't listed again here (until 2026-11-06, "Only lightly, as a supporting muscle:" listed them).
- None missed: "Your plan works every muscle group."
- **A ready-made workout for them** (LIB-7): under the list, a card, "Or plan a ready-made workout for them:" ("To work the supporting ones harder, plan a ready-made workout:" when none is missed), with the workout's title, its description, what it adds, e.g. "**Adds Biceps, Forearms, Obliques and 7 more.**" (up to four named; past that, three and how many more), and **Add to a day**.
    - It's the ready-made workout (LIB-6) that does most for the lists: each missed muscle it works as a main muscle counts 3, each it only supports 1 (it's then lightly worked rather than missed), and each lightly worked muscle it works as a main muscle 2. Highest wins; on a tie, the first in the ready-made workouts' order. "Adds" names those muscles, in the app's order.
    - Left out: any planned already, and, with **Only what I have** on, any needing equipment you haven't picked.
    - **Add to a day** opens the same dialog as a workout's Add to plan (PLN-1, since 2026-11-10; until then it took one day per pick): "Plan Gym extras on…", then the days, each with what's planned on it, each workout with up to three of its main muscles, "Legs day: Glutes, Quads · Push: Chest", or "Nothing planned", so days can be picked to suit, and **Done**. A full day says "Full" and can't be chosen. Done plans it, as it is, on each day chosen, with Undo; focus goes to Undo, then back to the first of those days' Add. The lists then shrink, and the next best is suggested for what's left.
    - With no gaps, or none that a ready-made workout helps, there's no card.

### The tour of the Plan page (PLN-8)

- **Shown once, the first time the Plan page opens** on this device, from Edit plan or Plan your week on Today, and not while another tour is on. Devices already in use get it once too, on their next visit. It's kept on the device only (`tour-plan`, see [data](data.md)). **Planning your week**, in Help's Tours, takes it again any time: it opens the Plan page, then the tour.
- It's the tour of the app's overlay and card (see [home and navigation](home-and-navigation.md#the-tour-nav-8)), staying on the Plan page and lighting up no tab: **four stops**:
    1. **Your week**: today's day, saying the plan's the same every week, and Add and ✕.
    2. **This week**: the first planned workout, saying what Done, Missed, Due and From next week mean (PLN-3). It replaced the ? beside From next week, whose question stays in Help.
    3. **Ready-made plans**: Start from a ready-made plan (PLN-6).
    4. **What your plan works**: the body map, saying Missing muscle groups is under it, with a ready-made workout for them (LIB-5, LIB-7).
- With nothing planned, stops 2 and 4 say what will be there, and light up nothing.
- **Done and Skip tour both leave focus on the page's title**, Plan.

### Due today (PLN-2)

- On **Today**, under the week: a **Due today** card listing today's planned workouts not yet run today, in the plan's order, each with **Start**. The first's Start is the page's main button; the others' are smaller.
- When some have been run today: "Done today: Legs" under the list. When all have: "✓ All done: Push, Legs" in place of the list.
- With a week planned, the **suggested next workout** isn't shown on Today on a day with something planned: the plan says what's next. With nothing planned this week, it shows as before (see [progress](progress.md), PRG-9).
- **On a day with nothing planned** in a planned week (since 2026-11-06; nothing showed there from 2026-11-03), it's offered, not pressed, so a rest day isn't told off: "**Fancy a workout today?** Nothing's planned today, so resting is fine too. If you'd like to train:", then the suggested workout, yours or ready-made, and Start.
    - It leaves out the workouts planned on the next day this week with any, and prefers those whose main muscles are mostly not theirs (no more than a third of its main muscles shared), falling back to the others only when there's nothing else.
    - It says so: "It works your Chest, which you haven't trained in the last 7 days, and leaves your Glutes and Quads fresh for Legs day on Saturday.", naming up to two of the next workout's main muscles it doesn't work as main ones. With nothing more to come this week, or none left fresh, that part's left out.
    - It shows even with no history yet, and a day whose only workouts have since been deleted counts as nothing planned.
- With nothing planned today, there's no card, and Today is as it was.

## Acceptance criteria

- Given Legs and Push in my workouts, when I press Edit plan (or Make your own plan) on Today, then the Plan page slides in with ‹ Today; when I press Add on Thursday and pick Push, then Thursday lists Push, focus is on Thursday's Add, and screen readers hear "Push planned on Thursday".
- Given Legs planned on Thursday, when I press Add on Thursday, then Legs says "Planned" and can't be picked.
- Given the Plan page, when I press Add on Thursday, then Make a new workout is first; when I press it, then Create opens with ‹ Plan and nothing's planned; when I make Sprints and press Save, then the Plan page slides back with Sprints pointed out on Thursday, focus on Thursday's Add, and screen readers hear "Saved Sprints, planned on Thursday".
- Given Legs on Workouts, when I open its options, press Add to plan, choose Monday and Thursday and press Done, then Legs is planned on both, and the Undo bar says "Legs planned on Monday and Thursday"; its Details say "On your plan: Mon, Thu", and Change days starts with both chosen; unchoosing Monday and pressing Done takes it off Monday.
- Given no workouts, when I open Plan, then it says to make one first, with Go to your workouts, and no Add.
- Given Legs planned on Saturday, when I press its ✕, then Saturday says "Nothing planned".
- Given a device that's never opened the Plan page, with Gym full body planned today, when I press Edit plan, then the Plan page opens with its tour, "1 of 4", lighting up today; Next lights up Gym full body, saying what Done, Missed, Due and From next week mean; when I press Done on the fourth, then focus is on the title, Plan, and opening the page again shows no tour.
- Given nothing planned, when the Plan page's tour reaches This week or What your plan works, then it says what will be there and lights up nothing.
- Given today is Wednesday and Legs on Monday (run Monday evening), Push on Tuesday (run on Wednesday instead), and Legs and Push today, when I open Plan, then Monday's Legs is Done, Tuesday's Push is Missed, today's Legs is Due, and it says "1 of 4 done so far this week".
- Given Legs planned on Friday and then deleted, then Friday says "Nothing planned".
- Given Push and Legs planned today, when I open Today, then Due today lists Push then Legs, each with Start (Push's the main button), and there's no suggested workout; when I've run Legs, then only Push is listed, with "Done today: Legs"; when I've run both, then it says "All done: Push, Legs" and the suggested workout is back.
- Given nothing planned today, when I open Today, then there's no Due today.
- Given a workout and nothing planned, when I open Today, then This week says "Nothing planned yet." with the ready-made week for my goal and equipment and its Use this plan as the main button, and More plans and Make your own plan under it.
- Given Training for Fitness, when I open the Ready-made plans page, then Fitness 4 days is first, then Kettlebell 3 days and No equipment 3 days, then the rest; with Only what I have on and no equipment picked, then only No equipment 3 days, saying 5 more need equipment I haven't picked.
- Given Legs planned on Saturday, when I use Dumbbells at home, 4 days, then the ready-made Dumbbell upper and Dumbbell lower are planned as they are (Mon and Thu upper, Tue and Fri lower), none is added to my workouts, Saturday's Legs is off it, and Today opens with Undo; when I press Undo, then Legs is back on Saturday.
- Given a day's Add, then my workouts are listed A to Z, then the ready-made ones, each with the Ready-made badge; picking Gym legs plans it as it is.
- Given a week planned with something today, when I open Today, then there's no suggested next workout.
- Given today is Wednesday, nothing planned today and Legs (back squats) on Thursday, with Push (bench press) too, when I open Today, then it says "Fancy a workout today?", that resting is fine too, and suggests a workout that isn't Legs, saying it leaves the Glutes and Quads fresh for Legs on Thursday.
- Given today is Sunday, Legs on Monday (not run), Push on Wednesday (run), and Legs and Push today, when I open Today, then the week shows Monday missed, Wednesday done, Sunday planned and outlined as today, the other days free, and "1 of 4 done this week".
- Given today is Thursday, Legs on Thursday and Saturday, none run, then it says "0 of 2 done this week · Next: Legs on Saturday".
- Given today is Wednesday, when I plan Legs on Monday, then the Plan page says Legs is From next week, dimmed, and it isn't counted; Legs planned on Monday last week says Missed.
- Given today is Sunday, when I use No equipment, 3 days, then Today's week says "Your plan starts next week", its days shown free.
- Given a plan changed on this device after one on my other device, when they sync, then both have this one.
- Given Back squat and Bench press workouts planned, then Missing muscle groups lists Biceps, Forearms, Abs, Obliques, Traps, Upper back, Abductors, Calves, Shins and Neck, and the map lists Shoulders, Triceps, Lower back, Adductors and Hamstrings as Supporting, each a link to exercises for it, and they're not listed again; a workout in my workouts but not planned doesn't count.
- Given no planned step linked to an exercise, then there's no Missing muscle groups section, and no body map.
- Given Back squat and Bench press workouts planned, and an Arms workout (biceps curls) not planned, then What your plan works shades the chest, glutes and quads as main, and not the biceps.
- Given those planned, then Gym extras is suggested, "Adds Forearms, Abs, Obliques and 7 more."; when I press Add to a day, choose Friday and press Done, then Gym extras is planned on Friday, with Undo, and another is suggested.
- Given Only what I have on with no equipment picked, then the workout suggested needs no equipment.

## Platform notes

- **Web:** the plan is `WeekPlan` in `src/app/models/plan.ts`, with `thisWeek()` working out where each planned workout is from the history, by the device's calendar (`weekdayOf()`, `startOfWeek()`). It's kept by `PlanStore` (`src/app/shared/state/plan-store.service.ts`) in localStorage as `week-plan`, each change dated by the sync clock. It syncs as the record of kind `plan`, id `week` (`src/app/sync/sync-records.ts`), and is `plan` in backups from version 13. The page is `PlanComponent` (`src/app/plan/`), and Today's cards `WeekStripComponent` (`src/app/home/week-strip/`, a day's mark from `markFor()`) and `DueTodayComponent` (`src/app/home/due-today/`). The ready-made plans are `BUILT_IN_PLANS` in `src/app/models/built-in-plans.ts` (with `plansFor()`, `firstPlan()` and `builtInPlanEquipment()`), checked by `built-in-plans.spec.ts`; using one is `ReadyMadePlans.use()` (`src/app/shared/state/ready-made-plans.service.ts`), which returns its undo, with the whole week set by `PlanStore.replace()` and put back by `PlanStore.restore()`; the page is `ReadyMadePlansComponent` (`src/app/plan/ready-made-plans/`), each plan shown by `PlanCardComponent` (`src/app/plan/plan-card/`), shared with Today's Get started. Picking a workout uses `WorkoutChoiceDialogComponent` (`src/app/shared/components/workout-choice-dialog/`), shared with an exercise's Add to workout. What your plan works and Missing muscle groups are `PlanMusclesComponent`, the body map `BodyMapComponent` (`shared/components/body-map/`), (`src/app/plan/plan-muscles/`), from `musclesWorked()` and `musclesMissed()` in `src/app/models/workout-muscles.ts`; the ready-made workout for the gaps is picked by `workoutToFillGaps()`, with its line by `listMuscles()`, in `src/app/models/fill-gaps.ts`. The tour of the page (PLN-8) is `TOURS.plan` in `src/app/tour/tour-stops.ts`, started by `PlanComponent` with `TourService.startOnce('plan')`; the parts it lights up have `data-tour` attributes (`plan-today` on today's day only, `plan-workout` on each planned workout, the first winning, `plan-ready-made`, and `plan-works` in `PlanMusclesComponent`), and the title has the id `plan-title`, for focus at the end.
- **iOS:** the page maps onto a `List` with a `Section` per day and `.swipeActions` (or an ✕ button) to take a workout off; Add onto a `.sheet` or `Menu` of your workouts. The week starts on Monday whatever the device's `Calendar` says, as on the web. The week is a row of seven views at the top of the Today tab, with Edit plan pushing the plan; Due today is a section under it.
