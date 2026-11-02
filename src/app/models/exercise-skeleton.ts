import {
    BODY,
    ExerciseMotion,
    HANDS_APART,
    lerpPose,
    MotionView,
    Point,
    Pose,
    SolvedLimb,
    solvePose,
    STANCE,
} from './exercise-motion';

/**
 * The 3D figure of an exercise's demo (EXR-13), from the same poses as the flat one: each is
 * solved as drawn, then lifted out of the drawing's plane. In centimetres, on a floor at y = 0,
 * up being +y. The figure faces +x, and +z is to its right, whichever view it was drawn from:
 * from the side the drawing is the x–y plane, seen from the figure's right; from the front,
 * it's the z–y plane, the drawing's right being the figure's left. Either way, its near limbs
 * are its right ones.
 *
 * Out of the plane, the hips and shoulders spread apart, and a part drawn shorter (`scale`
 * on a `Limb`) points out of the drawing by the length it's missing: towards you from the
 * side (the near arm of a fly, opening), forwards from the front (a thigh, sitting).
 */

export type Vec3 = readonly [x: number, y: number, z: number];

/** An arm or a leg: where it hangs from, its elbow or knee, and its hand or ankle. */
export interface Limb3 {
    readonly root: Vec3;
    readonly mid: Vec3;
    readonly end: Vec3;
    /** Which side it's on: -1 the figure's left, 1 its right. */
    readonly side: -1 | 1;
}

export interface Skeleton {
    readonly hips: Vec3;
    /** Between the shoulders. */
    readonly shoulders: Vec3;
    /** The top of the neck, where the head sits. */
    readonly neck: Vec3;
    /** The torso's axes: along the back, the way the chest faces, and to its right. */
    readonly up: Vec3;
    readonly forward: Vec3;
    readonly right: Vec3;
    /** How far the shoulders are turned from the hips, in degrees (`Pose.twist`). */
    readonly twist: number;
    /** The way the head points, from the neck. */
    readonly headUp: Vec3;
    readonly arms: readonly [near: Limb3, far: Limb3];
    readonly legs: readonly [near: Limb3, far: Limb3];
    /** The way each foot points, from the ankle to the toes. */
    readonly feet: readonly [near: Vec3, far: Vec3];
    /** Where a barbell on the back sits. */
    readonly bar: Vec3;
    /** How far the dumbbells are turned palms in (`Pose.palmsIn`). */
    readonly palmsIn: number;
    /**
     * Where a kettlebell's handle is: in the hand `Pose.heldBy` says, between the hands, or
     * set down (`Pose.bellAt`), and whether it's set down, so stands upright.
     */
    readonly bell: Vec3;
    readonly bellDown: boolean;
    /** Which hand the kettlebell is in (`Pose.heldBy`). */
    readonly heldBy: number;
}

/** How far each shoulder and hip joint is from the middle, side to side. */
export const SHOULDER_SPREAD = 17;
export const HIP_SPREAD = 9;
const NECK = 9;

export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a: Vec3, by: number): Vec3 => [a[0] * by, a[1] * by, a[2] * by];
export const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
export const length3 = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const normalize3 = (a: Vec3): Vec3 => scale3(a, 1 / (length3(a) || 1));
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => add3(a, scale3(sub3(b, a), t));

/** `point` turned `degrees` about the line through `through` along `axis` (a unit vector). */
export function rotateAbout(point: Vec3, through: Vec3, axis: Vec3, degrees: number): Vec3 {
    const radians = (degrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(radians), Math.sin(radians)];
    const v = sub3(point, through);
    // Rodrigues' rotation formula
    const turned = add3(
        add3(scale3(v, cos), scale3(cross3(axis, v), sin)),
        scale3(axis, dot3(axis, v) * (1 - cos))
    );
    return add3(through, turned);
}

/** A point or a direction of the drawing, in 3D: see the top of this file. */
const lift = (view: MotionView, [x, y]: Point): Vec3 =>
    view === 'side' ? [x, -y, 0] : [0, -y, -x];

/**
 * The elbow or knee of a limb from `root` to `end` (out of reach, it stretches straight), bent
 * the way `towards` points, by two-joint IK.
 */
function bend(root: Vec3, end: Vec3, upper: number, lower: number, towards: Vec3): Vec3 {
    const toEnd = sub3(end, root);
    const reach = Math.min(length3(toEnd), upper + lower);
    const along = normalize3(toEnd);
    const sideways = sub3(towards, scale3(along, dot3(towards, along)));
    const out = length3(sideways) > 1e-6 ? normalize3(sideways) : [0, 0, 0];
    const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * (reach || 1e-6));
    const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
    return add3(
        root,
        add3(scale3(along, upper * Math.cos(angle)), scale3(out as Vec3, upper * Math.sin(angle)))
    );
}

/** `end` brought in towards `root`, if it's further than `length` from it. */
function within(root: Vec3, end: Vec3, length: number): Vec3 {
    const away = sub3(end, root);
    const distance = length3(away);
    return distance <= length ? end : add3(root, scale3(away, length / distance));
}

