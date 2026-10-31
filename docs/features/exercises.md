# Exercises

Built: exercises are in the data (#86), with the built-in list, your own exercises and notes, and existing data carried over (EXR-4). In the app: the Exercises list and a page per exercise (EXR-6–8), the picker in Create (EXR-2) with each exercise's details a tap away (EXR-11), and mid-workout from the (i) by its name (RUN-9), making, renaming and editing your own exercises (EXR-3, EXR-9), your notes, shown on the exercise's page and mid-workout (EXR-10), hiding any exercise from the picker, and deleting your own. From its page, an exercise can be added to a workout, new or in the library (EXR-12). Every built-in exercise has an animated demo (EXR-13). Each card has its latest and best (PRG-3), and the page its progress (PRG-4; see [progress](progress.md)).

## Stories

- **EXR-1** As a user I want exercises to be things in their own right, so "Squats" in two workouts is the same exercise and its history stays together.
- **EXR-2** As a user I want to pick an exercise when adding a step, from the built-in list or my own, or make a new one by typing its name.
- **EXR-3** As a user I want to rename my own exercise once and have it change everywhere, history included.
- **EXR-4** As a user I want my existing workouts and history to carry over into exercises without doing anything.
- **EXR-5** As a user I want to see "Workouts" (not "Timers") throughout the app.
- **EXR-6** As a user I want a built-in list of common exercises to browse and search, so I don't have to type them all in.
- **EXR-7** As a user I want to see how to do an exercise: a short description and the steps.
- **EXR-8** As a user I want to see which muscles an exercise works, shaded on a body map.
- **EXR-9** As a user I want to make my own exercise, with its own description and the muscles it works.
- **EXR-10** As a user I want to add my own note to any exercise, built-in ones included (e.g. "Pause at the bottom").
- **EXR-11** As a user I want to see an exercise's details while building a workout, so I can tell it's the one I want before I use it.
- **EXR-12** As a user I want to add an exercise to one of my workouts, or start a new workout with it, from its page, so finding an exercise I like leads straight to doing it.
- **EXR-13** As a user I want to see an exercise done, as an animated figure, so I can check the movement at a glance.

## Rules (draft)

### What an exercise is

- An exercise has:
    - an **id** and a **name**
    - how it's **measured**: reps (with an optional weight) or timed
    - **main muscles** and **supporting muscles** (either may be empty)
    - optional: other names (e.g. "Press-ups" for "Push-ups"), equipment, a one-line description, how-to steps, and tips
- Rest isn't an exercise.
- A step **doesn't need an exercise**: an unnamed timed or rep step is still allowed, as now. It just isn't tracked (no history or progress of its own).
- An exercise has **no weight unit of its own**: weights always show in the unit chosen in Account → Profile (SET-4).
- There are two kinds:
    - **Built-in** (EXR-6): shipped with the app. Their names and details are fixed, but each can be **hidden** from the picker.
    - **Your own** (EXR-9): made by you, editable, and saved and synced as your data. Only these can be renamed (EXR-3) or deleted.
- A step, and a logged set, point to an exercise by id, whichever kind it is. A logged set also keeps the name it had when it ran, as the history keeps a workout's title.

### The built-in list (EXR-6, EXR-7)

- A curated list of about **60–100 common exercises**, not an exhaustive database. Every one has muscles, equipment and a description; how-to steps and tips where they help.
- **Written in our own words**, in the app's voice: a one-line description of what it is and why, 3–5 short how-to steps, and a tip or two. Plain and short enough to read between sets.
- [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain, Unlicense) is a **reference only**: for which exercises to include, their equipment and their muscles, each checked by hand (it lists glutes as only supporting in a back squat, for one). Its text isn't copied, and its photos aren't used: where they came from isn't stated.
- Built-in ids are fixed text that never changes (e.g. `builtin:back-squat`), so history keeps pointing to them across app updates. An exercise taken out of the list stays readable by its id for history's sake.
- The list is part of the app, not the user's data: it updates with the app and isn't synced or exported.
- Searchable by name and other names, and can be filtered by main muscle and by the equipment you have (see [the Exercises list](#the-exercises-list-exr-6)).
- **Equipment** lists everything an exercise needs, all of it, so the list can be filtered by **what you have**: an exercise shows if you have every piece it lists. Where any one of a few things will do, it's a choice (a goblet squat needs a dumbbell _or_ a kettlebell). "None" means nothing at all. Plates and a floor are taken for granted.
    - Where a pair of things will do, or one thing that does the job of both, the choice is in two needs: an inverted row needs a barbell _or_ a Smith machine _or_ rings, and a rack _or_ a Smith machine _or_ rings. When the exercise page shows equipment, it should read that as "Barbell and rack, Smith machine, or rings".
- The equipment: barbell, dumbbells, kettlebell, bench, preacher bench (a bench with an angled arm pad), rack, Smith machine, pull-up bar, parallel bars, rings (gymnastic rings or suspension straps), cable, machine (a dedicated gym machine, e.g. a leg press), band, step (a box, step or stair), ab wheel, none. All but none can be picked for an exercise of your own.

### The body map (EXR-8)

Mocked up in the [exercise page options](https://claude.ai/artifact/3SiP96YThwyL5D4fJAdSdW) canvas: "A + C, in our own words" is the chosen design.

The component is built (`BodyMapComponent`); it goes on the exercise pages when they're built.

- **An anatomical figure, front and back side by side**, captioned "Front" and "Back", made of muscle-shaped pieces. It isn't a picture per exercise: the app shades it from the exercise's muscles, **strongest for main, softer for supporting**, and unworked muscles stay grey. Head, hair, hands, feet, knees and ankles are drawn but never shaded.
- The shapes come from [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) (MIT; its licence is kept beside them), drawn as our own Angular component rather than using the React package.
- **Under the figure, the muscles as labels**: "Main" (e.g. Quads, Glutes) and "Supporting" as chips in the same two shades. They're the figure's key, and its text: the figure itself is hidden from screen readers, which read the labels. (On the Exercises list, where its muscles can be picked, each muscle is a toggle button instead; see below.) A muscle in both counts as main. With none at all, it says "No muscles listed."
- Muscle groups follow the diagram's shapes: chest, shoulders, biceps, triceps, forearms, abs, obliques, traps, upper back, lower back, glutes, abductors, adductors, quads, hamstrings, calves, shins, neck. (The diagram can't show front, side and rear shoulders, or lats, apart, so they aren't separate groups.)
- **Abductors are the upper glute on the back.** The diagram has no abductor shapes, but on the back it draws the glutes as two shapes a side: the gluteus maximus, and above and outside it the gluteus medius, the hip's main abductor. So the medius is shaded as the abductors and the maximus as the glutes. Abductors aren't shown on the front.
- Its shades are colour tokens with a contrast check like the others, in both themes: each label's text is at least 4.5:1 on its shade; main stands out 3:1 from unworked and from the page; and the three shades are at least 2:1 apart in lightness, not just hue (the labels carry the meaning, so the figure needn't be 3:1 throughout). In the dark theme main is the brightest; in light, the darkest.
- **Male or female figure**, from the **Sex** chosen in Account → Profile (SET-5). The diagram has both, with the same muscle groups, so the choice changes only the drawing. Every side is drawn in the same 1:2 box, so front and back match in size whatever the drawing's own canvas.

### The Exercises list (EXR-6)

The **Exercises** tab, after Library. Top to bottom:

- **Exercises** and a **New** button at its right (the filled main button, small enough to sit by the title), which opens the exercise dialog for a new exercise of your own (see below). Saving it makes it and goes to its page; Cancel makes nothing.
- **Search**: finds by name and other names, as the picker does (case, spaces and a plural "s" don't count), best match first. A match on another name says so on its card ("Also called Press-up").
- **Only what I have**, a switch, with **My equipment: 3 pieces** ("none" to begin with, "1 piece") under it, which opens the equipment as chips to pick from (every piece but "none"). On, the list shows only exercises you can do with what's picked: every piece an exercise lists, where a choice is met by any one of it; one that needs nothing always shows, and so does one of your own that lists none. Both the switch and the equipment are **remembered** (saved with the settings), so they're set once, and they're the same ones the ready-made workouts are filtered by (see [library](library.md#ready-made-workouts-lib-6)). Off to begin with, and nothing picked.
- **Muscles**: one row of chips, scrolling sideways: **All muscles**, then each muscle group. Muscle chips toggle on/off, **All muscles** clears all picks, and the list shows exercises with **any** picked muscle as a main muscle.
- **The body map**, under the chips, with the picked muscles shaded as main. Tapping a muscle on the figure picks it or unpicks it, as its chip does, so the chips and the figure always match. Each muscle is one toggle button for keyboards and screen readers (its name, pressed when picked), so a muscle drawn in several pieces is one stop. The picked muscles are listed under it, each with a remove button (×).
- The picked muscles are **kept in the address**, e.g. `/exercises?muscles=quads,glutes`, in the order picked. A card passes them on to the exercise's page, whose **‹ Exercises** (and **All exercises**, and deleting your own) goes back to the list with them still picked; the browser's Back button keeps them too. Muscles the app doesn't know in the address are ignored. The search isn't kept.
- How many exercises are shown ("42 exercises"), read out as it changes.
- The exercises, **A to Z** (best match first while searching), as cards: the name, **Your own** on your own ones, the main muscles as chips in the body map's main shade, and the equipment in a line ("Barbell, rack"; "Dumbbells or kettlebell"; "No equipment"; nothing when your own lists none). A card goes to the exercise's page.
- When nothing matches: "No exercises match.", and **Clear search and filters** when there's a search or filter to clear.
- **Hidden from the picker (2)**, after the list when any of those shown are hidden: it opens them, as cards in the same way. They're left out of the list above.

### The exercise page (EXR-7, EXR-8)

At `/exercises/<name>` for a built-in exercise (e.g. `/exercises/back-squat`, its id without `builtin:`) and `/exercises/<id>` for your own. It **slides in from the right** over the list, which moves a little way left and fades, as a page opens on a phone; it opens at its top. Going back with **‹ Exercises** (or **All exercises**) slides it off to the right, with the list coming back scrolled where it was. **Swiping right** anywhere on the page (with a finger or pen, not a mouse) goes back too: the page follows the finger, and let go past halfway, or flicked, it slides the rest of the way off at the speed it was let go; short of that it springs back into place. Pulled left of where it rests, it moves less than the finger. A finger can catch the page as it springs back, or as it's still sliding in, and it stops where it was seen and follows from there; a tap mid-slide ends the slide and lands on what it was over. A swipe doesn't start on the progress chart or in a text box, doesn't press the button it starts on, and is off while the exercise dialog is open; scrolling up and down works as usual. The browser's own Back changes page at once. With reduced motion, the pages cross-fade quickly instead of sliding, though the page still follows a swipe. Top to bottom:

- **‹ Exercises**, back to the list.
- The name; "Also called: …" when it has other names.
- Chips: what it needs (one chip per need, a choice as "Dumbbells or kettlebell", the inverted row's as "Barbell and rack, Smith machine, or rings", and "No equipment" for none), how it's measured (**Reps** or **Timed**), and **Your own** on yours.
- "Hidden from the picker in Create." when it's hidden.
- The one-line description, when it has one.
- **Your note**, set apart, when you've written one (EXR-10).
- **Add to workout** (EXR-12; see below), then **Add note** / **Edit note** (built-in) or **Edit** (your own), opening the exercise dialog. Focus goes back to it when the dialog closes.
- **Muscles worked**: the body map.
- **Progress** (PRG-4): bests, a chart and recent sessions; see [progress](progress.md).
- **How to do it**: the animated demo, when it has one (EXR-13; see below), then the numbered steps, and **Tips**, each when it has any. Your own with neither says "No how-to steps or tips yet. Add them with Edit."
- **Hide from the picker** / **Show in the picker**, and **Delete** on your own (see below).

A link to an exercise that isn't there (deleted, or mistyped) says "Exercise not found", with a link to all exercises.

### The animated demo (EXR-13)

Every built-in exercise has one; your own exercises don't. Most are posed from the side; those whose move shows best from the front (a lateral raise, a shoulder press, a jumping jack, a side plank) from the front.

**It's drawn in 3D** (since 2026-10-31, a prototype for now): a smooth jointed figure, lit, with a shadow on the floor, first seen three-quarters round (from the side's poses, 60° round from the front; from the front's, 25°; a motion can say otherwise, as the Russian twist's does). **Drag it sideways** to turn it round, or press **Turn** to turn it 45° at a time (WCAG 2.5.7: dragging isn't the only way). Turning carries over to the stills with reduced motion. It's drawn with three.js, loaded with the first demo shown (about 116 kB over the network), not in the first download. While three.js loads, the space for it is kept empty; without WebGL, it's drawn flat, as below.

- **The 3D figure is posed from the same numbers as the flat one**: each pose is worked out as drawn, then lifted out of the drawing. Out of it, the hips and shoulders are spread apart, and a part drawn shorter (see below) points out of the drawing by the length it's missing, so a fly's arms open out to the sides and a sitting thigh points forwards, with nothing written twice. Two things only the 3D figure shows: a **twist** of the shoulders about the back (the arms and head turn with them, as in a Russian twist) and **how far apart the hands are**, when closer than the shoulders (hands together). The flat figure leaves them out.
- **Its muscles are shaded by where they are on each part**: a thigh's front is its quads, its back its hamstrings, its inner side its adductors, the top of its outer side its abductors; the shin's front its shins and back its calves; the upper arm's front its biceps and back its triceps; the chest, abs and obliques, traps, upper and lower back on the torso; glutes on the seat; shoulders on round caps at each shoulder. Unworked muscles are mixed part way to the outline colour, as without the body map's outlines they'd be lost against the page.
- **Kit is solid**: plates, hexagonal dumbbells, a kettlebell, a bench's cushion on legs, a frame's posts either side of the figure, a pull-up bar end to end.

The flat figure, which the 3D one is posed from:

- **One drawn figure for every exercise**, not a picture or video per exercise: a jointed body drawn as the body map is, an outlined silhouette with each muscle on it as its own outlined piece. It's drawn from the side and from the front, in parts (torso, head and neck, upper arms, forearms and hands, thighs, shins, feet) that turn about their joints. It's posed from a few numbers per key position (where the hips are, the lean of the back, each arm's and leg's angles, or where a hand or foot should be). The app moves it between them in a loop, easing into and out of each, as a body slows at each end of a rep. A motion is a few hundred bytes, and loads with the exercise's words, not in the first download.
- **Its muscles are shaded as on the body map**: main, supporting, or unworked, each muscle on its own (a back squat's quads and glutes as main, its hamstrings and lower back as supporting). Head, hands, feet and knees are never shaded. A muscle the view can't show isn't shaded (the inner thigh from the side; glutes, hamstrings and the lower back from the front). From the side, the far arm and leg are drawn fainter, behind the body.
- **Kit is drawn with it**, carried or standing still. Carried: a barbell on the back or in the hands (from the side its plate behind the body, so it doesn't hide the head), a dumbbell in each hand or one, a kettlebell hanging from the hand, an ab wheel, a band, a machine's roller on the shins or behind the ankles, and a leg press's plate under the feet. Standing still, behind the figure: benches and seats (flat, incline, preacher), frames and racks, a bar to hang from, a step or box, a wall, and cables, which run from their pulley to the nearer hand. All on a floor line.
- **Arms or legs pointing towards you** are drawn shorter, as they look: sitting from the front (a shoulder press, hip abduction), the arms of a fly or rear delt fly opening out, a band pulled apart. A hand can be placed on the body (on the chest, behind the head), so it moves with it.
- **A hold** (plank, side plank, wall sit, dead hang) is one position, shown still, with no Pause.
- It's at the top of **How to do it**, on the exercise's page and in its details dialog (in Create and mid-workout).
- **Pause** under it stops it where it is; **Play** carries on from there. It also stops while scrolled off screen. In 3D, **Turn** is beside it.
- With **reduced motion**, it doesn't move: its key positions stand side by side, each labelled ("Standing", "Bottom").
- Hidden from screen readers, as the body map's figure is: the steps say the same in words. Pause and Play are named "Pause the demo" and "Play the demo", and Turn "Turn the figure".

### Adding it to a workout (EXR-12)

- **Add to workout** on the page opens a dialog, "Add Back squat to", saying "It goes at the end with 3 sets, to change before you save." Under it, **New workout**, then each workout in the library in the library's order, with how many steps it has beside it ("6 steps"; a blank title is "Untitled workout"). Focus starts on New workout. ✕, Escape or a tap outside close it, with focus back on Add to workout; swiping back is off while it's open.
- A workout already at the most steps (20) says "Full, 20 steps" and can't be picked.
- Picking a workout opens it in **Create** with the exercise added at the end, linked to it, as the only step open and focused, and screen readers hear "Added Back squat, step 7". **New workout** opens Create with it as the only step (in place of the empty one a new workout starts with).
- It's added as **3 sets with 1:00 rest**: of 10 reps for a rep exercise, or of 0:30 for a timed one, with no weight. Nothing is saved until Save & start; leaving Create leaves the workout as it was.
- Reloading Create, or coming back to it, doesn't add it again.

### Hiding and deleting

- **Any exercise can be hidden from the picker** in Create, built-in or your own, from its page. A hidden one isn't offered as you type, unless its whole name (or other name) is typed, so typing "Front squat" still finds it; a step already linked to it stays linked, and it still shows mid-workout and in the history. It's kept apart at the end of the Exercises list. Showing it again puts it back.
- Which are hidden is your data: saved, exported and synced. Showing one again leaves a deletion, so that reaches other copies too.
- **Deleting** is for your own exercises only:
    - one a saved workout (or the one running) uses can't be deleted: "Sled push is in Legs, so it can't be deleted. Take it out of that workout first, or hide it from the picker." (with every such workout named, an untitled one as "an untitled workout")
    - one in the history (a set of it was logged) is **hidden instead**, at once, so the history keeps its name: "Sled push is in your history, so it's hidden from the picker instead", with **Undo**.
    - otherwise it's deleted at once, with your note on it, and you're back on the list, where "Deleted Sled push" offers **Undo**: that puts it back, note and hidden state and all, and opens its page again. Deletions are left behind for each (and taken back on Undo).

### Picking an exercise (EXR-2)

- A timed or rep step's name box in setup, labelled **Exercise (optional)**, is a combobox. As you type, it lists up to 8 exercises, built-in and your own, whose name or other names match (as names are matched: case, spaces and a plural "s" don't count):

    1. the same name, e.g. "squat" finds Back squat, one of whose other names is "Squat"
    2. names starting with what's typed
    3. names with a word starting with it, e.g. "squat" finds Goblet squat
    4. names containing it

    A match on an exercise's own name comes before one on its other names; otherwise they're in alphabetical order. A match on another name says so ("Push-up, Also called Press-up"), and your own exercises say "Your own".

- Each exercise in the list also says its main muscles and what it needs (EXR-11), so similar ones can be told apart: "Quads, glutes · Barbell, rack", "Quads, glutes · Dumbbells or kettlebell". Equipment reads as on the exercise page; one of your own with neither yet has no such line.

- When no exercise has the name typed, the list ends with **Make "Sled drag"** ("A new exercise of your own").
- Up and Down move through the list (wrapping round), Enter or a click picks, Escape closes it, and leaving the box closes it. Enter with nothing chosen submits the form as usual.
- **Picking** an exercise fills in its name and links the step to it. **Typing** over the name drops the link, and the step goes by its name again, as before there was a picker.
- **Making** one keeps the name typed (tidied); the exercise is made when the workout is saved, so a workout that's never saved leaves nothing behind. It's measured as its step is: reps for a rep step, time for a timed one. That can be changed when editing it.
- Under the box, a line says which exercise the step is: "Built-in exercise" or "Your own exercise" (with your note under it, if any), or "A new exercise of your own, made when the workout is saved". Beside it (or under it, where there isn't room):
    - **Details** (EXR-11) opens a dialog titled with the exercise's name, showing what its page shows: other names, equipment and how it's measured, the description, your note, the body map, how to do it and tips, so you needn't leave the workout to check. **✕** at its top right closes it; the name and ✕ stay at the top while the rest scrolls, so it can be closed without scrolling to the bottom. **Done** at the bottom closes it too; **Pick another** closes it and puts the cursor in the step's name box with the name selected, so typing replaces it. Escape or a tap outside closes it too, and focus goes back to Details. The same dialog opens mid-workout from the (i) by the step's name, without Pick another (see [run-a-workout](run-a-workout.md), RUN-9).
    - **Edit** (your own) or **Add note** / **Edit note** (built-in) opens the exercise in the editing dialog. Focus goes back to that button when the dialog closes.
- A step is still allowed **no exercise**: leave the box empty.

### Your own exercises (EXR-3, EXR-9)

- Names are unique among what you can see, ignoring case, spaces and a plural "s": typing "squats " finds "Squats", whether that's built-in or your own. A built-in exercise's other names count as a match too.
- **Editing** one (the dialog from its step in setup, or from its exercise page) changes its **name**, how it's **measured** (Reps or Time), a **description** (up to 300 characters), its **equipment** (single pieces; a choice of pieces from a backup is kept as it is), its **main and supporting muscles**, **How to do it** and **Tips**.
    - Muscles are picked from two lists of chips, Main and Supporting, with the body map shading them as they're picked. A muscle is main or supporting, not both: picking it in one takes it out of the other. **Tapping a muscle on the body map** moves it along: not worked → main → supporting → not worked, and the chips follow. (The chips do the same for keyboards and screen readers, so the figure stays hidden from them.)
    - How-to steps and tips are written **one per line**: up to 8 steps and 4 tips, each up to 200 characters ("Up to 8 steps, one per line", "Keep each one to 200 characters"). Empty lines are dropped and each line trimmed.
    - The name is needed, up to 40 characters, and can't be another exercise's: "There's already an exercise called "Bench press"". Saving with a problem puts the cursor in the first box that's wrong.
- **Making** one: by typing a name in the picker (see above), or with **New** on the Exercises list, which opens the same dialog, titled **New exercise**, empty and measured by reps. It's made when saved, with your note if one was written.
- **Renaming** one (EXR-3) renames it everywhere: the steps linked to it in every saved workout (and the one running) take the new name, and the history shows it by its new name (see [history](history.md)).
- Deleting one: see [Hiding and deleting](#hiding-and-deleting).

### Carrying over (EXR-4)

On first load, each distinct step name (trimmed, ignoring case, and ignoring a plural "s", so "Squats" and "Push-ups" match "Squat" and "Push-up"):

1. **Matches a built-in exercise** by name or other name → linked to it. "Squat" is one of Back squat's other names, so a plain "Squats" step becomes a back squat; picking another exercise for the step changes it.
2. **Otherwise** → becomes one of your own exercises, with no muscles yet.

Past logged sets are linked the same way. Unnamed steps stay unnamed and aren't tracked as an exercise.

### Your notes on an exercise (EXR-10)

- **Any exercise**, built-in or your own, can have a note of your own, e.g. "Pause at the bottom" or "Seat on hole 4". It's how you make a built-in exercise your own without changing it: there's no copying a built-in exercise into your own, so its history stays in one place.
- It's written in the exercise's dialog, opened from its step in setup or from its exercise page: **Your note (optional)**, "Shown with this exercise mid-workout."
- The note shows under its step in setup, mid-workout with any work or rep step linked to the exercise (see [run-a-workout](run-a-workout.md)), and on the exercise page under the description, marked **Your note**.
- Up to 200 characters, trimmed; saving an empty note removes it. Notes are your data: saved, exported and synced.
- A built-in exercise keeps its note across app updates, even if its own text changes.

## Acceptance criteria

- Given a rep step, when I type "front sq" and pick Front squat, then the step is named "Front squat" and saved linked to `builtin:front-squat`.
- Given "Sled drag", which no exercise has, then the list offers `Make "Sled drag"`, and saving the workout makes it an exercise of my own.
- Given a step linked to Push-up, when I type over its name, then it's linked by the new name when saved.
- Given my own exercise "Sled push" in a saved workout, when I rename it "Sled drag", then the workout's step and the history's sets of it say "Sled drag".
- Given my own exercise, when I rename it "bench press", then it isn't saved and I'm told there's already an exercise called that.
- Given my note "Elbows in" on Push-up, when a step linked to Push-up is running, then the note shows under the ring and is read out with the step.

- Given a back squat (main quads and glutes; supporting hamstrings, adductors and lower back), then the quads and glutes are shaded strongest, the others softer, and the labels read "Main: Quads, Glutes" and "Supporting: Hamstrings, Adductors, Lower back".
- Given Female chosen as the sex in Account → Profile, then the body map draws the female figure.
- Given an exercise with no muscles, then the body map says "No muscles listed."
- Given an exercise that works the abductors, then the upper glute on the back is shaded, and the gluteus maximus isn't.

- Given the Exercises list, then every exercise is listed A to Z with how many there are, and Back squat's card shows Quads and Glutes and "Barbell, rack", and goes to `/exercises/back-squat`.
- Given I search "press-up", then Push-up comes first, saying "Also called Press-up".
- Given I pick Calves, then only exercises with calves as a main muscle are listed.
- Given I pick Calves and Shins, then exercises with either as a main muscle are listed, and the cards link with `?muscles=calves,shins`; picking Calves again unpicks it, and All muscles unpicks both.
- Given I tap the quads on the Exercises list's figure, then the Quads chip is pressed and the quads toggle on the figure is pressed; pressing the chip again unpicks both.
- Given Quads picked, when I press its remove button under the figure, then it's unpicked.
- Given Quads picked, when I open Back squat and press ‹ Exercises, then I'm back on `/exercises?muscles=quads` with Quads still picked.
- Given I pick a pull-up bar as my equipment and turn on Only what I have, then Pull-up and Push-up are listed and Back squat isn't, and after a reload it's still so.
- Given I type "squat" in a step's name box, then Back squat's option says "Quads, glutes · Barbell, rack" and Goblet squat's "Quads, glutes · Dumbbells or kettlebell".
- Given a step linked to Front squat, when I press Details, then a dialog titled "Front squat" shows its description, body map and how-to steps; ✕ at its top right (or Done) closes it and focus goes back to Details.
- Given the details of the step's exercise, when I press Pick another, then the dialog closes and the step's name is selected in its box, ready to type over.
- Given Plank is hidden, then it's left out of the list and shown under "Hidden from the picker (1)", and the picker in Create doesn't offer it for "plan" but does for "plank".
- Given New on the Exercises list, when I name it "Sled drag" and save, then it's made and its page opens.
- Given the inverted row's page, then its equipment reads "Barbell and rack, Smith machine, or rings".
- Given Back squat's page, when I add the note "Pause at the bottom", then it shows under the description as Your note, and the button says Edit note.
- Given my own exercise, when I write two steps on separate lines in the dialog, then its page lists them as How to do it, in order.
- Given my own exercise's dialog, when I tap the quads on the figure three times, then they're main, then supporting, then not worked.
- Given my own exercise in the workout "Legs", when I press Delete, then it isn't deleted and I'm told it's in Legs.
- Given my own exercise with a set in the history and in no workout, when I press Delete, then it's hidden instead, with Undo.
- Given the Exercises list scrolled down, when I open Back squat, then its page slides in from the right and opens at its top; when I press ‹ Exercises, then it slides off to the right and the list is scrolled where it was.
- Given Back squat's page, when I swipe right past halfway and let go, then it slides off and the list is back; when I swipe right a little and let go slowly, then the page springs back and stays.
- Given reduced motion is on, when I open an exercise or go back, then the pages cross-fade, without sliding.
- Given an exercise's page sliding in, when I touch it and swipe right, then it stops where it was and follows my finger from there.
- Given Back squat's page and workouts "Legs" (6 steps) and "Arms" (20 steps), when I press Add to workout, then the dialog offers New workout, Legs and Arms, and Arms says it's full and can't be picked.
- Given that dialog, when I pick Legs, then Create opens on Legs with Back squat as step 7, 3 sets of 10 with 1:00 rest, open; when I pick New workout instead, then Create opens a new workout with only Back squat. Given Plank (timed), then it's 3 sets of 0:30.
- Given Create opened on Legs that way, when I reload it, then Legs opens as saved, without Back squat added again.
- Given my own exercise in no workout and not in the history, when I delete it, then it's gone, with my note on it, and the list shows with Undo; when I press Undo, then it's back with my note, on its page.
- Given Back squat's page, then How to do it starts with a figure squatting with a bar on its back, its quads and glutes shaded as main and its hamstrings and lower back as supporting, in a loop; when I press Pause, then it stops where it is and the button says Play; when I press Play, then it carries on from there.
- Given reduced motion is on, when I open Back squat's page, then it shows the figure standing and at the bottom, side by side, labelled "Standing" and "Bottom", with no Pause.
- Given Plank's page, then the figure holds a forearm plank, still, labelled "Hold", with no Pause.
- Given Bench press's page, then the figure lies on a bench pressing a barbell up from its chest; given Lat pulldown's, then it sits pulling a cable down to its chest.
- Given my own exercise's page, then there's no demo.

## Platform notes

- **Web:** the Exercises list is `ExerciseListComponent` (`src/app/exercises/`) and the page `ExercisePageComponent` (`src/app/exercises/exercise-page/`), which shows `ExerciseDetailsComponent` (`src/app/shared/components/exercise-details/`), as does `ExerciseDetailsDialogComponent` (`src/app/shared/components/exercise-details-dialog/`), shown by Create and by the workout page (RUN-9), routed at `/exercises` and `/exercises/:id`. Equipment reads as `equipmentPhrases()` in `models/exercise.ts`, and `exerciseUsage()` in `models/exercise-links.ts` says whether one can be deleted. `ExerciseStore` keeps which are hidden (`setHidden()`) and makes (`createOwn()`) and deletes (`deleteOwn()`) your own; your equipment is in `SettingsStore`, picked with `EquipmentFilterComponent` (`src/app/shared/components/equipment-filter/`), which the ready-made workouts share. The picker is `ExercisePickerComponent` (`src/app/workout-setup/exercise-picker/`), an ARIA 1.2 combobox with `aria-activedescendant`, searching with `searchExercises()` in `models/exercise-links.ts`. The dialog is `ExerciseEditorComponent` (`src/app/shared/components/exercise-editor/`); `ExerciseStore.updateOwn()` saves your own exercise and `WorkoutStore.renameExerciseSteps()` renames its steps. The body map is `BodyMapComponent` (`src/app/shared/components/body-map/`): `tappable` reports taps, `toggles` makes each muscle a toggle button as well (the Exercises list), and `removableLabels` adds the remove buttons. The list's muscles in the address are read and written by `src/app/exercises/muscle-filter-query.ts`. Its shapes, `body-shapes.ts`, are generated by `node tools/build-body-shapes.mjs` from a pinned commit of react-native-body-highlighter; don't edit them by hand. The built-in exercises are `src/app/models/built-in-exercises.ts`, with their descriptions, steps and tips in `built-in-exercise-text.ts` beside it, written as in [writing-exercises](../writing-exercises.md). The words aren't in the first download: `ExerciseStore.loadText()` loads them when an exercise's details are shown, and `textOf()` gives them. The slide is `PageSlide` (`src/app/nav/page-slide.ts`), a view transition started by the card and back links around their own navigation, as `WorkoutMorph` does; `src/styles/_page-slide.scss` names the list and the page differently (so each keeps its own place, however each is scrolled) only while it runs. The swipe is `SwipeBackDirective` (`src/app/nav/swipe-back.directive.ts`), which hands the finger's speed on to the slide as a spring (`spring()` in `src/app/shared/spring.ts`). Mid-slide the browser sends every press to `<html>`, so `letInputThrough()` (`src/app/nav/let-input-through.ts`) ends the transition and sends the press on to what it was over; `PageSlide.takeCaught()` says where a page sliding in was seen, for the swipe to take it from there. The demo is `ExerciseDemoComponent` (`src/app/shared/components/exercise-demo/`), which draws each pose with `ExerciseFigureComponent` beside it; the rig (poses, two-joint IK for a hand or foot given by where it is, easing between positions, where each part goes) is `models/exercise-motion.ts`, the drawing of each part, from the side and the front, is `models/exercise-figure-art.ts` (each part drawn once at its joint, and moved and turned into place with an SVG `transform`), and the built-in motions are `built-in-exercise-motion.ts`, loaded by `ExerciseStore.loadMotion()` and given by `motionOf()`. Kit, carried (`Prop`) or standing still (`Kit`), is placed by `drawFigure()` with the figure. It runs on `requestAnimationFrame`, stopped while paused, with reduced motion, or off screen (an `IntersectionObserver`).
- **iOS:** the list maps onto a `List` with `.searchable`, and the muscle chips onto a horizontal `ScrollView`; each card is a `NavigationLink` to the exercise's page. A `NavigationStack` gives the slide in and out, and the swipe back from the edge, for free; the web's swipe works from anywhere on the page, which on iOS needs a custom gesture. Tapping the body map needs hit-testing each `Path` (`contentShape`). The same paths work as SwiftUI `Path`s from SVG data, or through react-native-body-highlighter itself in a React Native app. The picker maps onto a `TextField` with a list of suggestions under it (or `.searchable` with `searchSuggestions`), and the exercise dialog onto a sheet. The demo's motions are plain data, so the same numbers can pose a SwiftUI figure drawn with `Canvas` in a `TimelineView(.animation)`, which pauses with `.paused`; `accessibilityReduceMotion` picks the stills. The 3D figure maps onto SceneKit or RealityKit: the skeleton (`exercise-skeleton.ts`) is plain maths, so the same joints can place capsule nodes, with a drag gesture turning the camera.
