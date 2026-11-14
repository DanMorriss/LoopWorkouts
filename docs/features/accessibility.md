# Accessibility

## Stories

- **A11Y-1** As a user of a screen reader, keyboard, or reduced motion, I want to use every feature as well as anyone else.

## Rules

### Screen readers

- As each step starts, the workout announces it politely (it doesn't interrupt), and **not every second**:
    - "Timed, round 1 of 3" at the start of a round (an unnamed timed step is called "Timed"); "Rest" mid-round.
    - With several steps: the name and number, e.g. "Squats, step 1 of 3, round 2 of 5".
    - Rep steps add the count, and the weight if there is one: "Push-ups, 20 reps", "Squats, 10 reps at 60 kg".
    - A step with sets says which, e.g. "Leg press, 10 reps, set 2 of 3", or "last set" for its last.
    - A step done each side says which after its name: "Step-up, left side, 10 reps".
    - As each exercise starts, in a workout with headings or more than one exercise, its part and number come first: "Legs, exercise 2 of 3, Leg press, 10 reps" (RUN-10). Not on each of its sets.
    - "last round" in place of the count in the final round (but "round 1 of 1" for a one-round workout); "round 4" with no total when it runs until stopped.
    - "Paused" when paused; "Finished" at the end.
- ∞ is read as "until stopped". The round dots, the step strip and each step's kind icon are hidden (the announcements say the same), and so is what's after a rest on the face, which "Next:" says.
- The ring reports progress through the step as a percentage, or "Waiting for Done" on a rep step. The progress bar is a layer of its own over the ring, not the ring holding the face, as a progress bar's contents are hidden from screen readers and the face's reps and weight wheels must be reachable.
- Icon buttons have names (Pause, Resume, Skip step or Skip rest, Options for …), and Done on a rep step is named for what it does and where it goes, "Done. Next: Rest · 01:00". Visible captions repeat them, hidden from screen readers.
- The setup (NAV-4) moves focus to each question's heading as it shows, so it's read out, and says "Question 2 of 6" in words (its bar is hidden). Its options are real radio buttons in a group named by the question, and the equipment chips are toggles (pressed when picked), as on the Exercises page; picking doesn't move on, so arrow keys can go through the options. Signed in, "Getting your profile…" is a status, read out.
- Wheels are spin buttons named by their step, e.g. "Step 2, rest, Seconds", reporting their value and range.
- Adding, moving, deleting or changing the kind of a step is announced, e.g. "Moved squats to step 3", "Step 2 is now rest".
- A step's kind pill is a button named with its kind and step, e.g. "Reps, change type of step 1", saying whether its menu is open; the menu marks the current kind as pressed.
- Browse by a step's name box (BLD-16) is named for its step, "Browse exercises for step 2". Its dialog's cards are buttons named with the exercise, its muscles and equipment; the muscle chips are toggles (pressed when picked), the count of exercises shown is read out as it changes, and picking one says "Step 2 is now Goblet squat". When a step's exercise changes its kind (Plank in a rep step), screen readers hear why, "Plank is timed, so this step is now 00:30", which also stays under the box as part of its description.
- The (i) button by setup's Steps heading is described by its tip (`role="tooltip"`), so screen readers read the tip without opening it.
- A step whose sets vary (BLD-11) lists its rows under the Vary each set switch, which names the list. Each row is a button saying its set, e.g. "Set 2 · 10 × 45 kg", whether it's open, and the wheels it controls; its wheels are named by the step, the set and the wheel, e.g. "Step 1, Leg press, Set 2, Reps".
- A superset (BLD-12) is named to screen readers in Create as "Superset, steps 2 to 3" (or "Giant set"), and each of its steps' open buttons says it's in it, e.g. "Step 2, Bench, in the superset, 10 reps". Joining, taking out and moving are announced, e.g. "Took Press out of the giant set, now step 4", "Moved superset to before step 3".
- A workout's headings (BLD-13) are named to screen readers in Create as "Heading, Warmup", and aren't counted as steps. In the history and the workout summary they're headings (`h4`) within the entry, over the lines of their part. A superset's lines there are a list of their own inside the entry's, under its name ("Superset" or "Giant set"), so a screen reader hears them as a list of 2 within it.

### Keyboard and focus

- Everything works with a keyboard. Space pauses, resumes, and presses Done; Escape resumes. Both are left alone while an exercise's details are open over the workout (RUN-9). Focus moves to Resume on pause and back on resume (see [pause-and-stop](pause-and-stop.md)).
- Wheels: arrows move one, Page Up/Down move five, Home/End jump to the ends, and typing digits picks a number.
- Steps can be reordered with **Move up/down** buttons as well as by dragging (the drag handle is hidden from screen readers). Your workouts on Workouts can be too, with **Move up** and **Move down** in a card's ⋮ menu, which stays open with focus on the same item (or the other one at the top or bottom); each move is announced, e.g. "Moved Legs day to 2 of 5".
- Focus is always put somewhere sensible: into a dialog, back to the button that opened a menu or dialog, onto a library card's play button (which starts its workout, with its summary read with it) when a workout has just been saved or added, back onto the card when its details slide back, onto a new step's name box, onto "Applied" when a summary's Next time step-up is applied, onto **Undo** after any delete (and back to what was put back on Undo, or the step that took a deleted one's place if the offer is closed).
- Escape closes menus, dialogs, tooltips and open wheels. Dialogs grow out of the button that opened them as the page dims and blurs behind, and shrink back into it as they close; menus grow out of their button and fold back into it. Taps reach the page as soon as one starts to close.

