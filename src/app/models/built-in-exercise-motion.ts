import { BuiltInExercise } from './exercise';
import { ExerciseMotion, Kit, Limb, Point, Pose } from './exercise-motion';

/**
 * How built-in exercises move, by id, for their animated demos (EXR-13). Kept apart, as
 * their words are, so they aren't in the first download: the exercise store loads them when
 * an exercise's details are shown. How a motion is written is in `exercise-motion.ts`.
 *
 * Standing from the side, the hips are at (0, -92) with the feet under them; the arms hang
 * from (0, -140), 60 long, and the legs are 88. From the front the hips are at (0, -99.5).
 */

type Bend = 'cw' | 'ccw';
const reach = (x: number, y: number, bend: Bend): Limb => ({ reach: [x, y], bend });
const touch = (forward: number, up: number, bend: Bend): Limb => ({ touch: [forward, up], bend });
const angles = (upper: number, lower: number, scale?: readonly [number, number]): Limb =>
    scale ? { angles: [upper, lower], scale } : { angles: [upper, lower] };
const both = (limb: Limb): readonly [Limb, Limb] => [limb, limb];
/** Both hands on the barbell across the back, wider than the shoulders, the elbows down and out. */
const ON_BAR = {
    arms: both({ reach: 'bar', bend: 'ccw' }),
    handsApart: 90,
    elbowsOut: 0.6,
} as const;

/** Feet flat under the hips, from the side, the far one a little behind. */
const FEET = [reach(0, -4, 'ccw'), reach(-3, -4, 'ccw')] as const;
/** Standing, from the front, the feet under the hips. */
const FRONT_LEGS = [angles(-1.5, -1.5), angles(1.5, 1.5)] as const;
/** Arms hanging, from the front. */
const FRONT_ARMS = [angles(-4, -3), angles(4, 3)] as const;
/** Hands at x on either side, from the front, the elbows out. */
const frontHands = (x: number, y: number): readonly [Limb, Limb] => [
    reach(-x, y, 'cw'),
    reach(x, y, 'ccw'),
];

/** Hands at x on either side, from the front, raised to the shoulders or above, the elbows out. */
const frontHandsUp = (x: number, y: number): readonly [Limb, Limb] => [
    reach(-x, y, 'ccw'),
    reach(x, y, 'cw'),
];
/** Sitting, from the front: the thighs towards you, so short, and the feet on the floor. */
const FRONT_SITTING = [angles(-10, -6, [0.25, 0.85]), angles(10, 6, [0.25, 0.85])] as const;
/** A seat from the front, end on, its top at y. */
const frontSeat = (y = -46): Kit[] => [
    { kind: 'frame', from: [-12, y], to: [-12, 0] },
    { kind: 'frame', from: [12, y], to: [12, 0] },
    { kind: 'block', from: [-18, y], to: [18, y + 7] },
];

/** A bench's cushion, level from `from` to `to` at `y`, on two legs. */
const bench = (from: number, to: number, y = -40): Kit[] => [
    { kind: 'frame', from: [from + 8, y], to: [from + 8, 0] },
    { kind: 'frame', from: [to - 8, y], to: [to - 8, 0] },
    { kind: 'pad', from: [from, y], to: [to, y] },
];
const pad = (from: Point, to: Point): Kit => ({ kind: 'pad', from, to });
const frame = (from: Point, to: Point): Kit => ({ kind: 'frame', from, to });

/** Standing tall, from the side and from the front. */
const STANDING = { hips: [0, -92], torso: 180, legs: FEET } as const;
const FRONT_STANDING = { hips: [0, -99.5], torso: 180, legs: FRONT_LEGS } as const;
/** Sitting on `frontSeat()`, from the front. */
const FRONT_SEATED = { hips: [0, -58], torso: 180, legs: FRONT_SITTING } as const;

/** Lying on its back on `bench(-55, 55)`, head to the left, feet on the floor. */
const ON_BENCH = {
    hips: [30, -54],
    torso: -90,
    legs: [reach(62, -4, 'ccw'), reach(58, -4, 'ccw')],
} as const;
/** An incline bench, its back raised, and lying back on it. */
const INCLINE_BENCH: Kit[] = [
    { kind: 'frame', from: [30, -44], to: [30, 0] },
    { kind: 'frame', from: [-20, -80], to: [-30, 0] },
    { kind: 'pad', from: [5, -44], to: [38, -44] },
    { kind: 'pad', from: [12, -46], to: [-26, -84] },
];
const ON_INCLINE = {
    hips: [20, -58],
    torso: 225,
    legs: [reach(52, -4, 'ccw'), reach(48, -4, 'ccw')],
} as const;

/** Lying on its back on the floor, head to the left. */
const ON_FLOOR = { hips: [0, -13], torso: -90 } as const;

/**
 * Sitting on the floor leaning back, the feet off it, in a V, the hands together in front of
 * the belly.
 */
const V_SIT = {
    hips: [0, -12],
    torso: 215,
    head: 200,
    arms: both(touch(40, -26, 'cw')),
    legs: both(angles(130, 60)),
    feet: [115, 115],
    handsApart: 4,
} as const;

/** A high plank, from the side, on straight arms. */
const PLANK_HIGH = {
    hips: [82.9, -47.5],
    torso: 109.55,
    legs: both(angles(-70.45, -70.45)),
    feet: [15, 15],
} as const;

/** A bar to hang from, end on, on its frame. */
const PULL_UP_BAR: Kit[] = [
    { kind: 'frame', from: [40, 0], to: [40, -232] },
    { kind: 'frame', from: [8, -226], to: [40, -226] },
    { kind: 'bar', at: [8, -226] },
];
/** Hanging from `PULL_UP_BAR` by straight arms, and pulled up to it. */
const HANGING = { hips: [2, -118], torso: 178, legs: both(angles(5, -25)) } as const;
const PULLED_UP = {
    hips: [-15, -165],
    torso: 172,
    head: 186,
    legs: both(angles(15, -20)),
} as const;

/** Kneeling on the far knee, the near foot forward. */
const HALF_KNEELING = {
    hips: [0, -50],
    torso: 180,
    legs: [reach(34, -4, 'ccw'), angles(0, -90)],
    feet: [90, -90],
} as const;

/** On the hands and knees, from the side: the hands under the shoulders, the knees under the hips. */
const ALL_FOURS = {
    hips: [0, -50],
    torso: 107,
    arms: both(reach(46, -5, 'cw')),
    legs: both(reach(-44, -6, 'ccw')),
    feet: [-90, -90],
} as const;
// Thread the needle's near hand passing by the shoulder, between up and under
const THREAD_HAND_DOWN: Pose = {
    hips: [-5, -50],
    torso: 107,
    head: 100,
    arms: [reach(40, -16, 'cw'), reach(46, -5, 'cw')],
    legs: both(reach(-44, -6, 'ccw')),
    feet: [-80, -80],
};
// The world's greatest stretch's near arm passing straight out to the side, on the way up and
// down. Straight from here to the top, it can't bend; going straight up, a bend that points
// the elbow back below the shoulder points it forwards above it
const WORLDS_GREATEST_ARM_OUT: Pose = {
    hips: [48, -36],
    torso: 111.5,
    head: 120,
    twist: -22.5,
    arms: [reach(92, -55, 'cw'), reach(55.5, -15.5, 'cw')],
    handsOut: [70, 10],
    legs: [reach(62.5, -4, 'ccw'), reach(-34.5, -12, 'ccw')],
    feet: [90, 55],
};

/**
 * A band lateral walk's half squat, from the front, hips at x: the hands together in front, the
 * knees bent forwards, and each foot on the floor at its x, or lifted to it mid-step.
 */
const lateralWalk = (x: number, near: number, far: number, lifted?: 'near' | 'far'): Pose => ({
    hips: [x, lifted ? -91 : -89],
    torso: 180,
    arms: [reach(x - 6, -118, 'cw'), reach(x + 6, -118, 'ccw')],
    handsForward: 16,
    kneesForward: 1,
    legs: [
        reach(near, lifted === 'near' ? -22 : -11.5, 'cw'),
        reach(far, lifted === 'far' ? -22 : -11.5, 'ccw'),
    ],
});

export const BUILT_IN_EXERCISE_MOTION: Readonly<
    Partial<Record<BuiltInExercise['id'], ExerciseMotion>>
