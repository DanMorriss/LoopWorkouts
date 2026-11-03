# Workouts (the library)

## Stories

- **LIB-1** As a user I want to see the workouts I've made and start one, so I can reuse them.
- **LIB-2** As a user I want to edit or delete a saved workout.
- **LIB-3** As a user I want to put my workouts in the order I want, so the ones I do most are easy to find.
- **LIB-4** As a user I want to see which muscles a workout works and when I last did it, so I can choose what to do today.
- **LIB-5** As a user I want to see which muscle groups none of my workouts work, so I can fill the gaps.
- **LIB-6** As a user I want ready-made workouts to pick from, so I don't have to make my own to get started.

## Rules

- The page, the **Workouts** tab (at `/library`; the Library until 2026-11-03), has a **title**, "Workouts", as Exercises and Progress do, with **New** at its top right (the filled main button, small enough to sit by the title), which makes a new workout. The weekly plan isn't here: it opens from the week on Today (PLN-4, see [planning](planning.md)). It was a **Plan** button beside New until 2026-11-03.
- Arriving from **Save** in Create (BLD-15, see [build-a-workout](build-a-workout.md)), the workout just saved is **highlighted**, tinted with a bar down its left as the history marks a workout just done, scrolled to the middle of the screen, with focus on it, and screen readers hear "Saved" and its name.
- The library lists every saved workout as a card, in the order they were made, unless they've been moved (see **Moving**).
- Each card shows:
    - The **title**, or "Untitled workout".
    - A **summary of one round**:
        - Its **exercises** when any step is named: the work and rep steps' names in order, each once, e.g. "Squats, Bench press", or "Squats, Bench press + 1 more" with more than two. This replaces the times below, so the card says what's in it.
        - With no step named, "01:05 - 00:20" (timed - rest) for a workout of one timed step and at most one rest step. With no rest it shows "- 00:00".
        - "5 steps · 02:15" otherwise, with the length of one round.
        - "4 steps · 01:30 + reps" when a round has rep steps, since they take as long as they take, or "2 steps · reps" when there are no timed steps at all.
    - The **rounds**: the number, or ∞; or the time limit, e.g. "Squats, Push-ups in 20:00", read as "as many rounds as possible in 20:00".
- **Starting**: **one tap on a card** starts the workout from the beginning and opens the workout page; a play glyph at the card's left says so. The whole card is a button, "Start Legs day", so keyboards reach it and screen readers hear its summary with it. If a workout is already going, it's ended and logged as stopped first.
- **Swipe to delete**: a card swiped to the left follows the finger, showing **Delete** behind it in red, which turns solid once letting go would delete it. On letting go, where the swipe would carry it decides: past halfway it carries on off the card and deletes it, with the Undo bar; short of that it springs back. Caught again on its way off, it stops where it is and isn't deleted. A swipe to the right resists. Up and down scroll the page as usual; a swipe never starts the workout.
- **Hold to pick up**: holding a card still for half a second **lifts** it (a little bigger, with a deeper shadow, and a short vibration where the phone has one). Then:
    - **Moved**, it's dragged: it follows the finger, the other cards slide aside to make room on a spring with no bounce, and an outline shows where it will land. Let go, and it settles there on the same spring, carrying on at the speed it was let go, and the library keeps that order. The order merges from a backup, and will sync, when it was moved more recently there than here (see [backup-and-sync](backup-and-sync.md)). Its options don't open.
    - **Let go of where it is**, its options open, as on an iPhone.
    - Moving before the half second is up is a swipe or a scroll, as above, never a drag.
