import { BUILT_IN_EXERCISE_MOTION } from './built-in-exercise-motion';
import { BODY, ExerciseMotion, loopLength, Pose, poseAt } from './exercise-motion';
import {
    dot3,
    HIP_SPREAD,
    length3,
    Limb3,
    motionJoints,
    SHOULDER_SPREAD,
    skeletonOf,
    sub3,
    Vec3,
} from './exercise-skeleton';

const distance = (a: Vec3, b: Vec3) => length3(sub3(a, b));
const close = (a: Vec3, b: Vec3) => a.forEach((value, i) => expect(value).toBeCloseTo(b[i], 5));

const standing: Pose = {
    hips: [0, -92],
    torso: 180,
    arms: [{ angles: [0, 0] }, { angles: [0, 0] }],
    legs: [
        { reach: [0, -4], bend: 'ccw' },
        { reach: [0, -4], bend: 'ccw' },
    ],
};
const side = (pose: Pose): ExerciseMotion => ({
    view: 'side',
    frames: [{ label: 'Hold', pose, ms: 1000 }],
});
const front = (pose: Pose): ExerciseMotion => ({ ...side(pose), view: 'front' });

/** Each part of a limb keeps its length, however it was drawn. */
function expectLengths(limb: Limb3, upper: number, lower: number) {
    expect(distance(limb.root, limb.mid)).toBeCloseTo(upper, 4);
    expect(distance(limb.mid, limb.end)).toBeCloseTo(lower, 4);
}

describe('skeletonOf', () => {
    it('lifts a figure drawn from the side: facing +x, up +y, its near limbs on its right', () => {
        const skeleton = skeletonOf(standing, side(standing));

        close(skeleton.hips, [0, 92, 0]);
        close(skeleton.up, [0, 1, 0]);
        close(skeleton.forward, [1, 0, 0]);
        close(skeleton.right, [0, 0, 1]);
        expect(skeleton.shoulders[1]).toBeCloseTo(92 + BODY.torso, 5);
        expect(skeleton.arms[0].root[2]).toBeCloseTo(SHOULDER_SPREAD, 5);
        expect(skeleton.arms[1].root[2]).toBeCloseTo(-SHOULDER_SPREAD, 5);
        expect(skeleton.legs[0].root[2]).toBeCloseTo(HIP_SPREAD, 5);
        expect(skeleton.arms.map((arm) => arm.side)).toEqual([1, -1]);
        // Feet flat, pointing forwards
        close(skeleton.feet[0], [1, 0, 0]);
    });

    it('lifts a figure drawn from the front the same way round', () => {
        const pose: Pose = { ...standing, hips: [0, -99.5] };
        const skeleton = skeletonOf(pose, front(pose));

        close(skeleton.forward, [1, 0, 0]);
        close(skeleton.right, [0, 0, 1]);
        // The near arm, on your left as drawn, is the figure's right
        expect(skeleton.arms[0].root[2]).toBeGreaterThan(0);
        expect(skeleton.arms[1].root[2]).toBeLessThan(0);
        close(skeleton.feet[0], [1, 0, 0]);
    });

    it('keeps every part its length, as drawn or reaching', () => {
        const skeleton = skeletonOf(standing, side(standing));

        skeleton.arms.forEach((arm) => expectLengths(arm, BODY.upperArm, BODY.forearm));
        skeleton.legs.forEach((leg) => expectLengths(leg, BODY.thigh, BODY.shin));
    });

    it('points a part drawn shorter out of the drawing by the length it misses', () => {
        // A fly's arms opening: towards you from the side, the far one away
        const open: Pose = {
            ...standing,
            arms: [
                { angles: [180, 180], scale: [0.2, 0.2] },
                { angles: [180, 180], scale: [0.2, 0.2] },
            ],
        };
        const skeleton = skeletonOf(open, side(open));

        skeleton.arms.forEach((arm) => expectLengths(arm, BODY.upperArm, BODY.forearm));
        expect(skeleton.arms[0].end[2]).toBeGreaterThan(SHOULDER_SPREAD + 50);
        expect(skeleton.arms[1].end[2]).toBeLessThan(-SHOULDER_SPREAD - 50);

        // A thigh drawn short from the front, sitting, points forwards
        const sitting: Pose = {
            ...standing,
            hips: [0, -58],
            legs: [
                { angles: [-10, -6], scale: [0.25, 0.85] },
                { angles: [10, 6], scale: [0.25, 0.85] },
            ],
        };
        const seated = skeletonOf(sitting, front(sitting));
        seated.legs.forEach((leg) => {
            expectLengths(leg, BODY.thigh, BODY.shin);
            expect(leg.mid[0] - leg.root[0]).toBeGreaterThan(40);
        });
    });

    it('turns the shoulders, arms and head about the back by its twist', () => {
        const reaching: Pose = {
            ...standing,
            arms: [{ angles: [90, 90] }, { angles: [90, 90] }],
        };
        const still = skeletonOf(reaching, side(reaching));
        const turned = skeletonOf({ ...reaching, twist: 90 }, side(reaching));

        // Turned to the figure's left, a quarter turn: the arms reach that way, not forwards
        close(turned.forward, [0, 0, -1]);
        expect(turned.arms[0].end[2]).toBeLessThan(-40);
        expect(turned.arms[0].end[1]).toBeCloseTo(still.arms[0].end[1], 5);
        // The legs and hips stay
        expect(turned.legs).toEqual(still.legs);
        close(turned.hips, still.hips);
    });

    it('brings the hands together when told how far apart they are', () => {
        const together: Pose = {
            ...standing,
            arms: [{ angles: [60, 120] }, { angles: [60, 120] }],
            handsApart: 4,
        };
        const skeleton = skeletonOf(together, side(together));

        expect(Math.abs(skeleton.arms[0].end[2] - skeleton.arms[1].end[2])).toBeCloseTo(4, 4);
        skeleton.arms.forEach((arm) => expectLengths(arm, BODY.upperArm, BODY.forearm));
    });
});

