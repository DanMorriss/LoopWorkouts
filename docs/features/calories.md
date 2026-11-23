# Calories

Built: an estimate of the calories each workout burnt, on its summary and in the history (CAL-1), and each week's on Progress (CAL-3), and of the afterburn over the next day, on the summary (CAL-7), from a body weight given on You → Profile or on the summary itself (CAL-2), kept on the device unless you agree to keep it with your account (CAL-6). To come: how hard an exercise of your own is (CAL-4), and heart rate from a watch (CAL-5).

## Stories

- **CAL-1** As a user I want to see about how many calories a workout burnt, on its summary and in the history, so I have a sense of how much work it was.
- **CAL-2** As a user I want to give my body weight once, as I set up the app or later, and have it kept on this device only, so the estimate is mine without my weight leaving my phone; and not be asked again once I've given it.
- **CAL-3** As a user I want to see the calories I've burnt each week on Progress, beside the time I've spent.
- **CAL-4** As a user I want to say how hard an exercise of my own is, so its calories are closer than a general guess.
- **CAL-5** As a user with a watch I want the estimate to use my heart rate, so it's closer still.
- **CAL-7** As a user I want to see about how many more calories I'll burn over the next day as my body recovers, so I know the work doesn't stop counting when the workout does.
- **CAL-6** As a signed-in user I want to agree to keeping my body weight with my account, and withdraw that, so my other devices have it without my weight leaving my phone unless I say so.

## Rules

### What's asked (CAL-2)

