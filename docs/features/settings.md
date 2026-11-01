# Settings

## Stories

- **SET-1** As a user I want a dark, light or match-my-device theme.
- **SET-2** As a user I want to turn sound, vibration, and keeping the screen on, on or off.
- **SET-3** As a user I want to hear what each alarm sounds like before a workout.
- **SET-4** As a user I want to see and pick weights in kg or lb, whichever I lift in.
- **SET-5** As a user I want the body map to show a male or female figure, whichever I prefer.
- **SET-6** As a user I want to read how my data is handled, and the terms I use the app on.

## Rules

- Settings is opened from **Account**: a row under Sync, with a gear, "Settings", the hint "Theme, alarms and sounds" and a ›. It slides in over Account, as an exercise's page does over its list, with ‹ Account at the top to go back (or a swipe right); Account stays chosen in the tab bar. It was a tab of its own until 2026-10-28. It holds only this device's choices, which don't sync; **Profile**, **Your data** (backups, Copy AI prompt and Clear this device) and **About** are on Account (see [backup-and-sync](backup-and-sync.md)).
- **Profile**, on Account between Sync and the Settings row (since 2026-10-28; until then in Settings, as Body figure and Units → Weight), holds three more choices saved with the settings, so they stay a choice for each device too:
    - **Sex** (SET-5): Male (the default) or Female, with the hint "The body the muscle maps show": the figure the body map draws (see [exercises](exercises.md)). Called Sex, not Gender, as it picks an anatomical drawing.
    - **Training for** (PRG-8): Muscle (the default) or Fitness, with the hint "Aim for 10 to 20 sets a week on each muscle, 4 to 10 on small ones" (or 6 to 12 and 2 to 6 for Fitness): the sets a week the muscle bars aim at (see [progress](progress.md)).
    - **Weight units** (SET-4): Kilograms (kg) (the default) or Pounds (lb). Weights are always saved in kg, so switching loses nothing.

| Section      | Setting                        | Default | Hint                                                                           | Notes                                                                        |
| ------------ | ------------------------------ | ------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Appearance   | Theme                          | Dark    | —                                                                              | Dark, Light or System. System follows the device, including when it changes. |
| Workouts     | Each side: start with          | Left    | —                                                                              | Left or Right: which side an exercise done each side starts with (BLD-10).   |
| Workouts     | Switch sides                   | 5 s     | Time between a timed exercise's two sides, e.g. a side plank                   | A wheel: Off, or 1 to 30 seconds.                                            |
| Alarms       | Sound                          | On      | Beeps as each phase starts                                                     |                                                                              |
| Alarms       | Countdown beeps                | On      | Ticks in the last 3 seconds of each timed step and rest                        | Steps of 10 seconds or more (ALM-5; see [alarms](alarms.md)).                |
| Alarms       | Vibration                      | On      | Buzzes as each phase starts                                                    | Disabled, saying "This device can't vibrate", where it can't.                |
| Alarms       | Keep screen on                 | On      | Stops the phone locking mid-workout                                            | Disabled, saying "This browser can't keep the screen on", where it can't.    |
| Alarm sounds | Timed, Rest, Finish, Countdown | —       | Two short high beeps / One long low tone / Three rising notes / One short tick | A Play button for each.                                                      |

- **Your equipment** and **Only what I have** are saved with the settings too, but set on the Exercises page (see [exercises](exercises.md#the-exercises-list-exr-6)), not here.
- Changes are **saved at once** and apply at once, mid-workout too (e.g. turning sound off silences alarms already booked). The two Workouts settings are the exception: a workout keeps them as they were when it started, so its clock can't move, and the next one uses the new ones.
- **Play** plays that alarm straight away, even with Sound turned off (it was asked for), without touching any booked alarms.
- Switching theme **fades** from one to the other, unless reduced motion is on, when it changes at once. A tap mid-fade ends the fade and lands, so choosing again doesn't wait for it.
- The **switches** flip with a tap, or their knob can be dragged across, as on an iPhone: where it's let go (and which way it was flicked) decides. The knob swells as it's pressed and moves on a spring with no bounce. The pickers' highlights slide on the same spring.
- **About**, last on **Account**: the ∞ logo (also on the welcome screen), drawing itself in with a light travelling round it, and "Loop Workouts: build a workout, then let it loop.", then "Ideas, problems or questions? Email dan@loopworkouts.com", which opens a new email with the subject "Loop Workouts feedback", then links to the **Privacy notice** (`/privacy`) and **Terms of use** (`/terms`). Each slides in over Account, as an exercise's page does over its list, with ‹ Account at the top to go back (or a swipe right). The privacy notice says what's saved on the device and what leaves it (the hosting, Google Fonts, and, if you sign in, your email address to Supabase and to Resend for the sign-in email, and your workouts, history and exercises to Supabase for sync); questions go to dan@loopworkouts.com, and must change in the same PR as anything that stores more or sends anything off the device, such as sync.

## Acceptance criteria

- Given a first visit, then the theme is Dark and every switch is on.
- Given I choose Light and reload, then Light is still chosen.
- Given System is chosen and the device switches to dark, then the app does too.
- Given Sound is off, when I press Play on Rest, then the rest alarm plays.
- Given saved settings are broken, then the defaults are used.
- Given a first visit, then Countdown beeps is on; given I turn it off mid-workout, then the ticks still to come are silenced.
- Given weights in kg, when I choose Pounds, then a step saved at 61.235 kg shows as 135 lb on the workout and in setup.
- Given a first visit, then Account → Profile has Male chosen for Sex; given I choose Female and reload, then Female is still chosen.
- Given a first visit, then Account → Profile has Muscle chosen for Training for; given I choose Fitness, then the hint says 6 to 12 sets a week and the muscle bars' bands move down.

## Platform notes

- **Web:** `SettingsStore` (`src/app/shared/state/settings-store.service.ts`), `SettingsComponent` (`src/app/settings/`), `ThemeService`. Profile is `ProfileComponent` (`src/app/account/profile/`), and the About section is in `AccountComponent` (`src/app/account/`).
- **iOS:** `@AppStorage` for each setting. Settings is a `NavigationLink` row in the Account tab's `List`, so it pushes in with the system's back button and swipe. The theme maps onto `preferredColorScheme` (nil for System). Vibration would always be available on an iPhone, so its disabled state goes.