### Text

- Reading text is the **system's own face** (San Francisco on Apple devices), at 16px in `rem`, so it follows the browser's text size; headings are semibold. Headings' sizes, line heights and margins are in `rem` too (Material sets them in px, which `styles.scss` restates), so a bigger text size doesn't run a wrapped title's lines into each other. Audiowide, the app's display face, is only for page titles and the workout's big numbers, tracked in as it grows and left alone at smaller sizes.
- Small text (0.75rem and under, e.g. chart labels and chips' details) is spaced out a touch so it stays legible; sizes are in `rem` throughout, the chart's axis labels included.
- The countdown's digits each sit in a **cell of the same width**, so the time doesn't shift as it ticks; screen readers hear it as one piece of text, e.g. "00:41". Other ticking numbers (time left, the workout's bar, the wheels) use the system face's fixed-width digits.

### Motion and colour

- With **reduced motion**: looping animations stop (the "Next:" pulse too, leaving its coloured border, the face's last-seconds pulse, leaving its tint, and rest's breathing), a timed step's last seconds don't pop and Done doesn't swell as a rep step comes round, the logo shows drawn at once, wheels jump rather than glide, a new step or round crossfades rather than rolling in, Pause and Resume swap rather than glide, the workout opens and closes with a quick cross-fade rather than growing out of its bar, an exercise's page (and Settings, the Privacy notice and Terms of use) opens and goes back with a quick cross-fade rather than sliding (a swipe back still follows the finger), the workout's bar, swiped right to end it, ends it without sliding off, dialogs and menus fade without growing or shrinking, the summary appears and goes without rising or sinking, a mouse-flicked wheel lands at once, switches' knobs jump across, an exercise's animated demo shows its key positions side by side rather than moving (EXR-13), lists close up (or open out) at once rather than sliding, with a row put back or a step's content fading in, and themes change without a fade.
- Anything that moves on its own for more than 5 seconds can be paused (WCAG 2.2.2): an exercise's animated demo has **Pause** under it (EXR-13). A hold's demo (a plank, say) doesn't move, so has none.
- Nothing needs dragging (WCAG 2.5.7): the 3D demo figure turns round when dragged, and **Turn** beside Pause does the same with a press (EXR-13). The figure's canvas is hidden from screen readers, as the steps say the same in words.
- **Pressing** a button shows at once, while the finger or mouse button is still down: buttons shrink a little, switches' knobs swell, and menu and list rows light up. Hover looks only show where there's a mouse or trackpad, so on a phone they don't stick after a tap.
- Controls drawn smaller than a fingertip (chips, the chart's range buttons, the ⓘ and step-kind buttons, a muscle's ✕) take presses **44px** across, without changing how they look.
- With **reduced transparency**, panels and cards are solid and the dimming behind dialogs is darker with no blur; with **more contrast**, panels and cards get a control's border. The bars along the bottom do both too.
- Every page meets **WCAG 2.1 AA** in both themes: text at least 4.5:1 against what it sits on, controls and the ring at least 3:1. Nothing relies on colour alone (e.g. switches say On or Off, and each kind of step has its own icon as well as its colour).

## Acceptance criteria

- Given a run of 3 rounds, then a screen reader hears "Timed, round 1 of 3", "Rest", "Timed, round 2 of 3", …, "Finished", and nothing between.
- Given a run paused, then it hears "Paused", and on resume, which phase it's back in.
- Given I delete something, then focus is on Undo, and Escape closes the offer without undoing.
- Given reduced motion is on, then nothing loops.
- Given any page in either theme, then an automated accessibility check (axe) finds nothing.

## Platform notes

- **Web:** checked by axe over every page and state (`src/app/a11y.spec.ts`), leaving out a closed number wheel's other numbers, which are out of sight and hidden from screen readers (its current number and an open wheel's are checked) and colour contrast tests (`src/app/shared/theme/theme-contrast.spec.ts`).
- **iOS:** VoiceOver announcements via `AccessibilityNotification.Announcement`; spin buttons map onto adjustable elements (`accessibilityAdjustableAction`); honour `accessibilityReduceMotion` and Dynamic Type. Reading text is SF Pro with Dynamic Type text styles (`.body`, `.headline`); Audiowide stays for titles and the timer, with `.monospacedDigit()`-style cells for its countdown. Press feedback comes from a `ButtonStyle` reading `configuration.isPressed`; there's no hover to worry about on a phone. Xcode's Accessibility Inspector audit plays the part of axe.
