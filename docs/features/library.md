# Workouts (the library)

## Stories

- **LIB-1** As a user I want to see the workouts I've made and start one, so I can reuse them.
- **LIB-2** As a user I want to edit or delete a saved workout.
- **LIB-3** As a user I want to put my workouts in the order I want, so the ones I do most are easy to find.
- **LIB-4** As a user I want to see which muscles a workout works, when I last did it and what's in it, so I can choose what to do today without opening Edit.
- **LIB-5** As a user I want to see which muscle groups none of the workouts in my plan work, so I can fill the gaps (on the Plan page, see [planning](planning.md)).
- **LIB-6** As a user I want ready-made workouts to pick from, so I don't have to make my own to get started.
- **LIB-7** As a user I want a ready-made workout suggested for the muscle groups my plan leaves out, so filling the gaps is one tap.
- **LIB-8** As a user I want to search and filter my workouts, and mark favourites, so I can find the one I want in a long list.

## Rules

- The page, the **Workouts** tab (at `/library`; the Library until 2026-11-03), has a **title**, "Workouts", as Exercises and Progress do, with **New** at its top right (the filled main button, small enough to sit by the title), which makes a new workout. The weekly plan isn't here: it opens from the week on Today (PLN-4, see [planning](planning.md)). It was a **Plan** button beside New until 2026-11-03.
- Arriving from **Save** in Create (BLD-15, see [build-a-workout](build-a-workout.md)), the workout just saved is **highlighted**, tinted with a bar down its left as the history marks a workout just done, scrolled to the middle of the screen, with focus on it, and screen readers hear "Saved" and its name.
- The library lists every saved workout as a card, in the order they were made, unless they've been moved (see **Moving**).
- **Search and filters** (LIB-8, since 2026-11-06), between the title and the cards:
    - A **search** box, "Name or exercise, e.g. squat": a workout shows if every word typed is in its title or in one of its steps' names or their exercises' names, in any case, so "squat" finds a workout with a Goblet squat in it.
    - **All**, **My own** or **Ready-made**, a switch under it (since 2026-11-06): whether to list your workouts and the ready-made ones, only yours, or only the ready-made ones. The search and filters below cut down both.
    - **Favourites**, a chip with a heart, shows only favourites. A ready-made workout is never one, so it hides them all.
    - **More filters** opens, under them, the **muscle chips** (the Exercises list's: All muscles, then one per muscle), showing workouts with any of those picked as a main muscle of one of their exercises, and **Only what I have** with **My equipment**, the same switch and pieces as on the Exercises list and ready-made workouts (one setting for all three), hiding any workout needing equipment you haven't picked. A workout with no step linked to an exercise works no muscle that's known, so muscles hide it, and needs nothing, so Only what I have doesn't. The chip says how many of these are on, e.g. "More filters (2)".
    - All of them at once: a workout shows only if it passes every one.
    - While any workout is hidden, yours or ready-made, "7 of 20 workouts" shows over the cards (or "No workouts match"), counting both, with **Clear search and filters**, which takes them all off, Only what I have included, and goes back to All.
    - What's chosen stays while the app's open, so coming back from a workout's details finds the list as it was. Arriving from Save in Create, or adding a ready-made workout, with that workout hidden, clears them, so it's in view.
    - **No reordering** while any workout is hidden: a hold still lifts a card and opens its options, but it can't be dragged, and its options have no Move up or Move down, as where it would land among the hidden ones would be a guess.
- **Favourites**: the **heart** at the left of a card's foot, level with the play button, "Favourite Legs day", a toggle, filled in the accent colour while it's a favourite. The same heart is at the right of the title in a workout's Details. It syncs with the workout (see [data](data.md)).
- Each card has the ready-made cards' look (since 2026-11-05), and shows:
    - The **title**, or "Untitled workout".
    - **How many**, in a badge at its top right: "3 exercises", counting the different named steps, or "4 steps" with none named.
    - The **main muscles it works**, the first four, then "+2 more", and **what it needs** as tags ("Dumbbells", "Bench", or "No equipment"). Neither shows when no step is linked to an exercise.
    - A **summary of one round**:
        - Its **exercises** when any step is named: the work and rep steps' names in order, each once, e.g. "Squats, Bench press", or "Squats, Bench press + 1 more" with more than two. This replaces the times below, so the card says what's in it.
        - With no step named, "01:05 - 00:20" (timed - rest) for a workout of one timed step and at most one rest step. With no rest it shows "- 00:00".
        - "5 steps · 02:15" otherwise, with the length of one round.
        - "4 steps · 01:30 + reps" when a round has rep steps, since they take as long as they take, or "2 steps · reps" when there are no timed steps at all.
    - The **rounds**: the number, or ∞; or the time limit, e.g. "Squats, Push-ups in 20:00", read as "as many rounds as possible in 20:00".
- **Hovering** with a mouse or trackpad: the card under the pointer stays as it is and the other workout cards dim (since 2026-11-05), so it's clear which one you're on. Not while a card's options are open or one's being dragged, and not on a touch screen.
- **Opening**: **a tap on a card** slides in the workout's **details** (since 2026-11-05; until then it started the workout). The whole card is a link, "Details of Legs day", so keyboards reach it and screen readers hear its summary with it.
- **Starting**: the big round **play button** in the middle of the card's foot, "Start Legs day", starts the workout from the beginning and opens the workout page. If a workout is already going, it's ended and logged as stopped first.
- **Swipe to delete**: a card swiped to the left follows the finger, showing **Delete** behind it in red, which turns solid once letting go would delete it. On letting go, where the swipe would carry it decides: past halfway it carries on off the card and deletes it, with the Undo bar; short of that it springs back. Caught again on its way off, it stops where it is and isn't deleted. A swipe to the right resists. Up and down scroll the page as usual; a swipe never starts the workout or opens its details.
- **Hold to pick up**: holding a card still for half a second **lifts** it (a little bigger, with a deeper shadow, and a short vibration where the phone has one). Then:
    - **Moved**, it's dragged: it follows the finger, the other cards slide aside to make room on a spring with no bounce, and an outline shows where it will land. Let go, and it settles there on the same spring, carrying on at the speed it was let go, and the library keeps that order. The order merges from a backup, and will sync, when it was moved more recently there than here (see [backup-and-sync](backup-and-sync.md)). Its options don't open.
    - **Let go of where it is**, its options open, as on an iPhone.
    - Moving before the half second is up is a swipe or a scroll, as above, never a drag.
- **Options** (⋮ on each card, a hold let go of, or a right-click; one open at a time, and a tap elsewhere closes it):
    - **Edit** opens the workout in setup (see [build-a-workout](build-a-workout.md), BLD-6).
    - **Move up** and **Move down** move it one place; the first card has no Move up and the last no Move down. The options stay open with focus on the same item, or on the other one once it reaches the top or bottom, and screen readers hear e.g. "Moved Legs day to 2 of 5".
    - **Delete** removes it from the library at once, and the **Undo bar** says "Deleted "Legs day"" with **Undo**, which puts it back where it was (see [home-and-navigation](home-and-navigation.md#undo)). Its history entries stay, under the title it had.
- However it's deleted, the cards after it **slide** up to close the gap, and Undo slides them back to make room as the card fades back in (at once with reduced motion, the fade staying). Move up and Move down slide the cards too.
- **Details** (LIB-4), the workout's own page (since 2026-11-05; a dialog over the list until then), at `/library/<its id>`, sliding in over Workouts as an exercise does over Exercises:
    - The workout's title.
    - **Muscles it works**: the body map, shaded for the main and supporting muscles of its steps' exercises, with the muscles listed under it. A muscle that's main in one exercise and supporting in another counts as main. With no step linked to an exercise: "None of its steps is an exercise yet. Pick exercises for them in Edit to see the muscles they work."
    - **History**: "Done once" or "Done 6 times", then its five latest runs, newest first, each its day ("Tue 21 Oct"), rounds and time (as in the history, e.g. "4 rounds · 24:10"), and each a link to that run on the Progress page. With more than five, **All in Progress** goes there. Never done: "Not done yet."
    - **What's in it**, last (since 2026-11-03; until then only Edit showed the steps): written out as a ready-made workout's preview is (see below), how many times it goes round ("Once through", "3 rounds of all of it", "As many rounds as you can in 20:00"), then its headings, each exercise with its sets ("Back squat 3 × 10, rest 1:00"), and each superset with its rounds and steps set in under it. An unnamed step goes by its kind, as in the history: "Work" or "Reps". An exercise linked to one that still exists is a link, with a **›** at the end of its line to show it on a phone, and its whole line pressable: its page slides in from the right at `/library/<workout id>/<its name>`, with the Workouts tab still chosen, and **‹** and the workout's title at its top, or a swipe right, slide it back to these details.
    - **‹ Workouts** at its top, or a swipe right, slides it back off, to the list where it was scrolled, with focus back on the card; **Edit** at the bottom opens it in setup. A link to a workout that's gone says "Workout not found".
- **Missing muscle groups** (LIB-5) and **a ready-made workout for them** (LIB-7) are on the Plan page since 2026-11-06, for what the plan leaves out rather than the whole library: see [planning](planning.md). Until then they were under the cards here.
- **No workouts**: "No workouts yet. Make one, or start with a ready-made one below." with a **Create a workout** button, and no **New** (one way to make a workout at a time), then the search and filters and the ready-made workouts.
- **Ready-made workouts** (LIB-6): listed under your own, under **Ready-made**, since 2026-11-06 (see below). Until then a link under the cards opened a page of them, at `/ready-made`, which now goes to Workouts.

### Ready-made workouts (LIB-6)

- Workouts that come with the app, made of built-in exercises (see [exercises](exercises.md)), in groups by what they need: **No equipment**, **Kettlebell**, **Dumbbells**, **Gym** and **Other kit** (a pull-up bar, dip bars or a step; since the second batch, 2026-11-03).
    - **The first batch** (10): Bodyweight basics, 20-minute AMRAP, Cardio intervals and Core in 15; Kettlebell full body and Kettlebell swing ladder; Dumbbell full body; Gym push, Gym pull and Gym legs.
    - **The second batch** (8, 2026-11-03), for the gaps the first left: **Tabata** (no equipment: four moves, 8 × 20 s hard and 10 s easy) and **Kettlebell AMRAP** (15 minutes), for fitness; **Dumbbell upper** and **Dumbbell lower**, a two-day split at home; **Gym full body**, a first gym workout of machines and dumbbells; **Gym extras**, for the hips, calves, lower back and grip the big lifts leave out; and, in Other kit, **Pull-up bar and dips** and **Step circuit**, for kit no workout used before.
    - Still to come, once there are exercises for them: a band workout, and mobility or stretching (see TODO). They're written into the app, not saved as your data: they don't sync, can't be changed or deleted, and can be improved in any release. Their ids (`builtin:<title-in-kebab-case>`) never change once released.
- **On Workouts**, under your own workouts (since 2026-11-06; on a page of their own until then): **Ready-made**, a line on what they're for ("Pick one to see what's in it. Added to your workouts, it's yours to start, change or plan."), then the groups, each with its workouts as cards in the look of yours: the title, a one-line description, how many exercises, the main muscles it works (the first four, then "+2 more"), and what it needs, with a › as it opens a page. A card has no play button, or heart, as it isn't yours yet. A group left empty isn't shown, and with none left, nor is Ready-made.
- **Left out**: any whose title is one of your workouts' already (in any case), as it's most likely a copy of it; deleting the copy brings it back. The search and filters cut them down as they do yours (see Search and filters): **Only what I have** on hides any needing a piece you haven't picked.
- What a workout **needs** is every need of its exercises, once; a choice (a dumbbell or a kettlebell) that's met by a piece it needs anyway is left out, as it changes nothing about who can do it.
- A card opens the workout's **own page** (since 2026-11-04; a dialog over the list until then), at `/ready-made/<its name>`, e.g. `/ready-made/gym-legs`, sliding in over Workouts as an exercise does over Exercises, with **‹ Workouts** at its top, or a swipe right, to slide back, with focus back on its card (`/library?ready-made=<its name>`) (from a ready-made plan's card it's the same page, at `/ready-made-plans/<its name>`, without the two Add buttons, and back to where the card was: see [planning](planning.md)):
    - The title, the description, and what it needs as chips.
    - **What's in it**: how many times it goes round ("Once through", "3 rounds of all of it", "As many rounds as you can in 20:00"), then its headings, and each exercise with its sets, e.g. "Goblet squat 3 × 10, rest 1:00", "Back squat 3 sets: 12, 10, 8, rest 2:30", "Side plank 2 × 0:30 each side", and each superset with its rounds and its steps set in under it.
    - **Muscles it works**: the body map, as in a workout's Details.
    - **Add and start**, then **Add to my workouts** under it.
    - A link to one there isn't says "Workout not found".
- **Add to my workouts** saves a copy as a new workout of your own, at the end of your workouts, which is then like any other: start it, edit it, plan it, delete it. Its page then slides back out to Workouts, with the new workout picked out and in view (screen readers hear "Added Gym legs"), and the Undo bar says "Added "Gym legs" to your workouts", with Undo taking it out again. Until 2026-11-04 the page stayed open, to add more. **Add and start** does the same and starts it, opening the workout page.
- Its steps have **no weights**, as everyone's are their own: Last time and the suggested weight fill in from the first run.
- Its page says "You have a workout called this in your workouts already" when one has its title, e.g. opened from a ready-made plan, as adding it again makes a second copy.

## Acceptance criteria

- Given no workouts, then the empty message and "Create a workout" show, and no New.
- Given workouts, then the title "Workouts" shows with New at its right, which goes to setup, and no Plan button.
- Given a workout with work 1:05 and rest 0:20 for 3 rounds, then its card shows "01:05 - 00:20" and 3.
- Given a workout of five unnamed steps, two of them reps, then its card shows "5 steps · mm:ss + reps".
- Given a workout of Squats, Bench press, Rows and a rest, then its card shows "Squats, Bench press + 1 more".
- Given a workout that runs until stopped, then its card shows ∞.
- Given a workout with a 20:00 time limit, then its card shows "in 20:00" in place of the rounds.
- Given a card, when I tap it, then its details slide in; when I press its play button, then that workout starts and the workout page opens.
- Given I've just pressed Save in Create on "Sprints", then Workouts shows Sprints highlighted, in view and focused, and says "Saved Sprints"; given a workout that's since been deleted, then nothing is highlighted.
- Given a card, when I swipe it left past halfway (or flick it), then it's deleted with Undo; when I let go short of halfway, then it springs back.
- Given a card, when I hold it, then it lifts; when I let go without moving, then its options open, and it doesn't start.
- Given three cards, when I hold the first and drag it below the third, then it's last, and stays last after a reload.
- Given a card, when I choose Move down in its options, then it's a place lower, its options are still open, and screen readers hear where it went.
- Given the first card, then its options have no Move up; given the last, no Move down.
- Given a workout done twice, when I open its Details, then it says "Done 2 times" and lists both runs, newest first, each linking to it in the history.
- Given a workout of 2 rounds, a heading "Main", 3 × 10 Back squat resting 1:00, and an unnamed 0:30 timed step, when I open its Details, then What's in it comes last, after History, saying "2 rounds of all of it", then Main, "Back squat 3 × 10, rest 1:00" and "Work 0:30".
- Given a workout of Back squat only, when I open its Details, then the body map shades the quads and glutes as main, and the hamstrings, adductors and lower back as supporting.
- Given no workouts, then the ready-made workouts are listed under Create a workout; given workouts, then under the cards.
- Given Gym legs in my workouts, then it isn't among the ready-made ones; when I delete it, then it is again.
- Given a ready-made card, then it has no play button, and pressing it slides in its page; when I go back, then focus is on its card.
- Given My own picked, then only my workouts show; given Ready-made, then only the ready-made ones; Clear search and filters goes back to All.
- Given the ready-made workouts, then they're listed under No equipment, Kettlebell, Dumbbells, Gym and Other kit.
- Given only a kettlebell picked and Only what I have on, then only the No equipment and Kettlebell groups of ready-made workouts show, and the count says how many of all the workouts show.
- Given Gym legs opened, then it reads "Back squat 3 sets: 12, 10, 8, rest 2:30" and shows the muscles it works.
- Given a ready-made workout opened, when I press Add to my workouts, then a copy is at the end of my workouts, Workouts slides back with it picked out, and Undo takes it out again.
- Given a ready-made workout opened, when I press Add and start, then a copy is in my workouts and it's running.
- Given workouts "Legs day" (Back squat) and "At home" (a step "Squats" linked to Goblet squat), when I search "squat", then both show, with the ready-made ones with a squat in them; when I search "goblet", then only At home.
- Given no workout matches the search, then "No workouts match" shows, and Clear search and filters shows them all again.
- Given a card, when I press its heart, then it's a favourite (the heart pressed), and with Favourites on only favourites show; pressing the heart doesn't open its details or start it.
- Given a favourite, when I edit it in Create and save, then it's still a favourite.
- Given Chest picked under More filters, then only workouts with a chest exercise as a main muscle show.
- Given a search hiding some workouts, then no card can be dragged and none has Move up or Move down.
- Given a search, when I open a workout's details and come back, then the search is still there; when I arrive from Save in Create with the saved workout hidden, then the search and filters are cleared.
- Given I delete a workout, then it's gone at once, and when it was the last one, the empty message shows; when I press Undo, then it's back where it was.

## Platform notes

- **Web:** `WorkoutLibraryComponent` and `WorkoutCardComponent` (`src/app/workout-library/`), at `/library`, and `WorkoutDetailsComponent` (`workout-details/`), at `/library/<its id>`; The search and filters are `LibraryFiltersComponent` (`library-filters/`), with what's chosen kept by `LibraryFilters` (`library-filters.service.ts`), and both lists cut down by `filterWorkouts()` in `src/app/models/workout-filter.ts`; the heart is `FavouriteButtonComponent` (`favourite-button/`), using `WorkoutStore.setFavourite()`. `/library?saved=<id>` highlights that workout (the card's `highlighted` input), as Create's Save goes there, and `/library?details=<id>` puts focus on its card, as coming back from its details does. The card's look is `styles/_showcase-card.scss` and the parts in `shared/components/showcase/`, shared with the ready-made cards, and what it needs comes from `workoutEquipment()` in `src/app/models/built-in-workouts.ts`. The card's swipe and hold are `CardGestures` (`workout-card/card-gestures.ts`), which uses `project()`, `rubberband()` and `VelocityTracker` from `src/app/shared/gesture.ts`, and springs with `criticallyDampedSpring()` from `src/app/shared/spring.ts`. Dragging is the CDK's drop list (`cdkDropList`, mixed orientation as the cards wrap into columns on wide screens), with a start delay of the card's hold time (`HOLD_MS`), so moving sooner leaves the press to the card's swipe or the page's scroll; the card lifts itself when the hold time is up. The cards close up and open out around a deleted one with `captureLayout()` (`src/app/shared/layout-change.ts`). Workouts are saved by `WorkoutStore`, in the library's order (`moveWorkout()`, which also saves when it was moved, for `mergeLibraryOrder()`). `?ready-made=<its name>` puts focus on a ready-made workout's card, as coming back from its page does.
- **Web, ready-made workouts:** `LibraryReadyMadeComponent` (`src/app/workout-library/library-ready-made/`), under your workouts, with those to show from `LibraryFilters.readyMade`, each a `ReadyMadeCardComponent` (`ready-made/ready-made-card/`); and `ReadyMadeWorkoutComponent` (`ready-made/ready-made-workout/`), at `/ready-made/:id`, held by the Workouts tab (`/ready-made` itself redirects to `/library`); a card's details are `readyMadeCard()` (`ready-made-card.ts`). The workouts are `BUILT_IN_WORKOUTS` in `src/app/models/built-in-workouts.ts`, written with its small builders (`sets()`, `superset()`, `reps()`, `timed()`, …) and only loaded with the page; `builtInWorkoutEquipment()` says what one needs and `copyOfBuiltIn()` makes the copy for `WorkoutStore.addWorkout()`. A workout's lines are `WorkoutOutlineComponent` (`src/app/shared/components/workout-outline/`, shared with a workout's Details), from `outline()` and `repeatsText()` in `src/app/models/workout-outline.ts`. Each workout is checked by `built-in-workouts.spec.ts`: its exercises exist and are named as they are, it reads back as a saved workout, and its supersets have more than one round.
- **iOS:** a `List` where tapping a row pushes its details and each row has a large play button to start it, with `.swipeActions` for Delete (a full swipe deletes), `.onMove` for dragging rows, a `.contextMenu` for Edit, Move and Delete on a hold, and the same Undo. The search is `.searchable`, with Favourites and the filters as tokens or a filter menu, and `.onMove` off while it's searched or filtered; the heart is a button on the row and in the details' toolbar. Details is a pushed page, as on the web, with Edit at its foot. The ready-made workouts are a `Section` under yours, each pushing its page.
- **Open question:** deleting the workout that's running doesn't stop the run on the web; after a reload the run is gone. Decide what a port should do.
