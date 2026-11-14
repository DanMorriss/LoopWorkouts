# Calories

Built: an estimate of the calories each workout burnt, on its summary and in the history (CAL-1), from a body weight given in the setup or on You → Profile, kept on the device only (CAL-2). To come: the week's calories on Progress (CAL-3), how hard an exercise of your own is (CAL-4), and heart rate from a watch (CAL-5).

## Stories

- **CAL-1** As a user I want to see about how many calories a workout burnt, on its summary and in the history, so I have a sense of how much work it was.
- **CAL-2** As a user I want to give my body weight once, as I set up or on my profile, and have it kept on this device only, so the estimate is mine without my weight leaving my phone.
- **CAL-3** As a user I want to see the calories I've burnt in the last 7 days on Progress, beside the time I've spent.
- **CAL-4** As a user I want to say how hard an exercise of my own is, so its calories are closer than a general guess.
- **CAL-5** As a user with a watch I want the estimate to use my heart rate, so it's closer still.

## Rules

### What's asked (CAL-2)

- **Body weight** is all that's needed. Sex is asked already (SET-5) but isn't used: the estimate below doesn't depend on it. Age and height would only refine it a little (by correcting for resting metabolism), so they aren't asked.
- **It's optional.** With none given, no calories are shown anywhere, and nothing says they're missing. Taking it away (emptying the box) stops them showing again. There's no separate switch.
- **It stays on this device.** It's saved with this device's settings, not with the profile, so it isn't synced and doesn't go to the account: weight is health data under UK GDPR, which would need explicit consent to keep, as notes do (SYN-10). A device you sign in on asks for it on Profile, not in the setup (which it skips). It is in an exported backup, as the settings are, as that's your own file.
- **In the setup**, a sixth question, after the units, as it's asked in the unit just picked: **"What do you weigh?"**, "For an estimate of the calories each workout burns. It stays on this device, and you can leave it empty." A box, "Your weight", with the unit after it ("kg" or "lb"). Enter is Done, as it's the last question. The counts become "Question 1 of 6" and so on.
- **On You → Profile**, under Weight units: **Body weight**, the same box and unit, with the hint "For calories burnt. Kept on this device only".
- **The value:** a number in the unit chosen, to one decimal place (e.g. 72.5); saved in kg, as lifted weights are, so switching units loses nothing. It's saved as the box is left (or on Next or Done in the setup), and shown back as it's kept: whole numbers without a ".0", e.g. "72" or "72.5". From 20 kg to 300 kg (44 to 661 lb); anything outside that, or not a number, is taken as none and the box is emptied.

### The estimate (CAL-1)

