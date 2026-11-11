import { ExerciseMotion, Limb, MotionView, Point, Pose, solvePose } from './exercise-motion';

/**
 * Changing a motion's poses a part at a time, for the posing tool (a page only in development
 * builds): see `src/app/dev/`.
 */

/** How a limb is given: by its two angles, where its end reaches, or a point on the body. */
export type LimbKind = 'angles' | 'reach' | 'touch';

export type LimbSet = 'arms' | 'legs';

export function limbKind(limb: Limb): LimbKind {
    return 'angles' in limb ? 'angles' : 'reach' in limb ? 'reach' : 'touch';
}

/** Rounded to two places, as the motions are written. */
export const rounded = (value: number) => Math.round(value * 100) / 100;

/** The way a part points, as a pose's angles are given: 0 down, 90 right, 180 up. */
const angleOf = ([x, y]: Point) => rounded((Math.atan2(x, y) * 180) / Math.PI);

/**
 * The limb `pose[limbs][index]` given as `kind` instead, where it is now: its angles, or where
 * its end is, bent the way it is. A straight limb keeps the way it was bent, if it had one, or
 * else bends `straightBend`.
 */
export function limbAs(
    pose: Pose,
    view: MotionView,
    limbs: LimbSet,
    index: 0 | 1,
    kind: LimbKind,
    straightBend: 'cw' | 'ccw' = 'cw'
): Limb {
    const given = pose[limbs][index];
    if (limbKind(given) === kind && !('reach' in given && given.reach === 'bar')) {
        return given;
    }
    const solved = solvePose(pose, view);
    const { root, mid, end } = solved[limbs][index];
    if (kind === 'angles') {
        return { angles: [angleOf(sub(mid, root)), angleOf(sub(end, mid))] };
    }
    const toEnd = sub(end, root);
    const toMid = sub(mid, root);
    const cross = toEnd[0] * toMid[1] - toEnd[1] * toMid[0];
    const bend =
        Math.abs(cross) >= 1e-6
            ? cross > 0
                ? 'cw'
                : 'ccw'
            : 'bend' in given
              ? given.bend
              : straightBend;
    if (kind === 'reach') {
        return { reach: [rounded(end[0]), rounded(end[1])], bend };
    }
    const fromShoulders = sub(end, solved.shoulders);
    return {
        touch: [rounded(dot(fromShoulders, solved.across)), rounded(dot(fromShoulders, solved.up))],
        bend,
    };
}

/** `pose` with `limb` in place of `pose[limbs][index]`. */
export function withLimb(pose: Pose, limbs: LimbSet, index: 0 | 1, limb: Limb): Pose {
    const pair: [Limb, Limb] = [pose[limbs][0], pose[limbs][1]];
    pair[index] = limb;
    return { ...pose, [limbs]: pair };
}

/** `motion` with `pose` as its `frame`th position's. */
export function withFramePose(motion: ExerciseMotion, frame: number, pose: Pose): ExerciseMotion {
    return {
        ...motion,
        frames: motion.frames.map((each, i) => (i === frame ? { ...each, pose } : each)),
    };
}

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
