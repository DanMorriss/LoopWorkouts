# Writing the built-in exercises

How the exercises that come with Loop Workouts are written, and which are still to write. This is for whoever writes the next batch, a person or an agent (`.claude/agents/exercise-writer.md`). What the app does with them is in [features/exercises](features/exercises.md).

## Where they go

- The exercises: `src/app/models/built-in-exercises.ts`, one batch of 10 at a time, added to the end of the list under a comment saying what the batch is, e.g. `// Fourth batch: core, carries and variations`.
- Their words (`description`, `steps` and `tips`): `src/app/models/built-in-exercise-text.ts`, under each one's id, in the same order and under the same batch comment. They're kept apart so they aren't in the app's first download.
- Their shape: `BuiltInExercise` and `ExerciseText` in `src/app/models/exercise.ts`.
- How they move, for their animated demos (EXR-13): `src/app/models/built-in-exercise-motion.ts`, under each one's id, written as `exercise-motion.ts` explains. Every built-in exercise has one, so a new one needs one too; a test checks. Look at it drawn before raising it, in 3D and turned round (see [exercises](features/exercises.md)): a flat pose can look right from the side and wrong from the front. `tools/shoot-demos.mjs` screenshots demos from `ng serve --port 4300`, turned round if asked.
- The rules below that can be checked are checked by `src/app/models/built-in-exercises.spec.ts`. Run it after every batch.

## Each field

| Field               | Rule                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                | `builtin:` and the name in kebab case, e.g. `builtin:bulgarian-split-squat`. **Never changes once merged**: history points to it.                                                                                                    |
| `name`              | The commonest gym name, in sentence case: "Romanian deadlift", "Push-up". Singular: "Dip", not "Dips".                                                                                                                               |
| `otherNames`        | Other names people really use, and spellings ("Pull up", "Pullup"). Not vague ones that could mean another exercise ("Curl", "Row", "Press"). May be empty. No two exercises share a name, ignoring case and a plural "s".           |
| `equipment`         | **Everything it needs, all of it**, so people can filter by what they have. A choice where any one will do: `[['dumbbells', 'kettlebell']]`. `['none']` for nothing. Plates and a floor are taken for granted. Must match the steps. |
| `measuredBy`        | `'reps'`, or `'timed'` for anything held or done for a time (plank, wall sit, carries, most conditioning moves).                                                                                                                     |
| `mainMuscles`       | The 1–3 muscle groups doing most of the work. At least one.                                                                                                                                                                          |
| `supportingMuscles` | Up to 4 that help or hold steady. May be empty for a move that really works one muscle (leg extension). Never one that's also main.                                                                                                  |
| `description`       | One or two sentences, at most 140 characters: **what it is**, then **why do it**.                                                                                                                                                    |
| `steps`             | 3–5, in order: set up, do it, go back. Each a sentence or two, at most 140 characters.                                                                                                                                               |
| `tips`              | 1 or 2, each at most 140 characters: the commonest mistake, or how to make it easier or harder.                                                                                                                                      |

Equipment is one of: `barbell`, `dumbbells`, `kettlebell`, `bench`, `preacher bench`, `rack`, `smith machine`, `pull-up bar`, `parallel bars`, `rings` (or suspension straps), `cable`, `machine` (a dedicated gym machine), `band`, `step` (a box, step or stair), `ab wheel`, `none`. If an exercise truly needs something else, add it to `Equipment` and `EQUIPMENT_CHOICES` to `Equipment` in `exercise.ts` and to the list in [features/exercises](features/exercises.md#the-built-in-list-exr-6-exr-7), in the same batch.

Muscle groups are the 18 in `MuscleGroup`, the shapes on the body map. There are no separate front, side or rear shoulders, and no lats: use `shoulders` and `upper-back`.

## The voice

Read the first 30 before writing; new ones should sound the same.

- **In our own words.** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) is a reference for which exercises exist and roughly which muscles they work. Check its muscles by hand (it calls glutes only supporting in a back squat); never copy or lightly reword its text.
- **Plain, short and spoken to the reader:** "Push through your whole foot to stand back up." Readable between sets, on a phone.
- **British English:** "towards", "colour", "programme".
- **No jargon without its meaning.** Say "brace your middle", not "engage your core"; "the backs of your shoulders", not "posterior deltoids".
- **No hype, no medical claims, no exclamation marks, no emoji.** "Great for hamstrings" is fine; "burns fat" or "fixes back pain" isn't.
- Name body parts as the app does: quads, glutes, hamstrings, upper back, lower back, abs.