- **Options** (⋮ on each card, a hold let go of, or a right-click; one open at a time, and a tap elsewhere closes it):
    - **Details** opens the workout's details (see below).
    - **Edit** opens the workout in setup (see [build-a-workout](build-a-workout.md), BLD-6).
    - **Move up** and **Move down** move it one place; the first card has no Move up and the last no Move down. The options stay open with focus on the same item, or on the other one once it reaches the top or bottom, and screen readers hear e.g. "Moved Legs day to 2 of 5".
    - **Delete** removes it from the library at once, and the **Undo bar** says "Deleted "Legs day"" with **Undo**, which puts it back where it was (see [home-and-navigation](home-and-navigation.md#undo)). Its history entries stay, under the title it had.
- However it's deleted, the cards after it **slide** up to close the gap, and Undo slides them back to make room as the card fades back in (at once with reduced motion, the fade staying). Move up and Move down slide the cards too.
- **Details** (LIB-4), a dialog over the page, growing out of where it was opened:
    - The workout's title.
    - **Muscles it works**: the body map, shaded for the main and supporting muscles of its steps' exercises, with the muscles listed under it. A muscle that's main in one exercise and supporting in another counts as main. With no step linked to an exercise: "None of its steps is an exercise yet. Pick exercises for them in Edit to see the muscles they work."
    - **History**: "Done once" or "Done 6 times", then its five latest runs, newest first, each its day ("Tue 21 Oct"), rounds and time (as in the history, e.g. "4 rounds · 24:10"), and each a link to that run on the Progress page. With more than five, **All in Progress** goes there. Never done: "Not done yet."
    - **Edit** opens it in setup; **Done**, Escape or a tap outside closes it, with focus back on the card's ⋮.
- **Missing muscle groups** (LIB-5), under the cards, once any workout has a step linked to an exercise:
    - The muscle groups that no exercise in any workout works, even as a supporting muscle: "None of your workouts work these. Pick one to find exercises for it."
    - Then those only ever worked as a supporting muscle: "Only lightly, as a supporting muscle:".
    - Each is a link to the Exercises list cut down to that muscle (`/exercises?muscles=calves`).
    - All worked as a main muscle somewhere: "Your workouts work every muscle group."
- **No workouts**: "No workouts yet. Make one, or start with a ready-made one." with a **Create a workout** button, and no **New** (one way to make a workout at a time), and **Browse ready-made workouts** under it.
- **Ready-made workouts** (LIB-6): once there's a workout, a link under the cards, "Ready-made workouts: Need ideas? Add one to your workouts." Either way in, the page slides in over Workouts, as an exercise does over the Exercises list, with ‹ Workouts and a swipe right back.

### Ready-made workouts (LIB-6)

- Workouts that come with the app, made of built-in exercises (see [exercises](exercises.md)), in groups by what they need: **No equipment**, **Kettlebell**, **Dumbbells**, **Gym**. They're written into the app, not saved as your data: they don't sync, can't be changed or deleted, and can be improved in any release. Their ids (`builtin:<title-in-kebab-case>`) never change once released.
- The page: its title, "Ready-made workouts", a line on what it's for, then **Only what I have** and **My equipment**, the same switch and pieces as on the Exercises list (one setting, so it's set once for both). Then the groups, each with its workouts as cards: the title, a one-line description, and "5 exercises · Dumbbells, Bench" (or "No equipment").
- **Only what I have** on hides any workout needing a piece you haven't picked, as the Exercises list hides exercises, and says how many are hidden: "4 more need equipment you haven't picked." A group left empty isn't shown. No-equipment workouts always show.
- What a workout **needs** is every need of its exercises, once; a choice (a dumbbell or a kettlebell) that's met by a piece it needs anyway is left out, as it changes nothing about who can do it.
- A card opens its **preview**, a dialog over the page, growing out of the card:
    - The title, the description, and what it needs as chips.
    - **What's in it**: how many times it goes round ("Once through", "3 rounds of all of it", "As many rounds as you can in 20:00"), then its headings, and each exercise with its sets, e.g. "Goblet squat 3 × 10, rest 1:00", "Back squat 3 sets: 12, 10, 8, rest 2:30", "Side plank 2 × 0:30 each side", and each superset with its rounds and its steps set in under it.
    - **Muscles it works**: the body map, as in a workout's Details.
    - **Add and start**, **Add to my workouts** and **Close** (Escape or a tap outside close it too, with focus back on its card).
- **Add to my workouts** saves a copy as a new workout of your own, at the end of your workouts, which is then like any other: start it, edit it, plan it, delete it. The page stays open, to add more, and the Undo bar says "Added "Gym legs" to your workouts", with Undo taking it out again. **Add and start** does the same and starts it, opening the workout page.
- Its steps have **no weights**, as everyone's are their own: Last time and the suggested weight fill in from the first run.
- A card whose title is already one of your workouts' says **In your workouts**, and its preview says so too, as adding it again makes a second copy.


## Acceptance criteria

- Given no workouts, then the empty message and "Create a workout" show, and no New.
- Given workouts, then the title "Workouts" shows with New at its right, which goes to setup, and no Plan button.
- Given a workout with work 1:05 and rest 0:20 for 3 rounds, then its card shows "01:05 - 00:20" and 3.
- Given a workout of five unnamed steps, two of them reps, then its card shows "5 steps · mm:ss + reps".
- Given a workout of Squats, Bench press, Rows and a rest, then its card shows "Squats, Bench press + 1 more".
- Given a workout that runs until stopped, then its card shows ∞.
- Given a workout with a 20:00 time limit, then its card shows "in 20:00" in place of the rounds.
- Given a card, when I tap it, then that workout starts and the workout page opens.
- Given I've just pressed Save in Create on "Sprints", then Workouts shows Sprints highlighted, in view and focused, and says "Saved Sprints"; given a workout that's since been deleted, then nothing is highlighted.
- Given a card, when I swipe it left past halfway (or flick it), then it's deleted with Undo; when I let go short of halfway, then it springs back.
- Given a card, when I hold it, then it lifts; when I let go without moving, then its options open, and it doesn't start.
- Given three cards, when I hold the first and drag it below the third, then it's last, and stays last after a reload.
- Given a card, when I choose Move down in its options, then it's a place lower, its options are still open, and screen readers hear where it went.
- Given the first card, then its options have no Move up; given the last, no Move down.
- Given a workout done twice, when I open its Details, then it says "Done 2 times" and lists both runs, newest first, each linking to it in the history.
- Given a workout of Back squat only, when I open its Details, then the body map shades the quads and glutes as main, and the hamstrings, adductors and lower back as supporting.
- Given workouts of Back squat and Bench press, then Missing muscle groups lists Biceps, Forearms, Abs, Obliques, Traps, Upper back, Abductors, Calves, Shins and Neck, and, apart, Shoulders, Triceps, Lower back, Adductors and Hamstrings as only lightly worked.
- Given no step linked to an exercise, then there's no Missing muscle groups section.
- Given no workouts, then Browse ready-made workouts shows under Create a workout; given workouts, then Ready-made workouts shows under the cards.
- Given the ready-made workouts, then they're listed under No equipment, Kettlebell, Dumbbells and Gym.
- Given only a kettlebell picked and Only what I have on, then only the No equipment and Kettlebell workouts show, and it says how many more need equipment I haven't picked.
- Given Gym legs previewed, then it reads "Back squat 3 sets: 12, 10, 8, rest 2:30" and shows the muscles it works.
- Given a ready-made workout previewed, when I press Add to my workouts, then a copy is at the end of my workouts, its card says In your workouts, and Undo takes it out again.
- Given a ready-made workout previewed, when I press Add and start, then a copy is in my workouts and it's running.
- Given I delete a workout, then it's gone at once, and when it was the last one, the empty message shows; when I press Undo, then it's back where it was.

## Platform notes

- **Web:** `WorkoutLibraryComponent`, `WorkoutCardComponent` and `WorkoutDetailsDialogComponent` (`src/app/workout-library/`), at `/library`; `/library?saved=<id>` highlights that workout (the card's `highlighted` input), as Create's Save goes there. The card's swipe uses `project()`, `rubberband()` and `VelocityTracker` from `src/app/shared/gesture.ts`, and springs with `criticallyDampedSpring()` from `src/app/shared/spring.ts`. Dragging is the CDK's drop list (`cdkDropList`, mixed orientation as the cards wrap into columns on wide screens), with a start delay of the card's hold time (`HOLD_MS`), so moving sooner leaves the press to the card's swipe or the page's scroll; the card lifts itself when the hold time is up. The cards close up and open out around a deleted one with `captureLayout()` (`src/app/shared/layout-change.ts`). Workouts are saved by `WorkoutStore`, in the library's order (`moveWorkout()`, which also saves when it was moved, for `mergeLibraryOrder()`). The muscles come from `musclesWorked()` and `musclesMissed()` in `src/app/models/workout-muscles.ts`.
- **Web, ready-made workouts:** `ReadyMadeComponent` and `ReadyMadeDialogComponent` (`src/app/workout-library/ready-made/`), at `/ready-made` (held by the Workouts tab). The workouts are `BUILT_IN_WORKOUTS` in `src/app/models/built-in-workouts.ts`, written with its small builders (`sets()`, `superset()`, `reps()`, `timed()`, …) and only loaded with the page; `builtInWorkoutEquipment()` says what one needs and `copyOfBuiltIn()` makes the copy for `WorkoutStore.addWorkout()`. The preview's lines are `outline()` and `repeatsText()` in `src/app/models/workout-outline.ts`. Only what I have and My equipment are `EquipmentFilterComponent` (`src/app/shared/components/equipment-filter/`), shared with the Exercises list. Each workout is checked by `built-in-workouts.spec.ts`: its exercises exist and are named as they are, it reads back as a saved workout, and its supersets have more than one round.
- **iOS:** a `List` where tapping a row starts it, with `.swipeActions` for Delete (a full swipe deletes), `.onMove` for dragging rows, a `.contextMenu` for Details, Edit, Move and Delete on a hold, and the same Undo. Details is a sheet. The ready-made workouts are a pushed view, with the preview as a sheet.
- **Open question:** deleting the workout that's running doesn't stop the run on the web; after a reload the run is gone. Decide what a port should do.