describe('skeletonOf, placing the hands in 3D', () => {
    it('brings the hands forwards from the front by handsForward', () => {
        const pose: Pose = {
            ...standing,
            hips: [0, -99.5],
            arms: [
                { reach: [-6, -106], bend: 'cw' },
                { reach: [6, -106], bend: 'ccw' },
            ],
        };
        const flat = skeletonOf(pose, front(pose));
        const forward = skeletonOf({ ...pose, handsForward: 30 }, front(pose));

        forward.arms.forEach((arm, i) => {
            expect(arm.end[0] - flat.arms[i].end[0]).toBeCloseTo(30, 4);
            expectLengths(arm, BODY.upperArm, BODY.forearm);
        });
    });

    it('points the elbows out to the sides with elbowsOut, the hands staying put', () => {
        const pulled: Pose = {
            ...standing,
            arms: [
                { reach: [18, -160], bend: 'ccw' },
                { reach: [18, -160], bend: 'ccw' },
            ],
        };
        const up = skeletonOf(pulled, side(pulled));
        const out = skeletonOf({ ...pulled, elbowsOut: 1 }, side(pulled));

        out.arms.forEach((arm, i) => {
            close(arm.end, up.arms[i].end);
            expectLengths(arm, BODY.upperArm, BODY.forearm);
            // Further out to its own side than the shoulder, and no higher than drawn
            expect(arm.mid[2] * arm.side).toBeGreaterThan(arm.root[2] * arm.side + 10);
            expect(arm.mid[1]).toBeLessThan(up.arms[i].mid[1] + 1e-6);
        });
    });

    it('brings each hand forwards by its own amount when given one for each', () => {
        const pose: Pose = {
            ...standing,
            hips: [0, -99.5],
            arms: [
                { reach: [-6, -160], bend: 'ccw' },
                { reach: [6, -160], bend: 'cw' },
            ],
        };
        const flat = skeletonOf(pose, front(pose));
        const each = skeletonOf({ ...pose, handsForward: [-8, 12] }, front(pose));

        expect(each.arms[0].end[0] - flat.arms[0].end[0]).toBeCloseTo(-8, 4);
        expect(each.arms[1].end[0] - flat.arms[1].end[0]).toBeCloseTo(12, 4);
        each.arms.forEach((arm) => expectLengths(arm, BODY.upperArm, BODY.forearm));
    });

    it('points the elbows forwards with elbowsForward, the hands staying put', () => {
        // Hands beside the head, as in a kettlebell halo
        const pose: Pose = {
            ...standing,
            hips: [0, -99.5],
            arms: [
                { reach: [-26, -176], bend: 'ccw' },
                { reach: [26, -176], bend: 'cw' },
            ],
        };
        const drawn = skeletonOf(pose, front(pose));
        const forwards = skeletonOf({ ...pose, elbowsForward: 1 }, front(pose));

        forwards.arms.forEach((arm, i) => {
            close(arm.end, drawn.arms[i].end);
            expectLengths(arm, BODY.upperArm, BODY.forearm);
            expect(arm.mid[0]).toBeGreaterThan(arm.root[0] + 10);
        });
    });

    it('points the knees forwards with kneesForward, the feet staying put', () => {
        // A half squat from the front, the knees bent out to the sides as drawn
        const pose: Pose = {
            ...standing,
            hips: [0, -89],
            legs: [
                { reach: [-12, -11.5], bend: 'cw' },
                { reach: [12, -11.5], bend: 'ccw' },
            ],
        };
        const drawn = skeletonOf(pose, front(pose));
        const forwards = skeletonOf({ ...pose, kneesForward: 1 }, front(pose));

        forwards.legs.forEach((leg, i) => {
            close(leg.end, drawn.legs[i].end);
            expectLengths(leg, BODY.thigh, BODY.shin);
            expect(leg.mid[0]).toBeGreaterThan(leg.root[0] + 10);
            // Not out past the foot, as drawn
            expect(Math.abs(leg.mid[2])).toBeLessThan(Math.abs(drawn.legs[i].mid[2]));
        });
    });

    it('points the elbows down the body with elbowsDown, the hands staying put', () => {
        // Hands in front of the shoulders, from the front, as an Arnold press starts
        const pose: Pose = {
            ...standing,
            hips: [0, -99.5],
            handsForward: 20,
            arms: [
                { reach: [-14, -160], bend: 'ccw' },
                { reach: [14, -160], bend: 'cw' },
            ],
        };
        const drawn = skeletonOf(pose, front(pose));
        const down = skeletonOf({ ...pose, elbowsDown: 1 }, front(pose));

        down.arms.forEach((arm, i) => {
            close(arm.end, drawn.arms[i].end);
            expectLengths(arm, BODY.upperArm, BODY.forearm);
            // Below the shoulder and the hand, and in front of the shoulder, not out to the side
            expect(arm.mid[1]).toBeLessThan(Math.min(arm.root[1], arm.end[1]));
            expect(Math.abs(arm.mid[2] - arm.root[2])).toBeLessThan(5);
        });
    });

    it('moves one hand across the body with handsOut, the other staying put', () => {
        const pose: Pose = {
            ...standing,
            arms: [
                { reach: [20, -100], bend: 'cw' },
                { reach: [20, -100], bend: 'cw' },
            ],
        };
        const drawn = skeletonOf(pose, side(pose));
        const across = skeletonOf({ ...pose, handsOut: [-30, 0] }, side(pose));

        expect(across.arms[0].end[2]).toBeCloseTo(drawn.arms[0].end[2] - 30, 4);
        close(across.arms[1].end, drawn.arms[1].end);
        expectLengths(across.arms[0], BODY.upperArm, BODY.forearm);
    });

    it('puts the feet wider apart for a wide stance, the knees out over them', () => {
        const squat: Pose = { ...standing, hips: [-20, -50], torso: 140 };
        const drawn = skeletonOf(squat, side(squat));
        const wide = skeletonOf({ ...squat, stance: 50 }, side(squat));

        expect(wide.legs[0].end[2] - wide.legs[1].end[2]).toBeCloseTo(50, 4);
        wide.legs.forEach((leg, i) => {
            expectLengths(leg, BODY.thigh, BODY.shin);
            expect(leg.mid[2] * leg.side).toBeGreaterThan(drawn.legs[i].mid[2] * leg.side);
        });
    });

    it('raises the body between thighs out to the sides, the legs staying put', () => {
        const sumo: Pose = {
            hips: [0, -57],
            torso: 180,
            arms: standing.arms,
            legs: [
                { reach: [-52, -11.5], bend: 'cw' },
                { reach: [52, -11.5], bend: 'ccw' },
            ],
        };
        const wide = skeletonOf(sumo, front(sumo));
        const upright = skeletonOf(standing, side(standing));

        // Above the hip joints the thighs hang from, with the shoulders and arms
        expect(wide.hips[1] - wide.legs[0].root[1]).toBeGreaterThan(5);
        expect(wide.shoulders[1] - wide.hips[1]).toBeCloseTo(BODY.torso, 4);
        wide.legs.forEach((leg) => expectLengths(leg, BODY.thigh, BODY.shin));
        // Not standing up straight
        expect(upright.hips[1] - upright.legs[0].root[1]).toBeCloseTo(0, 4);
    });

    it('puts a kettlebell in the hand that holds it, between the hands, or set down', () => {
        const pose: Pose = {
            ...standing,
            arms: [
                { reach: [20, -100], bend: 'cw' },
                { reach: [30, -100], bend: 'cw' },
            ],
        };
        const motion = side(pose);
        const [near, far] = skeletonOf(pose, motion).arms;

        close(skeletonOf(pose, motion).bell, near.end);
        close(skeletonOf({ ...pose, heldBy: 1 }, motion).bell, far.end);
        close(skeletonOf({ ...pose, heldBy: 0.5 }, motion).bell, [
            (near.end[0] + far.end[0]) / 2,
            (near.end[1] + far.end[1]) / 2,
            (near.end[2] + far.end[2]) / 2,
        ]);
        const down = skeletonOf({ ...pose, bellAt: [40, -19, -25] }, motion);
        close(down.bell, [40, 19, -25]);
        expect(down.bellDown).toBe(true);
    });

    it('carries a barbell held below the hips in front of the legs, not through them', () => {
        const pose: Pose = {
            hips: [-26, -60],
            torso: 112,
            arms: [
                { reach: [8, -17], bend: 'cw' },
                { reach: [8, -17], bend: 'cw' },
            ],
            legs: standing.legs,
        };
        const lift: ExerciseMotion = { ...side(pose), props: ['barbell'] };
        const skeleton = skeletonOf(pose, lift);
        const shin = skeleton.legs[0];
        const barX = skeleton.arms[0].end[0];

        // In front of the shin at the bar's height
        const t = (skeleton.arms[0].end[1] - shin.end[1]) / (shin.mid[1] - shin.end[1]);
        const shinX = shin.end[0] + (shin.mid[0] - shin.end[0]) * t;
        expect(barX).toBeGreaterThanOrEqual(shinX + 6.9);
        skeleton.arms.forEach((arm) => expectLengths(arm, BODY.upperArm, BODY.forearm));
    });
});

