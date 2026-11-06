# Run a workout

## Stories

- **RUN-1** As a user I want to see at a glance which step I'm on, how long is left and which round it is, from across the room.
- **RUN-2** As a user I want to see what's coming next, so I can get ready for it.
- **RUN-3** As a user I want the workout to wait while I do a set of reps, and carry on when I tap Done.
- **RUN-4** As a user I want to know when I've finished, and be able to note how it went.
- **RUN-5** As a user I want the countdown to stay right even if my phone sleeps or I switch apps.
- **RUN-6** As a user I want to change the reps or weight while I'm on a rep step (e.g. going up a weight, or managing fewer reps), so what I log is what I did, and next time starts from there.
- **RUN-7** As a user I want a summary of how a workout went when I finish or end it, where I can correct a set, add a note, and go back to the workout if I ended it early.
- **RUN-8** As a user I want a workout with a time limit to count my rounds up, show the time left, warn me as it runs out, and stop when time's up, so I can just keep going until then.
- **RUN-9** As a user I want to check how a step's exercise is done, mid-workout, without leaving it.
- **RUN-10** As a user I want the workout to show which set, side or round I'm on, and the section I'm in, so I know where I am in a long gym workout.
- **RUN-11** As a user I want to swap an exercise for something equivalent mid-workout, e.g. when someone's on the machine, so I can still work those muscles.
- **RUN-12** As a user I want to skip any step, e.g. a warm-up I've done already, a rest I'm ready to cut short or a set I'm leaving out, and carry on from the next step without it logged as done.

## Rules

### Timing