- **Body weight** is all that's needed. Sex is asked already (SET-5) but isn't used: the estimate below doesn't depend on it. Age and height would only refine it a little (by correcting for resting metabolism), so they aren't asked.
- **It's optional.** With none given, no calories are shown anywhere, and nothing says they're missing. Taking it away (emptying the box) stops them showing again. There's no separate switch.
- **It stays on this device unless you agree otherwise.** It's saved with this device's settings, not with the profile, as weight is health data under UK GDPR, which needs explicit consent to keep with the account. Signed in, a tick on Profile gives that consent (CAL-6, below). It is in an exported backup, as the settings are, as that's your own file.
- **In the setup, last and optional** (since 2026-11-23): the seventh question, **What do you weigh?**, the same box in the unit just picked, with "For calories burnt. Kept on this device only. Leave it empty if you'd rather not say." Done with it empty gives none. Asked last, so the first six aren't held up by it, and optional, for how some people feel about being asked (Dan, 2026-11-23). From 2026-11-14 to then it wasn't asked in the setup at all, judged a cost before the first workout; for a day before that, it was the setup's sixth question, without saying it could be left.
- **Given once, not asked again.** With a weight given, wherever it was, the summary doesn't ask. It's also on Profile, and on the workout summary, which with no body weight given has **Add your weight to see calories** under its stats (a button that reads as a link). Pressing it puts the **Body weight** box there in its place, with focus in it, and the same hint as Profile's under it. Once a weight's given (on Enter, or on leaving the box), the box goes, the Calories stat (and the afterburn) appear, and focus goes to the stats, unless it was given by moving to something else. Anything not a weight empties the box, which stays. The run stays on the summary throughout. (Until 2026-11-23 the button ended the run and opened You on Body weight, so that run's calories were never seen on its summary.)
- **On You → Profile**, under Weight units: **Body weight**, the same box and unit, with the hint "For calories burnt. Kept on this device only" ("Kept with your account" with consent, CAL-6).
- **The value:** a number in the unit chosen, to one decimal place (e.g. 72.5); saved in kg, as lifted weights are, so switching units loses nothing. It's saved as the box is left (or on Next or Done in the setup), and shown back as it's kept: whole numbers without a ".0", e.g. "72" or "72.5". From 20 kg to 300 kg (44 to 661 lb); anything outside that, or not a number, is taken as none and the box is emptied.

### Keeping it with your account (CAL-6)

- **A consent of its own,** apart from notes' (SYN-10), so either can be given or withdrawn alone. Signed in, under Body weight's hint on Profile is a tick, unticked to begin with: "I agree that my body weight, which is health data, is kept with my account, so my other devices have it." Its whole line is its label, at least 44px tall. It shows once the account's answer is known (looked up on signing in, `my_body_weight_consent()`); signed out, or offline before it's known, there's no tick.
- **Ticking it** saves the consent with the account (`give_body_weight_consent()`), dated by the server's clock with the privacy notice's date, and under the tick says "Agreed on 14 November 2026. Untick to delete it from your account; it stays on this device." The hint becomes "For calories burnt. Kept with your account". The weight then syncs: one record, kind `body-weight`, id `me`, `{ kg, updatedAt }` (kg null for none given), the latest change winning, as the profile does. A weight from another device is taken if it's newer than this one's.
- **Unticking it** withdraws the consent (`withdraw_body_weight_consent()`): the server deletes the consent and the weight it kept, at once and for good, with no deletion left to sync. This device, and any other that had it, keep their own copy.
- **Either way, if it can't be saved** (offline, say), the tick goes back to how it was, and it says "That couldn't be saved. Check your connection and try again." While it's saving, the tick can't be pressed.
- **The server enforces it:** without the consent on record, `push_records()` leaves out a `body-weight` record, so a device that hasn't heard of a withdrawal can't put it back.
- **Signing out**, or deleting the account, removes the body weight from the device if it was kept with the account, as the account's name is. Otherwise it stays, as it was this device's.
- **The setup** doesn't ask for the consent: a device that's set up from the account's profile has the weight too, if it was kept.

### The estimate (CAL-1)

- **Calories = MET × body weight in kg × hours**, added up over the parts of the run. A MET is how hard an activity is, against sitting still (1 MET is about 1 kcal per kg an hour), as listed by the Compendium of Physical Activities. The values are taken at the vigorous end of its ranges, as a workout here is sets with short rests rather than a lift now and then, and to be in line with other fitness apps (Dan, 2026-11-23; until then they were at the moderate end, and a 26-minute Kettlebell full body at 90 kg came to about 140 kcal rather than 195).
- **Each part of the run** (from the history entry's sets, `activeSeconds` and `repSeconds`; pauses never count):
    - **A timed set** (e.g. a plank, or 40 seconds of swings): its seconds, at its exercise's MET.
    - **The time on rep steps** (`repSeconds`): shared between the rep sets as the duration estimate guesses them (3 seconds a rep and 5 a set, see LIB-9), each share at its exercise's MET. A run from before 2026-11-14 has no `repSeconds`, so the guess itself is used.
    - **The rest of the time** (rests, Switch sides, unnamed steps, and anything else): at 2.5 METs, well above sitting still, as breathing and heart rate are still up between sets.
    - Work time can't be more than the run's active time: if the sets' time adds up to more (a run from before `repSeconds`, guessed too long), the rep time is cut to fit.
- **Each exercise's MET** comes from its movement (see Swap in [exercises](exercises.md)), as exercises that move the same way work about as hard:

    | Movement                                                                                                                                       | MET | e.g.                     |
    | ---------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------ |
    | Squat, lunge, hinge, bridge, horizontal and vertical push and pull, dip                                                                        | 6   | Back squat, push-up      |
    | Chest fly, lateral raise, rear delt, curl, triceps extension, shrug, leg extension, leg curl, calf raise, hip abduction, hip adduction, circle | 4   | Dumbbell curl            |
    | Core brace, side brace, core curl, core twist                                                                                                  | 4   | Plank, crunch            |
    | Hang                                                                                                                                           | 3   | Dead hang                |
    | Carry, whole body                                                                                                                              | 8   | Farmer's carry, thruster |
    | Jump, cardio                                                                                                                                   | 8   | Burpee, box jump         |
    | Stretch                                                                                                                                        | 2.3 | Child's pose             |

    With a few of their own, harder or easier than their movement: kettlebell swing and snatch 9.8, jumping jack 7.7, wall sit 4. An exercise done only with a kettlebell (a floor press, a halo, a Turkish get-up) is at least 8, the Compendium's vigorous circuit training with kettlebells; one done with a dumbbell or a kettlebell, such as a goblet squat, is its movement's.

- **An exercise of your own**, or a set with no exercise found, is taken as 5, resistance training between moderate and vigorous, until CAL-4 lets you say otherwise.
- **The same run always gives the same number on a device**: it's worked out when shown, from the weight saved now, so a run done before the weight was given shows calories too, and changing the weight changes every run's.
- **It's an estimate.** It can be out by a quarter either way. The words say "about", and nothing in the app ties calories to losing weight (see the voice in [marketing](../marketing.md)).

### The afterburn (CAL-7)

- **After a workout the body uses more than it would at rest for a while** as it recovers (excess post-exercise oxygen consumption, EPOC). After strength and circuit work, studies put it at about 6 to 15% of the workout's energy above resting, most of it in the first few hours, tailing off over about a day (Børsheim and Bahr, 2003, *Sports Medicine*). Other fitness apps quote the top of that or more; this takes the top, 15% (Dan, 2026-11-23), and no higher, as above it the studies don't back it.
- **Afterburn = 15% × (the workout's calories − its resting share)**, where the resting share is 1 MET × body weight × its active hours. So 45 minutes of circuits at an average of 5 METs and 80 kg is 300 kcal, 60 of it resting, and an afterburn of 36, shown as "about 35 kcal".
- **Said as over the next day**, not a number of hours, as how long it lasts varies with how hard the work was.
- **Said as an estimate,** with the same rounding and "about" as the workout's calories. It's not added to the workout's own figure, nor to the history's.

### How it's shown (CAL-1, CAL-7)

- **Rounded** to the nearest 5 kcal; under 5, nothing's shown.
- **The workout summary** (RUN-7): a third stat beside Time and Rounds, **Calories**, "About 210 kcal", heard as "about 210 calories". Only with a body weight given and the run in the history.
- **Under the summary's stats**, with Calories shown: "Plus about 25 kcal over the next day, as your body recovers", heard with "Plus about 25 calories". Under 5, nothing's shown, which is the case for most runs under about 10 minutes.
- **Progress, each week** (CAL-3, since 2026-11-23): in the Time per week card (PRG-12), beside each week's time, with its workouts' calories added up before rounding: over the bars, "2–8 Nov · 2 workouts · about 260 kcal" (heard "…, about 260 calories"), and the table has a **Calories** column, "about 260 kcal", "under 5 kcal" for a week whose total is under 5, or "0 kcal" with no workouts. The weeks are Monday to Sunday, as the bars are, not the last 7 days, so the two agree. Without a body weight, neither shows. The afterburn isn't added.
- **The history** (HIS-1): each run's line under its title adds it last: "6:45 pm · 3 rounds · about 210 kcal", heard with "about 210 calories".

## Acceptance criteria

- Given a first visit, then the setup's last question (7 of 7) is What do you weigh?, in the unit picked before it; given 72.5 and Enter, then it's saved and Today opens; given nothing and Done, then none is saved, and the first summary offers Add your weight to see calories.
- Given no body weight, when a workout finishes, then the summary has no Calories, and has Add your weight to see calories; when I press it, then the Body weight box is there with focus in it, "Kept on this device only" under it; when I type 75 and press Enter, then the box goes, the summary shows Calories with focus on its stats, and the run's still on the summary. Given I leave the summary without one, then the history shows no calories.
- Given I type 72.5 in Body weight, then it's saved, and the summary shows Calories, not Add your weight.
- Given I type 160 in lb, then 72.6 kg is saved, and choosing Kilograms shows 72.6.
- Given 10 in kg, then it's emptied and none is saved.
- Given a body weight, then it isn't in the synced profile, and without consent signing in on another device doesn't bring it.
- Given I'm signed out, then Profile has no tick to keep it with an account.
- Given I'm signed in, when I tick to keep it, then the consent is saved under the notice's date, Profile says "Agreed on …", the hint says "Kept with your account", and the weight is sent; when I untick it, the consent is withdrawn and the hint says "Kept on this device only".
- Given the consent can't be saved, then the tick goes back, saying "That couldn't be saved."
- Given the account kept the weight, when I sign out, then it's gone from the device; given it didn't, it stays.
- Given 75 kg and a run of 10 minutes of planks (timed sets, 600 seconds at 4 METs), then it's 4 × 75 × 600 ÷ 3600 = 50, shown as "About 50 kcal".
- Given 80 kg and a run of 3 sets of 10 squats over 90 seconds of rep time, with 120 seconds of rest (210 active), then it's 6 × 80 × 90 ÷ 3600 + 2.5 × 80 × 120 ÷ 3600 = 12 + 6.7 = 18.7, "About 20 kcal".
- Given a run with no `repSeconds`, then its rep sets' time is guessed at 3 seconds a rep and 5 a set, cut to fit its active time.
- Given an exercise of my own, then its sets count at 5 METs; given a kettlebell floor press, at 8.
- Given a body weight, when a workout finishes, then the summary shows Calories with "About … kcal"; given none, it shows only Time and Rounds.
- Given 72 kg and two workouts this week with no sets, 30 and 56½ minutes (2.5 METs), then Time per week says "2–8 Nov · 2 workouts · about 260 kcal", and the table's Calories says "about 260 kcal"; given a week of 20 seconds, "under 5 kcal". Given no body weight, then neither says calories, and the table has no Calories column.
- Given 300 kg and a run of 20 minutes of unnamed steps (2.5 METs), then it's 250 kcal, 100 of it resting, and the afterburn is 22.5, "Plus about 25 kcal over the next day, as your body recovers". Given 5 minutes of planks at 75 kg (afterburn 2.8), then there's no afterburn line.

## Platform notes

- **Web:** the estimate is `caloriesBurnt()` and `describeCalories()` in `src/app/models/calories.ts`, with each exercise's MET from `exerciseMet()` (from `BUILT_IN_MOVEMENTS` in `built-in-exercise-movements.ts`, the exceptions in `MET_EXCEPTIONS`, and kettlebell-only exercises at `KETTLEBELL_MET`), and the rep sets' time shared out by `repSetSeconds()` from `workout-estimate.ts`. The body weight is `bodyWeight` in `SettingsStore` (kg, or null), dated by `bodyWeightUpdatedAt` and given to sync as `bodyWeightRecord()`, not one of `PROFILE_FIELDS`; sync sends it only while `ConsentService.weightGiven()` (`SyncService.keptBodyWeight()`), and `mergeBodyWeight()` takes another device's. The consent is `ConsentService` (`giveWeight()`, `withdrawWeight()`), through `AccountService.keepBodyWeight()`, shown by `BodyWeightConsentComponent` (`src/app/account/profile/`), and kept in the `body_weight_consents` table (`supabase/schema.sql`), with the tick's look shared with notes' (`styles/_consent.scss`); the box is `WeightFieldComponent` (`kind="body"`). The summary, the history entry and Time per week (`TimePerWeekComponent`, adding up with `timePerWeek()`'s `burnt` through `CaloriesService.burning()`) use `CaloriesService` (`src/app/shared/state/calories.service.ts`), which gives null with no weight; the summary's afterburn is its `describeAfterburn()`, from `afterburn()` in `calories.ts` (`AFTERBURN_SHARE`). The box is shared (`src/app/shared/components/weight-field/`), used by Profile, the setup (`SetupComponent`) and the summary's `SummaryStatsComponent`, which all take their hint from `bodyWeightHint()`.
- **iOS:** the same estimate, until CAL-5: HealthKit's active energy for the workout, written by a watch, is closer, and the app could write its own estimate to HealthKit as a workout's energy, with permission.

## Open questions

- Whether the afterburn should depend on how hard the work was (a bigger share after heavy lifting or intervals, less after light circuits), rather than a flat 15%.
- Whether a rep's seconds should come from each set's own time, logged as it's done, rather than shared out by the guess.