- **Calories = MET × body weight in kg × hours**, added up over the parts of the run. A MET is how hard an activity is, against sitting still (1 MET is about 1 kcal per kg an hour), as listed by the Compendium of Physical Activities.
- **Each part of the run** (from the history entry's sets, `activeSeconds` and `repSeconds`; pauses never count):
    - **A timed set** (e.g. a plank, or 40 seconds of swings): its seconds, at its exercise's MET.
    - **The time on rep steps** (`repSeconds`): shared between the rep sets as the duration estimate guesses them (3 seconds a rep and 5 a set, see LIB-9), each share at its exercise's MET. A run from before 2026-11-14 has no `repSeconds`, so the guess itself is used.
    - **The rest of the time** (rests, Switch sides, unnamed steps, and anything else): at 1.5 METs, a little above sitting still, as breathing and heart rate are still up between sets.
    - Work time can't be more than the run's active time: if the sets' time adds up to more (a run from before `repSeconds`, guessed too long), the rep time is cut to fit.
- **Each exercise's MET** comes from its movement (see Swap in [exercises](exercises.md)), as exercises that move the same way work about as hard:

    | Movement                                                                                                                                      | MET | e.g.                     |
    | --------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------ |
    | Squat, lunge, hinge, bridge, horizontal and vertical push and pull, dip                                                                       | 5   | Back squat, push-up      |
    | Chest fly, lateral raise, rear delt, curl, triceps extension, shrug, leg extension, leg curl, calf raise, hip abduction, hip adduction, circle | 3.5 | Dumbbell curl            |
    | Core brace, side brace, core curl, core twist                                                                                                 | 3.8 | Plank, crunch            |
    | Hang                                                                                                                                          | 3   | Dead hang                |
    | Carry, whole body                                                                                                                             | 6   | Farmer's carry, thruster |
    | Jump, cardio                                                                                                                                  | 8   | Burpee, box jump         |
    | Stretch                                                                                                                                       | 2.3 | Child's pose             |

    With a few of their own, harder or easier than their movement: kettlebell swing and snatch 9.8, jumping jack 7.7, wall sit 3.5.

- **An exercise of your own**, or a set with no exercise found, is taken as 3.5, general resistance training, until CAL-4 lets you say otherwise.
- **The same run always gives the same number on a device**: it's worked out when shown, from the weight saved now, so a run done before the weight was given shows calories too, and changing the weight changes every run's.
- **It's an estimate.** It can be out by a quarter either way, and strength work burns less than people expect (an hour of lifting is about 300 to 400 kcal for 75 kg). The words say "about", and nothing in the app ties calories to losing weight (see the voice in [marketing](../marketing.md)).

### How it's shown (CAL-1)

- **Rounded** to the nearest 5 kcal; under 5, nothing's shown.
- **The workout summary** (RUN-7): a third stat beside Time and Rounds, **Calories**, "About 210 kcal", heard as "about 210 calories". Only with a body weight given and the run in the history.
- **The history** (HIS-1): each run's line under its title adds it last: "6:45 pm · 3 rounds · about 210 kcal", heard with "about 210 calories".

## Acceptance criteria

- Given a first visit, when I go through the setup, then question 6 of 6 is "What do you weigh?", in kg (or lb if I chose pounds), and Done goes to Today; given I type 72.5 and press Done, then You → Profile shows 72.5 kg under Body weight.
- Given I leave the weight empty in the setup, then no calories show on the summary or in the history.
- Given I type 160 in lb, then 72.6 kg is saved, and choosing Kilograms shows 72.6.
- Given 10 in kg, then it's emptied and none is saved.
- Given a body weight, then it isn't in the synced profile, and signing in on another device doesn't bring it.
- Given 75 kg and a run of 10 minutes of planks (timed sets, 600 seconds at 3.8 METs), then it's about 3.8 × 75 × 600 ÷ 3600 = 47.5, shown as "About 50 kcal".
- Given 80 kg and a run of 3 sets of 10 squats over 90 seconds of rep time, with 120 seconds of rest (210 active), then it's 5 × 80 × 90 ÷ 3600 + 1.5 × 80 × 120 ÷ 3600 = 10 + 4 = 14, "About 15 kcal".
- Given a run with no `repSeconds`, then its rep sets' time is guessed at 3 seconds a rep and 5 a set, cut to fit its active time.
- Given an exercise of my own, then its sets count at 3.5 METs.
- Given a body weight, when a workout finishes, then the summary shows Calories with "About … kcal"; given none, it shows only Time and Rounds.

## Platform notes

- **Web:** the estimate is `caloriesBurnt()` and `describeCalories()` in `src/app/models/calories.ts`, with each exercise's MET from `exerciseMet()` (from `BUILT_IN_MOVEMENTS` in `built-in-exercise-movements.ts`, and the exceptions in `MET_EXCEPTIONS`), and the rep sets' time shared out by `repSetSeconds()` from `workout-estimate.ts`. The body weight is `bodyWeight` in `SettingsStore` (kg, or null), not one of `PROFILE_FIELDS`; the box is `BodyWeightFieldComponent` (`src/app/shared/components/body-weight-field/`), in the setup and on Profile. The summary and the history entry use `CaloriesService` (`src/app/shared/state/calories.service.ts`), which gives null with no weight.
- **iOS:** the same estimate, until CAL-5: HealthKit's active energy for the workout, written by a watch, is closer, and the app could write its own estimate to HealthKit as a workout's energy, with permission.

## Open questions

- Whether to sync the weight with consent, as notes are (SYN-10), so it needn't be given on each device.
- Whether a rep's seconds should come from each set's own time, logged as it's done, rather than shared out by the guess.
