import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { EquipmentNeed, Exercise } from './exercise';
import {
    Block,
    RepSetAmount,
    RepStep,
    Step,
    StepGroup,
    TimedStep,
    UNTIL_STOPPED,
    WorkoutFields,
    allSteps,
} from './workout';

/**
 * What a ready-made workout's built around, by what it needs. They were listed in these groups
 * on a page of their own until 2026-11-06; they're A to Z with yours now.
 */
export type BuiltInWorkoutGroup = 'bodyweight' | 'kettlebell' | 'dumbbells' | 'gym' | 'other';

/**
 * A workout that comes with the app (LIB-6): never saved as it is, but copied into the
 * library, where it's yours to start, change or plan. Its steps are built-in exercises, with
 * no weights, as everyone's are their own.
 */
export interface BuiltInWorkout extends WorkoutFields {
    /** Fixed for good: `builtin:<title-in-kebab-case>`. */
    id: `builtin:${string}`;
    /** One line: what it is, and who or what it's for. */
    description: string;
    group: BuiltInWorkoutGroup;
}

/** A built-in exercise's step name, by its id without `builtin:`. */
function exercise(id: string): { name: string; exerciseId: string } {
    const found = BUILT_IN_EXERCISES.find((e) => e.id === `builtin:${id}`);
    if (!found) {
        throw new Error(`No built-in exercise ${id}`);
    }
    return { name: found.name, exerciseId: found.id };
}

/** A rep step: `reps('push-up', 10)`, or `reps('reverse-lunge', 8, { eachSide: true })`. */
function reps(id: string, count: number, options: { eachSide?: true } = {}): RepStep {
    return { kind: 'reps', reps: count, ...exercise(id), ...options };
}

/** A rep step whose sets vary, e.g. 12, 10, 8: its group needs as many rounds. */
function repsEachSet(id: string, counts: number[]): RepStep {
    const sets: RepSetAmount[] = counts.map((count) => ({ reps: count }));
    return { kind: 'reps', reps: counts[0], ...exercise(id), sets };
}

/** A timed step: `timed('plank', 30)`. */
function timed(id: string, seconds: number, options: { eachSide?: true } = {}): TimedStep {
    return { kind: 'work', seconds, ...exercise(id), ...options };
}

function rest(seconds: number): StepGroup {
    return {
        kind: 'group',
        rounds: 1,
        restSeconds: 0,
        steps: [{ kind: 'rest', seconds, name: '' }],
    };
}

/** An exercise and its sets, with the rest after each: `sets(3, 60, reps('goblet-squat', 10))`. */
function sets(rounds: number, restSeconds: number, step: Step): StepGroup {
    return { kind: 'group', rounds, restSeconds: rounds > 1 ? restSeconds : 0, steps: [step] };
}

/** A step done once a round, straight after the last, as in a circuit. */
function once(step: Step): StepGroup {
    return sets(1, 0, step);
}

/** A superset (or giant set, of three or more) and its rounds, with the rest after each. */
function superset(rounds: number, restSeconds: number, ...steps: Step[]): StepGroup {
    return { kind: 'group', rounds, restSeconds, steps };
}

function heading(text: string): Block {
    return { kind: 'heading', text };
}

/**
 * The ready-made workouts, in the order they're listed in each group. Ids never change once
 * released. In batches; each reviewed before the next is written.
 */