> = {
    'builtin:back-squat': {
        view: 'side',
        props: ['barbell-on-back'],
        frames: [
            {
                label: 'Standing',
                hold: 400,
                ms: 1500,
                pose: { hips: [0, -92], torso: 178, head: 180, ...ON_BAR, legs: FEET },
            },
            {
                label: 'Bottom',
                hold: 150,
                ms: 1200,
                pose: { hips: [-22, -46], torso: 137, head: 155, ...ON_BAR, legs: FEET },
            },
        ],
    },
    'builtin:push-up': {
        view: 'side',
        frames: [
            {
                label: 'Top',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [82.9, -47.5],
                    torso: 109.55,
                    elbowsOut: 0.45,
                    handsApart: 50,
                    arms: [reach(128, -5.5, 'cw'), reach(125, -5.5, 'cw')],
                    legs: both(angles(-70.45, -70.45)),
                    feet: [15, 15],
                },
            },
            {
                label: 'Bottom',
                hold: 100,
                ms: 1000,
                pose: {
                    hips: [88, -19.3],
                    torso: 90.82,
                    elbowsOut: 0.45,
                    handsApart: 50,
                    arms: [reach(128, -5.5, 'cw'), reach(125, -5.5, 'cw')],
                    legs: both(angles(-89.18, -89.18)),
                    feet: [5, 5],
                },
            },
        ],
    },
    'builtin:lateral-raise': {
        view: 'front',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Arms down',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [0, -99.5],
                    torso: 180,
                    arms: [angles(-12, -8), angles(12, 8)],
                    legs: FRONT_LEGS,
                },
            },
            {
                label: 'Arms up',
                hold: 300,
                ms: 1500,
                pose: {
                    hips: [0, -99.5],
                    torso: 180,
                    arms: [angles(-88, -80), angles(88, 80)],
                    legs: FRONT_LEGS,
                },
            },
        ],
    },
    'builtin:good-morning': {
        view: 'side',
        props: ['barbell-on-back'],
        frames: [
            {
                label: 'Standing',
                hold: 300,
                ms: 1500,
                pose: { hips: [0, -92], torso: 178, head: 180, ...ON_BAR, legs: FEET },
            },
            {
                label: 'Hinged',
                hold: 200,
                ms: 1300,
                pose: { hips: [-26, -86], torso: 95, head: 115, ...ON_BAR, legs: FEET },
            },
        ],
    },
    'builtin:rack-pull': {
        view: 'side',
        props: ['barbell'],
        kit: [frame([38, 0], [38, -110]), frame([-12, -31], [40, -31])],
        frames: [
            {
                label: 'Bar on the pins',
                hold: 300,
                ms: 1100,
                pose: {
                    hips: [-14, -77],
                    torso: 135,
                    head: 155,
                    arms: both(reach(6, -48, 'cw')),
                    legs: FEET,
                },
            },
            {
                label: 'Standing',
                hold: 400,
                ms: 1100,
                pose: { hips: [0, -92], torso: 180, arms: both(reach(3, -81, 'cw')), legs: FEET },
            },
        ],
    },
    'builtin:shrug': {
        view: 'front',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Shoulders down',
                hold: 200,
                ms: 700,
                pose: {
                    hips: [0, -99.5],
                    torso: 180,
                    palmsIn: 1,
                    arms: FRONT_ARMS,
                    legs: FRONT_LEGS,
                },
            },
            {
                label: 'Shoulders up',
                hold: 500,
                ms: 900,
                pose: {
                    hips: [0, -99.5],
                    torso: 180,
                    shrug: 6,
                    palmsIn: 1,
                    arms: FRONT_ARMS,
                    legs: FRONT_LEGS,
                },
            },
        ],
    },
    // Feet wide enough that the shins stand upright with the bar at its lowest
    'builtin:sumo-deadlift': {
        view: 'front',
        props: ['barbell'],
        frames: [
            {
                label: 'Bar on the floor',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -42],
                    torso: 180,
                    arms: frontHands(13, -36),
                    handsForward: 22,
                    legs: [reach(-51, -11.5, 'cw'), reach(51, -11.5, 'ccw')],
                },
            },
            {
                label: 'Standing',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -88],
                    torso: 180,
                    arms: frontHands(19, -78),
                    handsForward: 12,
                    legs: [reach(-51, -11.5, 'cw'), reach(51, -11.5, 'ccw')],
                },
            },
        ],
    },
    // A landmine: the bar pivots on the floor behind, between the legs, a V handle at its end
    'builtin:t-bar-row': {
        view: 'side',
        kit: [{ kind: 'landmine', at: [-120, -3] }],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [-18, -84],
                    torso: 125,
                    head: 145,
                    arms: both(reach(20, -52, 'cw')),
                    handsApart: 8,
                    stance: 40,
                    legs: FEET,
                },
            },
            {
                label: 'Bar to the chest',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [-18, -84],
                    torso: 125,
                    head: 145,
                    arms: both(reach(18, -86, 'cw')),
                    handsApart: 8,
                    stance: 40,
                    legs: FEET,
                },
            },
        ],
    },
    // Walking on the spot, a dumbbell in each hand
    'builtin:farmers-carry': {
        view: 'side',
        props: ['dumbbells'],
        frames: [
            {
                label: 'One step',
                ms: 550,
                pose: {
                    hips: [0, -94],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    palmsIn: 1,
                    handsApart: 52,
                    legs: [angles(20, 10), angles(-20, -30)],
                    feet: [100, 50],
                },
            },
            {
                label: 'The next',
                ms: 550,
                pose: {
                    hips: [0, -94],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    palmsIn: 1,
                    handsApart: 52,
                    legs: [angles(-20, -30), angles(20, 10)],
                    feet: [50, 100],
                },
            },
        ],
    },
    'builtin:deadlift': {
        view: 'side',
        props: ['barbell'],
        frames: [
            {
                label: 'Bar on the floor',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-26, -60],
                    torso: 112,
                    head: 150,
                    arms: both(reach(8, -17, 'cw')),
                    legs: FEET,
                },
            },
            {
                label: 'Standing',
                hold: 300,
                ms: 1300,
                pose: { hips: [0, -92], torso: 180, arms: both(reach(3, -81, 'cw')), legs: FEET },
            },
        ],
    },
    'builtin:bench-press': {
        view: 'side',
        props: ['barbell'],
        kit: bench(-55, 55),
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [30, -54],
                    torso: -90,
                    elbowsOut: 0.45,
                    handsApart: 56,
                    arms: both(reach(-16, -112, 'cw')),
                    legs: [reach(62, -4, 'ccw'), reach(58, -4, 'ccw')],
                },
            },
            {
                label: 'Bar to the chest',
                hold: 150,
                ms: 1100,
                pose: {
                    hips: [30, -54],
                    torso: -90,
                    elbowsOut: 0.45,
                    handsApart: 56,
                    arms: both(reach(-14, -68, 'cw')),
                    legs: [reach(62, -4, 'ccw'), reach(58, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:overhead-press': {
        view: 'side',
        props: ['barbell'],
        frames: [
            {
                label: 'At the shoulders',
                hold: 300,
                ms: 600,
                pose: {
                    hips: [0, -92],
                    torso: 180,
                    handsApart: 52,
                    arms: both(reach(14, -136, 'cw')),
                    legs: FEET,
                },
            },
            {
                label: 'Past the face',
                ms: 700,
                through: true,
                pose: {
                    hips: [0, -92],
                    torso: 180,
                    head: 195,
                    handsApart: 52,
                    arms: both(reach(12, -178, 'cw')),
                    legs: FEET,
                },
            },
            {
                label: 'Overhead',
                hold: 300,
                ms: 700,
                pose: {
                    hips: [0, -92],
                    torso: 180,
                    handsApart: 52,
                    arms: both(reach(1, -199, 'cw')),
                    legs: FEET,
                },
            },
            {
                label: 'Lowering',
                ms: 600,
                through: true,
                pose: {
                    hips: [0, -92],
                    torso: 180,
                    head: 195,
                    handsApart: 52,
                    arms: both(reach(12, -178, 'cw')),
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:barbell-row': {
        view: 'side',
        props: ['barbell'],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [-18, -86],
                    torso: 110,
                    head: 135,
                    arms: both(reach(24, -44, 'cw')),
                    legs: FEET,
                },
            },
            {
                label: 'Bar to the belly',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [-18, -86],
                    torso: 110,
                    head: 135,
                    arms: both(reach(2, -74, 'cw')),
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:romanian-deadlift': {
        view: 'side',
        props: ['barbell'],
        frames: [
            {
                label: 'Standing',
                hold: 300,
                ms: 1600,
                pose: { hips: [0, -91], torso: 180, arms: both(reach(3, -81, 'cw')), legs: FEET },
            },
            {
                label: 'Hips back',
                hold: 200,
                ms: 1300,
                pose: {
                    hips: [-28, -84],
                    torso: 100,
                    head: 125,
                    arms: both(reach(8, -36, 'cw')),
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:front-squat': {
        view: 'side',
        props: ['barbell'],
        frames: [
            {
                label: 'Standing',
                hold: 400,
                ms: 1500,
                pose: {
                    hips: [0, -92],
                    torso: 180,
                    arms: both(touch(10, -2, 'cw')),
                    handsApart: 46,
                    legs: FEET,
                },
            },
            {
                label: 'Bottom',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [-14, -46],
                    torso: 160,
                    head: 165,
                    arms: both(touch(10, -2, 'cw')),
                    handsApart: 46,
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:incline-bench-press': {
        view: 'side',
        props: ['barbell'],
        kit: [
            frame([30, -44], [30, 0]),
            frame([-20, -80], [-30, 0]),
            pad([5, -44], [38, -44]),
            pad([12, -46], [-26, -84]),
        ],
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [20, -58],
                    torso: 225,
                    elbowsOut: 0.45,
                    handsApart: 56,
                    arms: both(reach(-12, -150, 'cw')),
                    legs: [reach(52, -4, 'ccw'), reach(48, -4, 'ccw')],
                },
            },
            {
                label: 'Bar to the chest',
                hold: 150,
                ms: 1100,
                pose: {
                    hips: [20, -58],
                    torso: 225,
                    elbowsOut: 0.45,
                    handsApart: 56,
                    arms: both(reach(0, -100, 'cw')),
                    legs: [reach(52, -4, 'ccw'), reach(48, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:close-grip-bench-press': {
        view: 'side',
        props: ['barbell'],
        kit: bench(-55, 55),
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [30, -54],
                    torso: -90,
                    arms: both(reach(-14, -112, 'cw')),
                    legs: [reach(62, -4, 'ccw'), reach(58, -4, 'ccw')],
                },
            },
            {
                label: 'Bar to the chest',
                hold: 150,
                ms: 1100,
                pose: {
                    hips: [30, -54],
                    torso: -90,
                    arms: both(reach(-8, -68, 'cw')),
                    legs: [reach(62, -4, 'ccw'), reach(58, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:incline-dumbbell-press': {
        view: 'side',
        props: ['dumbbells'],
        kit: INCLINE_BENCH,
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: {
                    ...ON_INCLINE,
                    elbowsOut: 0.45,
                    handsApart: 48,
                    arms: both(reach(-12, -150, 'cw')),
                },
            },
            {
                label: 'Dumbbells to the chest',
                hold: 150,
                ms: 1100,
                pose: {
                    ...ON_INCLINE,
                    elbowsOut: 0.45,
                    handsApart: 48,
                    arms: both(reach(-2, -98, 'cw')),
                },
            },
        ],
    },
    'builtin:dumbbell-shoulder-press': {
        view: 'front',
        props: ['dumbbells'],
        kit: frontSeat(),
        frames: [
            {
                label: 'At the shoulders',
                hold: 200,
                ms: 1200,
                pose: { ...FRONT_SEATED, arms: frontHandsUp(30, -112) },
            },
            {
                label: 'Overhead',
                hold: 300,
                ms: 1300,
                pose: { ...FRONT_SEATED, arms: frontHandsUp(14, -166) },
            },
        ],
    },
    'builtin:dumbbell-curl': {
        view: 'side',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, arms: both(angles(4, 6)) },
            },
            {
                label: 'Curled',
                hold: 300,
                ms: 1400,
                pose: { ...STANDING, arms: both(angles(8, 150)) },
            },
        ],
    },
    'builtin:dumbbell-lunge': {
        view: 'side',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Up',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-4, -85],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(32, -4, 'ccw'), reach(-40, -14, 'ccw')],
                    feet: [90, 40],
                },
            },
            {
                label: 'Down',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [-4, -52],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(32, -4, 'ccw'), reach(-40, -14, 'ccw')],
                    feet: [90, 40],
                },
            },
        ],
    },
    'builtin:goblet-squat': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Standing',
                hold: 400,
                ms: 1500,
                pose: {
                    ...STANDING,
                    arms: both(touch(18, -10, 'cw')),
                    handsApart: 10,
                    heldBy: 0.5,
                },
            },
            {
                label: 'Bottom',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [-14, -46],
                    torso: 160,
                    head: 165,
                    arms: both(touch(18, -10, 'cw')),
                    handsApart: 10,
                    heldBy: 0.5,
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:dumbbell-row': {
        view: 'side',
        props: ['dumbbell'],
        // The bench under the far knee and hand, beside the standing leg
        kit: [
            { kind: 'frame', from: [-50, -37], to: [-50, 0], aside: 17 },
            { kind: 'frame', from: [40, -37], to: [40, 0], aside: 17 },
            { kind: 'pad', from: [-65, -37], to: [50, -37], aside: 17 },
        ],
        frames: [
            {
                label: 'Arm long',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [-14, -88],
                    torso: 95,
                    head: 105,
                    arms: [reach(38, -32, 'cw'), reach(40, -42, 'cw')],
                    legs: [reach(10, -4, 'ccw'), angles(0, -90)],
                },
            },
            {
                label: 'Dumbbell to the hip',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [-14, -88],
                    torso: 95,
                    head: 105,
                    arms: [reach(14, -80, 'cw'), reach(40, -42, 'cw')],
                    legs: [reach(10, -4, 'ccw'), angles(0, -90)],
                },
            },
        ],
    },
    'builtin:hammer-curl': {
        view: 'side',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, arms: both(angles(4, 6)), palmsIn: 1 },
            },
            {
                label: 'Curled',
                hold: 300,
                ms: 1400,
                pose: { ...STANDING, arms: both(angles(8, 145)), palmsIn: 1 },
            },
        ],
    },
    'builtin:skull-crusher': {
        view: 'side',
        props: ['barbell'],
        kit: bench(-55, 55),
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: { ...ON_BENCH, arms: both(angles(192, 186)) },
            },
            {
                label: 'Bar to the forehead',
                hold: 150,
                ms: 1100,
                pose: { ...ON_BENCH, arms: both(angles(196, 262)) },
            },
        ],
    },
    'builtin:dumbbell-bench-press': {
        view: 'side',
        props: ['dumbbells'],
        kit: bench(-55, 55),
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: {
                    ...ON_BENCH,
                    elbowsOut: 0.45,
                    handsApart: 48,
                    arms: both(reach(-18, -112, 'cw')),
                },
            },
            {
                label: 'Dumbbells to the chest',
                hold: 150,
                ms: 1100,
                pose: {
                    ...ON_BENCH,
                    elbowsOut: 0.45,
                    handsApart: 48,
                    arms: both(reach(-14, -64, 'cw')),
                },
            },
        ],
    },
    // Arms out to the sides, towards you and away, so drawn shorter as they open
    'builtin:dumbbell-fly': {
        view: 'side',
        props: ['dumbbells'],
        kit: bench(-55, 55),
        frames: [
            {
                label: 'Arms above the chest',
                hold: 300,
                ms: 1500,
                pose: { ...ON_BENCH, palmsIn: 1, arms: both(angles(184, 168)) },
            },
            {
                label: 'Arms open',
                hold: 200,
                ms: 1300,
                pose: { ...ON_BENCH, palmsIn: 1, arms: both(angles(182, 150, [0.15, 0.55])) },
            },
        ],
    },
    'builtin:arnold-press': {
        view: 'front',
        props: ['dumbbells'],
        kit: frontSeat(),
        frames: [
            {
                label: 'Palms in',
                hold: 200,
                ms: 700,
                pose: {
                    ...FRONT_SEATED,
                    handsForward: 20,
                    elbowsDown: 1,
                    arms: frontHandsUp(14, -120),
                },
            },
            {
                label: 'Turning out',
                ms: 700,
                through: true,
                pose: { ...FRONT_SEATED, handsForward: 6, arms: frontHandsUp(30, -128) },
            },
            {
                label: 'Overhead',
                hold: 300,
                ms: 1400,
                pose: { ...FRONT_SEATED, arms: frontHandsUp(14, -166) },
            },
        ],
    },
    // Arms out to the sides, towards you and away, so drawn shorter as they rise
    'builtin:rear-delt-fly': {
        view: 'side',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Arms hanging',
                hold: 200,
                ms: 1100,
                pose: {
                    hips: [-26, -84],
                    torso: 100,
                    head: 120,
                    arms: both(angles(2, 4)),
                    palmsIn: 1,
                    legs: FEET,
                },
            },
            {
                label: 'Arms out',
                hold: 400,
                ms: 1300,
                pose: {
                    hips: [-26, -84],
                    torso: 100,
                    head: 120,
                    arms: both(angles(2, 10, [0.2, 0.25])),
                    palmsIn: 1,
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:preacher-curl': {
        view: 'side',
        props: ['dumbbells'],
        kit: [
            frame([-10, -50], [-10, 0]),
            frame([12, -83], [12, 0]),
            pad([-26, -50], [4, -50]),
            pad([-3, -97], [24, -71]),
        ],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1100,
                pose: {
                    hips: [-10, -58],
                    torso: 165,
                    arms: both(angles(45, 75)),
                    legs: [reach(26, -4, 'ccw'), reach(22, -4, 'ccw')],
                },
            },
            {
                label: 'Curled',
                hold: 300,
                ms: 1400,
                pose: {
                    hips: [-10, -58],
                    torso: 165,
                    arms: both(angles(45, 185)),
                    legs: [reach(26, -4, 'ccw'), reach(22, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:overhead-triceps-extension': {
        view: 'side',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Behind the head',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, palmsIn: 1, handsApart: 26, arms: both(angles(176, 322)) },
            },
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: { ...STANDING, palmsIn: 1, handsApart: 26, arms: both(angles(176, 178)) },
            },
        ],
    },
    'builtin:bulgarian-split-squat': {
        view: 'side',
        props: ['dumbbells'],
        kit: [
            frame([-92, -40], [-92, 0]),
            frame([-71, -40], [-71, 0]),
            pad([-100, -40], [-63, -40]),
        ],
        frames: [
            {
                label: 'Up',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-8, -84],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(28, -4, 'ccw'), reach(-70, -52, 'ccw')],
                    feet: [90, -110],
                },
            },
            {
                label: 'Down',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [-18, -50],
                    torso: 172,
                    arms: both(angles(0, 0)),
                    legs: [reach(28, -4, 'ccw'), reach(-70, -52, 'ccw')],
                    feet: [90, -110],
                },
            },
        ],
    },
    // The back foot lifted over the edge of the box, stepping up and down
    'builtin:step-up': {
        view: 'side',
        kit: [{ kind: 'block', from: [5, -40], to: [65, 0] }],
        frames: [
            {
                label: 'One foot up',
                hold: 300,
                ms: 700,
                pose: {
                    hips: [-22, -92],
                    torso: 175,
                    arms: both(angles(0, 0)),
                    legs: [reach(24, -44, 'ccw'), reach(-22, -4, 'ccw')],
                },
            },
            {
                label: 'Stepping up',
                ms: 600,
                through: true,
                pose: {
                    hips: [0, -116],
                    torso: 172,
                    arms: both(angles(0, 0)),
                    legs: [reach(24, -44, 'ccw'), reach(-4, -58, 'ccw')],
                },
            },
            {
                label: 'On the step',
                hold: 300,
                ms: 600,
                pose: {
                    hips: [22, -132],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(24, -44, 'ccw'), reach(18, -44, 'ccw')],
                },
            },
            {
                label: 'Stepping down',
                ms: 700,
                through: true,
                pose: {
                    hips: [-2, -114],
                    torso: 176,
                    arms: both(angles(0, 0)),
                    legs: [reach(24, -44, 'ccw'), reach(-12, -54, 'ccw')],
                },
            },
        ],
    },
    'builtin:single-leg-romanian-deadlift': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Standing on one leg',
                hold: 300,
                ms: 1500,
                pose: {
                    hips: [0, -91],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(0, -4, 'ccw'), angles(-4, -4)],
                },
            },
            {
                label: 'Leg back, chest down',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-6, -86],
                    torso: 95,
                    head: 110,
                    arms: both(angles(0, 0)),
                    legs: [reach(0, -4, 'ccw'), angles(-85, -85)],
                },
            },
        ],
    },
    'builtin:chainsaw-row': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Arm long',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [-16, -80],
                    torso: 115,
                    head: 130,
                    arms: [reach(30, -32, 'cw'), reach(28, -60, 'cw')],
                    legs: [reach(32, -4, 'ccw'), reach(-50, -4, 'ccw')],
                },
            },
            {
                label: 'Bell to the hip',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [-16, -80],
                    torso: 115,
                    head: 130,
                    arms: [reach(4, -78, 'cw'), reach(28, -60, 'cw')],
                    legs: [reach(32, -4, 'ccw'), reach(-50, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:pull-up': {
        view: 'side',
        kit: PULL_UP_BAR,
        frames: [
            {
                label: 'Hanging',
                hold: 300,
                ms: 1300,
                pose: { ...HANGING, arms: both(reach(8, -226, 'cw')) },
            },
            {
                label: 'Chin over the bar',
                hold: 300,
                ms: 1500,
                pose: { ...PULLED_UP, arms: both(reach(8, -226, 'cw')) },
            },
        ],
    },
    'builtin:chin-up': {
        view: 'side',
        kit: PULL_UP_BAR,
        frames: [
            {
                label: 'Hanging',
                hold: 300,
                ms: 1300,
                pose: { ...HANGING, arms: both(reach(6, -226, 'cw')) },
            },
            {
                label: 'Chin over the bar',
                hold: 300,
                ms: 1500,
                pose: { ...PULLED_UP, arms: both(reach(6, -226, 'cw')) },
            },
        ],
    },
    'builtin:dead-hang': {
        view: 'side',
        kit: PULL_UP_BAR,
        frames: [
            { label: 'Hold', ms: 1000, pose: { ...HANGING, arms: both(reach(8, -226, 'cw')) } },
        ],
    },
    'builtin:dip': {
        view: 'side',
        kit: [{ kind: 'bars', at: [8, -120], apart: 54 }],
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-0.5, -132],
                    torso: 175,
                    arms: both(reach(8, -120, 'cw')),
                    handsApart: 54,
                    legs: both(angles(10, -40)),
                },
            },
            {
                label: 'Lowered',
                hold: 150,
                ms: 1100,
                pose: {
                    hips: [-5.8, -107],
                    torso: 160,
                    arms: both(reach(8, -120, 'cw')),
                    handsApart: 54,
                    legs: both(angles(10, -40)),
                },
            },
        ],
    },
    'builtin:plank': {
        view: 'side',
        frames: [
            {
                label: 'Hold',
                ms: 1000,
                pose: {
                    hips: [0, -28.7],
                    torso: 97,
                    arms: both(angles(0, 90)),
                    legs: both(angles(-83, -83)),
                    feet: [15, 15],
                },
            },
        ],
    },
    'builtin:hanging-leg-raise': {
        view: 'side',
        kit: PULL_UP_BAR,
        frames: [
            {
                label: 'Hanging',
                hold: 300,
                ms: 1300,
                pose: { ...HANGING, arms: both(reach(8, -226, 'cw')), legs: both(angles(4, -4)) },
            },
            {
                label: 'Legs up',
                hold: 300,
                ms: 1500,
                pose: {
                    hips: [6, -116],
                    torso: 186,
                    arms: both(reach(8, -226, 'cw')),
                    legs: both(angles(92, 92)),
                },
            },
        ],
    },
    // From the front, on its side: the far arm (lower, as it tips) holds it up
    'builtin:side-plank': {
        view: 'front',
        frames: [
            {
                label: 'Hold',
                ms: 1000,
                pose: {
                    hips: [0, -39],
                    torso: 105,
                    arms: [angles(178, 178), angles(0, 90, [1, 0.3])],
                    legs: both(angles(-75, -75)),
                    feet: [-75, -75],
                },
            },
        ],
    },
    'builtin:dead-bug': {
        view: 'side',
        frames: [
            {
                label: 'One arm and the other leg out',
                hold: 300,
                ms: 1200,
                pose: {
                    ...ON_FLOOR,
                    arms: [angles(265, 265), angles(180, 180)],
                    legs: [angles(180, 90), angles(95, 95)],
                },
            },
            {
                label: 'Then the others',
                hold: 300,
                ms: 1200,
                pose: {
                    ...ON_FLOOR,
                    arms: [angles(180, 180), angles(265, 265)],
                    legs: [angles(95, 95), angles(180, 90)],
                },
            },
        ],
    },
    // From the front, sitting back with the knees up towards you, so the legs drawn short
    // Turning the shoulders, which only the 3D figure shows: flat, the hands stay in front
    'builtin:russian-twist': {
        view: 'side',
        seenFrom: 20,
        frames: [
            {
                label: 'Hands to one side',
                hold: 150,
                ms: 900,
                pose: { ...V_SIT, twist: 50 },
            },
            {
                label: 'Then the other',
                hold: 150,
                ms: 900,
                pose: { ...V_SIT, twist: -50 },
            },
        ],
    },
    'builtin:glute-bridge': {
        view: 'side',
        frames: [
            {
                label: 'Hips down',
                hold: 200,
                ms: 1100,
                pose: {
                    ...ON_FLOOR,
                    head: -90,
                    arms: both(angles(82, 84)),
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
            {
                label: 'Hips up',
                hold: 500,
                ms: 1200,
                pose: {
                    hips: [-7, -39],
                    torso: -60,
                    head: -90,
                    arms: both(angles(82, 84)),
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
        ],
    },
    'builtin:hip-thrust': {
        view: 'side',
        props: ['barbell'],
        kit: bench(-105, -40, -37),
        frames: [
            {
                label: 'Hips down',
                hold: 200,
                ms: 1200,
                pose: {
                    hips: [-16.6, -12.2],
                    torso: -140,
                    arms: both(touch(20, -47, 'cw')),
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
            {
                label: 'Hips up',
                hold: 500,
                ms: 1200,
                pose: {
                    hips: [2, -53.8],
                    torso: -88,
                    head: -100,
                    arms: both(touch(20, -47, 'cw')),
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
        ],
    },
    'builtin:walking-lunge': {
        view: 'side',
        frames: [
            {
                label: 'Down',
                hold: 150,
                ms: 900,
                pose: {
                    hips: [-4, -52],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(32, -4, 'ccw'), reach(-40, -14, 'ccw')],
                    feet: [90, 40],
                },
            },
            {
                label: 'Stepping through',
                ms: 900,
                pose: { ...STANDING, arms: both(angles(0, 0)), feet: [90, 90] },
            },
            {
                label: 'Down on the other leg',
                hold: 150,
                ms: 900,
                pose: {
                    hips: [-4, -52],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(-40, -14, 'ccw'), reach(32, -4, 'ccw')],
                    feet: [40, 90],
                },
            },
            {
                label: 'Stepping through',
                ms: 900,
                pose: { ...STANDING, arms: both(angles(0, 0)), feet: [90, 90] },
            },
        ],
    },
    'builtin:reverse-lunge': {
        view: 'side',
        frames: [
            {
                label: 'Standing',
                hold: 300,
                ms: 500,
                pose: { ...STANDING, arms: both(angles(0, 0)), feet: [90, 90] },
            },
            {
                label: 'Stepping back',
                ms: 600,
                through: true,
                pose: {
                    hips: [-12, -86],
                    torso: 176,
                    arms: both(angles(0, 0)),
                    legs: [reach(0, -4, 'ccw'), reach(-40, -26, 'ccw')],
                    feet: [90, 60],
                },
            },
            {
                label: 'Down',
                hold: 150,
                ms: 600,
                pose: {
                    hips: [-30, -52],
                    torso: 172,
                    arms: both(angles(0, 0)),
                    legs: [reach(0, -4, 'ccw'), reach(-72, -14, 'ccw')],
                    feet: [90, 40],
                },
            },
            {
                label: 'Stepping in',
                ms: 500,
                through: true,
                pose: {
                    hips: [-12, -86],
                    torso: 176,
                    arms: both(angles(0, 0)),
                    legs: [reach(0, -4, 'ccw'), reach(-40, -26, 'ccw')],
                    feet: [90, 60],
                },
            },
        ],
    },
    'builtin:nordic-curl': {
        view: 'side',
        kit: [frame([-62, -15], [-62, 0]), pad([-56, -15], [-34, -15])],
        frames: [
            {
                label: 'Kneeling tall',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -50],
                    torso: 180,
                    arms: both(angles(10, 60)),
                    legs: both(angles(0, -90)),
                    feet: [-90, -90],
                },
            },
            {
                label: 'Lowering',
                ms: 1300,
                through: true,
                pose: {
                    hips: [22, -44.1],
                    torso: 150,
                    arms: both(angles(20, 55)),
                    legs: both(angles(-30, -90)),
                    feet: [-90, -90],
                },
            },
            {
                label: 'Caught on the hands',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [38.1, -28],
                    torso: 120,
                    elbowsOut: 0.4,
                    arms: both(angles(14, 51)),
                    legs: both(angles(-60, -90)),
                    feet: [-90, -90],
                },
            },
            {
                label: 'Coming up',
                ms: 900,
                through: true,
                pose: {
                    hips: [22, -44.1],
                    torso: 150,
                    arms: both(angles(20, 55)),
                    legs: both(angles(-30, -90)),
                    feet: [-90, -90],
                },
            },
        ],
    },
    'builtin:inverted-row': {
        view: 'side',
        kit: [
            frame([-95, 0], [-95, -114]),
            frame([-95, -108], [-64, -108]),
            { kind: 'bar', at: [-64, -108] },
        ],
        frames: [
            {
                label: 'Arms straight',
                hold: 200,
                ms: 1000,
                pose: {
                    hips: [-20.3, -34.8],
                    torso: -107,
                    arms: both(reach(-64, -108, 'cw')),
                    handsApart: 60,
                    elbowsOut: 0.5,
                    legs: both(angles(73, 73)),
                    feet: [160, 160],
                },
            },
            {
                label: 'Chest to the bar',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [-11.4, -54.2],
                    torso: -121,
                    arms: both(reach(-64, -108, 'cw')),
                    handsApart: 60,
                    elbowsOut: 0.5,
                    legs: both(angles(59, 59)),
                    feet: [150, 150],
                },
            },
        ],
    },
    'builtin:bench-dip': {
        view: 'side',
        kit: bench(-60, -10),
        frames: [
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-10, -50],
                    torso: 180,
                    arms: both(reach(-14, -40, 'cw')),
                    legs: both(reach(66, -6, 'ccw')),
                    feet: [160, 160],
                },
            },
            {
                label: 'Lowered',
                hold: 150,
                ms: 1100,
                pose: {
                    hips: [-8, -22],
                    torso: 180,
                    arms: both(reach(-14, -40, 'cw')),
                    legs: both(reach(66, -6, 'ccw')),
                    feet: [160, 160],
                },
            },
        ],
    },
    'builtin:diamond-push-up': {
        view: 'side',
        frames: [
            {
                label: 'Top',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [82.9, -47.5],
                    torso: 109.55,
                    arms: both(reach(118, -5.5, 'cw')),
                    handsApart: 2,
                    elbowsOut: 0.85,
                    legs: both(angles(-70.45, -70.45)),
                    feet: [15, 15],
                },
            },
            {
                label: 'Bottom',
                hold: 100,
                ms: 1000,
                pose: {
                    hips: [88, -19.3],
                    torso: 90.82,
                    arms: both(reach(118, -5.5, 'cw')),
                    handsApart: 2,
                    elbowsOut: 0.85,
                    legs: both(angles(-89.18, -89.18)),
                    feet: [5, 5],
                },
            },
        ],
    },
    'builtin:pike-push-up': {
        view: 'side',
        frames: [
            {
                label: 'Top',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-20, -97],
                    torso: 32,
                    arms: both(reach(38, -5, 'cw')),
                    handsApart: 50,
                    elbowsOut: 0.6,
                    legs: both(reach(-44, -16, 'ccw')),
                    feet: [35, 35],
                },
            },
            {
                label: 'Head to the floor',
                hold: 100,
                ms: 1100,
                pose: {
                    hips: [-6, -92],
                    torso: 8,
                    arms: both(reach(38, -5, 'cw')),
                    handsApart: 50,
                    elbowsOut: 0.6,
                    legs: both(reach(-44, -16, 'ccw')),
                    feet: [35, 35],
                },
            },
        ],
    },
    'builtin:burpee': {
        view: 'side',
        frames: [
            {
                label: 'Standing',
                hold: 100,
                ms: 450,
                pose: {
                    ...STANDING,
                    arms: both(reach(2, -80, 'cw')),
                    feet: [90, 90],
                },
            },
            {
                label: 'Hands down',
                ms: 200,
                pose: {
                    hips: [-10, -40],
                    torso: 115,
                    arms: both(reach(38, -5, 'cw')),
                    legs: FEET,
                    feet: [90, 90],
                },
            },
            {
                label: 'Jumping back',
                ms: 200,
                pose: {
                    hips: [-8, -50],
                    torso: 112,
                    arms: both(reach(38, -5, 'cw')),
                    legs: [reach(-50, -30, 'ccw'), reach(-48, -30, 'ccw')],
                    feet: [40, 40],
                },
            },
            {
                label: 'Feet back',
                hold: 100,
                ms: 200,
                pose: {
                    hips: [-7.1, -47.5],
                    torso: 109.55,
                    arms: both(reach(38, -5, 'cw')),
                    legs: [reach(-90, -18, 'ccw'), reach(-88, -18, 'ccw')],
                    feet: [15, 15],
                },
            },
            {
                label: 'Jumping in',
                ms: 200,
                pose: {
                    hips: [-8, -50],
                    torso: 112,
                    arms: both(reach(38, -5, 'cw')),
                    legs: [reach(-50, -30, 'ccw'), reach(-48, -30, 'ccw')],
                    feet: [40, 40],
                },
            },
            {
                label: 'Feet in',
                ms: 450,
                pose: {
                    hips: [-10, -40],
                    torso: 115,
                    arms: both(reach(38, -5, 'cw')),
                    legs: FEET,
                    feet: [90, 90],
                },
            },
            {
                label: 'Jump',
                hold: 80,
                ms: 380,
                pose: {
                    hips: [0, -128],
                    torso: 180,
                    arms: both(reach(4, -220, 'cw')),
                    legs: [reach(0, -40, 'ccw'), reach(-3, -40, 'ccw')],
                    feet: [25, 25],
                },
            },
            {
                label: 'Landing',
                ms: 350,
                pose: {
                    hips: [-8, -82],
                    torso: 168,
                    arms: both(reach(14, -84, 'cw')),
                    legs: FEET,
                    feet: [90, 90],
                },
            },
        ],
    },
    'builtin:mountain-climber': {
        view: 'side',
        frames: [
            {
                label: 'One knee in',
                ms: 450,
                pose: {
                    hips: [82.9, -49],
                    torso: 109.55,
                    arms: [reach(128, -5.5, 'cw'), reach(125, -5.5, 'cw')],
                    legs: [reach(62, -13, 'ccw'), reach(-5, -18, 'ccw')],
                    feet: [60, 15],
                },
            },
            {
                label: 'Then the other',
                ms: 450,
                pose: {
                    hips: [82.9, -49],
                    torso: 109.55,
                    arms: [reach(128, -5.5, 'cw'), reach(125, -5.5, 'cw')],
                    legs: [reach(-5, -18, 'ccw'), reach(62, -13, 'ccw')],
                    feet: [15, 60],
                },
            },
        ],
    },
    // Jumping each time the feet go out or in
    'builtin:jumping-jack': {
        view: 'front',
        frames: [
            {
                label: 'Feet together',
                ms: 300,
                pose: { ...FRONT_STANDING, arms: FRONT_ARMS },
            },
            {
                label: 'Jumping out',
                ms: 300,
                through: true,
                pose: {
                    hips: [0, -112],
                    torso: 180,
                    arms: [angles(-80, -85), angles(80, 85)],
                    legs: [angles(-9, -9), angles(9, 9)],
                },
            },
            {
                label: 'Feet apart, hands up',
                ms: 300,
                pose: {
                    hips: [0, -95.2],
                    torso: 180,
                    arms: [angles(-160, -170), angles(160, 170)],
                    legs: [angles(-18, -18), angles(18, 18)],
                },
            },
            {
                label: 'Jumping in',
                ms: 300,
                through: true,
                pose: {
                    hips: [0, -112],
                    torso: 180,
                    arms: [angles(-80, -85), angles(80, 85)],
                    legs: [angles(-9, -9), angles(9, 9)],
                },
            },
        ],
    },
    'builtin:jump-squat': {
        view: 'side',
        frames: [
            {
                label: 'Bottom',
                hold: 100,
                ms: 500,
                pose: {
                    hips: [-22, -46],
                    torso: 137,
                    head: 155,
                    arms: both(angles(80, 80)),
                    legs: FEET,
                    feet: [90, 90],
                },
            },
            {
                label: 'In the air',
                ms: 500,
                pose: {
                    hips: [0, -126],
                    torso: 180,
                    arms: both(angles(-20, -15)),
                    legs: [reach(0, -40, 'ccw'), reach(-3, -40, 'ccw')],
                    feet: [40, 40],
                },
            },
        ],
    },
    'builtin:box-jump': {
        view: 'side',
        kit: [{ kind: 'block', from: [30, -50], to: [90, 0] }],
        frames: [
            {
                label: 'Standing',
                hold: 200,
                ms: 450,
                pose: {
                    hips: [-10, -92],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(-10, -4, 'ccw'), reach(-13, -4, 'ccw')],
                },
            },
            {
                label: 'Dip',
                ms: 350,
                pose: {
                    hips: [-28, -58],
                    torso: 140,
                    arms: both(angles(-40, -40)),
                    legs: [reach(-10, -4, 'ccw'), reach(-13, -4, 'ccw')],
                },
            },
            {
                label: 'In the air',
                ms: 350,
                pose: {
                    hips: [20, -130],
                    torso: 165,
                    arms: both(angles(150, 150)),
                    legs: [reach(30, -70, 'ccw'), reach(27, -70, 'ccw')],
                },
            },
            {
                label: 'Landed',
                ms: 600,
                pose: {
                    hips: [38, -100],
                    torso: 145,
                    arms: both(angles(80, 80)),
                    legs: [reach(56, -54, 'ccw'), reach(53, -54, 'ccw')],
                },
            },
            {
                label: 'On the box',
                hold: 300,
                ms: 450,
                pose: {
                    hips: [56, -142],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(56, -54, 'ccw'), reach(53, -54, 'ccw')],
                },
            },
            // Stepping back down, one foot then the other, each lifted back over the box's edge
            {
                label: 'Stepping back',
                ms: 450,
                pose: {
                    hips: [40, -128],
                    torso: 178,
                    arms: both(angles(0, 0)),
                    legs: [reach(56, -54, 'ccw'), reach(24, -62, 'ccw')],
                },
            },
            {
                label: 'One foot down',
                ms: 450,
                pose: {
                    hips: [24, -96],
                    torso: 178,
                    arms: both(angles(0, 0)),
                    legs: [reach(56, -54, 'ccw'), reach(12, -4, 'ccw')],
                },
            },
            {
                label: 'Off the box',
                ms: 450,
                pose: {
                    hips: [6, -90],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(24, -62, 'ccw'), reach(-3, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:bodyweight-squat': {
        view: 'side',
        frames: [
            {
                label: 'Standing',
                hold: 300,
                ms: 1300,
                pose: { ...STANDING, arms: both(angles(0, 0)) },
            },
            {
                label: 'Bottom',
                hold: 150,
                ms: 1100,
                pose: {
                    hips: [-22, -46],
                    torso: 137,
                    head: 155,
                    arms: both(angles(85, 85)),
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:wall-sit': {
        view: 'side',
        kit: [{ kind: 'block', from: [-22, -200], to: [-14, 0] }],
        frames: [
            {
                label: 'Hold',
                ms: 1000,
                pose: {
                    hips: [0, -48],
                    torso: 180,
                    arms: both(angles(0, 90)),
                    legs: [reach(44, -4, 'ccw'), reach(41, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:crunch': {
        view: 'side',
        frames: [
            {
                label: 'Lying back',
                hold: 200,
                ms: 1000,
                pose: {
                    ...ON_FLOOR,
                    arms: both(touch(2, 18, 'cw')),
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
            {
                label: 'Shoulders up',
                hold: 400,
                ms: 1100,
                pose: {
                    ...ON_FLOOR,
                    torso: -110,
                    head: -125,
                    arms: both(touch(2, 18, 'cw')),
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
        ],
    },
    'builtin:bicycle-crunch': {
        view: 'side',
        frames: [
            {
                label: 'One knee in',
                hold: 100,
                ms: 700,
                pose: {
                    ...ON_FLOOR,
                    torso: -112,
                    head: -125,
                    twist: -35,
                    arms: both(touch(2, 18, 'cw')),
                    legs: [angles(200, 90), angles(100, 100)],
                },
            },
            {
                label: 'Then the other',
                hold: 100,
                ms: 700,
                pose: {
                    ...ON_FLOOR,
                    torso: -112,
                    head: -125,
                    twist: 35,
                    arms: both(touch(2, 18, 'cw')),
                    legs: [angles(100, 100), angles(200, 90)],
                },
            },
        ],
    },
    'builtin:ab-wheel-rollout': {
        view: 'side',
        props: ['ab-wheel'],
        frames: [
            {
                label: 'Kneeling',
                hold: 200,
                ms: 800,
                pose: {
                    hips: [7.6, -49.3],
                    torso: 115,
                    arms: both(reach(54, -10, 'cw')),
                    legs: both(angles(-10, -90)),
                    feet: [-90, -90],
                },
            },
            {
                label: 'Rolling out',
                ms: 800,
                through: true,
                pose: {
                    hips: [25.2, -42],
                    torso: 108,
                    arms: both(reach(97, -10, 'cw')),
                    legs: both(angles(-35, -90)),
                    feet: [-90, -90],
                },
            },
            {
                label: 'Rolled out',
                hold: 200,
                ms: 700,
                pose: {
                    hips: [38.1, -28],
                    torso: 100,
                    arms: both(reach(140, -10, 'cw')),
                    legs: both(angles(-60, -90)),
                    feet: [-90, -90],
                },
            },
            {
                label: 'Rolling back',
                ms: 800,
                through: true,
                pose: {
                    hips: [25.2, -42],
                    torso: 108,
                    arms: both(reach(97, -10, 'cw')),
                    legs: both(angles(-35, -90)),
                    feet: [-90, -90],
                },
            },
        ],
    },
    'builtin:lat-pulldown': {
        view: 'side',
        kit: [
            frame([-2, -50], [-2, 0]),
            pad([-18, -50], [14, -50]),
            pad([10, -72], [26, -72]),
            { kind: 'cable', from: [8, -250], bar: 120 },
        ],
        frames: [
            {
                label: 'Arms up',
                hold: 200,
                ms: 1200,
                pose: {
                    hips: [0, -58],
                    torso: 190,
                    handsApart: 90,
                    elbowsOut: 0.8,
                    arms: both(reach(6, -163, 'cw')),
                    legs: [reach(30, -4, 'ccw'), reach(27, -4, 'ccw')],
                },
            },
            {
                label: 'Bar to the chest',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -58],
                    torso: 190,
                    handsApart: 90,
                    elbowsOut: 0.8,
                    arms: both(reach(4, -122, 'cw')),
                    legs: [reach(30, -4, 'ccw'), reach(27, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:seated-cable-row': {
        view: 'side',
        kit: [
            frame([-16, -32], [-16, 0]),
            pad([-36, -32], [4, -32]),
            { kind: 'block', from: [66, -45], to: [72, 0] },
            { kind: 'cable', from: [82, -60], bar: 30 },
        ],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1000,
                pose: {
                    hips: [-16, -40],
                    torso: 160,
                    arms: both(reach(57, -70, 'cw')),
                    handsApart: 22,
                    legs: [reach(58, -22, 'ccw'), reach(56, -22, 'ccw')],
                    feet: [180, 180],
                },
            },
            {
                label: 'Handle to the belly',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [-16, -40],
                    torso: 185,
                    arms: both(reach(6, -70, 'cw')),
                    handsApart: 22,
                    legs: [reach(58, -22, 'ccw'), reach(56, -22, 'ccw')],
                    feet: [180, 180],
                },
            },
        ],
    },
    'builtin:triceps-pushdown': {
        view: 'side',
        kit: [{ kind: 'cable', from: [34, -225], bar: 40 }],
        frames: [
            {
                label: 'Hands up',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, torso: 174, arms: both(angles(10, 140)), handsApart: 26 },
            },
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1200,
                pose: { ...STANDING, torso: 174, arms: both(angles(6, 14)), handsApart: 26 },
            },
        ],
    },
    'builtin:kettlebell-swing': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Bell between the legs',
                ms: 600,
                pose: {
                    hips: [-24, -84],
                    torso: 110,
                    head: 135,
                    arms: both(angles(-15, -15)),
                    handsApart: 8,
                    heldBy: 0.5,
                    stance: 48,
                    legs: FEET,
                },
            },
            {
                label: 'Hips forward, bell up',
                hold: 100,
                ms: 600,
                pose: {
                    ...STANDING,
                    arms: both(angles(90, 90)),
                    handsApart: 8,
                    heldBy: 0.5,
                    stance: 48,
                },
            },
        ],
    },
    'builtin:leg-press': {
        view: 'side',
        props: ['foot-plate'],
        kit: [
            frame([10, -30], [10, 0]),
            pad([-6, -30], [16, -30]),
            pad([-4, -32], [-50, -60]),
            frame([20, -30], [100, -110]),
        ],
        frames: [
            {
                label: 'Knees in',
                hold: 150,
                ms: 1400,
                pose: {
                    hips: [0, -42],
                    torso: 240,
                    arms: both(angles(40, 60)),
                    legs: [reach(38, -80, 'ccw'), reach(36, -78, 'ccw')],
                    feet: [225, 225],
                },
            },
            {
                label: 'Legs pushed out',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -42],
                    torso: 240,
                    arms: both(angles(40, 60)),
                    legs: [reach(60, -102, 'ccw'), reach(58, -100, 'ccw')],
                    feet: [225, 225],
                },
            },
        ],
    },
    'builtin:leg-curl': {
        view: 'side',
        props: ['roller-behind-ankles'],
        kit: bench(-45, 75),
        frames: [
            {
                label: 'Legs long',
                hold: 200,
                ms: 1100,
                pose: {
                    hips: [0, -54],
                    torso: 90,
                    arms: both(angles(30, 100)),
                    legs: both(angles(-90, -90)),
                    feet: [-160, -160],
                },
            },
            {
                label: 'Heels to the seat',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -54],
                    torso: 90,
                    arms: both(angles(30, 100)),
                    legs: both(angles(-90, -175)),
                    feet: [-160, -160],
                },
            },
        ],
    },
    'builtin:leg-extension': {
        view: 'side',
        props: ['roller-on-shins'],
        kit: [frame([10, -48], [10, 0]), pad([-18, -48], [40, -48]), pad([-17, -60], [-24, -125])],
        frames: [
            {
                label: 'Knees bent',
                hold: 200,
                ms: 1100,
                pose: {
                    hips: [0, -58],
                    torso: 175,
                    arms: both(angles(10, 60)),
                    legs: both(angles(90, 5)),
                },
            },
            {
                label: 'Legs straight',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -58],
                    torso: 175,
                    arms: both(angles(10, 60)),
                    legs: both(angles(90, 82)),
                },
            },
        ],
    },
    'builtin:calf-raise': {
        view: 'side',
        kit: [{ kind: 'block', from: [5, -20], to: [60, 0] }],
        frames: [
            {
                label: 'Heels down',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [0.8, -110],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: both(reach(0.8, -22.2, 'ccw')),
                    feet: [110, 110],
                },
            },
            {
                label: 'Up on the toes',
                hold: 400,
                ms: 1000,
                pose: {
                    hips: [5, -126],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: both(reach(5, -37.8, 'ccw')),
                    feet: [40, 40],
                },
            },
        ],
    },
    'builtin:face-pull': {
        view: 'side',
        kit: [{ kind: 'cable', from: [95, -160] }],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1000,
                // Elbows bending down, as elbows do; in 3D they swing out to the sides as the
                // rope comes to the face
                pose: { ...STANDING, arms: both(reach(52, -150, 'cw')) },
            },
            {
                label: 'Rope to the face',
                hold: 400,
                ms: 1200,
                pose: { ...STANDING, arms: both(reach(18, -160, 'cw')), elbowsOut: 1 },
            },
        ],
    },
    'builtin:cable-crossover': {
        view: 'front',
        kit: [
            { kind: 'cable', from: [-82, -215] },
            { kind: 'cable', from: [82, -215] },
        ],
        frames: [
            {
                label: 'Arms open',
                hold: 200,
                ms: 1200,
                pose: {
                    ...FRONT_STANDING,
                    arms: [reach(-62, -146, 'cw'), reach(62, -146, 'ccw')],
                    handsForward: 22,
                },
            },
            {
                label: 'Hands together',
                hold: 400,
                ms: 1300,
                pose: {
                    ...FRONT_STANDING,
                    arms: [reach(-6, -106, 'cw'), reach(6, -106, 'ccw')],
                    handsForward: 36,
                },
            },
        ],
    },
    'builtin:hack-squat': {
        view: 'side',
        kit: [frame([10, -40], [-40, -170]), pad([1.7, -50], [-30, -138])],
        frames: [
            {
                label: 'Standing',
                hold: 300,
                ms: 1500,
                pose: {
                    hips: [0, -90],
                    torso: 200,
                    arms: both(touch(6, 4, 'cw')),
                    legs: [reach(18, -4, 'ccw'), reach(15, -4, 'ccw')],
                },
            },
            {
                label: 'Bottom',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [13, -54],
                    torso: 200,
                    arms: both(touch(6, 4, 'cw')),
                    legs: [reach(18, -4, 'ccw'), reach(15, -4, 'ccw')],
                },
            },
        ],
    },
    'builtin:back-extension': {
        view: 'side',
        kit: [
            frame([-2, -59], [-2, 0]),
            pad([5, -66], [-9, -52]),
            pad([-73, -25], [-63, -17]),
            { kind: 'block', from: [-80, -4], to: [-30, 0] },
        ],
        frames: [
            {
                label: 'Body straight',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [0, -78],
                    torso: 135,
                    arms: both(touch(10, -6, 'cw')),
                    handsApart: -26,
                    legs: both(angles(-45, -45)),
                    feet: [45, 45],
                },
            },
            {
                label: 'Bent forward',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [0, -78],
                    torso: 50,
                    arms: both(touch(10, -6, 'cw')),
                    handsApart: -26,
                    legs: both(angles(-45, -45)),
                    feet: [45, 45],
                },
            },
        ],
    },
    'builtin:seated-calf-raise': {
        view: 'side',
        props: ['pad-on-knees'],
        kit: [
            frame([-2, -50], [-2, 0]),
            pad([-18, -50], [14, -50]),
            // Low enough for the balls of the feet to stand on it, the heels off its edge
            { kind: 'block', from: [48, -13], to: [78, 0] },
        ],
        frames: [
            {
                label: 'Heels down',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [0, -58],
                    torso: 180,
                    arms: both(reach(44, -76, 'cw')),
                    legs: both(reach(44.8, -14.2, 'ccw')),
                    feet: [110, 110],
                },
            },
            {
                label: 'Heels up',
                hold: 400,
                ms: 1000,
                pose: {
                    hips: [0, -58],
                    torso: 180,
                    arms: both(reach(44, -80, 'cw')),
                    legs: both(reach(49, -32, 'ccw')),
                    feet: [40, 40],
                },
            },
        ],
    },
    // From the front, sitting, the thighs towards you: the knees push out
    'builtin:hip-abduction': {
        view: 'front',
        kit: frontSeat(),
        frames: [
            {
                label: 'Knees together',
                hold: 200,
                ms: 1100,
                pose: { ...FRONT_SEATED, arms: frontHands(26, -62) },
            },
            {
                label: 'Knees out',
                hold: 400,
                ms: 1200,
                pose: {
                    ...FRONT_SEATED,
                    arms: frontHands(26, -62),
                    legs: [angles(-55, -14, [0.35, 0.85]), angles(55, 14, [0.35, 0.85])],
                },
            },
        ],
    },
    'builtin:hip-adduction': {
        view: 'front',
        kit: frontSeat(),
        frames: [
            {
                label: 'Knees out',
                hold: 200,
                ms: 1100,
                pose: {
                    ...FRONT_SEATED,
                    arms: frontHands(26, -62),
                    legs: [angles(-55, -14, [0.35, 0.85]), angles(55, 14, [0.35, 0.85])],
                },
            },
            {
                label: 'Knees together',
                hold: 400,
                ms: 1200,
                pose: { ...FRONT_SEATED, arms: frontHands(26, -62) },
            },
        ],
    },
    'builtin:straight-arm-pulldown': {
        view: 'side',
        kit: [{ kind: 'cable', from: [70, -225], bar: 60 }],
        frames: [
            {
                label: 'Arms up',
                hold: 200,
                ms: 1100,
                pose: {
                    ...STANDING,
                    hips: [-6, -91],
                    torso: 165,
                    arms: both(angles(145, 150)),
                    handsApart: 48,
                },
            },
            {
                label: 'Hands to the thighs',
                hold: 300,
                ms: 1300,
                pose: {
                    ...STANDING,
                    hips: [-6, -91],
                    torso: 165,
                    arms: both(angles(15, 15)),
                    handsApart: 48,
                },
            },
        ],
    },
    // From the front, arms reaching towards you, so drawn short, then pulled out wide
    'builtin:band-pull-apart': {
        view: 'front',
        props: ['band'],
        frames: [
            {
                label: 'Hands together',
                hold: 200,
                ms: 300,
                pose: {
                    ...FRONT_STANDING,
                    arms: [angles(90, 90, [0.2, 0.2]), angles(-90, -90, [0.2, 0.2])],
                },
            },
            {
                label: 'Pulling apart',
                ms: 900,
                pose: {
                    ...FRONT_STANDING,
                    arms: [angles(-90, -90, [0.25, 0.25]), angles(90, 90, [0.25, 0.25])],
                },
            },
            {
                label: 'Arms wide',
                hold: 400,
                ms: 900,
                pose: {
                    ...FRONT_STANDING,
                    // In 3D a touch in front of the body, so the band passes in front of the chest
                    arms: [angles(-90, -90, [0.94, 0.94]), angles(90, 90, [0.94, 0.94])],
                },
            },
            {
                label: 'Coming back',
                ms: 300,
                pose: {
                    ...FRONT_STANDING,
                    arms: [angles(-90, -90, [0.25, 0.25]), angles(90, 90, [0.25, 0.25])],
                },
            },
        ],
    },
    'builtin:cable-curl': {
        view: 'side',
        kit: [{ kind: 'cable', from: [45, -8], each: true }],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, arms: both(angles(4, 10)) },
            },
            {
                label: 'Curled',
                hold: 300,
                ms: 1400,
                pose: { ...STANDING, arms: both(angles(8, 150)) },
            },
        ],
    },
    'builtin:kettlebell-thruster': {
        view: 'side',
        props: ['kettlebells'],
        frames: [
            {
                label: 'Bottom',
                hold: 150,
                ms: 1000,
                pose: {
                    hips: [-14, -46],
                    torso: 160,
                    head: 165,
                    arms: both(touch(14, -6, 'cw')),
                    legs: FEET,
                },
            },
            {
                label: 'Standing, bell overhead',
                hold: 300,
                ms: 1100,
                pose: { ...STANDING, arms: both(touch(2, 54, 'cw')) },
            },
        ],
    },
    'builtin:kettlebell-clean-and-press': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Bell between the legs',
                ms: 600,
                pose: {
                    hips: [-24, -84],
                    torso: 110,
                    head: 135,
                    arms: [reach(-6, -52, 'cw'), angles(-10, 0)],
                    legs: FEET,
                },
            },
            {
                label: 'At the shoulder',
                hold: 300,
                ms: 900,
                pose: { ...STANDING, arms: [reach(14, -136, 'cw'), angles(-4, 0)] },
            },
            {
                label: 'Overhead',
                hold: 300,
                ms: 900,
                pose: { ...STANDING, arms: [reach(2, -199, 'cw'), angles(-4, 0)] },
            },
            {
                label: 'Back to the shoulder',
                hold: 200,
                ms: 700,
                pose: { ...STANDING, arms: [reach(14, -136, 'cw'), angles(-4, 0)] },
            },
        ],
    },
    'builtin:kettlebell-snatch': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Bell between the legs',
                ms: 500,
                pose: {
                    hips: [-24, -84],
                    torso: 110,
                    head: 135,
                    arms: [reach(-6, -52, 'cw'), angles(-10, 0)],
                    legs: FEET,
                },
            },
            {
                label: 'Pulling up',
                ms: 400,
                pose: { ...STANDING, arms: [reach(20, -160, 'cw'), angles(-4, 0)] },
            },
            {
                label: 'Overhead',
                hold: 400,
                ms: 450,
                pose: { ...STANDING, arms: [reach(2, -199, 'cw'), angles(-4, 0)] },
            },
            {
                label: 'Coming down in front',
                ms: 450,
                through: true,
                pose: { ...STANDING, arms: [reach(52, -128, 'cw'), angles(-4, 0)] },
            },
        ],
    },
    'builtin:kettlebell-pistol-squat': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Standing on one leg',
                hold: 300,
                ms: 1600,
                pose: {
                    hips: [0, -92],
                    torso: 180,
                    arms: both(touch(14, -12, 'cw')),
                    legs: [reach(0, -4, 'ccw'), angles(30, 20)],
                },
            },
            {
                label: 'Bottom, other leg out',
                hold: 150,
                ms: 1400,
                pose: {
                    hips: [-18, -40],
                    torso: 145,
                    arms: both(touch(14, -12, 'cw')),
                    legs: [reach(0, -4, 'ccw'), angles(82, 86)],
                },
            },
        ],
    },
    'builtin:kettlebell-floor-press': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Elbow on the floor',
                hold: 200,
                ms: 1200,
                pose: {
                    ...ON_FLOOR,
                    arms: [angles(90, 180), angles(90, 90)],
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
            {
                label: 'Arm straight',
                hold: 300,
                ms: 1200,
                pose: {
                    ...ON_FLOOR,
                    arms: [angles(180, 180), angles(90, 90)],
                    legs: both(reach(40, -4, 'ccw')),
                },
            },
        ],
    },
    'builtin:turkish-get-up': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Lying, bell up',
                hold: 300,
                ms: 900,
                pose: {
                    ...ON_FLOOR,
                    arms: [angles(180, 180), reach(10, -8, 'ccw')],
                    legs: [reach(36, -4, 'ccw'), reach(86, -8, 'ccw')],
                },
            },
            {
                label: 'Up on the elbow',
                hold: 200,
                ms: 800,
                pose: {
                    ...ON_FLOOR,
                    torso: -135,
                    arms: [angles(180, 180), reach(-40, -8, 'ccw')],
                    legs: [reach(36, -4, 'ccw'), reach(86, -8, 'ccw')],
                },
            },
            {
                label: 'Up on the hand',
                hold: 200,
                ms: 1000,
                pose: {
                    ...ON_FLOOR,
                    torso: -160,
                    arms: [angles(180, 180), reach(-45, -8, 'ccw')],
                    legs: [reach(36, -4, 'ccw'), reach(86, -8, 'ccw')],
                },
            },
            {
                label: 'Kneeling',
                hold: 200,
                ms: 1000,
                pose: {
                    hips: [-10, -50],
                    torso: -180,
                    arms: [angles(180, 180), reach(-12, -40, 'ccw')],
                    legs: [reach(24, -4, 'ccw'), reach(-54, -6, 'ccw')],
                },
            },
            {
                label: 'Standing',
                hold: 400,
                ms: 1000,
                pose: {
                    hips: [0, -92],
                    torso: -180,
                    arms: [angles(180, 180), reach(2, -82, 'ccw')],
                    legs: [reach(0, -4, 'ccw'), reach(-3, -4, 'ccw')],
                },
            },
            {
                label: 'Kneeling',
                hold: 200,
                ms: 1000,
                pose: {
                    hips: [-10, -50],
                    torso: -180,
                    arms: [angles(180, 180), reach(-12, -40, 'ccw')],
                    legs: [reach(24, -4, 'ccw'), reach(-54, -6, 'ccw')],
                },
            },
            {
                label: 'Down on the hand',
                hold: 200,
                ms: 800,
                pose: {
                    ...ON_FLOOR,
                    torso: -160,
                    arms: [angles(180, 180), reach(-45, -8, 'ccw')],
                    legs: [reach(36, -4, 'ccw'), reach(86, -8, 'ccw')],
                },
            },
            {
                label: 'Down on the elbow',
                hold: 200,
                ms: 900,
                pose: {
                    ...ON_FLOOR,
                    torso: -135,
                    arms: [angles(180, 180), reach(-40, -8, 'ccw')],
                    legs: [reach(36, -4, 'ccw'), reach(86, -8, 'ccw')],
                },
            },
        ],
    },
    // Feet wide enough that the shins stand upright at the bottom
    'builtin:kettlebell-sumo-high-pull': {
        view: 'front',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Bell low',
                hold: 200,
                ms: 900,
                pose: {
                    hips: [0, -57],
                    torso: 180,
                    arms: [reach(-4, -54, 'cw'), reach(4, -54, 'ccw')],
                    elbowsOut: 1,
                    handsForward: 18,
                    heldBy: 0.5,
                    legs: [reach(-52, -11.5, 'cw'), reach(52, -11.5, 'ccw')],
                },
            },
            {
                label: 'Bell to the chin',
                hold: 300,
                ms: 1000,
                pose: {
                    hips: [0, -87],
                    torso: 180,
                    arms: [reach(-4, -140, 'cw'), reach(4, -140, 'ccw')],
                    handsForward: 22,
                    elbowsOut: 1,
                    heldBy: 0.5,
                    legs: [reach(-52, -11.5, 'cw'), reach(52, -11.5, 'ccw')],
                },
            },
        ],
    },
    // Holding the bell on the floor behind the head with both hands
    'builtin:kettlebell-reverse-crunch': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Knees over the hips',
                hold: 200,
                ms: 1000,
                pose: {
                    ...ON_FLOOR,
                    arms: both(reach(-98, -19, 'cw')),
                    handsApart: 8,
                    heldBy: 0.5,
                    legs: both(angles(180, 90)),
                },
            },
            {
                label: 'Knees to the chest',
                hold: 300,
                ms: 1100,
                pose: {
                    hips: [0, -17],
                    torso: -84,
                    head: -90,
                    arms: both(reach(-98, -19, 'cw')),
                    handsApart: 8,
                    heldBy: 0.5,
                    legs: both(angles(215, 130)),
                },
            },
        ],
    },
    // Each hand in turn reaches under the body and drags the bell across to its own side; in 3D
    // the bell is set down between pulls
    'builtin:plank-pull-through': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Hand under to the bell',
                hold: 200,
                ms: 800,
                pose: {
                    ...PLANK_HIGH,
                    arms: [reach(114, -20, 'cw'), reach(125, -5.5, 'cw')],
                    handsOut: [-42, 0],
                    bellAt: [114, -20, -25],
                },
            },
            {
                label: 'Pulled across',
                ms: 800,
                pose: {
                    ...PLANK_HIGH,
                    arms: [reach(114, -20, 'cw'), reach(125, -5.5, 'cw')],
                    handsOut: [8, 0],
                    bellAt: [114, -20, 25],
                },
            },
            {
                label: 'Hand back down',
                hold: 200,
                ms: 800,
                pose: {
                    ...PLANK_HIGH,
                    arms: [reach(128, -5.5, 'cw'), reach(125, -5.5, 'cw')],
                    handsOut: [0, 0],
                    bellAt: [114, -20, 25],
                },
            },
            {
                label: 'Other hand under',
                hold: 200,
                ms: 800,
                pose: {
                    ...PLANK_HIGH,
                    arms: [reach(128, -5.5, 'cw'), reach(114, -20, 'cw')],
                    handsOut: [0, -42],
                    bellAt: [114, -20, 25],
                },
            },
            {
                label: 'Pulled back across',
                ms: 800,
                pose: {
                    ...PLANK_HIGH,
                    arms: [reach(128, -5.5, 'cw'), reach(114, -20, 'cw')],
                    handsOut: [0, 8],
                    bellAt: [114, -20, -25],
                },
            },
            {
                label: 'Hand back down',
                hold: 200,
                ms: 800,
                pose: {
                    ...PLANK_HIGH,
                    arms: [reach(128, -5.5, 'cw'), reach(125, -5.5, 'cw')],
                    handsOut: [0, 0],
                    bellAt: [114, -20, -25],
                },
            },
        ],
    },
    'builtin:half-kneeling-kettlebell-press': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'At the shoulder',
                hold: 300,
                ms: 1100,
                pose: {
                    ...HALF_KNEELING,
                    arms: [touch(14, -6, 'cw'), angles(-4, 0)],
                },
            },
            {
                label: 'Overhead',
                hold: 300,
                ms: 1200,
                pose: {
                    ...HALF_KNEELING,
                    arms: [touch(2, 54, 'cw'), angles(-4, 0)],
                },
            },
        ],
    },
    // Both hands on the bell by its horns, round the head close to it, the elbows forwards: in
    // 3D, by each ear one hand is in front of the head and the other behind it. Once round one
    // way, then back the other
    'builtin:kettlebell-halo': {
        view: 'front',
        props: ['kettlebell'],
        frames: [
            {
                label: 'In front of the chest',
                hold: 200,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: 24,
                    elbowsDown: 1,
                    arms: [reach(-5, -166, 'ccw'), reach(5, -166, 'cw')],
                },
            },
            {
                label: 'By one ear',
                through: true,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: [-6, 14],
                    elbowsForward: 1,
                    arms: [reach(-30, -195, 'ccw'), reach(-14, -195, 'cw')],
                },
            },
            {
                label: 'Behind the head',
                through: true,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: -18,
                    elbowsForward: 1,
                    arms: [reach(-6, -195, 'ccw'), reach(6, -195, 'cw')],
                },
            },
            {
                label: 'By the other ear',
                through: true,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: [14, -6],
                    elbowsForward: 1,
                    arms: [reach(14, -195, 'ccw'), reach(30, -195, 'cw')],
                },
            },
            {
                label: 'Back in front of the chest',
                hold: 200,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: 24,
                    elbowsDown: 1,
                    arms: [reach(-5, -166, 'ccw'), reach(5, -166, 'cw')],
                },
            },
            {
                label: 'The other way, by the other ear',
                through: true,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: [14, -6],
                    elbowsForward: 1,
                    arms: [reach(14, -195, 'ccw'), reach(30, -195, 'cw')],
                },
            },
            {
                label: 'Behind the head again',
                through: true,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: -18,
                    elbowsForward: 1,
                    arms: [reach(-6, -195, 'ccw'), reach(6, -195, 'cw')],
                },
            },
            {
                label: 'By the first ear',
                through: true,
                ms: 600,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0.5,
                    handsForward: [-6, 14],
                    elbowsForward: 1,
                    arms: [reach(-30, -195, 'ccw'), reach(-14, -195, 'cw')],
                },
            },
        ],
    },

    // Passed from hand to hand round the waist: in front, round one side, behind, round the other
    'builtin:kettlebell-around-the-world': {
        view: 'front',
        props: ['kettlebell'],
        frames: [
            {
                label: 'In front',
                ms: 500,
                pose: {
                    ...FRONT_STANDING,
                    handsForward: 22,
                    heldBy: 0.5,
                    arms: [reach(-4, -92, 'cw'), reach(4, -92, 'ccw')],
                },
            },
            {
                label: 'To one side',
                ms: 500,
                through: true,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 0,
                    arms: [reach(-36, -96, 'cw'), reach(36, -96, 'ccw')],
                },
            },
            {
                label: 'Behind',
                ms: 500,
                pose: {
                    ...FRONT_STANDING,
                    handsForward: -26,
                    heldBy: 0.5,
                    arms: [reach(-4, -96, 'cw'), reach(4, -96, 'ccw')],
                },
            },
            {
                label: 'To the other side',
                ms: 500,
                through: true,
                pose: {
                    ...FRONT_STANDING,
                    heldBy: 1,
                    arms: [reach(-36, -96, 'cw'), reach(36, -96, 'ccw')],
                },
            },
        ],
    },
    'builtin:kettlebell-push-up': {
        view: 'side',
        props: ['kettlebells'],
        frames: [
            {
                label: 'Top',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [82, -55.5],
                    torso: 115.2,
                    arms: [reach(125.4, -18, 'cw'), reach(123, -18, 'cw')],
                    legs: both(angles(-64.8, -64.8)),
                    feet: [15, 15],
                },
            },
            {
                label: 'Bottom',
                hold: 100,
                ms: 1000,
                pose: {
                    hips: [89.1, -33.3],
                    torso: 100,
                    arms: [reach(125.4, -18, 'cw'), reach(123, -18, 'cw')],
                    legs: both(angles(-80, -80)),
                    feet: [10, 10],
                },
            },
        ],
    },
    'builtin:kettlebell-lunge': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Up',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [-4, -85],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(32, -4, 'ccw'), reach(-40, -14, 'ccw')],
                    feet: [90, 40],
                },
            },
            {
                label: 'Down',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [-4, -52],
                    torso: 180,
                    arms: both(angles(0, 0)),
                    legs: [reach(32, -4, 'ccw'), reach(-40, -14, 'ccw')],
                    feet: [90, 40],
                },
            },
        ],
    },
    'builtin:kettlebell-curl': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'Arm long',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, arms: [angles(4, 6), angles(-4, 0)] },
            },
            {
                label: 'Curled',
                hold: 300,
                ms: 1400,
                pose: { ...STANDING, arms: [angles(8, 150), angles(-4, 0)] },
            },
        ],
    },
    'builtin:kettlebell-press': {
        view: 'side',
        props: ['kettlebell'],
        frames: [
            {
                label: 'At the shoulder',
                hold: 300,
                ms: 1100,
                pose: { ...STANDING, arms: [touch(14, -6, 'cw'), angles(-4, 0)] },
            },
            {
                label: 'Overhead',
                hold: 300,
                ms: 1200,
                pose: { ...STANDING, arms: [touch(2, 54, 'cw'), angles(-4, 0)] },
            },
        ],
    },
    'builtin:downward-dog': {
        view: 'side',
        frames: [
            {
                label: 'Hold',
                ms: 1000,
                pose: {
                    hips: [-16, -92],
                    torso: 35,
                    head: 30,
                    arms: both(reach(42, -5, 'cw')),
                    handsApart: 44,
                    legs: both(reach(-44, -8, 'ccw')),
                    feet: [70, 70],
                },
            },
        ],
    },
    'builtin:childs-pose': {
        view: 'side',
        frames: [
            {
                label: 'Hold',
                ms: 1000,
                pose: {
                    hips: [-36, -22],
                    torso: 95,
                    head: 60,
                    arms: both(reach(66, -5, 'cw')),
                    legs: both(angles(68, -90)),
                    feet: [-72, -72],
                },
            },
        ],
    },
    // The back is one piece, so it can't round: the hips and shoulders lift and the head tucks
    // for the cat, and they sink as the head lifts for the cow
    'builtin:cat-cow': {
        view: 'side',
        frames: [
            {
                label: 'Back rounded',
                hold: 400,
                ms: 1600,
                pose: { ...ALL_FOURS, hips: [0, -53.5], torso: 104, head: 55 },
            },
            {
                label: 'Back dipped',
                hold: 400,
                ms: 1600,
                pose: { ...ALL_FOURS, hips: [0, -50], torso: 111, head: 140 },
            },
        ],
    },
    'builtin:cobra-stretch': {
        view: 'side',
        frames: [
            {
                label: 'Lying face down',
                hold: 300,
                ms: 1500,
                pose: {
                    hips: [0, -11],
                    torso: 90,
                    head: 100,
                    arms: both(reach(44, -4, 'cw')),
                    legs: both(angles(-90, -90)),
                    feet: [-90, -90],
                },
            },
            {
                label: 'Chest up',
                hold: 1500,
                ms: 1300,
                pose: {
                    hips: [0, -11],
                    torso: 140,
                    head: 150,
                    arms: both(reach(44, -4, 'cw')),
                    legs: both(angles(-90, -90)),
                    feet: [-90, -90],
                },
            },
        ],
    },
    // Kneeling on the far knee, the near foot forward, as the steps say
    'builtin:kneeling-hip-flexor-stretch': {
        view: 'side',
        frames: [
            {
                label: 'Kneeling tall',
                hold: 300,
                ms: 1400,
                pose: {
                    hips: [0, -50],
                    torso: 180,
                    arms: both(angles(-4, 0)),
                    legs: [reach(40, -4, 'ccw'), angles(0, -90)],
                    feet: [90, -90],
                },
            },
            {
                label: 'Hips forward',
                hold: 1500,
                ms: 1300,
                pose: {
                    hips: [14, -48],
                    torso: 180,
                    arms: both(angles(-4, 0)),
                    legs: [reach(40, -4, 'ccw'), angles(-18.4, -90)],
                    feet: [90, -90],
                },
            },
        ],
    },
    // Standing on the far leg, the near hand holding the near foot behind
    'builtin:standing-quad-stretch': {
        view: 'side',
        frames: [
            {
                label: 'Hold',
                ms: 1000,
                pose: {
                    hips: [0, -92],
                    torso: 180,
                    legs: [angles(-13.5, -165), reach(0, -4, 'ccw')],
                    arms: [reach(-29.5, -79.5, 'cw'), angles(20, 30)],
                    handsOut: [-8, 0],
                    feet: [253.5, 90],
                    twist: 17,
                },
            },
        ],
    },
    'builtin:seated-hamstring-stretch': {
        view: 'side',
        frames: [
            {
                label: 'Sitting tall',
                hold: 300,
                ms: 1600,
                pose: {
                    hips: [0, -12],
                    torso: 180,
                    arms: both(reach(35, -20, 'cw')),
                    legs: both(angles(90, 90)),
                    feet: [180, 180],
                },
            },
            {
                label: 'Folded forward',
                hold: 1500,
                ms: 1400,
                pose: {
                    hips: [0, -12],
                    torso: 125,
                    head: 115,
                    arms: both(reach(78, -15, 'cw')),
                    legs: both(angles(90, 90)),
                    feet: [180, 180],
                },
            },
        ],
    },
    // The near knee forward and the shin folded back under it; in 3D the feet are drawn closer
    // together than the hips, so the shin runs across in front of them
    'builtin:pigeon-stretch': {
        view: 'side',
        frames: [
            {
                label: 'Hold',
                ms: 1000,
                pose: {
                    hips: [-21, -32],
                    torso: 136.5,
                    arms: both(reach(28, -5, 'cw')),
                    // Wide, so the near arm is outside the near knee
                    handsApart: 90,
                    legs: [reach(2, -5, 'ccw'), angles(-59.5, -92)],
                    feet: [90, -44],
                    stance: -4,
                },
            },
        ],
    },
    // In a lunge on the near foot, the far hand down inside it; the near elbow down to it, then
    // the near arm up as the chest turns towards it. In 3D only, the far hand is drawn off the
    // floor and out to the side as the chest turns, so it stays put once turned (flat, it lifts)
    'builtin:worlds-greatest-stretch': {
        view: 'side',
        frames: [
            {
                label: 'Hands down',
                hold: 300,
                ms: 1000,
                pose: {
                    hips: [50, -36.5],
                    torso: 115,
                    head: 100,
                    arms: [reach(64, -5, 'cw'), reach(60, -5, 'cw')],
                    // The near hand outside the front foot: inside, the arm goes through the leg
                    handsOut: [20, 0],
                    legs: [reach(62.5, -4, 'ccw'), reach(-34.5, -12, 'ccw')],
                    feet: [90, 55],
                },
            },
            {
                label: 'Elbow to the foot',
                hold: 500,
                ms: 500,
                pose: {
                    hips: [46, -33.5],
                    torso: 105,
                    head: 90,
                    // Outside the front knee: inside the foot, the arm goes through the leg
                    arms: [reach(90, -4, 'cw'), reach(60, -5, 'cw')],
                    handsOut: [5, 0],
                    legs: [reach(62.5, -4, 'ccw'), reach(-34.5, -12, 'ccw')],
                    feet: [90, 55],
                },
            },
            { label: 'Arm out', through: true, ms: 500, pose: WORLDS_GREATEST_ARM_OUT },
            {
                label: 'Arm up',
                hold: 800,
                ms: 550,
                pose: {
                    hips: [50, -38.5],
                    torso: 118,
                    head: 150,
                    twist: -45,
                    arms: [reach(97.2, -110, 'cw'), reach(51, -26, 'cw')],
                    handsOut: [40, 20],
                    legs: [reach(62.5, -4, 'ccw'), reach(-34.5, -12, 'ccw')],
                    feet: [90, 55],
                },
            },
            { label: 'Arm out', through: true, ms: 550, pose: WORLDS_GREATEST_ARM_OUT },
        ],
    },
    // On the hands and knees, the near arm up as the chest turns towards it, then threaded under
    // the body to the far side. As in the world's greatest stretch, the far hand is drawn off
    // the floor and out to the side as the chest turns, so in 3D it stays put. The near hand
    // passes down by the shoulder on the way, as going straight there takes the arm through
    // the chest
    'builtin:thread-the-needle': {
        view: 'side',
        frames: [
            {
                label: 'Arm up',
                hold: 500,
                ms: 800,
                pose: {
                    hips: [-9.5, -50],
                    torso: 107,
                    arms: [reach(-26.5, -113, 'cw'), reach(41.3, -20.4, 'cw')],
                    legs: both(reach(-44, -6, 'ccw')),
                    feet: [-70, -70],
                    head: 150,
                    twist: -30,
                    handsOut: [26.3, 25.9],
                },
            },
            { label: 'Hand down', through: true, ms: 700, pose: THREAD_HAND_DOWN },
            {
                label: 'Threaded under',
                hold: 800,
                ms: 700,
                pose: {
                    ...ALL_FOURS,
                    torso: 75,
                    head: 60,
                    arms: [reach(32, -5, 'cw'), reach(46, -5, 'cw')],
                    handsOut: [-46, 0],
                },
            },
            { label: 'Hand down', through: true, ms: 800, pose: THREAD_HAND_DOWN },
        ],
    },
    // Eleventh batch: resistance bands. A band tied to something, or under the feet, is drawn
    // as a cable from where it's held to the hands
    'builtin:band-row': {
        view: 'side',
        kit: [{ kind: 'cable', from: [86, -14], each: true }],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1000,
                pose: {
                    hips: [0, -12],
                    torso: 175,
                    arms: both(reach(52, -44, 'cw')),
                    legs: both(angles(88, 90)),
                    feet: [180, 180],
                },
            },
            {
                label: 'Hands to the belly',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [0, -12],
                    torso: 182,
                    arms: both(reach(10, -40, 'cw')),
                    legs: both(angles(88, 90)),
                    feet: [180, 180],
                },
            },
        ],
    },
    'builtin:band-chest-press': {
        view: 'side',
        kit: [{ kind: 'cable', from: [-10, -132], each: true }],
        frames: [
            {
                label: 'Hands at the chest',
                hold: 200,
                ms: 1000,
                pose: { ...STANDING, arms: both(reach(16, -126, 'cw')), elbowsOut: 0.5 },
            },
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1200,
                pose: { ...STANDING, arms: both(reach(58, -130, 'cw')), handsApart: 30 },
            },
        ],
    },
    'builtin:band-overhead-press': {
        view: 'front',
        // Under the feet, up in front of the body to the hands
        kit: [{ kind: 'cable', from: [0, -3], each: true, apart: 26 }],
        frames: [
            {
                label: 'At the shoulders',
                hold: 200,
                ms: 1200,
                pose: { ...FRONT_STANDING, arms: frontHandsUp(30, -153), handsForward: 14 },
            },
            {
                label: 'Overhead',
                hold: 300,
                ms: 1300,
                pose: { ...FRONT_STANDING, arms: frontHandsUp(14, -207), handsForward: 14 },
            },
        ],
    },
    'builtin:band-face-pull': {
        view: 'side',
        kit: [{ kind: 'cable', from: [95, -160], each: true }],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1000,
                pose: { ...STANDING, arms: both(reach(52, -150, 'cw')) },
            },
            {
                label: 'Hands to the face',
                hold: 400,
                ms: 1200,
                pose: { ...STANDING, arms: both(reach(18, -160, 'cw')), elbowsOut: 1 },
            },
        ],
    },
    'builtin:band-curl': {
        view: 'side',
        kit: [{ kind: 'cable', from: [4, -3], each: true }],
        frames: [
            {
                label: 'Arms long',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, arms: both(angles(4, 6)) },
            },
            {
                label: 'Curled',
                hold: 300,
                ms: 1400,
                pose: { ...STANDING, arms: both(angles(8, 150)) },
            },
        ],
    },
    'builtin:band-triceps-pushdown': {
        view: 'side',
        kit: [{ kind: 'cable', from: [34, -225], each: true }],
        frames: [
            {
                label: 'Hands up',
                hold: 200,
                ms: 1100,
                pose: { ...STANDING, torso: 174, arms: both(angles(10, 140)), handsApart: 26 },
            },
            {
                label: 'Arms straight',
                hold: 300,
                ms: 1200,
                pose: { ...STANDING, torso: 174, arms: both(angles(6, 14)), handsApart: 26 },
            },
        ],
    },
    'builtin:band-squat': {
        view: 'side',
        // Under the feet, up outside them to the hands
        kit: [{ kind: 'cable', from: [4, -3], each: true, apart: 52 }],
        frames: [
            {
                label: 'Standing',
                hold: 300,
                ms: 1300,
                pose: {
                    ...STANDING,
                    arms: both(touch(12, -2, 'cw')),
                    handsApart: 46,
                    stance: 30,
                },
            },
            {
                label: 'Bottom',
                hold: 150,
                ms: 1100,
                pose: {
                    hips: [-22, -46],
                    torso: 137,
                    head: 155,
                    arms: both(touch(12, -2, 'cw')),
                    handsApart: 46,
                    stance: 30,
                    legs: FEET,
                },
            },
        ],
    },
    'builtin:band-pull-through': {
        view: 'side',
        kit: [{ kind: 'cable', from: [-120, -24] }],
        frames: [
            {
                label: 'Hips back',
                hold: 150,
                ms: 900,
                pose: {
                    hips: [-24, -84],
                    torso: 110,
                    head: 135,
                    arms: both(angles(-25, -25)),
                    handsApart: 8,
                    stance: 40,
                    legs: FEET,
                },
            },
            {
                label: 'Standing tall',
                hold: 300,
                ms: 1000,
                pose: {
                    ...STANDING,
                    arms: both(angles(16, 16)),
                    handsApart: 8,
                    stance: 40,
                },
            },
        ],
    },
    'builtin:band-lateral-walk': {
        view: 'front',
        props: ['leg-band'],
        // A step to the figure's left and the other foot following, then back again
        frames: [
            { label: 'Feet apart', hold: 150, ms: 350, pose: lateralWalk(0, -12, 12) },
            {
                label: 'Stepping out',
                through: true,
                ms: 350,
                pose: lateralWalk(7, -12, 34, 'far'),
            },
            { label: 'Wide', hold: 100, ms: 350, pose: lateralWalk(14, -12, 40) },
            {
                label: 'The other foot following',
                through: true,
                ms: 350,
                pose: lateralWalk(21, 4, 40, 'near'),
            },
            { label: 'Feet apart again', hold: 150, ms: 350, pose: lateralWalk(28, 16, 40) },
            {
                label: 'Stepping back',
                through: true,
                ms: 350,
                pose: lateralWalk(21, -2, 40, 'near'),
            },
            { label: 'Wide again', hold: 100, ms: 350, pose: lateralWalk(14, -12, 40) },
            {
                label: 'Following back',
                through: true,
                ms: 350,
                pose: lateralWalk(7, -12, 22, 'far'),
            },
        ],
    },
    'builtin:pallof-press': {
        view: 'front',
        seenFrom: 35,
        kit: [{ kind: 'cable', from: [-95, -130] }],
        frames: [
            {
                label: 'Hands at the chest',
                hold: 200,
                ms: 1000,
                pose: { ...FRONT_STANDING, arms: frontHands(4, -128), handsForward: 14 },
            },
            {
                label: 'Pressed out',
                hold: 800,
                ms: 1000,
                pose: {
                    ...FRONT_STANDING,
                    arms: frontHands(3, -136),
                    handsForward: 50,
                },
            },
        ],
    },
};
