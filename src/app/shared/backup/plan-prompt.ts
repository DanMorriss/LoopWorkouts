import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import {
    EQUIPMENT_CHOICES,
    MAX_EXERCISE_DESCRIPTION_LENGTH,
    MAX_EXERCISE_NAME_LENGTH,
    MAX_EXERCISE_STEPS,
    MAX_EXERCISE_TIPS,
    MuscleGroup,
    MUSCLE_LABELS,
} from '../../models/exercise';
import { MAX_WEIGHT_KG } from '../../models/weight';
import {
    MAX_HEADING_LENGTH,
    MAX_HEADINGS,
    MAX_REPEATS,
    MAX_REPS,
    MAX_STEP_SECONDS,
    MAX_STEPS,
    MAX_TIME_LIMIT_SECONDS,
} from '../../models/workout';
import { BACKUP_VERSION } from './backup-file';

/**
 * A prompt to give an AI with a workout plan (from a coach, a book or a spreadsheet), so it
 * writes a file Import can read: workouts with no ids, steps named after the built-in
 * exercises where they match, and exercises of your own only for the rest (see
 * docs/features/backup-and-sync.md). Made from the app's own limits and exercise list, so it
 * keeps up with them.
 */
export function planPrompt(): string {
    const muscles = (Object.keys(MUSCLE_LABELS) as MuscleGroup[]).join(', ');
    const builtIn = BUILT_IN_EXERCISES.map((exercise) =>
        exercise.otherNames.length > 0
            ? `${exercise.name} (${exercise.otherNames.join(', ')})`
            : exercise.name
    ).join('\n');
    const example = {
        app: 'Loop Workouts',
        version: BACKUP_VERSION,
        workouts: [
            {
                title: 'Day A: Legs',
                repeats: 1,
                blocks: [
                    { kind: 'heading', text: 'Warmup' },
                    {
                        kind: 'group',
                        rounds: 1,
                        restSeconds: 0,
                        steps: [{ kind: 'work', seconds: 60, name: 'Plank' }],
                    },
                    { kind: 'heading', text: 'Main sets' },
                    {
                        kind: 'group',
                        rounds: 3,
                        restSeconds: 90,
                        steps: [{ kind: 'reps', reps: 8, name: 'Back squat', weight: 60 }],
                    },
                    {
                        kind: 'group',
                        rounds: 3,
                        restSeconds: 60,
                        steps: [
                            {
                                kind: 'reps',
                                reps: 12,
                                name: 'Leg press',
                                weight: 40,
                                sets: [
                                    { reps: 12, weight: 40 },
                                    { reps: 10, weight: 45 },
                                    { reps: 8, weight: 50 },
                                ],
                            },
                        ],
                    },
                    {
                        kind: 'group',
                        rounds: 2,
                        restSeconds: 45,
                        steps: [{ kind: 'reps', reps: 10, name: 'Step-up', eachSide: true }],
                    },
                    {
                        kind: 'group',
                        rounds: 2,
                        restSeconds: 60,
                        steps: [{ kind: 'work', seconds: 45, name: 'Wall sit hold' }],
                    },
                    {
                        kind: 'group',
                        rounds: 3,
                        restSeconds: 60,
                        steps: [
                            { kind: 'reps', reps: 12, name: 'Leg extension', weight: 30 },
                            { kind: 'reps', reps: 12, name: 'Seated leg curl', weight: 30 },
                        ],
                    },
                ],
            },
        ],
        exercises: [
            {
                name: 'Wall sit hold',
                measuredBy: 'timed',
                equipment: [],
                mainMuscles: ['quads'],
                supportingMuscles: ['glutes'],
                description: 'Sit against a wall with your thighs level, and hold.',
                steps: ['Back flat against a wall.', 'Slide down until your knees are at 90°.'],
                tips: ['Keep your weight in your heels.'],
            },
        ],
    };

    return `I use Loop Workouts, a workout app. I'll give you a workout plan below. Please turn it into a JSON file that Loop Workouts can import, following these rules exactly.

THE FILE
Reply with one JSON object, in a code block, that I can paste into the app:
- "app": always "Loop Workouts"
- "version": always ${BACKUP_VERSION}
- "workouts": a list of workouts
- "exercises": a list of exercises that aren't built in (see below); leave it empty if every exercise is built in
Leave out ids and dates ("id", "updatedAt"): the app adds them.

A WORKOUT
- "title": its name, e.g. "Day A: Legs"
- "blocks": its exercises, in order, each as a group (below), up to ${MAX_STEPS} steps in all, with headings between them where the plan has them
- "repeats": how many times the whole workout runs, 1–${MAX_REPEATS}; or 0 for until stopped. Nearly always 1; more for a circuit done several times through.
- "timeLimitSeconds" (optional): for as many rounds of the whole workout as fit in a time, 1–${MAX_TIME_LIMIT_SECONDS} seconds. Only with "repeats": 0.
- "carryOn" (optional): true for a circuit timed to the second, e.g. Tabata, so a timed exercise after a rest of 30 seconds or more starts as the rest ends, rather than waiting for the user to press Start. Leave it out otherwise.
A workout needs at least one step that isn't rest.

A GROUP is one exercise and its sets: { "kind": "group", "rounds": 3, "restSeconds": 90, "steps": [one step] }
- "rounds": how many sets, 1–${MAX_REPEATS}
- "restSeconds": the rest after each set, 0–${MAX_STEP_SECONDS} seconds; it comes after the last set too, before the next exercise (not at the end of the workout, nor when a rest group comes next). 0 for none, or for one set.
- "steps": the one step it is, as below
So "3 × 8 squats, 90 seconds rest" is one group with "rounds": 3 and "restSeconds": 90. A rest between one exercise and the next is a group of one rest step, with "rounds": 1; after an exercise with sets, only for a rest unlike its rest between sets, as it takes that one's place. Something done once, e.g. a warm-up, is a group with "rounds": 1.
A SUPERSET (or giant set, or exercises paired as "A1/A2") is one group with two or more steps, done one after another each round, then the rest: "3 rounds of 12 leg extensions and 12 leg curls, 60 seconds rest" is one group with "rounds": 3, "restSeconds": 60 and both steps. A rest inside a round (e.g. 15 seconds between the two) is a rest step between them. Each step counts towards the ${MAX_STEPS}. Only for exercises the plan pairs up and does more than once; otherwise give each exercise a group of its own.

A HEADING is a label over the part of the workout after it, e.g. "Warmup" or "Upper body": { "kind": "heading", "text": "Warmup" }. Use the plan's own section titles, up to ${MAX_HEADINGS} of them, each up to ${MAX_HEADING_LENGTH} characters. Leave them out if the plan has none; they don't count as steps.

A STEP is one of:
- Reps: { "kind": "reps", "reps": 1–${MAX_REPS}, "name": "Bench press", "weight": 60 } — the app waits until I press Done. "weight" is optional, in kilograms (more than 0, up to ${MAX_WEIGHT_KG}); convert pounds (1 lb = 0.45359237 kg). Leave it out for bodyweight.
- Timed: { "kind": "work", "seconds": 1–${MAX_STEP_SECONDS}, "name": "Plank" } — a countdown, e.g. a hold or an interval.
- Rest: { "kind": "rest", "seconds": 1–${MAX_STEP_SECONDS}, "name": "" }
For sets that differ (e.g. a pyramid "12, 10, 8 at 40, 45, 50 kg", or warm-up sets), add "sets" to the step: one { "reps": 12, "weight": 40 } (reps steps) or { "seconds": 30 } (timed steps) for each of its group's rounds (a superset's rounds, for a step in one), in order, exactly as many as "rounds", and with the step's own "reps" and "weight" (or "seconds") set to the first set's. Leave it out when every set is the same, and for a group of one round.
For an exercise done one side at a time (e.g. "10 each leg", "30 seconds each side"), add "eachSide": true to its reps or timed step, with the reps or time for one side: the app runs all of one side's reps (or time), then all of the other's, in each set. It's only for exercises done that way, e.g. a step-up, a single-arm row or a side plank. Leave it out for an exercise whose sides take turns, rep by rep, even when the plan says "each side": e.g. a dead bug, a bird dog, a Russian twist, a bicycle crunch or a mountain climber. Count both sides' reps together for those, so "10 each side" is 20 reps, and say so under "Notes:". Leave it out otherwise too, and never put it on a rest.
Names are up to ${MAX_EXERCISE_NAME_LENGTH} characters. Write durations as whole seconds: 1:30 is 90.

EXERCISE NAMES
Name each step after a built-in exercise where one matches, spelled as below (other names it goes by are in brackets, but the first name is best):
${builtIn}

For anything not on the list, use a short, plain name, and add it to "exercises":
- "name": the same as on its steps
- "measuredBy": "reps" or "timed"
- "equipment": what it needs, any of: ${EQUIPMENT_CHOICES.join(', ')}; empty for nothing
- "mainMuscles" and "supportingMuscles": any of: ${muscles}
- "description" (optional): one or two sentences, up to ${MAX_EXERCISE_DESCRIPTION_LENGTH} characters
- "steps" (optional): up to ${MAX_EXERCISE_STEPS} short how-to steps; "tips" (optional): up to ${MAX_EXERCISE_TIPS}
Only describe it from the plan or well-known technique; leave out what you're unsure of.

AN EXAMPLE
${JSON.stringify(example, null, 2)}

If anything in the plan doesn't fit (e.g. a weight as a percentage of a max, or a range like 8–12 reps), pick a sensible value, e.g. the low end of a range, and list what you changed under the JSON, after a line saying "Notes:", so I can check it.

MY PLAN
`;
}