/** The figure in `pose`, in 3D. */
export function skeletonOf(pose: Pose, motion: ExerciseMotion): Skeleton {
    const view = motion.view;
    const side = view === 'side';
    const solved = solvePose(pose, view);
    const up = normalize3(lift(view, solved.up));
    // Square to the back: the drawing's across is forwards from the side, and the figure's
    // left from the front
    const right: Vec3 = side ? [0, 0, 1] : scale3(normalize3(lift(view, solved.across)), -1);
    const forward = cross3(up, right);
    const hips = lift(view, pose.hips);
    const shoulders = lift(view, solved.shoulders);
    const twist = pose.twist ?? 0;
    const turn = (point: Vec3) => (twist ? rotateAbout(point, hips, up, twist) : point);
    const turnDir = (way: Vec3) => (twist ? rotateAbout(way, [0, 0, 0], up, twist) : way);

    const limb = (
        given: SolvedLimb,
        index: 0 | 1,
        spread: number,
        [upper, lower]: readonly [number, number]
    ): Limb3 => {
        const sideSign = index === 0 ? 1 : -1;
        // From the side the drawing is all on the middle line; from the front it's spread already
        const offset = side ? scale3(right, sideSign * spread) : ([0, 0, 0] as Vec3);
        // A part drawn short points out of the drawing: outwards from the side, forwards from
        // the front
        const out: Vec3 = side ? [0, 0, sideSign] : [1, 0, 0];
        const part = (from: Point, to: Point, length: number, scaled: boolean): Vec3 => {
            const flat = lift(view, [to[0] - from[0], to[1] - from[1]]);
            const missing = scaled ? Math.sqrt(Math.max(0, length ** 2 - length3(flat) ** 2)) : 0;
            return add3(flat, scale3(out, missing));
        };
        const root = add3(lift(view, given.root), offset);
        const mid = add3(root, part(given.root, given.mid, upper, given.upperScale !== 1));
        const end = add3(mid, part(given.mid, given.end, lower, given.lowerScale !== 1));
        return { root, mid, end, side: sideSign };
    };
    const arm = (index: 0 | 1): Limb3 => {
        const placed = limb(solved.arms[index], index, SHOULDER_SPREAD, [
            BODY.upperArm,
            BODY.forearm,
        ]);
        // Hands held closer together, or further forwards, than drawn: the hand moved, and the
        // elbow bent to reach it
        let end = placed.end;
        if (side && pose.handsApart !== undefined) {
            end = add3(end, scale3(right, (placed.side * (pose.handsApart - HANDS_APART)) / 2));
        }
        if (side && pose.handsOut?.[index]) {
            end = add3(end, scale3(right, placed.side * pose.handsOut[index]));
        }
        if (!side && pose.handsForward) {
            end = add3(end, scale3(forward, pose.handsForward));
        }
        let towards = sub3(placed.mid, scale3(add3(placed.root, end), 0.5));
        if (pose.elbowsOut) {
            // Out to the side: square to the line from the shoulder to the hand
            const along = normalize3(sub3(end, placed.root));
            const out = scale3(right, placed.side);
            const sideways = sub3(out, scale3(along, dot3(out, along)));
            towards = add3(
                scale3(normalize3(towards), 1 - pose.elbowsOut),
                scale3(normalize3(sideways), pose.elbowsOut)
            );
        }
        if (pose.elbowsDown) {
            // Down the body: square to the line from the shoulder to the hand
            const along = normalize3(sub3(end, placed.root));
            const down = scale3(up, -1);
            const downwards = sub3(down, scale3(along, dot3(down, along)));
            towards = add3(
                scale3(normalize3(towards), 1 - pose.elbowsDown),
                scale3(normalize3(downwards), pose.elbowsDown)
            );
        }
        if (end === placed.end && !pose.elbowsOut && !pose.elbowsDown) {
            return placed;
        }
        end = within(placed.root, end, BODY.upperArm + BODY.forearm);
        const mid = bend(placed.root, end, BODY.upperArm, BODY.forearm, towards);
        return { ...placed, mid, end };
    };
    const turnLimb = (limb: Limb3): Limb3 => ({
        ...limb,
        root: turn(limb.root),
        mid: turn(limb.mid),
        end: turn(limb.end),
    });
    const leg = (index: 0 | 1): Limb3 => {
        const placed = limb(solved.legs[index], index, HIP_SPREAD, [BODY.thigh, BODY.shin]);
        if (!side || pose.stance === undefined) {
            return placed;
        }
        // A wide stance: the foot moved out, the knee bent out over it
        const end = within(
            placed.root,
            add3(placed.end, scale3(right, (placed.side * (pose.stance - STANCE)) / 2)),
            BODY.thigh + BODY.shin
        );
        const drawn = sub3(placed.mid, scale3(add3(placed.root, placed.end), 0.5));
        const towards = add3(drawn, scale3(right, placed.side * length3(drawn) * 0.5));
        const mid = bend(placed.root, end, BODY.thigh, BODY.shin, towards);
        return { ...placed, mid, end };
    };
    const legs = [leg(0), leg(1)] as const;

    const headAngle = ((pose.head ?? pose.torso) * Math.PI) / 180;
    const headUp = turnDir(normalize3(lift(view, [Math.sin(headAngle), Math.cos(headAngle)])));
    const turnedShoulders = turn(shoulders);

    const foot = (index: 0 | 1): Vec3 => {
        const leg = legs[index];
        const shin = normalize3(sub3(leg.end, leg.mid));
        if (side) {
            const angle = ((pose.feet?.[index] ?? 90) * Math.PI) / 180;
            return lift(view, [Math.sin(angle), Math.cos(angle)]);
        }
        // From the front a foot points forwards, square to the shin
        const forwards = sub3(forward, scale3(shin, dot3(forward, shin)));
        return length3(forwards) > 0.2 ? normalize3(forwards) : forward;
    };

    const arms = clearLegs(motion, [turnLimb(arm(0)), turnLimb(arm(1))], legs, hips);
    const bellAt = pose.bellAt;
    return {
        hips,
        shoulders: turnedShoulders,
        neck: add3(turnedShoulders, scale3(headUp, NECK)),
        up,
        forward: turnDir(forward),
        right: turnDir(right),
        twist,
        headUp,
        arms,
        legs,
        feet: [foot(0), foot(1)],
        bar: turn(lift(view, solved.bar)),
        palmsIn: pose.palmsIn ?? 0,
        bell: bellAt
            ? add3(lift(view, [bellAt[0], bellAt[1]]), scale3(right, bellAt[2]))
            : lerp3(arms[0].end, arms[1].end, pose.heldBy ?? 0),
        bellDown: !!bellAt,
        heldBy: pose.heldBy ?? 0,
    };
}

