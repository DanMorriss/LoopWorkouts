# Alarms

## Stories

- **ALM-1** As a user I want to hear each step start, with a different sound for work, rest and the finish, so I don't have to watch the screen.
- **ALM-2** As a user I want the alarms to keep going with my phone locked, so I can work out with it in my pocket.
- **ALM-3** As a user I want my phone to vibrate as each step starts, for when it's noisy or I'm wearing headphones.
- **ALM-4** As a user I want to choose which sound plays for each step, with a preview. (Not built: waiting on proper sound files.)
- **ALM-5** As a user I want the last few seconds of a timed step or rest counted down with a beep, so I know it's ending without watching the screen.

## Rules

### Sounds

| Alarm     | Plays at                                                                                                                    | Sound                                                                               | Vibration (on, off, … in ms) |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| Timed     | the start of each timed or rep step                                                                                         | two short high beeps: 880 Hz, 0.15s each, the second at 0.25s                       | 150, 100, 150                |
| Rest      | the start of each rest step                                                                                                 | one long low tone: 440 Hz, 0.5s                                                     | 500                          |
| Finish    | the end of the workout                                                                                                      | three rising notes: 523.25, 659.25, 783.99 Hz at 0s, 0.2s, 0.4s; the last held 0.6s | 180, 20, 180, 20, 600        |
| Countdown | 10, 3, 2 and 1 seconds before a time limit runs out (RUN-8); 3, 2 and 1 seconds before each timed step or rest ends (ALM-5) | one short tick: 660 Hz, 0.08s                                                       | 60                           |

- Notes are triangle waves at 30% volume, faded in over 10 ms and out over 30 ms so they don't click. They're placeholders until proper sound files arrive.
- A **rep step** sounds the work alarm as it starts.
- No rest alarm at the end of the last round (that rest is skipped), and no finish alarm for a workout that runs until stopped.
- **Countdown beeps** (ALM-5, on unless turned off in Settings): a tick 3, 2 and 1 seconds before each timed step or rest of **10 seconds or more** ends. Shorter steps (e.g. Switch sides at 5 seconds) have none, so they aren't all beeps. Rep steps have none, as no one knows when they'll end; the step before one counts down to it. Rest at the end of the last round is skipped, so it has none either.
- With a **time limit**, its own countdown has the last 10 seconds to itself: no step ticks in them, so the two never play over each other.
- With a **time limit**, no step alarm at or after the moment it runs out; the finish sounds then, part-way through a step or not. The ticks and the finish are booked even while a rep step is waited on, as the end doesn't move: Done moves the countdown's start on by just the time it adds to the time on rep steps.

### Timing

- Alarms are **booked ahead** for the whole workout, so they sound on time even if the app is held up. A workout that runs until stopped is booked 100 rounds at a time, topped up halfway through.
- Nothing is booked past a rep step not yet done (no one knows when it'll end). Done books the rest from the next step.
- An alarm **up to 1 second late** still plays (e.g. the first one, due the moment Start is pressed). Anything later is skipped, e.g. after a reload.
- An alarm that's begun plays out in full; one that's already played isn't played again when the alarms are booked afresh. After a **pause**, the step's alarm doesn't play again on resume.
- Pause cancels booked alarms; Stop also silences one that's sounding.
- **Vibration** happens as each alarm comes due, once each, and not for steps missed while the app was in the background.

### Turning sound on

- The web only allows sound after the user has tapped or pressed a key. Any tap anywhere in the app turns sound on, so it's ready by the time a workout starts. After a reload, the workout page shows a **Tap to turn on sound** button until it is.
- The Sound, Vibration and Keep screen on settings apply at once, mid-workout too (see [settings](settings.md)).

### The screen locking

- By default the **screen is kept on** while a workout is running (not paused or finished), so the phone doesn't lock and silence the alarms. It's asked for again when the app comes back to the front.

## Acceptance criteria

- Given work 0:03, rest 0:02, 2 rounds, then alarms sound: work at 0s, rest at 3s, work at 5s, finish at 8s.
- Given work 0:30, rest 0:10 and a time limit of 1:40, then alarms sound: work at 0s, 40s and 80s, rest at 30s and 70s, ticks at 90s, 97s, 98s and 99s, and the finish at 100s.
- Given work 0:30, rest 0:10, 2 rounds and countdown beeps on, then ticks sound at 27, 28 and 29s, 37, 38 and 39s, and 67, 68 and 69s, before the rest at 30s, the work at 40s and the finish at 70s.
- Given work 0:09 and rest 0:05 with countdown beeps on, then there are no ticks.
- Given work 0:30, rest 0:10, a time limit of 1:40 and countdown beeps on, then the last step ticks are at 77, 78 and 79s, and the time limit's at 90, 97, 98 and 99s.
- Given countdown beeps are turned off mid-workout, then the ticks still to come are silenced, and the other alarms stay.
- Given rest of 0:00, then there are no rest alarms.
- Given a rep step, then the work alarm sounds as it starts and nothing is booked after it until Done.
- Given an alarm due 0.5s ago, then it plays at once; given one due 1.5s ago, then it's skipped.
- Given sound is turned off mid-workout, then booked alarms are silenced; turned back on, they're booked again.
- Given a run is paused, then no alarms sound; on resume, the ones still to come are booked again.
- Given the phone can't vibrate, then nothing vibrates and the setting says why.
- Given the screen-on setting is on, then the screen stays on while running, and is let go when paused or finished.

## Platform notes

- **Web:** `AlarmService` (`src/app/shared/alarms/alarm.service.ts`) books notes on the Web Audio clock, which keeps time in background tabs where JS timers don't. The list of alarm times is pure: `alarmEvents()` in `src/app/models/alarm-schedule.ts`. Keep screen on is the Screen Wake Lock API (`KeepAwakeService`).
- **Web limits:**
    - **ALM-2:** iPhones suspend web audio when the phone locks, so alarms stop if it's locked by hand. Scheduled notifications aren't possible on iOS web (no Notification Triggers). Playing the alarms as an `<audio>` track was tried in PR #64 and was silent once locked in Safari, so it was taken out (#65).
    - **ALM-3:** iPhones don't support web vibration at all.
- **iOS:** this is where a native app does better than the web.
    - **ALM-2** should be possible: schedule a **local notification** (`UNUserNotificationCenter`) with a custom sound for each upcoming alarm. They fire when locked, and must be cancelled and re-booked on pause, resume, Done and Stop, as the web app does. iOS allows 64 pending at a time, so book in batches. An alternative is background audio (`AVAudioSession` playback category), which keeps playing when locked but ducks other music.
    - **ALM-3:** haptics with `UIImpactFeedbackGenerator` or Core Haptics while the app is open; a notification's own vibration when locked.
    - Keep screen on: `UIApplication.shared.isIdleWorkoutDisabled = true` while running.
