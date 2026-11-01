# Build a workout

## Stories

- **BLD-1** As a user I want to build a workout from work and rest steps that repeats a number of rounds, so it tells me when to start and stop each exercise.
- **BLD-2** As a user I want a workout that runs until I stop it, for when I don't know how many rounds I'll do.
- **BLD-3** As a user I want to name each step (e.g. "Squats"), so I know what to do next without remembering the order.
- **BLD-4** As a user I want a step that's a number of reps instead of a time (e.g. 20 push-ups), and takes as long as I take.
- **BLD-5** As a user I want to add, reorder and delete steps, to build a circuit.
- **BLD-6** As a user I want to edit a saved workout, so I don't have to build it again to change it.
- **BLD-7** As a user I want to add a weight to a rep step (e.g. 10 squats at 60 kg), so I know what to lift.
- **BLD-8** As a user I want a workout with a time limit (e.g. 20 minutes) in which I do as many rounds as I can, so I can work to the clock rather than to a count.
- **BLD-9** As a user I want to give an exercise a number of sets and a rest between them (e.g. 3 × 10 with 60 seconds rest), so a gym plan goes in as it's written.
- **BLD-10** As a user I want an exercise done one side at a time (e.g. 10 reps each leg), so it runs the left, then the right, before the rest.
- **BLD-11** As a user I want each set of an exercise to have its own reps and weight (e.g. 12 @ 40 kg, 10 @ 45 kg, 8 @ 50 kg), for a pyramid or warm-up sets.
- **BLD-12** As a user I want a superset (or, of three or more, a giant set): exercises done one after another, then a rest, for a number of rounds.
- **BLD-13** As a user I want to add headings to a workout (e.g. "Warmup", "Upper body"), so a long workout is easy to follow.
- **BLD-14** As a user I want to swap a step's exercise for another that works the same muscles while setting a workout up, so I can fit it to the equipment I have. (Its rules are with the exercise picker in [exercises](exercises.md).)
- **BLD-15** As a user I want to save a workout without starting it, so I can build one now and do it another day.
- **BLD-16** As a user I want to browse the exercises for a step, by muscle and the equipment I have, as the Exercises page lists them, without leaving the workout I'm making. (Its rules are with the exercise picker in [exercises](exercises.md).)

## Rules

### A workout

- A workout has a **title** (optional), a list of **steps** that make one round, and a number of **rounds** or a **time limit**.
- Rounds: **1 to 30**, or **∞** (until stopped). A new workout starts at 1.
- Or a time limit: as many rounds as fit in it (BLD-8; running it is RUN-8).
- Steps run in order to make one round, each for its **sets** (below); then the round repeats.
- **Rest at the end of the last round is skipped**: every rest step after the last timed or rep step of the round is left out of the final round, since the workout is over. Rest at the start or middle of a round is kept.
- A workout must have **some work**: at least one timed step with time, or one rep step with reps. Otherwise it can't be started, and once something has been put in a step (a name, a time, reps or a weight) the form says "Workout needs a timed step or some reps".

### Steps

- Three kinds:
    - **Timed**: a time, 0:01 to 99:59 (minutes 0–99, seconds 0–59). Called "Work" until October 2026; saved data still says `work`.
    - **Rest**: a time, the same range.
    - **Reps**: a count, 1 to 100, and an optional **weight**. No countdown; the workout waits until Done (see [run-a-workout](run-a-workout.md)).
- Each step has an optional **name**, up to 40 characters, trimmed when saved. The name box suggests "e.g. Squats" (timed), "e.g. Catch your breath" (rest) or "e.g. Push-ups" (reps).
- A timed or rep step's name box is labelled **Exercise (optional)** and finds exercises as you type, or makes a new one (EXR-2, see [exercises](exercises.md#picking-an-exercise-exr-2)), with a **Browse** button to its right that opens the whole list to pick from (BLD-16). A rest step's is a plain name box.
- **Up to 20 steps.** At 20, the **+ Step** button is disabled and the page says "That's the most steps a workout can have (20)."
- A new workout starts with **one open rep step** at 0 reps. Every step can be deleted, which shows the hint "Add a step to start."
- An **(i) button** beside the Steps heading shows the tip "Each round runs these in order. Steps left at 00:00 or 0 reps are skipped." on hover, focus or a tap, and hides it on Escape, when the pointer or focus leaves, or on a click elsewhere.
- Steps left at **0:00 or 0 reps are left out** when the workout is saved.
- Back-to-back steps of the same kind stay separate steps (each gets its own alarm and countdown).

