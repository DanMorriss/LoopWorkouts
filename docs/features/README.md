# Loop Workouts features

What the app does, one file per feature, written so it could be rebuilt on another platform (an iPhone app, say) without reading the Angular code.

Each file has the same sections:

- **Stories**: who wants what, and why, each with a stable ID (e.g. `ALM-2`) to refer to from TODO.md, PRs and issues.
- **Rules**: exact behaviour, limits and wording. These are what a port gets subtly wrong.
- **Acceptance criteria**: Given / When / Then checks. Most are taken from the web app's tests.
- **Platform notes**: how the web app does it and what an iPhone app would need. Everything above this section is meant to hold on any platform.

## Stories

Status: ✅ done, ◐ partly, — not started. The iOS column fills in as a port happens.

| ID     | Story                                                                    | Web | iOS | File                                          |
| ------ | ------------------------------------------------------------------------ | --- | --- | --------------------------------------------- |
| BLD-1  | Build a workout from work and rest steps that repeats a number of rounds | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-2  | Run a workout until I stop it                                            | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-3  | Name each step                                                           | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-4  | Count reps instead of a time                                             | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-5  | Reorder and delete steps                                                 | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-6  | Edit a saved workout                                                     | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-7  | Add a weight to a rep step, in kg or lb                                  | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-8  | Give a workout a time limit, for as many rounds as possible              | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-9  | Give an exercise sets, with a rest between them                          | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-10 | Do an exercise one side at a time                                        | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-11 | Give each set its own reps and weight                                    | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-12 | Superset or giant set: exercises in a row, then rest, for rounds         | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-13 | Add headings to a workout                                                | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-14 | Swap a step's exercise for one working the same muscles                  | ✅  | —   | [exercises](exercises.md)                     |
| BLD-15 | Save a workout without starting it                                       | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| BLD-16 | Browse the exercises for a step, by muscle and equipment                 | ✅  | —   | [exercises](exercises.md)                     |
| BLD-17 | A tour of Create, the first time I make a workout                        | ✅  | —   | [build-a-workout](build-a-workout.md)         |
| RUN-1  | See where I am in the workout at a glance                                | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-2  | See what's next                                                          | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-3  | Tap Done when a set of reps is finished                                  | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-4  | Know when I've finished, and note how it went                            | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-5  | Keep accurate time whatever the device does                              | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-6  | Change the reps or weight mid-workout, e.g. going up a weight            | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-7  | See a summary when I finish or end a workout, and correct its sets       | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-8  | Run to a time limit: rounds counting up, time left, the score at the end | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-9  | Check how a step's exercise is done, mid-workout                         | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-10 | See which set, side or round I'm on, and the section I'm in              | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-11 | Swap an exercise for an equivalent one mid-workout                       | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| RUN-12 | Skip a timed step or rest                                                | ✅  | —   | [run-a-workout](run-a-workout.md)             |
| CTL-1  | Pause and resume                                                         | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| CTL-2  | Stop a workout early                                                     | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| CTL-3  | Pick up where I was if the app is closed or reloaded                     | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| CTL-4  | Keep the workout going while I look at other pages                       | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| ALM-1  | Hear each step start, with a different sound for each kind               | ✅  | —   | [alarms](alarms.md)                           |
| ALM-2  | Hear alarms with my phone locked, in my pocket                           | ◐   | —   | [alarms](alarms.md)                           |
| ALM-3  | Feel each step start (vibration)                                         | ◐   | —   | [alarms](alarms.md)                           |
| ALM-4  | Choose the sound for each step                                           | —   | —   | [alarms](alarms.md)                           |
| ALM-5  | Hear the last seconds of a step counted down                             | ✅  | —   | [alarms](alarms.md)                           |
| LIB-1  | See my saved workouts and start one                                      | ✅  | —   | [library](library.md)                         |
| LIB-2  | Edit or delete a saved workout                                           | ✅  | —   | [library](library.md)                         |
| LIB-3  | Find a workout in the list quickly (A to Z)                              | ✅  | —   | [library](library.md)                         |
| LIB-4  | See what a workout works, and when I did it                              | ✅  | —   | [library](library.md)                         |
| LIB-5  | See which muscle groups my plan leaves out                               | ✅  | —   | [library](library.md)                         |
| LIB-6  | Start, plan or copy ready-made workouts                                  | ✅  | —   | [library](library.md)                         |
| LIB-7  | Get a ready-made workout suggested for the muscles my plan leaves out    | ✅  | —   | [library](library.md)                         |
| LIB-8  | Search and filter my workouts, and mark favourites                       | ✅  | —   | [library](library.md)                         |
| HIS-1  | See the workouts I've done, by day                                       | ✅  | —   | [history](history.md)                         |
| HIS-2  | See how much I've done this week                                         | ✅  | —   | [history](history.md)                         |
| HIS-3  | Add a note to a workout                                                  | ✅  | —   | [history](history.md)                         |
| HIS-4  | Delete a workout from the history, with Undo                             | ✅  | —   | [history](history.md)                         |
| HIS-5  | See the sets I did: reps and weight for each rep step                    | ✅  | —   | [history](history.md)                         |
| SET-1  | Choose a dark, light or system theme                                     | ✅  | —   | [settings](settings.md)                       |
| SET-2  | Turn sound, vibration and keeping the screen on, on or off               | ✅  | —   | [settings](settings.md)                       |
| SET-3  | Hear each alarm sound before a workout                                   | ✅  | —   | [settings](settings.md)                       |
| SET-4  | Choose kg or lb for weights                                              | ✅  | —   | [settings](settings.md)                       |
| SET-5  | Choose a male or female figure for the body map                          | ✅  | —   | [settings](settings.md)                       |
| SET-6  | Read the privacy notice and terms of use                                 | ✅  | —   | [settings](settings.md)                       |
| SET-7  | Give my name, and have my profile on every device I sign in on           | ✅  | —   | [settings](settings.md)                       |
| NAV-1  | Get to any page from anywhere, and back to a workout in progress         | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| NAV-2  | Open on what to do next and how my week is going                         | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| NAV-3  | Choose to sign in or carry on as a guest, the first time                 | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| NAV-4  | Set up my name, goal, equipment, body and units once, as I start         | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| NAV-5  | Tabs named for what I come to them for: Today, Workouts, Progress, You   | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| NAV-6  | Land on Today after setting up, shown to add workouts, then plan my week | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| NAV-7  | Find answers in the app, with ? links from the harder parts              | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| NAV-8  | A short tour of the app, pointing at each tab and its main part          | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| A11Y-1 | Use every feature with a screen reader, keyboard or reduced motion       | ✅  | —   | [accessibility](accessibility.md)             |
| EXR-1  | Exercises as things in their own right, used across workouts             | ✅  | —   | [exercises](exercises.md)                     |
| EXR-2  | Pick an exercise, built-in or my own, or make a new one                  | ✅  | —   | [exercises](exercises.md)                     |
| EXR-3  | Rename my own exercise everywhere, history included                      | ✅  | —   | [exercises](exercises.md)                     |
| EXR-4  | Carry existing workouts and history over into exercises                  | ✅  | —   | [exercises](exercises.md)                     |
| EXR-5  | See "Workouts", not "Timers", throughout the app                         | ✅  | —   | [exercises](exercises.md)                     |
| EXR-6  | Browse and search a built-in list of common exercises                    | ✅  | —   | [exercises](exercises.md)                     |
| EXR-7  | See how to do an exercise: a description and the steps                   | ✅  | —   | [exercises](exercises.md)                     |
| EXR-8  | See which muscles an exercise works, on a body map                       | ✅  | —   | [exercises](exercises.md)                     |
| EXR-9  | Make my own exercise, with a description and its muscles                 | ✅  | —   | [exercises](exercises.md)                     |
| EXR-10 | Add my own note to any exercise, built-in ones included                  | ✅  | —   | [exercises](exercises.md)                     |
| EXR-11 | See an exercise's details while building a workout                       | ✅  | —   | [exercises](exercises.md)                     |
| EXR-12 | Add an exercise to a workout, or a new one, from its page                | ✅  | —   | [exercises](exercises.md)                     |
| EXR-13 | See an exercise done, as an animated figure                              | ✅  | —   | [exercises](exercises.md)                     |
| PRG-1  | See what I did last time, mid-workout                                    | ✅  | —   | [progress](progress.md)                       |
| PRG-2  | Be told about personal bests when I finish                               | ✅  | —   | [progress](progress.md)                       |
| PRG-3  | See a list of my exercises with their latest and best                    | ✅  | —   | [progress](progress.md)                       |
| PRG-4  | See an exercise's chart, bests and recent sessions                       | ✅  | —   | [progress](progress.md)                       |
| PRG-5  | Get a suggested next weight                                              | ✅  | —   | [progress](progress.md)                       |
| PRG-6  | See which muscles I've worked this week, on the body map                 | ✅  | —   | [progress](progress.md)                       |
| PRG-7  | Be told when I've done the most rounds yet in a time limit               | ✅  | —   | [progress](progress.md)                       |
| PRG-8  | A bar per muscle group this week, showing what's over and under worked   | ✅  | —   | [progress](progress.md)                       |
| PRG-9  | A suggested next workout, for the muscles furthest short of their aims   | ✅  | —   | [progress](progress.md)                       |
| PRG-10 | Be told what to step up next time, more weight or reps, on the summary   | ✅  | —   | [progress](progress.md)                       |
| PRG-11 | See the muscles a workout worked, on its summary                         | ✅  | —   | [progress](progress.md)                       |
| PRG-12 | See the time I spend working out each week, on a chart                   | ✅  | —   | [progress](progress.md)                       |
| SYN-1  | Export all my data to a file                                             | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-2  | Import a backup without losing what's there                              | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-3  | Sign in and have the same data on every device                           | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-4  | Keep working offline, and catch up when back online                      | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-5  | Keep years of history, not just the last 500 workouts                    | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-6  | Have an AI turn a plan I already have into workouts to import            | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-7  | Sign in with Google or Apple                                             | ◐   | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-8  | Delete my account and what the server keeps                              | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| SYN-9  | Clear everything from this device                                        | ✅  | —   | [backup-and-sync](backup-and-sync.md)         |
| PLN-1  | Set which workouts I do on which days                                    | ✅  | —   | [planning](planning.md)                       |
| PLN-2  | See what's due today on Today                                            | ✅  | —   | [planning](planning.md)                       |
| PLN-3  | See whether I kept to the plan this week                                 | ✅  | —   | [planning](planning.md)                       |
| PLN-4  | See my week at a glance on Today, and change the plan from there         | ✅  | —   | [planning](planning.md)                       |
| PLN-5  | Add new workouts from the plan, when the ones I have aren't enough       | ✅  | —   | [planning](planning.md)                       |
| PLN-6  | Start from a ready-made week: workouts and plan in one go                | ✅  | —   | [planning](planning.md)                       |
| PLN-7  | Be offered a ready-made week on Today, for my goal and equipment         | ✅  | —   | [planning](planning.md)                       |

What's saved on the device, and in what shape, is in [data](data.md). Where the app is heading, and why the planned stories are in the order they are, is in [direction](../direction.md).

### The original stories

The README's first five user stories map onto these: 1 → BLD-1, 2 → BLD-2, 3 → BLD-3 and ALM-1 (ALM-4 to come), 4 → ALM-2, 5 → LIB-1.

## Keeping these up to date

A change in behaviour updates its file here in the same PR: the rule, an acceptance criterion if there's a new test for it, and the status above. A new feature gets a new story ID; IDs are never reused or renumbered.
