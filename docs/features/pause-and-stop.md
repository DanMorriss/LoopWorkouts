# Pause, stop, and carrying on

## Stories

- **CTL-1** As a user I want to pause and resume a workout, for when I'm interrupted.
- **CTL-2** As a user I want to stop a workout early, and still have what I did logged.
- **CTL-3** As a user I want to pick up where I was if the app is reloaded or closed by mistake.
- **CTL-4** As a user I want a workout to keep going, alarms and all, while I look at other pages of the app.

## Rules

### Controls

- Like a media player: a big **Pause** button under the ring, with **Skip** to its right on a timed step or rest (RUN-12), and nothing else while it runs. On a rep step it's still Pause, with no Skip, and Done is the "Next:" pill above it (see [run-a-workout](run-a-workout.md)).
- There's **no Stop while running**: a workout is only ended from the paused screen, two presses away, so it's never ended by mistake.
- On a keyboard, **Space** pauses and resumes, or presses Done on a rep step. It's ignored when held down (no flicker), with Shift, Ctrl, Alt or Cmd, once finished, and when a button or text box has focus (Space already does something there). **Escape** resumes too, except when it's closing a dialog over the workout (e.g. the exercise's details opened while paused), which it only closes.

### Pause

- Pausing **freezes** the countdown and the ring where they are, and stops the last-seconds pulse. However long it's paused, it doesn't move on.
- The ring **greys out**, and the round line, your note and Next turn the muted text colour. In the middle of the ring the face shows the step's name in the muted colour, on one line (cut short with "…" if it's long), with the **(i)** for its exercise's details beside it if it is one (RUN-9); then "**Paused · 00:23**" (or "Paused · 20 reps" on a rep step), a big **Resume** button, and **End workout** under it. Pausing to read how an exercise is done is common, so the (i) stays; the details open over the paused workout, and closing them goes back to the (i), still paused. Unnamed work shows no name; unnamed rest and reps say "Rest" and "Reps", as on the face. The controls under the ring go while paused.
- Focus moves to Resume on pause, and back to Pause on resume, as the button just pressed has gone.
- **Pause becomes Resume**: the button glides up from where Pause was into the middle of the ring as Resume, and back down again on resume, along the same path (from the smaller Pause beside Done on a rep step). It moves on a spring with no bounce (Apple's 0.4s response) and is a real button the whole way, so it can be pressed mid-glide, and it turns straight round from wherever it is. With reduced motion it's just swapped.
- Resuming carries on from exactly where it was. The time spent paused **doesn't count** as time spent in the history.
- Alarms booked ahead are cancelled on pause and booked again on resume. **An alarm that already sounded before the pause doesn't sound again** on resume, even if the pause came less than a second after it.
- Done on a rep step while paused carries on running.

### End workout (Stop)

- End workout, on the paused screen, logs the workout as it stands, silences any alarm still sounding, and opens the **summary** (see [run-a-workout](run-a-workout.md)). The run is kept, paused, behind it: **Back to workout** (or Escape) closes the summary and the run carries on from where it was, while **Done** ends it for good and opens it in the history. If the run is taken up again, its history entry is updated when it later stops or finishes.
- The workout is logged as **stopped**, with the full rounds done and the time spent so far, if **at least one step was done**. Stopping before the first step ends leaves no trace, so a workout started by mistake doesn't clutter the history.
- Starting another workout while one is going ends the first, logged as stopped by the same rule.

### Carrying on

- The run lives **outside the workout page**: its clock, alarms, vibration and history logging carry on on any page. While a run is going it shows in a **bar above the tabs** on every other page, with its step, time and Pause; tapping it goes back to the workout (see [home-and-navigation](home-and-navigation.md)).
- If the app is **reloaded**, the run carries on where it was, paused or not, rep steps and all. Alarms already past are skipped (only ones up to a second late still play).
- If the app is **closed**, the run is logged as it stands (stopped, or finished if it was). If it's reloaded and carries on, that same history entry is updated when it later stops or finishes, rather than adding another.
- A run is remembered **per tab** on the web, not across devices.

## Acceptance criteria

- Given a run 1.5s into work, when paused for 10 minutes, then it still shows the same time, and on resume carries on from there.
- Given a rest step that began half a second ago, when I pause and resume, then the rest alarm doesn't play again.
- Given a run paused, when the app reloads, then it's still paused at the same point.
- Given a run 4.5s in, when the app reloads, then it carries on from 4.5s, and only alarms still to come are booked.
- Given a run going, then the only controls are Pause and Skip; when paused, then Resume and End workout show over the greyed ring, and Escape resumes.
- Given a run paused on Push-ups (the Push-up exercise), then "Push-ups" and an (i) named "Details of Push-up" show above "Paused"; the (i) opens its details, and closing them leaves the run paused with focus on the (i). Paused on Jog (just a name), then "Jog" shows with no (i).
- Given a run going, when I press Pause, then Resume glides from Pause's place up into the ring; when I press Resume before it gets there, then Pause glides back from where Resume was.
- Given a run on its first step, when I end it, then nothing is logged, and the summary says "Nothing to log".
- Given a run, on another page, when I swipe its bar right past halfway, then it ends as End workout does, and its summary opens (see [home-and-navigation](home-and-navigation.md)).
- Given a run in round 2 of 3, when I end it, then it's logged as stopped, "1 of 3 rounds", with the time spent less pauses.
- Given a run going, when I open History, then the alarms carry on, and it's logged when it finishes even though I'm not on the workout page.
- Given a run going, when I start another workout, then the first is logged as stopped.
- Given a run going, when the tab closes, then it's logged as stopped; when it's reopened and the run finishes, then that entry becomes finished.

## Platform notes

- **Web:** `ActiveRunService` (`src/app/shared/run/active-run.service.ts`) owns the run; `WorkoutStore` (`src/app/shared/state/workout-store.service.ts`) saves the run's state in `sessionStorage` (see [data](data.md)). Closing the tab is caught with `pagehide`. The glide between Pause and Resume is a FLIP animation (`WorkoutComponent.glideFrom()`) with a spring easing from `src/app/shared/spring.ts`, rather than a view transition, which would block taps while it ran.
- **iOS:** the same few values (workout id, run start, adjusted start, paused at, rep steps done, rep time, skips) saved to `UserDefaults` give "carry on after relaunch". There's no reliable "app is closing" hook on iOS, so log the run as it stands whenever the app goes to the background (`scenePhase` → `.background`), which covers being swiped away. The lock-screen controls of a Live Activity could offer Pause and Stop too. The glide is a `matchedGeometryEffect` between the two buttons with `.spring(response: 0.4, dampingFraction: 1)`.