describe('motionJoints', () => {
    it('reaches the head and the hands in every position', () => {
        const raised: Pose = {
            ...standing,
            arms: [{ angles: [180, 180] }, { angles: [180, 180] }],
        };
        const motion: ExerciseMotion = {
            view: 'side',
            frames: [
                { label: 'Down', pose: standing, ms: 500 },
                { label: 'Up', pose: raised, ms: 500 },
            ],
        };
        const highest = Math.max(...motionJoints(motion).map((joint) => joint[1]));

        expect(highest).toBeGreaterThan(92 + BODY.torso + BODY.upperArm + BODY.forearm - 5);
    });
});

describe('BUILT_IN_EXERCISE_MOTION in 3D', () => {
    const motions = Object.entries(BUILT_IN_EXERCISE_MOTION) as [string, ExerciseMotion][];

    it.each(motions)('%s keeps every part its length, all through its loop', (_, motion) => {
        const steps = 12;
        for (let i = 0; i < steps; i++) {
            const skeleton = skeletonOf(poseAt(motion, (loopLength(motion) * i) / steps), motion);
            // A reach out of range stretches straight, so a part can come up short, but never long
            for (const [limb, upper, lower] of [
                ...skeleton.arms.map((arm) => [arm, BODY.upperArm, BODY.forearm] as const),
                ...skeleton.legs.map((leg) => [leg, BODY.thigh, BODY.shin] as const),
            ]) {
                expect(distance(limb.root, limb.mid)).toBeLessThanOrEqual(upper + 1e-6);
                expect(distance(limb.mid, limb.end)).toBeLessThanOrEqual(lower + 1e-6);
            }
            expect(dot3(skeleton.up, skeleton.right)).toBeCloseTo(0, 6);
        }
    });
});