### Sets (BLD-9)

- A timed or rep step has **Sets**, 1 to 30 on a wheel, under its other wheels. A new step has 1. A rest step has none: it's just a time.
- With more than one set, **Rest after each set (mm:ss)** shows under it: a minutes and a seconds wheel under the one label (each named to screen readers), 00:00 to 99:59, at **01:00** the first time Sets goes above 1 (and as saved after that).
- The rest comes **after each set, the last included**: 3 sets is set, rest, set, rest, set, rest, then the next step, so there's time to get to it. Two exceptions: at the end of the workout there's no rest (it's over), and a rest step straight after takes its place rather than adding to it. One set has no rest.
- Collapsed, a step with sets says so as the history does, with its rest: "3 × 10 @ 60 kg · rest 01:00", "3 × 00:45 · rest 00:30", or "3 × 10" with no rest.
- The tip by the Steps heading says "Each round runs these in order, each for its sets. Steps left at 00:00 or 0 reps are skipped."
- Saved, each step is a group of its own, its sets the group's `rounds` (see [data](data.md)), and a superset is a group of its steps (below). A workout of steps of one set runs as before: each straight after the last.

### Each side (BLD-10)

- A timed or rep step has an **Each side** switch beside its Sets wheel, off to start with. A rest step has none, and a step changed to rest is saved without it.
- On, each set runs **both sides**, the reps (or time) and weight being for each side: "10 reps each side" is 10 left and 10 right. Which side goes first, and the countdown between a timed step's two sides, are settings (see [settings](settings.md)); running it is in [run-a-workout](run-a-workout.md).
- Collapsed, the step says so: "10 reps each side", "00:30 each side", or with sets, "2 × 10 each side · rest 00:45".

### Vary each set (BLD-11)

- A timed or rep step with more than one set has a **Vary each set** switch under Rest after each set, off to start with. Off, every set has the step's one Reps and Weight (or time).
- On, the step's own Reps and Weight (or Minutes and Seconds) wheels give way to a **row a set** under the switch: "Set 1 · 12 × 40 kg", "Set 2 · 10 reps" (no weight), or "Set 1 · 00:30" for a timed step. Tapping a row opens its own Reps and Weight wheels (or Minutes and Seconds), closing any other; the rows below slide to make room, as steps do when they open and close.
- Turning it on starts every row at the step's reps and weight (or time). Turning it off sets every set back to **set 1's**.
- Raising Sets adds a row **copied from the last set**; lowering it removes rows from the end. Down to 1 set there's nothing to vary, so it turns off, the step keeping set 1's.
- For a step done each side, a row is for both sides.
- A row left at 0 reps (or 00:00) while others have some stops the workout starting, with "Each set needs some reps or time". A step whose rows are all empty is left out, as any empty step is.
- Collapsed, the step lists its sets: "12, 10, 8 @ 40–50 kg · rest 01:00" (one weight if they share it, none if none has one), or "00:30, 00:45, 01:00 · rest 00:30".
- Saved, set 1's reps and weight (or time) are the step's own, and each set's go in its `sets` (see [data](data.md)). Running it, a change mid-workout is for that set only (RUN-6, in [run-a-workout](run-a-workout.md)).

### Supersets (BLD-12)

- **What it's called goes by how many exercises are in it:** a **superset** with 2, a **giant set** with 3 or more (rest steps don't count). It's one thing either way, and the name changes by itself as exercises are joined or taken out, in Create and on the run screen.
- **Join with next**, at the bottom of an open timed or rep step, joins it and the exercise straight after it (a timed or rep step not in a superset) into a superset, with the first one's Sets as its **Rounds** and its Rest after each set as its **Rest after each round**. The second's sets become the rounds too (with Vary each set on, as Sets does to its rows). On a superset, Join with next adds the exercise after it, making it a giant set. Focus goes to the superset, and screen readers hear what it is, e.g. "Superset, steps 1 to 2, 3 rounds · rest 01:00: Bench, Row".
- A superset has a **row of its own** heading its steps: "SUPERSET" (or "GIANT SET") where a step has its kind pill, a **Rounds** wheel (1 to 30) and, with more than one round, **Rest after each round** (as Rest after each set). Its steps sit in from it, joined to it by a line, each as a step is, with Each side and **Vary each round** (rows "Round 1 · 10 reps"…), but no Sets of their own: Rounds sets each of their sets. A rest step can go in it too (e.g. bench, rest 0:15, row).
- Its **+ Step** adds a rep step at its end, opened with the cursor in its name box; the 20 steps include a superset's steps, and its own row doesn't count.
- **Take out**, on one of its steps, makes it an exercise of its own again, just after the superset, with its rounds as its sets and its rest between them. A superset left with one step becomes that exercise the same way, and so does one left with one step by a delete.
- **Collapsed**, a superset is one line of its steps' names and its rounds and rest, e.g. "Bench, Row" and "3 rounds · rest 01:00", and its steps are hidden with it, so a collapsed workout reads as its plan.
- **Moving:** a superset moves up and down with its buttons, with its steps, past the step or whole superset beside it, or is **dragged whole** by its row's handle: as the handle is pressed, its steps fold away under its row (if it's open), it drags as one card, "Superset" (or "Giant set") with its steps' names and rounds, e.g. "Bench, Row · 3 rounds · rest 01:00", and its steps follow it to where it's dropped, open again as they were. It can't be dropped into another superset; just under another's row, collapsed, it goes after that one's steps. Let go without dragging, its steps come back where they were. Its steps move up and down within it, by their buttons or dragged, and can't leave it but by Take out. Other steps move past it whole, and dragged, can't go into it; one dropped just under a collapsed superset's row goes after its steps, which is where it shows.
- **Deleting** a superset deletes its steps with it, with Undo ("Deleted Superset, steps 2 to 3"), which brings the lot back.
- Saved, a superset is a group of its steps, with its rounds and rest (see [data](data.md)). Steps left at 00:00 or 0 reps are left out as any are, and a superset left with none goes with them. A group of several steps of **one round** opens in Create as its steps on their own, as it runs the same: workouts from before groups are one group of all their steps, run once a round.
- Running it is in [run-a-workout](run-a-workout.md): "superset round 2 of 3", and a strip of the round's steps.