export const BUILT_IN_WORKOUTS: readonly BuiltInWorkout[] = [
    {
        id: 'builtin:bodyweight-basics',
        title: 'Bodyweight basics',
        description: 'A full-body circuit to start with: legs, push, glutes and core, three times.',
        group: 'bodyweight',
        repeats: 1,
        blocks: [
            superset(
                3,
                90,
                reps('bodyweight-squat', 15),
                reps('push-up', 10),
                reps('reverse-lunge', 8, { eachSide: true }),
                reps('glute-bridge', 15),
                timed('plank', 30)
            ),
        ],
    },
    {
        id: 'builtin:20-minute-amrap',
        title: '20-minute AMRAP',
        description: 'As many rounds as you can in 20 minutes. Rest when you need to.',
        group: 'bodyweight',
        repeats: UNTIL_STOPPED,
        timeLimitSeconds: 20 * 60,
        blocks: [
            once(reps('burpee', 5)),
            once(reps('push-up', 10)),
            once(reps('jump-squat', 15)),
            once(timed('mountain-climber', 30)),
        ],
    },
    {
        id: 'builtin:cardio-intervals',
        title: 'Cardio intervals',
        description: '40 seconds on, 20 off, four moves, three rounds. About 12 minutes.',
        group: 'bodyweight',
        repeats: 3,
        blocks: [
            once(timed('jumping-jack', 40)),
            rest(20),
            once(timed('burpee', 40)),
            rest(20),
            once(timed('mountain-climber', 40)),
            rest(20),
            once(timed('jump-squat', 40)),
            rest(60),
        ],
    },
    // Second batch (2026-11-03): more for fitness, a two-day dumbbell split, a first gym
    // workout, the small muscles, and kit that had none (a pull-up bar, dip bars, a step)
    {
        id: 'builtin:tabata',
        title: 'Tabata',
        description: 'Four moves, each 8 rounds of 20 seconds hard and 10 easy. About 20 minutes.',
        group: 'bodyweight',
        repeats: 1,
        blocks: [
            sets(8, 10, timed('jump-squat', 20)),
            rest(60),
            sets(8, 10, timed('mountain-climber', 20)),
            rest(60),
            sets(8, 10, timed('burpee', 20)),
            rest(60),
            sets(8, 10, timed('jumping-jack', 20)),
        ],
    },
    {
        id: 'builtin:core-in-15',
        title: 'Core in 15',
        description: 'Abs, obliques and holds, three rounds, in about 15 minutes.',
        group: 'bodyweight',
        repeats: 1,
        blocks: [
            superset(
                3,
                60,
                reps('dead-bug', 10),
                reps('crunch', 15),
                reps('bicycle-crunch', 20),
                timed('side-plank', 30, { eachSide: true }),
                timed('plank', 45)
            ),
        ],
    },
    {
        id: 'builtin:kettlebell-full-body',
        title: 'Kettlebell full body',
        description: 'Squat, swing, press and row with one kettlebell, then a carry to finish.',
        group: 'kettlebell',
        repeats: 1,
        blocks: [
            heading('Warmup'),
            once(reps('kettlebell-halo', 8)),
            heading('Main'),
            sets(3, 60, reps('goblet-squat', 10)),
            sets(3, 60, reps('kettlebell-swing', 15)),
            sets(3, 60, reps('kettlebell-press', 8, { eachSide: true })),
            sets(3, 60, reps('chainsaw-row', 10, { eachSide: true })),
            sets(2, 60, timed('farmers-carry', 45)),
        ],
    },
    {
        id: 'builtin:kettlebell-swing-ladder',
        title: 'Kettlebell swing ladder',
        description:
            'Swings up a ladder and back down: 10, 15, 20, 25, 20, 15, 10. A quick finisher.',
        group: 'kettlebell',
        repeats: 1,
        blocks: [sets(7, 45, repsEachSet('kettlebell-swing', [10, 15, 20, 25, 20, 15, 10]))],
    },
    {
        id: 'builtin:kettlebell-amrap',
        title: 'Kettlebell AMRAP',
        description:
            'As many rounds as you can in 15 minutes: thrusters, swings, rows, pull-throughs.',
        group: 'kettlebell',
        repeats: UNTIL_STOPPED,
        timeLimitSeconds: 15 * 60,
        blocks: [
            once(reps('kettlebell-thruster', 8)),
            once(reps('kettlebell-swing', 15)),
            once(reps('chainsaw-row', 8, { eachSide: true })),
            once(reps('plank-pull-through', 10)),
        ],
    },
    {
        id: 'builtin:dumbbell-full-body',
        title: 'Dumbbell full body',
        description: 'Every main muscle with a pair of dumbbells and a bench, finishing on arms.',
        group: 'dumbbells',
        repeats: 1,
        blocks: [
            sets(3, 90, reps('goblet-squat', 12)),
            sets(3, 90, reps('dumbbell-bench-press', 10)),
            sets(3, 60, reps('dumbbell-row', 10, { eachSide: true })),
            sets(3, 60, reps('single-leg-romanian-deadlift', 8, { eachSide: true })),
            sets(3, 60, reps('dumbbell-shoulder-press', 10)),
            superset(3, 60, reps('dumbbell-curl', 10), reps('skull-crusher', 12)),
        ],
    },
    {
        id: 'builtin:dumbbell-upper',
        title: 'Dumbbell upper',
        description: 'Chest, back, shoulders and arms. Pairs with Dumbbell lower over the week.',
        group: 'dumbbells',
        repeats: 1,
        blocks: [
            sets(3, 90, reps('dumbbell-bench-press', 10)),
            sets(3, 90, reps('dumbbell-row', 10, { eachSide: true })),
            sets(3, 60, reps('arnold-press', 10)),
            superset(3, 60, reps('lateral-raise', 12), reps('rear-delt-fly', 12)),
            superset(3, 60, reps('hammer-curl', 10), reps('overhead-triceps-extension', 12)),
        ],
    },
    {
        id: 'builtin:dumbbell-lower',
        title: 'Dumbbell lower',
        description: 'Legs, glutes, grip and core. Pairs with Dumbbell upper over the week.',
        group: 'dumbbells',
        repeats: 1,
        blocks: [
            sets(3, 90, reps('goblet-squat', 12)),
            sets(3, 90, reps('bulgarian-split-squat', 8, { eachSide: true })),
            sets(3, 60, reps('single-leg-romanian-deadlift', 8, { eachSide: true })),
            sets(3, 60, reps('glute-bridge', 15)),
            sets(2, 60, timed('farmers-carry', 45)),
            superset(3, 45, timed('side-plank', 30, { eachSide: true }), reps('dead-bug', 10)),
        ],
    },
    {
        id: 'builtin:gym-push',
        title: 'Gym push',
        description: 'Chest, shoulders and triceps: two heavy lifts, then lighter work.',
        group: 'gym',
        repeats: 1,
        blocks: [
            heading('Main lifts'),
            sets(4, 120, reps('bench-press', 8)),
            sets(3, 120, reps('overhead-press', 8)),
            heading('Accessories'),
            sets(3, 90, reps('incline-dumbbell-press', 10)),
            superset(3, 60, reps('lateral-raise', 12), reps('triceps-pushdown', 12)),
        ],
    },
    {
        id: 'builtin:gym-pull',
        title: 'Gym pull',
        description: 'Back and biceps: a heavy deadlift, then pulldowns, rows and curls.',
        group: 'gym',
        repeats: 1,
        blocks: [
            heading('Main lifts'),
            sets(3, 150, reps('deadlift', 5)),
            sets(3, 90, reps('lat-pulldown', 10)),
            heading('Accessories'),
            sets(3, 90, reps('seated-cable-row', 10)),
            superset(3, 60, reps('face-pull', 15), reps('dumbbell-curl', 10)),
        ],
    },
    {
        id: 'builtin:gym-legs',
        title: 'Gym legs',
        description: 'Squats getting heavier each set (12, 10, 8), then hamstrings and calves.',
        group: 'gym',
        repeats: 1,
        blocks: [
            heading('Main lifts'),
            sets(3, 150, repsEachSet('back-squat', [12, 10, 8])),
            sets(3, 120, reps('romanian-deadlift', 10)),
            heading('Accessories'),
            sets(3, 90, reps('leg-press', 12)),
            superset(3, 60, reps('leg-curl', 12), reps('seated-calf-raise', 15)),
        ],
    },
    {
        id: 'builtin:gym-full-body',
        title: 'Gym full body',
        description: 'A first gym workout: machines and dumbbells for every main muscle.',
        group: 'gym',
        repeats: 1,
        blocks: [
            sets(3, 90, reps('leg-press', 10)),
            sets(3, 90, reps('dumbbell-bench-press', 10)),
            sets(3, 90, reps('lat-pulldown', 10)),
            sets(3, 60, reps('leg-curl', 12)),
            sets(3, 60, reps('dumbbell-shoulder-press', 10)),
            sets(2, 45, timed('plank', 30)),
        ],
    },
    {
        id: 'builtin:gym-extras',
        title: 'Gym extras',
        description: 'Hips, calves, lower back and grip: the muscles the big lifts leave out.',
        group: 'gym',
        repeats: 1,
        blocks: [
            superset(3, 60, reps('hip-abduction', 15), reps('hip-adduction', 15)),
            sets(3, 60, reps('back-extension', 12)),
            sets(3, 60, reps('seated-calf-raise', 15)),
            superset(3, 60, reps('shrug', 12), timed('farmers-carry', 40)),
        ],
    },
    {
        id: 'builtin:pull-up-bar-and-dips',
        title: 'Pull-up bar and dips',
        description:
            'Pull-ups, dips and leg raises: upper body and core on a pull-up bar and dip bars.',
        group: 'other',
        repeats: 1,
        blocks: [
            sets(4, 120, reps('pull-up', 6)),
            sets(3, 120, reps('dip', 8)),
            sets(3, 90, reps('chin-up', 6)),
            sets(2, 60, reps('diamond-push-up', 10)),
            superset(3, 60, reps('hanging-leg-raise', 10), timed('dead-hang', 30)),
        ],
    },
    {
        id: 'builtin:step-circuit',
        title: 'Step circuit',
        description:
            'Step-ups, box jumps and calf raises on a step or box, four rounds, for fitness.',
        group: 'other',
        repeats: 1,
        blocks: [
            superset(
                4,
                90,
                reps('step-up', 10, { eachSide: true }),
                reps('box-jump', 8),
                reps('calf-raise', 15),
                reps('push-up', 10),
                timed('mountain-climber', 30)
            ),
        ],
    },
    {
        id: 'builtin:band-full-body',
        title: 'Band full body',
        description: 'Every main muscle with resistance bands and a post or door anchor to tie to.',
        group: 'other',
        repeats: 1,
        blocks: [
            heading('Warmup'),
            once(reps('band-pull-apart', 15)),
            heading('Main'),
            sets(3, 60, reps('band-squat', 12)),
            sets(3, 60, reps('band-row', 12)),
            sets(3, 60, reps('band-chest-press', 12)),
            sets(3, 60, reps('band-overhead-press', 10)),
            superset(
                3,
                60,
                reps('band-pull-through', 12),
                reps('band-lateral-walk', 10, { eachSide: true })
            ),
            superset(3, 45, reps('band-curl', 12), reps('band-triceps-pushdown', 12)),
            superset(
                3,
                45,
                reps('band-face-pull', 15),
                reps('pallof-press', 10, { eachSide: true })
            ),
        ],
    },
    // Third batch (2026-11-12): mobility, of the tenth batch's stretches, for the ready-made
    // plans' days between training. Each move once, in an order that keeps getting up and
    // down to a minimum
    {
        id: 'builtin:mobility-flow',
        title: 'Mobility flow',
        description: 'Ten minutes of slow moves and holds to loosen your back, hips and shoulders.',
        group: 'bodyweight',
        repeats: 1,
        blocks: [
            once(timed('cat-cow', 60)),
            once(reps('thread-the-needle', 5, { eachSide: true })),
            once(timed('downward-dog', 45)),
            once(reps('worlds-greatest-stretch', 5, { eachSide: true })),
            once(timed('kneeling-hip-flexor-stretch', 45, { eachSide: true })),
            once(timed('pigeon-stretch', 45, { eachSide: true })),
            once(timed('childs-pose', 60)),
        ],
    },
    {
        id: 'builtin:full-body-stretch',
        title: 'Full-body stretch',
        description: 'Longer holds for your legs, hips and back, standing then on the floor.',
        group: 'bodyweight',
        repeats: 1,
        blocks: [
            heading('Standing'),
            once(timed('standing-quad-stretch', 45, { eachSide: true })),
            heading('On the floor'),
            once(timed('downward-dog', 45)),
            once(timed('kneeling-hip-flexor-stretch', 60, { eachSide: true })),
            once(timed('pigeon-stretch', 60, { eachSide: true })),
            once(timed('seated-hamstring-stretch', 60)),
            once(timed('cobra-stretch', 30)),
            once(timed('childs-pose', 90)),
        ],
    },
];