- Each step counts down from its full time, in whole seconds, then the next starts at once. Rounds follow straight on.
- Rest after the last work or rep step of the **last round is skipped** (see [build-a-workout](build-a-workout.md)), so the workout finishes there.
- A step with **sets** runs them one after another, with its rest after each, the last included, then the next step starts (BLD-9). The last set's rest is skipped when it would end the workout (the whole workout's last round), and when a rest step comes next, which takes its place.
- A step done **each side** (BLD-10) runs both sides in each set, then the rest after the set: the side the settings start with first. A rep step's second side waits for Done like any rep step, with nothing between. A timed step's sides have **Switch sides** between them, a countdown in the rest colour (5 seconds to begin with, or as set; none when it's Off), which isn't a set and isn't logged.
- How sides run is taken from the settings **when the workout starts** and kept with it (refreshing the page too), so changing them mid-workout can't move its clock; the next workout uses the new ones.
- A workout that runs **until stopped never finishes** on its own.
- The countdown is worked out **from the clock** (now minus when it started, less any pauses), never by counting ticks. If the app is held up, it shows the right time as soon as it can, rather than running slow. The clock ticks on each quarter second of the run, and on each alarm, so the face rolls on to a step and the phone vibrates in the same tick the step's beep was booked for.
- Whole workout length = rounds × (sum of timed steps in a round) − (rest at the end of a round). Rep steps add whatever time they take on top.

### A time limit (RUN-8)

- Rounds go on one after another, **as many as fit**. Time's up when the countdown plus the time spent on rep steps, less any time skipped, reaches the limit: **reps and rests count**, pauses don't, and the time a skip saves goes to **more rounds** (RUN-12).
- When time's up the workout **finishes at once**, part-way through a step or not, as if it ran to its end: "Time's up" on the summary, the finish alarm, and logged as finished.
- **The score** is the full rounds done, and the steps done of the round it ran out in, rests left out: "7 rounds + 3". The step it ran out in isn't done, so a timed set of it isn't logged.
- **Alarms**: the steps' alarms as usual, up to the end; a short tick (see [alarms](alarms.md)) at 10 seconds left, and at 3, 2 and 1; then the finish. The end is known even while a rep step is waited on, so it's booked then too.

### Rep steps

- When the clock reaches a rep step, the workout **stops and waits**, however long it takes. The ring is full and still, in violet, and the face shows the reps, e.g. "20 reps", with the weight under them, e.g. "60 kg", or a quiet "+ kg" with none (see RUN-6).
- **Done** is the "Next:" line under the ring: a pill in the next step's colour, e.g. "Next: Rest · 01:00 →", with an arrow on to it. Screen readers hear "Done. Next: Rest · 01:00". It moves on to the next step, which starts from its **full time**. The big button stays **Pause**, as on any other step. While paused, the line is only what's next again, not a button.
- If Done had focus and the next step isn't a rep step (so Done goes), focus moves to Pause.
- As a rep step comes round, **Done swells once**, as it's the user's move now (not with reduced motion). The phone vibrates with the step's alarm, as for any step.
- **Pressing Done** finishes the set: the full ring stays a moment over the next step's, swelling out as it fades (not with reduced motion), in the same frame as the next step's beep and vibration.
- The time spent on reps doesn't come off any countdown, but it **counts as time spent** in the history.

### Skipping a step (RUN-12)

- **Skip** (⏭, captioned "Skip") is beside Pause, to its right, on **every kind of step**, like a media player's: for a warm-up you've done already, say, a rest you're ready to cut short, or a set you're leaving out. It moves on to the next step, which starts from its **full time**, as Done does on a rep step. Not while paused, when the controls under the ring go.
- Screen readers hear "Skip step", or "Skip rest" on a rest.
- The next step's alarm sounds and the phone vibrates at once, as the step starts; the skipped step's countdown beeps don't.
- A skipped **rep step** isn't logged: it's Done without its set, so its ring doesn't fill, and the time spent on it still counts, as on any rep step. A skipped **timed exercise** is logged with the time it actually ran, in whole seconds (none if under a second), not its full length. A skipped **rest** isn't logged, as rests never are.
- What's skipped doesn't count as time spent in the history. With a **time limit**, it doesn't count towards the limit either, so the time saved goes to more rounds. Skipping the last step of the last round finishes the workout.

### What's on screen

- **Title**: the workout's title. On a phone it takes the place of the app name in the header.
- **Section line** (RUN-10), above the round line: the heading of the part it's in, if there's one before it, and how far through the workout's exercises it is, e.g. "Knee rehabilitation · 2 of 7". Rest steps and headings don't count, and a superset counts as one; a rest step is part of the exercise before it, or the first before any. Only for a workout with headings or more than one exercise, and its room is kept for the whole run, so the ring doesn't move as it changes. One line, cut short with "…" if it's too long. Screen readers hear the count as "exercise 2 of 7", and "Knee rehabilitation, exercise 2 of 7" as each exercise starts (not on each of its sets).
- **Round line**:

    - "round 2 of 5" for a workout of more than one round, with a dot per round (done, current, to go) when there are 15 rounds or fewer.
    - "**Last one!**" in place of the count in the final round.
    - "round 3 of ∞" for a workout that runs until stopped.
    - "round 3" for a time limit, with the **time left** under it, e.g. "12:34 left", in the accent colour for its last 10 seconds. Screen readers hear it with the round as each round starts, e.g. "Timed, round 3, 12:34 left"; the time left itself isn't read out as it ticks.
    - Nothing for a single-round workout.
    - **On a step with sets** (BLD-9), its sets instead: "set 2 of 3", with a dot per set when there are 15 or fewer, and "**Last one!**" in the last set. The rest after a set is part of that set: resting after set 1 still says "set 1 of 3", and the next set's line turns in as it starts. Resting after the last set says "set 3 of 3", not "Last one!", as it's done. When the whole workout repeats, its round follows on the same line: "set 2 of 3 · round 1 of 2", "· round 3 of ∞", or "· round 3" with the time left under it for a time limit. Screen readers hear "set 2 of 3", or "last set", with each set. (RUN-10; the section line is above.)
    - **In a superset** (BLD-12), its rounds the same way: "superset round 2 of 3", or "giant set round 2 of 3" for three exercises or more, with a dot per round and "**Last one!**" in the last, for each of its steps. Screen readers hear "superset round 2 of 3", or "superset, last round".
    - The **time left of the whole workout**, e.g. "01:20 left", beside the dots, for a set number of rounds of timed steps only. Not with rep steps, which take as long as they take, nor until stopped.
    - A **strip of the round's steps** under it, one segment per step in its kind's colour: an outline to go, filled but quieter when done, and taller with a glow for the one in progress. Only when a round has more than one work or rep step (a plain work-and-rest workout leaves it out), and no step has sets (whose round line says where it is). In a workout with sets, a superset's round (BLD-12) has one, of its steps and the rest after it; hidden from screen readers, which hear the step number, e.g. "step 2 of 5", with each step.

- **Ring**: fills as the step goes by. Timed steps fill clockwise in pink; rest fills anticlockwise in blue. Both ends of the fill are **rounded**, as a drawn line's are, where it starts at 12 o'clock and where it's got to (since 2026-11-06; flat until then, when timed steps also had a bright dot at the leading edge, which the rounded end now does the job of). The face behind the time is tinted in the phase colour, and holds still for most of the step.
- **The bubble is a glossy ball** (since 2026-11-06): the ring is shaded as a tube, lighter along its inner middle and at the top left, darker at its outer edge; and the face fills the circle inside it (it had a thin white rim until then) as a glossy ball, with a hard white highlight at its top left, a faint sheen across its top, light bounced up along its bottom rim, its curve darkening towards the edge (most at the bottom right, away from the light), a crisp edge and a shadow cast onto the ring. The middle, where the step's name and time are, stays clear. The light and shade stay still, in both themes, paused and on a rep step's full ring too, so nothing repaints as the ring fills (`.workout-ring__shine` and `.workout-ring__gloss` in `workout-ring/`, with the tokens `--bubble-light` and `--bubble-shade`).
- **Face**:
    - An **icon for the step's kind** on its own line (a stopwatch for timed, a seated figure for rest, a dumbbell for reps), so the kinds aren't told apart by colour alone.
    - The step's name under it. Unnamed work shows just the icon over the time; unnamed rest says "Rest"; unnamed reps say "Reps".
    - For a step done each side, **which side** under its name: "Left side" or "Right side". The other side rolls up from below, as a new step does. Screen readers hear it with the step, e.g. "Step-up, left side, 10 reps".
    - An **(i)** to the right of the name of a step that's an exercise (RUN-9), drawn small in the face's quieter text colour but 44px to tap. It opens the exercise's details over the workout, as Create's Details does (EXR-11): what its page shows (its description, your note, the muscles it works, how to do it and tips), without its progress, and with **Swap exercise** in place of Create's Pick another (RUN-11, below). The workout carries on underneath, the clock too; Space and Escape are left to the dialog while it's open. ‹ Back at its top, which stays in reach as the details scroll (or Escape, or a tap outside) closes it, with focus back on the (i), or on Done or Pause if the workout has moved on to a step with no exercise meanwhile. A step that's only a name, e.g. "Jog", has none. Screen readers hear it as "Details of Push-up". While paused it stays, beside the step's name over the greyed ring, as pausing to read how it's done is what it's for (see [pause-and-stop](pause-and-stop.md)); closing the details there goes back to it.
    - A **long name** is fitted to the circle: at full size on one line if it fits; otherwise on two even lines, e.g. "Bodyweight / squat"; and only if that's still too wide, shrunk as far as it needs to be, to no less than 70% of its size. A name too long even for that, e.g. "Single-leg Romanian deadlift" on a phone, gets a third line in the same way. Past that, its last line ends in "…". It's fitted again when the screen changes size, e.g. a phone turned round.
    - The time left as mm:ss, e.g. "00:45". On each of a timed work step's **last 3 seconds** (for a step longer than that) the time pops in a little large and settles. Not rest. Countdown beeps tick in the last 3 seconds of timed steps and rests of 10 seconds or more (ALM-5; see [alarms](alarms.md)).)
    - On a rep step, the **count is the big thing**, e.g. "12 reps", with the weight and "Last time" under it.
    - During **rest, what's after it**, e.g. "then Bench press · 12 reps @ 60 kg", under the countdown, to get ready for. Screen readers hear it from "Next:". When it's an exercise, an **(i)** beside it, as on a step's name, opens its details, with Swap exercise for it (RUN-11, below). Screen readers hear it as "Details of Bench press, next".
    - While paused, the face's text gives way to the step's name (with its (i)), "Paused · 00:23", Resume and End workout (see [pause-and-stop](pause-and-stop.md)).
- **Moving on**: the face's text is on a drum behind the face, like the number wheels: the next step's text rolls up into view from below as the last one rolls away over the top, in perspective, on a spring with no bounce (about half a second), so a new step is plain to see. A step that comes before the last one has finished rolling in (a quick Done, say) turns the last one on away from wherever it had got to, rather than jumping it back to the middle first. When a new **round** starts the drum turns right to left instead, and the round line and dots above the ring turn with it; so does a step's next **set** (its round line as the set starts, after the rest). **Rest** settles in more gently: from a little way below, over most of a second, as the last step fades quickly away. The ring stays put. The text on its way out keeps showing the step it was, e.g. its last "00:01".
- **Your note** on the step's exercise (EXR-10), if you've written one, in a box under the ring, e.g. "Pause at the bottom". Any work or rep step linked to an exercise shows it; screen readers hear it with the step, e.g. "Push-ups, 20 reps, your note: Elbows in".
- **Next**: "Next: Plank · 00:45", "Next: Push-ups · 20 reps", "Next: Squats · 10 reps @ 60 kg", or "Next: finish" before the last step. Unnamed steps use their kind ("Timed", "Rest", "Reps"). A step with sets says which, e.g. "Next: Leg press · set 2 of 3 · 10 reps @ 40 kg", and so does the rest after the set before: "then Leg press · set 2 of 3 · 10 reps @ 40 kg". In a superset, only its first step says the round, as one starts ("then Bench · superset round 2 of 3 · 10 reps"); the others are in the round already said ("Next: Row · 10 reps"). A step's second side is only its side: "Next: Right side · 10 reps", or "then Right side · 00:30" during Switch sides.
    - In the **last 5 seconds** of a timed step (the last 3 for a step under 15 seconds), "Next:" becomes a pill in the next step's colour (pink for timed, blue for rest, violet for reps, the accent colour for finish) that swells and glows once a second, to get ready. Not on a rep step, where it's Done instead (above), and not while paused.
    - In the same seconds the **face** flares to full colour on each second and eases back to its tint, in time with "Next:": one "get ready" cue, rather than a flash all step long.

### Changing reps or weight mid-workout (RUN-6)

- While a rep step is waiting, the **reps and weight on the face are wheels**: closed, each is just its number in the face's text, with a short faint line under it (no box) that says it can be changed, with its unit beside it ("reps", "kg"). Tapping one opens it there, over the ring, as wheels open anywhere else: **Reps** 1–100, and **Weight** none, then halves, in the unit chosen in You → Profile. No weight shows as "+", to add one. Screen readers hear them as spin buttons named "reps" and "Weight, kg".
- A change applies at once, to **this set, the rest of this workout's rounds, and the saved workout**, so next time starts from there. If the workout has been deleted from the library meanwhile, only this workout changes.
- On a step whose sets vary (BLD-11), it applies to **this set only**, in this workout and the saved one: set 2 changed to 47.5 kg leaves sets 1 and 3 as they were. Each set's face shows its own reps and weight, and Next during a rest says the next set's, e.g. "then Leg press · set 2 of 3 · 10 reps @ 45 kg".
- On a step done each side, a change is for both sides of the set.
- A wheel closes by itself as it does anywhere else (on a pick, or two fifths of a second after it stops turning).
- Space on a focused wheel is left to the wheel, rather than pressing Done.

### Swapping an exercise (RUN-11)

- The same swap is in Create, as each exercise step's **Swap** button (BLD-14; see [exercises](exercises.md)).
- **Swap exercise**, in the step's details (the (i), on the face or while paused), opens "**Swap Back squat**". During a rest, the (i) beside "then …" opens the **next** exercise's details, so it can be swapped before it starts: the rest is when the machine's likeliest to be found taken. The swap dialog is over the workout: "For the rest of this workout. Sets done so far stay.", a **Search exercises** box (where focus starts), and a list.
- With nothing typed, the list is "**Same muscles**" ("Same muscles, with your equipment" once some is picked on the Exercises page): the **closest five**, each with its main muscles and equipment under its name, e.g. "Quads, glutes · Dumbbells", as the exercise picker shows them.
    - Only exercises **measured the same way** as the step (reps for a rep step, time for a timed one), as the step keeps its reps or time; not hidden ones, and not itself.
    - Only ones that share a main muscle (one is enough; supporting muscles don't have to match), and that can be done with **your equipment**, if you've picked any (all of them if not). When none of them can be done with your equipment, e.g. only kettlebells for a chainsaw row, the closest five are offered whatever they need, under "**Same muscles, needing other equipment**", rather than nothing.
    - Ranked by how closely their main muscles match, each extra or missing main muscle counting against one (so a whole-body move doesn't top a chest one), a little for supporting muscles in common, and a little more for needing **none of its equipment**, as that's likely what's taken. Then by name.
    - With none, "Nothing else works the same muscles. Search for one above."
- Typing searches every exercise measured the same way by name, as the picker does (hidden ones only when named in full), under "3 matches"; with none, "No exercise measured in reps matches that."
- Picking one swaps the step **for the rest of this run**: its name and exercise are the new one's; its reps or time, sets (and how they vary) and sides stay; its **weight is the new exercise's from last time** (each set's own where they vary), or none if it's never been done with a weight. The (i), Last time, the step up to try and your note follow the new exercise.
- The Undo bar says "**Swapped to Goblet squat**", with **Undo** to put the step back, until the step ends (then it goes, rather than sitting over Pause); swapped from the rest before it, through that rest and the step. Focus goes back to the (i).
- **Sets already done stay as they were**, under the old exercise, timed ones included; the history logs each set as the exercise it was done as, so progress, personal bests and the muscles worked count the right one.
- **The saved workout keeps its own**: changing the reps or weight of a swapped step changes it in this run only. A step can be swapped again, or back.
- The swaps are kept for the tab, so a **reload** carries on with them; a new run starts with none.
- ✕, Escape or a tap outside close it, swapping nothing, with focus back on the (i). Space and Escape are left to the dialog while it's open.
- If the step ends while the dialog is open (a timed step running out), picking swaps nothing, and the Undo bar says "Back squat has finished, so it wasn't swapped". If the rest ends while the next one's is open, picking swaps it, now it's started.

### Finishing, and the summary (RUN-4, RUN-7)

- The face says "**You're finished!**", the controls go, and the **summary** opens over the page by itself. End workout opens the same summary (see [pause-and-stop](pause-and-stop.md)).
- It's a sheet: the whole screen on a phone, a card in the middle on anything wider. Focus starts on its heading and stays inside it.
- It **rises in** on a spring with no bounce (from the bottom of the screen on a phone, a little way on a wider one) as the page behind dims, and **sinks back out the same way** when it closes.
- On a phone, a workout ended early can be **dragged down** by the grabber at the top of the sheet to go back to it, as Back to workout does; while it's scrolled to the top, its heading and title drag it too. The sheet follows the finger, resists being pulled up, and the page behind brightens as it goes. On letting go, where the flick would carry it decides: past halfway it carries on down at the finger's speed and goes back to the workout; short of that it springs back up, with a little bounce if it was flicked. It can be grabbed again mid-spring, even on its way down, and then it stays. A finished workout has no grabber, as there's nothing to go back to.
- It fits the screen however much it shows: its content scrolls, with the buttons always in reach under it.
- It shows:
    - "**Workout finished**", "**Time's up**" (a time limit that ran out) or "**Workout ended**", and the workout's title.
    - **Time** (as in the history, pauses left out) and **Rounds**, e.g. "1 of 3 rounds · stopped", or "7 rounds + 3 in 20:00" for a time limit.
    - When time ran out part-way through a rep step: "**Time ran out during Push-ups. How many reps did you get?**", with a Reps wheel (starting at the step's reps) and **Add set**, which logs that many reps at the step's weight. It's a set like any other after that, and can be changed with the rest, but it doesn't make the score "+ 1", as the step wasn't finished, and "Use these settings next time?" leaves it out.
    - **Personal bests** this workout set (PRG-2), and "Most rounds: 7 rounds + 3" for a time limit beaten (PRG-7; see [progress](progress.md)).
    - **Sets**, one line per step as in the history, e.g. "Squats: 10, 10, 8 @ 60 kg" or "Plank: 3 × 0:45".
    - **Next time**: a step up for each rep step where every set got its reps, e.g. "Bench press: try 82.5 kg, up from 80 kg" or "Push-ups: try 13 reps, up from 12", each with **Apply** to put it on the saved workout (PRG-10). Not for a swapped step (RUN-11), whose saved step is still the old exercise, unless it's been kept.
    - **Swapped** (RUN-11): each step swapped, e.g. "Back squat for Goblet squat", and "Use Goblet squat next time?" with **No, just this time** and **Yes, use next time** (for a workout still in the library). Yes puts the swapped step (its exercise, name and weight) on the saved workout and says "Saved: next time it's Goblet squat."; No leaves it, saying "Next time it's Back squat again.", as the machine's likely free next time. Focus moves to what it says. A step swapped back to what it was isn't listed.
    - **Muscles worked**: the body map, shaded by this workout's sets (PRG-11).
    - A **Note** box, saved to this workout in the history as you leave it.
    - The **suggested next workout**, as on Today, without its Start button (PRG-9; see [progress](progress.md)).
    - Buttons: **Done** (the main one: on to the history, with this workout highlighted), and **Back to workout** for a workout ended early or one that runs until stopped. Escape does the same as Back to workout, where there is one.
- **Change reps or weight** (shown when there are rep sets) turns each rep set into a Reps and a Weight wheel, so a set logged wrongly can be corrected (e.g. the last set was 8, not 10). Each step's sets are under its name, grouped as the lines are: under the workout's headings, and a superset's steps together under "Superset" (or "Giant set"). Timed sets ran as set, so they can't be changed. A change goes into this workout's history entry at once, and then asks "**Use these settings next time?**":
    - **Yes, use next time**: each rep step of the saved workout starts next time from its sets in this workout, each set as it was last done (both sides as one) and any not done as it was. Sets that came out the same stay one Reps and Weight; sets that differ turn on Vary each set (BLD-11), so a pyramid worked out mid-workout is kept. A step given a Next time step-up with **Apply** keeps the step-up instead, before or after Yes. It says "Saved: next time starts from these.", adding ", with the step-ups you applied" when there are any.
    - **No, just this time**: only the history changes.
- A workout ended before its first step was done has nothing logged: the summary says "Nothing to log", with no note box. Done still goes to the history.
- The workout is logged in the history once, when it finishes, wherever the user is in the app (see [history](history.md)). It's dated when it actually finished, even if the app only noticed later.

### No workout

- The workout page with no workout running says "No workout selected." with a link, "Choose one from your workouts".

## Acceptance criteria

- Given leg press 3 × 10 with 1:00 rest, then a plank, when I finish set 1, then the rest says "set 1 of 3" and "then Leg press · set 2 of 3 · 10 reps"; when I finish set 3, then there's 1:00 rest saying "set 3 of 3", then the plank.
- Given leg press 3 × 10 with 1:00 rest is the last step, when I finish set 3, then the workout is done, with no rest; given it's followed by a 1:30 rest step, then that rest comes after set 3, not both.
- Given headings "Warmup" and "Legs", a bike, then leg press 2 × 10, a rest and a plank, then on the bike the section line says "Warmup · 1 of 3"; on leg press, its rest between sets and the rest step after it, "Legs · 2 of 3"; on the plank, "Legs · 3 of 3". Screen readers hear "Legs, exercise 2 of 3" as leg press starts, and not on its second set.
- Given a workout of one exercise and no headings, then there's no section line.
- Given work 0:03, rest 0:02, 2 rounds, then it shows work 00:03 at the start, switches to rest exactly at 3s, starts round 2 at 5s, and finishes at 8s with no rest after the last work.
- Given rest of 0:00, then there's no rest phase at all.
- Given a workout of 5 rounds in its last round, then it says "Last one!".
- Given a workout of 20 rounds, then it says "round 1 of 20" with no dots.
- Given the app is held up for 10 seconds mid-step, when it catches up, then it shows the right time and phase straight away.
- Given a rep step is reached, when an hour goes by, then it's still waiting on the same step.
- Given a rep step, when Done is pressed, then the next step starts from its full time.
- Given a rep step at the very end of the last round, then the workout only finishes after Done.
- Given a round of only rep steps, then it runs with no countdown at all, waiting on each in turn.
- Given a rep step of 10 squats at 60 kg, then the face's wheels show 10 reps and 60 kg, "Next:" before it says "Squats · 10 reps @ 60 kg", and a screen reader hears "Squats, 10 reps at 60 kg".
- Given 20 push-ups in round 1, when I change them to 15 at 22.5 kg, then the face's wheels show 15 and 22.5, the saved workout has 15 at 22.5 kg, and round 2 starts from 15 at 22.5 kg.
- Given a step at 40 kg, when I set the weight to +, then the step has no weight.
- Given steps Squats (work), Rest, Plank (work), then the strip shows Squats as the first of three, screen readers hear "step 1 of 3", and it says "Next: Rest · 00:15".
- Given a step named "Bodyweight squat", then the face shows it on two lines at full size; given "Single-leg Romanian deadlift", then it's on two lines on a wide screen, and on three on a phone, never smaller than 70%.
- Given the workout finishes, then the summary opens with no Back to workout, and a note typed there is saved to it in the history.
- Given the summary, when I press Done, then the workout is over and the history opens with it highlighted.
- Given a workout ended early, on a phone, when I drag the summary down past halfway (or flick it down), then it goes back to the workout, paused; when I let go above halfway, then it springs back up.
- Given leg press of 12 @ 40, 10 @ 45 and 8 @ 50 kg, when I change set 2 to 47.5 kg mid-workout, then only set 2 changes, here and in the saved workout; given 3 equal sets of 10 @ 40 kg, when I change set 2 to 45 kg, then sets 2 and 3 run at 45 kg and the saved workout has 45 kg.
- Given sets done at 12 @ 40, 10 @ 45 and 8 @ 50 kg on a step of equal sets, when I answer "Yes, use next time", then the step has Vary each set on with those three sets.
- Given bench press 5 @ 80 kg done and Next time's 82.5 kg applied, when I correct the push-ups to 10 reps and answer "Yes, use next time", then the saved bench press stays at 82.5 kg and the push-ups start from 10.
- Given a heading "Upper" over a superset of bench and row, when I press Change reps or weight, then Bench's and Row's wheels are under "Upper" and "Superset", as the lines were.
- Given 20 push-ups at 40 kg in round 1 and the workout ended in round 2, when I change the set to 18 reps on the summary, then the history has 18; on "Yes, use next time" the saved workout starts from 18 at 40 kg, and on "No, just this time" it stays at 20.
- Given a summary longer than the screen (Next time, Muscles worked and the next workout), then the sheet fits the screen, its content scrolls, and Done is always in reach under it.
- Given a workout ended early, when I press Back to workout, then it is paused where it was ended, with focus on Resume.
- Given work 0:20 then rest, then "Next: Rest" pulses in the rest colour from 00:05 left, and stops when paused.
- Given work 0:10, then "Next:" pulses only from 00:03 left.
- Given a rep step, then "Next:" never pulses.
- Given work 0:20, then the face holds a steady pink tint until 00:05 left, then flares once a second with "Next:".
- Given a new step in the same round, then its text rolls up from below; given round 2 starting, then the text and "round 2 of 3" turn in from the right; given a rest, then it settles in gently from just below.
- Given work 0:03, rest 0:02 and a time limit of 1:04, then 12s in it says "round 3" and "00:52 left", and screen readers heard "Timed, round 1, 01:04 left" at the start.
- Given that workout, when 1:04 has gone by, then it finishes with "Time's up" and "12 rounds + 1 in 1:04", logged as finished with 12 rounds and 1 step.
- Given work 0:03 then 10 push-ups and a time limit of 0:20, when the push-ups take 12 seconds, then after Done 00:05 are left.
- Given time runs out while push-ups are waited on, then the summary asks how many reps I got; Add set with 6 logs 6 push-ups, and the score stays as it was.
- Given work 0:03, rest 0:02, 2 rounds, then it says "00:08 left" at the start and "00:05 left" at the rest; given a rep step in the round, then there's no time left.
- Given bench and row as a superset of 3 rounds with 0:05 between, then it runs bench, row, rest, bench, row, rest, bench, row, saying "superset round 1 of 3" on bench and row, "then Bench · superset round 2 of 3 · 10 reps" in the rest, and "Last one!" in round 3; with shoulder press too, it's "giant set round 1 of 3".
- Given that superset, then the strip shows bench and row; in round 2, the rest before them too.
- Given Squats, Plank and Rest, then the strip shows work (current), work, rest (to go); at the rest, the two works are done and rest is current.
- Given work 0:10, then the time pops at 00:03, 00:02 and 00:01, and not in the rest after.
- Given Squats, Plank, Rest in round 1 of 2, then the rest's face says "then Squats · 00:03".
- Given a rep step comes round, then Done swells once; with reduced motion it doesn't.
- Given Jog (timed, just a name) then Push-ups (the Push-up exercise), then Jog has no (i); at Push-ups an (i) named "Details of Push-up" opens its details, with Swap exercise, and the workout still waits on the push-ups; Space there doesn't press Done; ‹ Back at the top closes them, with focus back on the (i).

- Given 10 back squats at 60 kg, and goblet squats done at 24 kg last time, when I open the (i), press Swap exercise, search "goblet" and pick Goblet squat, then the face says Goblet squat at 24 kg, the Undo bar says "Swapped to Goblet squat", the next round's squats are goblet squats too, and the saved workout still has back squats; Undo puts back squats back at 60 kg.
- Given Chainsaw row and only kettlebells picked as my equipment, then Swap exercise lists five rows needing other equipment, under "Same muscles, needing other equipment", not "Nothing else works the same muscles".
- Given Back squat, then Swap exercise lists five exercises that work the quads or glutes, not Back squat; searching "wall sit" finds nothing, as it's timed.
- Given Front squat, then Swap exercise lists squats (Hack squat, Goblet squat, …) and not Burpee, though it works the quads too.
- Given back squats then a rest, twice, when I open the (i) beside "then Back squat …" during the rest, press Swap exercise and pick Goblet squat, then the rest says "then Goblet squat", round 2 is goblet squats at 24 kg, round 1's set is still logged as back squats, and Undo is offered until round 2's squats are done.
- Given a timed step swapped part-way through a workout, then its sets before the swap are logged under the old exercise and those after under the new one.
- Given a swapped step at the summary, when I press Yes, use next time, then the saved workout's step is the new exercise at its weight; when I press No, just this time, then it's unchanged. Either way there's no Next time step-up for it.
- Given a run with a swap, when the page reloads, then the step is still swapped.
- Given work 0:30 then rest 0:10, when I press Skip 5s in, then the rest starts from 00:10; Skip there starts round 2.
- Given a 0:45 plank (the Plank exercise) then rest, once, when I press Skip 20s in, then the workout finishes and the history has the plank for 20 seconds and 20 seconds spent.
- Given a rest skipped part-way, then no set is logged for it.
- Given work 0:03, rest 0:02 and a time limit of 0:20, when I skip the work 1s in and then the rest, then "00:19 left" shows, and time's up at "4 rounds + 1".
- Given work 0:12 with countdown beeps, when I press Skip 2s in, then the rest's alarm sounds at once and none of the work's countdown ticks do.
- Given work 0:03, push-ups, then rest, when I press Skip 8s into the push-ups, then the rest starts from its full time, no push-ups are logged, and the time spent counts the 8s.

## Platform notes

- **Web:** the maths is pure and has no Angular in it, so it can be ported line for line: `workoutStateAt()` in `src/app/workout/workout-state.ts` (where a workout is after so many ms, given the rep steps done and, for a time limit, the time off the clock: the time rep steps took, less any time skipped; `stepsIntoRound()` gives the score's steps) and the helpers in `src/app/models/workout.ts`. The run itself is `ActiveRunService` (`src/app/shared/run/`), and the page is `WorkoutComponent` (`src/app/workout/`), with what it shows worked out in `WorkoutView` (`workout-view.ts`), a step's text on the face in `workout-face-slide/`, the round line in `workout-round-line/`, details and swapping in `WorkoutSwap` (`workout-swap.ts`), each kind of step's look and motion in `workout-steps.scss` and `workout-motion.scss`, the step strip in `step-strip/`, an exercise's details in the shared `ExerciseDetailsDialogComponent` (RUN-9), and long names fitted to the face by `fitName()` (`fit-name.ts`), which measures the text rather than counting letters.
- **Web:** the summary is `WorkoutSummaryComponent` (`src/app/workout/workout-summary/`), with its sets in `SummarySetsComponent` and Next time in `SummaryStepUpsComponent`. Swapped is `SummarySwapsComponent`. Its host is a grid whose one cell is the screen (`grid-template: minmax(0, 1fr) / minmax(0, 1fr)`): an auto row grows to the content, and the sheet then runs off the screen once the summary is long.
- **iOS:** keep the same "work it out from the clock" design: store when the run started (moved on by pauses and rep steps, back by skips) and derive everything else. That's also what makes a relaunch carry on correctly (see [pause-and-stop](pause-and-stop.md)). A `TimelineView` or a display-link tick only needs to redraw. The face's drum is a `rotation3DEffect` about the x axis (the y axis for a new round) with an anchor behind the face; a long name can use `ViewThatFits`, or `lineLimit(3)` with `minimumScaleFactor(0.7)`. The (i) by an exercise's name (RUN-9) can open its details as a `.sheet` with medium and large detents, so the ring stays in sight above it.
