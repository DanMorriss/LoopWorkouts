# Loop Workouts

[![CI](https://github.com/DanMorriss/LoopWorkouts/actions/workflows/ci.yml/badge.svg)](https://github.com/DanMorriss/LoopWorkouts/actions/workflows/ci.yml)

Loop Workouts is a workout app built around an interval timer (it was called LoopTimer until October 2026). You build a round from work and rest steps, choose how many rounds (or until stopped), save the workout to a library, and run it whenever you need it.

**Try it:** https://loopworkouts.com

Built with Angular 22 (standalone components, signals and Signal Forms), Angular Material and Tailwind CSS, with Supabase (in Europe) for accounts and sync. The server side is in `supabase/schema.sql`.

## What it does today

- **Create a workout** from a list of timed, rest and rep steps in any order (up to 20), each optionally named, e.g. "Squats". Timed and rest steps are up to 99:59; a rep step is a count instead, up to 100, e.g. "20 push-ups", with an optional weight, e.g. "10 squats @ 60 kg". Add steps, drag them into order (or use the up and down buttons), or delete them. Then pick 1–30 rounds or ∞ (until stopped). Times are picked on iPhone-style wheels: swipe, scroll or drag a wheel, click a number, or type one, and the one in the middle is selected. Give it a title, or leave it untitled. For ∞, scroll the rounds wheel past 30, or flip the ∞ switch beside it: the dot races round the loop and the wheel spins to ∞. Turning the switch off spins back to the rounds you had. Or pick **Time limit** instead of rounds, e.g. 20:00, for as many rounds as you can before time's up. An exercise step's **Swap** offers others for the same muscles that your equipment allows, at the weight you did them at last time.
- **Run it.** A ring fills as each phase goes by. Timed steps fill clockwise in pink, rest fills anticlockwise in blue, and the face is tinted in the phase colour, pulsing in time with "Next:" in a step's last seconds. Each kind of step has its own look: timed steps have a bright dot at the ring's leading edge and their last 3 seconds pop; rest settles in gently, breathes, and shows what's after it; a rep step's count is the big thing on the face. The face shows the step's kind as an icon and its name, fitted to the circle however long it is, with an (i) beside an exercise's name that opens how it's done over the workout; underneath, what's up next. Each step rolls into the face as if on a drum, like the number wheels, and a new round turns in from the right. The page shows "round 2 of 5" with a dot for each round, the time left of a workout of timed steps, a strip of the round's steps in their colours, and "Last one!" for the final round. With a time limit it shows "round 3" counting up and the time left, ticks for the last 10 seconds, and stops when time's up with your score, e.g. "7 rounds + 3", asking how many reps you got of a set it cut short. On a phone, the workout's title takes the place of the Loop Workouts name at the top, leaving more room for the ring. Rest at the end of the last round is skipped. A rep step has no countdown: the ring turns violet and the face shows the reps, and the workout waits, however long it takes, until you press Done, the "Next:" pill under the ring (or Space). The next step then starts from its full time, and the time spent on reps still counts in the history. The reps and weight on the face are wheels: tap one to change it mid-workout, e.g. going up a weight, for this set, the rest of the workout and next time. Someone on the machine? Swap exercise, in the step's details, offers the closest exercises for the same muscles that your equipment allows (or search for one), for the rest of the workout, at its weight last time; the summary asks whether to use it next time.
- **Hear each phase start.** Two short high beeps for timed steps, a long low tone for rest, and three rising notes at the finish, with matching vibrations on phones that support them (not iPhones). The beeps are scheduled ahead on the audio clock, so they stay on time in a background tab. They keep going on any page of the app, not just the workout, and by default the screen is kept on during a workout (Screen Wake Lock) so the phone doesn't lock and silence them. Browsers only allow sound after a tap, so after a refresh the workout page shows a "Tap to turn on sound" button.
- **Pause, resume or stop** while it runs, or press Space to pause and resume (a "Space" key under Pause shows this on computers). Pausing freezes the countdown and the ring where they are; stopping (End workout, or swiping the bar along the bottom to the right) shows how it went, and Done then opens it in the history.
- **Keep accurate time.** The countdown is worked out from the clock, not by counting ticks. It stays correct if the tab is in the background or the phone is locked, and catches up as soon as you come back. Refreshing the page carries on where you were, paused or not.
- **Open on Home**: the workouts due today, the suggested next workout and the muscles worked this week.
- **Get anywhere from the tab bar** along the bottom: Home (where the app opens), Exercises, Library, History and Account, with Settings opened from Account. A workout that's going shows in a bar above the tabs, with its step, time and Pause, like a music app's mini player; tap it to go back to the workout, or ⌄ on the workout to leave it running.
- **Settings**: a dark, light or match-system theme, which fades from one to the other as you switch; show weights in kg or lb; turn sound, vibration, countdown beeps or keeping the screen on off; play each alarm sound to hear what it is; export and import a backup; and copy a prompt that has an AI turn a plan from a coach, a book or a spreadsheet into workouts to import. Saved in the browser, like workouts. The privacy notice and terms of use are linked under About.
- **History**: every finished workout, and any stopped after at least one step (including one ended by starting another workout, or by closing the tab: it's logged as stopped then, and updated if a refresh carries it on), grouped by day with its start time, time spent (not counting pauses) and rounds, plus a total for the last seven days. Each entry lists the sets of its rep steps, e.g. "Squats: 10, 10, 8 @ 60 kg". Each entry's ⋮ menu adds, edits or removes a short note (e.g. "felt strong"), or deletes it, with Undo. When a workout finishes, its summary shows the muscles it worked, what to step up next time (more weight, or another rep with no weight, where every set got its reps, each with Apply to put it on the saved workout) and the suggested next workout, and its Done opens it in the history. Saved in the browser.
- **Save and reuse workouts** in the library: start, edit or delete any of them, hold one to drag it to another place, and see a workout's details (the muscles it works and its history). Under the workouts, the muscle groups none of them work, each a link to exercises for it. Workouts are saved in the browser (`localStorage`), so they stay on that device.
- **Start from a ready-made workout**: ten to pick from (no equipment, kettlebell, dumbbells and gym), filtered by the equipment you have. Each shows its exercises, sets and the muscles it works, and is added to the library as your own copy to start, change or plan.
- **Sync, if you sign in.** An account is optional: the first time, the app asks whether to sign in or carry on as a guest. Sign in on the Account tab with a link or code sent to your email, and your workouts, history and exercises are the same on every device you sign in on. Everything is saved on the device first, so the app works offline and catches up when it's back online; settings stay a choice for each device. Sign out (which removes the account's data from the device, after syncing it), delete the account, or clear this device there too.
- **Accessible:**
    - Everything works with a keyboard, and Space pauses and resumes the workout.
    - Screen readers hear "Timed, round 1 of 3", "Rest" and "Finished" as each phase starts, and "Paused" when paused.
    - Looping animations stop when the system's reduced-motion setting is on.
    - Every page passes automated axe checks (WCAG 2.1 AA) in both themes, and every text and control colour is checked for contrast against the surfaces it sits on.

## Running it locally

You'll need **Node 24** (see `.nvmrc`) and npm.

```bash
nvm use        # switches to Node 24, if you use nvm
npm ci         # install dependencies
npx playwright install chromium   # one-off: the browser the tests run in
npm start      # dev server at http://localhost:4200, reloads as you edit
```

Other commands:

| Command                                   | What it does                                                        |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `npm run build`                           | Production build into `dist/loop-workouts`                          |
| `npm test`                                | Unit tests with Vitest in headless Chromium, re-running as you edit |
| `npx ng test --watch=false`               | Run the tests once (what CI runs)                                   |
| `npm run format:check` / `npm run format` | Check or apply Prettier formatting                                  |

## Tests

Every pull request runs the format check, these tests and the production build in GitHub Actions (`.github/workflows/ci.yml`).

There are around 1,260 unit tests, run with [Vitest](https://vitest.dev) in browser mode: a real headless Chromium via Playwright, so layout and colour contrast are checked as a browser renders them. Workout tests use Vitest's fake clock (`vi.useFakeTimers()`). As well as the usual component and service tests, they include:

- **Workout logic** (`src/app/workout/workout-state.ts`): phase changes on exact seconds, no rest after the last round, zero rest skipped, and catching up after delayed ticks.
- **Sync** (`src/app/sync/`): fetching, merging and sending against a fake server that keeps records as the database does, and clocks that are off.
- **Accessibility** (`src/app/a11y.spec.ts`): renders the whole app and runs [axe-core](https://github.com/dequelabs/axe-core) over every page and state, including the delete dialog and the workout mid-workout. Any WCAG 2.1 A/AA or best-practice violation fails the test.

## Project layout

```
src/app/
  home/                Where the app opens: today's planned workouts, the suggested next workout and this week's muscles
  nav/                 The header, and the bars along the bottom: tabs, the workout's bar, Undo
  history/             Past workouts by day, with delete and undo
  exercises/           The exercises list, and each exercise's page: bests, chart and sessions
  account/             The Account tab: signing in by email, profile (sex, weight units), your data (backups), About, and the way into Settings
  sync/                Sync with the account (loaded only once signed in), and its status
  legal/               The privacy notice and terms of use
  settings/            Theme, sound and vibration, alarm previews (slides in over Account)
  workout-setup/       Create or edit a workout (Signal Forms)
  workout-library/     Saved workouts
    workout-card/      One workout: tap to start, swipe to delete, hold to drag (or let go for options)
    workout-details/   A workout's muscles and history, from its options
  workout/             The running workout: ring, countdown, announcements
    workout-state.ts   Works out phase, time left and round from elapsed time
    fit-name.ts        Fits a step's name to the face: wraps, then shrinks only as far as it must
    step-strip/        The round's steps as a strip in their kinds' colours
    alarm-schedule.ts  When each alarm is due
  shared/
    state/workout-store.service.ts  Saved workouts and the active workout
    state/settings-store.service.ts Saved settings
    state/history-store.service.ts  Saved workout history
    state/sync-clock.service.ts     Dates changes, by the server's clock once sync has heard it
    backup/backup.service.ts        Export and import, and the merge sync uses too
    theme/theme.service.ts          Applies the theme (colour tokens are in src/styles.scss)
    alarms/alarm.service.ts         Plays alarms on the audio clock, and vibrates
    components/wheel-picker/        iPhone-style number wheel (a Signal Forms control)
    components/infinity-switch/     The ∞ (until stopped) switch in setup
    components/toggle-switch/       On/off switch used in settings
    undo/undo.service.ts            Undo after a delete, shown in the Undo bar (nav/undo-bar/)
    reduced-motion.ts               Follows the system reduced-motion setting
    spring.ts, gesture.ts           Springs (as CSS easings, or frame by frame), and flick projection, rubber-banding and speed for drags
    layout-change.ts                Slides a list's items to their new places when one is deleted, put back, opened or closed
    dialog-origin.ts                Grows a dialog out of the button that opened it
  a11y.spec.ts       axe checks across the whole app
src/styles/
  _buttons.scss      The shared buttons: .btn-main, .btn-pill, .btn-icon, .btn-add
  _forms.scss        Labelled form fields (.picker-field, .picker-row)
  _interaction.scss  Hover and press feedback, and 44px hit areas for small controls
  _type.scss         The two faces, display tracking by size, and small-text tracking
  _dialog.scss, _menu.scss  How dialogs and menus arrive and leave
supabase/schema.sql  The server side: the records table, and the sync and delete-account functions
```

## Roadmap

Loop Workouts is becoming a workout helper that shows you how you're improving: see [docs/direction.md](docs/direction.md). Done so far: exercises with a body map, last time and personal bests in the workout, progress pages, sync, a suggested next weight, a workout summary with the muscles worked, what to step up next time and the workout to do next, and gym plans as they're written: sets with a rest between them, exercises done each side, sets with their own reps and weight, supersets and giant sets, and headings. Since then: adding an exercise to a workout from its page, a weekly plan with what's due today on Home, and signing in with Google. Each built-in exercise shows an animated demo of how it's done, in 3D, which can be turned round. Still to come:

1. **Sign in with Apple**, once there's an Apple Developer account.

Also planned: proper alarm sounds, choosing the sound for each step, and alarms on a locked phone.

Work on these, plus design and technical follow-ups, is tracked in [TODO.md](TODO.md).

## User stories

Every feature's stories, exact rules and acceptance criteria are in [docs/features](docs/features/README.md), written so the app could be rebuilt on another platform (e.g. as an iPhone app) without reading the code. A change in behaviour updates its file there in the same PR.

These were the original five:

|     | Story                                                                                                                                                                     | Status                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | As a user I want to be able to create an alarm telling me when to start and end an 'x' second exercise with a 'y' second break that repeats 'z' times.                    | ✅ Done                                                                                                                                             |
| 2   | As a user I want to be able to create an alarm telling me when to start and end an 'x' second exercise with a 'y' second break that repeats until I turn it off manually. | ✅ Done (∞ rounds, and the Stop button)                                                                                                             |
| 3   | As a user I want to be able to set different notifications for each different interval of time so I know when I am entering a different period of time.                   | Partly: each step can be named, and work and rest have their own colour, sound and vibration; choosing a sound per step is planned                  |
| 4   | As a user I want the timers to continue if my phone screen locks so I can work out with my phone in my pocket.                                                            | Partly: the screen is kept on during a workout so it doesn't lock, and the countdown keeps correct time if it does; alerts while locked are planned |
| 5   | As a user I want to be able to see the alarms I have created in the past so I can reuse them.                                                                             | ✅ Done (the library)                                                                                                                               |

<details>
<summary>Original design notes (wireframes)</summary>

These are the screens from the original plan. Some have been built differently (for example, saving happens when you start a timer, and the library uses a menu for edit and delete), and some are still on the roadmap.

1. **Home screen.** Landing page with the title and links to Set Timer, Timer Library and Settings.
2. **Setup screen.** Configure timers and cycles:
    - Add multiple intervals with "+ Add Interval", each with a duration input and a delete icon.
    - A cycle count, with an infinite-loop option that disables it.
    - "Start Timer", "Reset" and "Save" buttons.
3. **Save modal.** Name input with "Save" and "Cancel".
4. **Active timer screen:**
    - A big countdown for the current interval.
    - Smaller text such as "Interval 2 of 3, Cycle 1 of 5".
    - An overall progress bar.
    - Pause/Resume, Stop and Save controls.
5. **Timer library screen.** A list of saved timers with "Edit" and "Delete".
6. **Confirm delete modal.** "Do you want to delete the timer {name}?" with "Yes" and "No".
7. **Settings screen (optional):**
    - Default alarm order: drag to reorder sounds, with a play button to preview each one.
    - Light/dark theme.
    - Vibration on or off.
8. **History screen (optional).** A log of completed cycles: start time, cycles and total duration, with an option to delete entries.

</details>