/**
 * Everything a built-in workout needs, every need of its exercises once, so it can be
 * checked against what someone has with `canDoWith()`. A choice met by a piece it needs
 * anyway is left out (a goblet squat's dumbbell or kettlebell, beside a kettlebell swing),
 * which changes nothing about who can do it, and reads more simply.
 */
export function builtInWorkoutEquipment(workout: Pick<BuiltInWorkout, 'blocks'>): EquipmentNeed[] {
    return workoutEquipment(workout, (id) => BUILT_IN_EXERCISES.find((e) => e.id === id));
}

/** What any workout needs, as `builtInWorkoutEquipment()` has it, from its steps' exercises. */
export function workoutEquipment(
    workout: Pick<BuiltInWorkout, 'blocks'>,
    byId: (id: string) => Pick<Exercise, 'equipment'> | undefined
): EquipmentNeed[] {
    const needs: EquipmentNeed[] = [];
    const seen = new Set<string>();
    for (const step of allSteps(workout)) {
        const found = step.exerciseId ? byId(step.exerciseId) : undefined;
        for (const need of found?.equipment ?? []) {
            const key = JSON.stringify(need);
            if (need !== 'none' && !seen.has(key)) {
                seen.add(key);
                needs.push(need);
            }
        }
    }
    const pieces = needs.filter((need) => typeof need === 'string');
    const left = needs.filter(
        (need) => typeof need === 'string' || !need.some((piece) => pieces.includes(piece))
    );
    return left.length ? left : ['none'];
}