/** How far a barbell's middle keeps clear of the middle of a thigh and of a shin, in cm. */
const BAR_CLEARS = { thigh: 9.5, shin: 7 } as const;

/**
 * A barbell held from the side, moved forwards clear of the legs if it would go through them:
 * flat, the hands hang over the legs; in 3D the bar runs across in front of them, as it would.
 * The hands go with it, the elbows bending to reach.
 */
function clearLegs(
    motion: ExerciseMotion,
    arms: readonly [Limb3, Limb3],
    legs: readonly [Limb3, Limb3],
    hips: Vec3
): readonly [Limb3, Limb3] {
    if (motion.view !== 'side' || !motion.props?.includes('barbell')) {
        return arms;
    }
    const barY = (arms[0].end[1] + arms[1].end[1]) / 2;
    // Only a bar hanging below the hips: one resting on them (a hip thrust) is where it should be
    if (barY >= hips[1]) {
        return arms;
    }
    const barX = (arms[0].end[0] + arms[1].end[0]) / 2;
    let needed = 0;
    for (const leg of legs) {
        for (const [from, to, clear] of [
            [leg.root, leg.mid, BAR_CLEARS.thigh],
            [leg.mid, leg.end, BAR_CLEARS.shin],
        ] as const) {
            const [low, high] = from[1] < to[1] ? [from, to] : [to, from];
            // Only a leg more upright than not: a bar resting on the hips over flat thighs (a hip
            // thrust) is where it should be
            const steep = high[1] - low[1] > Math.abs(high[0] - low[0]);
            if (!steep || barY < low[1] || barY > high[1]) {
                continue;
            }
            // Where the leg is, front to back, at the bar's height
            const t = (barY - low[1]) / (high[1] - low[1]);
            const x = low[0] + (high[0] - low[0]) * t;
            needed = Math.max(needed, x + clear - barX);
        }
    }
    if (needed <= 0) {
        return arms;
    }
    const move = (arm: Limb3): Limb3 => {
        const end = within(arm.root, add3(arm.end, [needed, 0, 0]), BODY.upperArm + BODY.forearm);
        const mid = bend(arm.root, end, BODY.upperArm, BODY.forearm, sub3(arm.mid, arm.root));
        return { ...arm, mid, end };
    };
    return [move(arms[0]), move(arms[1])];
}

/**
 * Every joint the motion's figure reaches, in its key positions and halfway between each
 * (where an IK limb can swing out past them), to fit the view around.
 */
export function motionJoints(motion: ExerciseMotion): Vec3[] {
    const poses = motion.frames.flatMap((frame, i) => [
        frame.pose,
        lerpPose(frame.pose, motion.frames[(i + 1) % motion.frames.length].pose, 0.5, motion.view),
    ]);
    return poses.flatMap((pose) => {
        const skeleton = skeletonOf(pose, motion);
        return [
            skeleton.hips,
            skeleton.shoulders,
            add3(skeleton.neck, scale3(skeleton.headUp, 22)),
            ...[...skeleton.arms, ...skeleton.legs].flatMap((limb) => [limb.mid, limb.end]),
            ...skeleton.legs.map((leg, i) => add3(leg.end, scale3(skeleton.feet[i], 22))),
        ];
    });
}