### Headings (BLD-13)

- **+ Heading**, beside + Step, adds a heading at the end, opened (closing the others) with the cursor in its box: **Heading**, "e.g. Warmup", up to 40 characters, trimmed when saved. One left empty is left out when the workout's saved.
- A heading is a label, not a step: it has no kind pill, wheels or number, and takes no time. The steps after it are numbered as if it weren't there.
- It moves, collapses and is deleted (with Undo: "Deleted Heading, Warmup") as a step is. Moved, screen readers hear where it went by the step after it, e.g. "Moved heading, warmup to before step 3".
- Collapsed, it shows its text in the style of a section title, so a collapsed workout reads as its plan.
- **Up to 10 headings**, which don't count towards the 20 steps. At 10, + Heading is disabled and the page says "That's the most headings a workout can have (10)."
- Saved, each is a heading in its place among the workout's groups (see [data](data.md)). Running, it's the section line (RUN-10, in [run-a-workout](run-a-workout.md)); in the history and the summary, the sets are grouped under it.

### Adding, moving and deleting

- **Add step** (shown as "+ Step") adds a **rep step** at the end, opens it (closing the others) and puts the cursor in its name box.
- **Changing kind:** a step's kind pill (e.g. "REPS") opens a menu of Reps, Timed and Rest, with the current one ticked. Picking one changes the step, open or collapsed, and focus goes back to the pill. The step keeps its name, exercise and numbers, so changing back finds them; only those its kind uses are saved. Escape, a click elsewhere or tabbing away closes the menu.
- A step can be moved up or down one place with buttons, or dragged by its handle. The first step can't move up; the last can't move down. A dragged step shows as a compact card, no wider than the step (its time goes under its name if they don't fit), held where the handle was grabbed, so it doesn't jump under the pointer, and **lifted** off the list as a held library card is: a little bigger, with a deeper shadow (it grows into that as it's picked up, but not with reduced motion). The other steps slide aside on a spring with no bounce, and let go, it settles into its place on the same spring, carrying on at the speed it was let go.
- A superset and its steps move as above (BLD-12).
- **Deleting** a step happens at once. For one with a name, time or reps, the **Undo bar** says "Deleted Step 2, Squats, 00:45" with **Undo**, which puts it back where it was (see [home-and-navigation](home-and-navigation.md#undo)); an empty one (no name, no time or reps) has nothing to undo.

### Collapsing

- Each step can be **open** (name box and wheels) or **collapsed** to one line: its name (or kind) and time, e.g. "Squats 00:45" or "Push-ups 20 reps".
- **Expand all / Collapse all** opens or closes every step at once.
- Opening or closing, the steps and everything under them **slide** to their new places on a spring with no bounce, and an opening step's name box and wheels fade in. With reduced motion they move at once, and the fade stays.
- A step opens as it's added. A saved workout opens with every step collapsed, so the whole workout is in view.

### Picking numbers

- Times, reps, weights and rounds are picked on **wheels** like iPhone pickers: swipe, scroll or drag, tap a number, or type one. Whatever sits in the middle is selected.
- Dragged with a mouse, a wheel follows once the pointer has moved 10px. Flicked, it glides on as far as the flick would carry it and settles on that row; pulled past either end, the numbers stretch and spring back. (Touch already scrolls this way.)
- The rounds wheel ends with **∞** after 30. Next to it, an **Until stopped** switch turns the wheel to ∞; turning it off goes back to the number of rounds picked before. The switch shrinks a little as it's pressed.

### Time limit (BLD-8)

- Under **Repeat the whole workout** (called Repeat until sets came in), a choice of **Rounds** or **Time limit**, as a row of two (radio buttons for keyboards and screen readers). Rounds to begin with, and for a workout saved with rounds.
- **Time limit** swaps the rounds wheel and the Until stopped switch for **Minutes** and **Seconds** wheels, 00:00 to 99:59, at **20:00** to begin with, and the hint "As many rounds as you can before time's up."
- 00:00 won't start: "Time limit needs to be longer than 00:00".
- Going back to Rounds keeps the time picked, and the other way round, until the workout's saved: it saves only the one picked.
- Saved, a time limit is `timeLimitSeconds` with rounds until stopped (see [data](data.md)). Editing a workout with one opens on Time limit, with its time.

### Weights (BLD-7)

- A rep step has a **Weight** wheel beside its Reps wheel, labelled with the unit chosen in Account → Profile: "Weight (kg)" or "Weight (lb)".
- It starts at **–** (none, read out as "none"), for bodyweight moves, which then show just "20 reps".
- It goes up in steps of **0.5**: to 300 kg, or 660 lb. Typing a number works, with a decimal point (or comma) for halves, e.g. "62.5".
- A collapsed rep step shows the weight with the reps: "10 reps @ 60 kg". A step with only a weight still asks before it's deleted.
- Weights are **saved in kg** whatever unit is shown (see [data](data.md)), and shown to the nearest 0.5 in the chosen unit. Editing a workout without moving a weight's wheel keeps the weight exactly as saved, so rounding for display never changes it.

### Saving

- The main button says **Start workout** for a new workout and **Save & start workout** when editing. It saves the workout to the library, starts it, and opens the workout page.
- **Save** (BLD-15) sits to its left, a smaller pill, so Start stays the main one. It saves the workout as Start does, without starting it, empties the form and goes back to the library, with the workout highlighted, in view and focused, and screen readers hear "Saved Sprints" (see [library](library.md)). It's held back by the same checks as Start.
- Saving a new workout gives it the next id (one more than the highest saved).
- Editing replaces the saved workout, keeping its id. If it's been deleted meanwhile, it's saved as a new one.

## Acceptance criteria

- Given a new workout, then it has one open rep step at 0 reps and 1 round, shows no error, and can't be started.
- Given a rep step, when I pick Timed from its kind pill, then it's a timed step with Minutes and Seconds wheels, and focus is on the pill.
- Given a timed step "Squats" at 0:30, when I change it to Reps and back, then it's "Squats" at 0:30 again; saved as Reps with 10 reps, it's saved with just the reps.
- Given every step is 0:00, when I try to start, then it won't, and says it needs a timed step or some reps.
- Given timed 0:45 and rest 0:00, when I start, then the saved workout has just the timed step.
- Given a workout with only rep steps, when I start, then it starts (reps count as work).
- Given 20 steps, then "+ Step" is disabled, with the reason shown.
- Given one step, when I delete it, then there are none, the hint shows, and focus goes to "Add step".
- Given + Heading, then a heading is added at the end with the cursor in its box; given " Warmup " typed in it and the workout saved, then it's saved as "Warmup" in its place, and the step after it is numbered as if it weren't there.
- Given a heading left empty, when I save, then it's left out.
- Given 3 sets of 10 @ 40 kg, when Vary each set is turned on, then there are 3 rows of 10 × 40 kg; when set 3 is changed to 8 and Sets goes to 4, then a 4th row copies the 3rd (8 × 40 kg).
- Given rows of 12, 8 and 10, when Vary each set is turned off, then every set is 12, as set 1 was.
- Given 10 headings, then + Heading is disabled, with the reason shown, and + Step still works.
- Given a step named "Squats" at 0:45, when I delete it, then it goes at once and "Deleted Step 1, Squats, 00:45" offers Undo; when I press Undo, then it's back in its place.
- Given steps A, B, C, when I move C up, then the order is A, C, B, and C keeps its name and time.
- Given the Until stopped switch is turned on after picking 5 rounds, when it's turned off, then rounds go back to 5.
- Given bench press (3 sets, 1:00 rest) and seated cable row, when I pick Join with next on bench press, then they're a superset of 3 rounds with 1:00 rest between rounds, saved as one group of both.
- Given that superset, when I join shoulder press to it, then it's called a giant set; when I take shoulder press out again, then it's a superset, and shoulder press is the step after it, with 3 sets.
- Given a superset of two steps, when I take one out, then both are exercises of their own, each with the superset's rounds as its sets and its rest.
- Given a superset of bench and row, then plank, when I drag the superset by its handle past plank, then plank is first and the superset second with bench and row still in it, and a screen reader hears "Moved superset to the end".
- Given a collapsed superset of bench and row, then it shows "Bench, Row" and "3 rounds · rest 01:00", and its steps are hidden.
- Given a step after a superset, when I move it up, then it goes before the whole superset; given the superset's first step, then it can't move up.
- Given I edit a saved workout, then it opens with its steps collapsed, and saving updates it rather than adding another.
- Given Time limit is picked, then the wheels show 20:00; when I pick 12:30 and start, then the workout is saved with a time limit of 750 seconds and rounds until stopped.
- Given Time limit at 00:00, then it won't start, and says the time limit needs to be longer than 00:00.
- Given 5 rounds, when I pick Time limit and then Rounds again and start, then it's saved with 5 rounds and no time limit.
- Given a saved workout with a time limit of 20:30, when I edit it, then Time limit is picked, at 20:30.
- Given a rep step of 10 reps at 22.5 kg, when I start, then it's saved with weight 22.5; given one left at –, then it's saved with no weight.
- Given weights in lb, when I pick 135, then it's saved as 61.235 kg, and shows as 135 lb.
- Given a step saved at 20.412 kg (45 lb), when I edit only the title, then the weight stays 20.412.
- Given a new workout "Sprints" with a timed step of 0:30, when I press Save, then it's in the library, nothing is running, and the library opens with Sprints highlighted and focused.
- Given a saved workout being edited, when I rename it and press Save, then the library still has one of it, renamed, and nothing is running.
- Given only a rest step, then Save is disabled, as Start is.

## Platform notes

- **Web:** the form is `WorkoutSetupComponent` (`src/app/workout-setup/`), at `/setup`, or `/setup?editId=<id>` to edit; `&add=<exercise id>` (or `/setup?add=<id>` for a new workout) adds that exercise at the end (EXR-12, from its page), then takes `add` off the address so it isn't added again. The wheels are `WheelPickerComponent`. Opening and closing steps slide with `captureLayout()` (`src/app/shared/layout-change.ts`), moving only transforms rather than animating heights. Rounds or Time limit is the shared segmented control (`src/styles/_segmented.scss`, also settings' theme). Rules for what counts as a valid workout are in `src/app/models/workout.ts`. The form keeps one flat list of rows: a superset is a row of its own (kind `superset`, its rounds as its `sets`) followed by its steps, each with the superset's key as its `group`; `moved()`, `wellFormed()` and `lonelyStepsOut()` keep them together. A superset's hidden steps are shrunk to nothing in place (`.step--hidden`), not `display: none`: the CDK drag orders the rows by where they are on screen, and a `display: none` row measures at the top, which put the indexes out. Dragging a superset hides its steps from the handle's `pointerdown` (`heldSuperset`), before the drag measures the list, and `movedRow()` takes its steps with it on the drop.
- **iOS:** the kind pill maps onto a `Menu` (or a `Picker` with `.menu` style) labelled with the kind; the Steps tip onto a `.popover` or `.help()` on an `info.circle` button. The wheels map directly onto `Picker` with `.wheel` style. Drag to reorder maps onto `List` with `onMove`, and a superset onto a `Section` of it, with its Rounds and Rest in the section's header; swipe to delete is the iOS habit, but keep the "ask first if it has something in it" rule. Start and Save map onto two buttons at the foot of the form, Start `.borderedProminent` and Save `.bordered`; Save pops back to the library, scrolling to the saved row and marking it.