An example to match, in `built-in-exercises.ts`:

```ts
{
    id: 'builtin:romanian-deadlift',
    name: 'Romanian deadlift',
    otherNames: ['RDL', 'Stiff-leg deadlift'],
    equipment: ['barbell'],
    measuredBy: 'reps',
    mainMuscles: ['hamstrings', 'glutes'],
    supportingMuscles: ['lower-back', 'forearms'],
},
```

and in `built-in-exercise-text.ts`:

```ts
'builtin:romanian-deadlift': {
    description:
        'From standing, you lower a bar down your legs by pushing your hips back, then stand back up. Great for hamstrings.',
    steps: [
        'Stand tall holding the bar in front of your thighs, hands just outside your legs.',
        'With your knees slightly bent, push your hips back and let the bar slide down your legs.',
        'Go down until you feel a strong stretch in your hamstrings, usually just below your knees.',
        'Push your hips forward to stand back up.',
    ],
    tips: ["It's a hip movement, not a squat: your knees barely bend more as you go down."],
},
```

## A batch, start to finish

1. Branch from the latest `main`: `exercise-list-batch-<n>`. Don't build on an unmerged batch; wait for the last one to merge.
2. Write the next unticked batch from the backlog below, in its order. If one turns out to be a duplicate of an existing exercise, or too niche, swap in a similar common one and say so in the PR.
3. Tick the batch off in the backlog, and update the count in `TODO.md` ("Write the built-in exercise list").
4. Check: `npm run format`, then `npm run format:check`, `npx ng test --watch=false` and `npx ng build` must all pass.
5. Commit, push, and raise a PR against `main` with `gh pr create`: a summary, a table of each exercise's main and supporting muscles, equipment and measured by, anything swapped or added (e.g. new equipment), and the test results. Watch CI with `gh pr checks <n> --watch`.
6. Stop there: Dan reviews each batch before the next is written.

## Backlog

97 written (batches 1–9). The list is complete for now; more can be added at the end of the backlog.

- [x] **Batch 4, core, carries and variations:** side plank, dead bug, Russian twist, farmer's carry, sumo deadlift, Bulgarian split squat, step-up, hammer curl, skull crusher, glute bridge
- [x] **Batch 5, chest, shoulders and arms:** dumbbell bench press, incline bench press, close-grip bench press, dumbbell fly, cable crossover, Arnold press, rear delt fly, shrug, preacher curl, overhead triceps extension
- [x] **Batch 6, legs:** hack squat, walking lunge, reverse lunge, single-leg Romanian deadlift, good morning, back extension, Nordic curl, seated calf raise, hip abduction machine, hip adduction machine
- [x] **Batch 7, back, pulling and bodyweight pushing:** inverted row, T-bar row, straight-arm pulldown, rack pull, band pull-apart, cable curl, bench dip, diamond push-up, pike push-up, dead hang
- [x] **Batch 8, conditioning and abs:** burpee, mountain climber, jumping jack, jump squat, box jump, bodyweight squat, wall sit, crunch, bicycle crunch, ab wheel rollout
- [x] **Batch 9, kettlebells (17, asked for by Dan):** kettlebell thruster, kettlebell clean and press, kettlebell snatch, kettlebell pistol squat, kettlebell floor press, Turkish get-up, kettlebell sumo high pull, chainsaw row, kettlebell reverse crunch, plank pull-through, half-kneeling kettlebell press, kettlebell halo, kettlebell around the world, kettlebell push-up, and kettlebell takes on dumbbell exercises: kettlebell lunge, kettlebell curl, kettlebell press
