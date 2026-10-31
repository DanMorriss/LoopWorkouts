import { MuscleGroup } from './exercise';
import { FIGURE_ART, PartArt, PartName } from './exercise-figure-art';

/**
 * How an exercise moves, for its animated demo (EXR-13): a figure posed at a few key
 * positions, which the demo moves between in a loop. See docs/features/exercises.md.
 *
 * The figure is drawn in units of about a centimetre, on a floor at y = 0 (so up is
 * negative, as in SVG). Angles are absolute, in degrees, each the way a body part points
 * from the joint it hangs from: 0 is straight down, 90 to the right, 180 straight up and
 * -90 to the left. From the side the figure faces right.
 */

/** From the side, facing right, or from the front. */
export type MotionView = 'side' | 'front';

export type Point = readonly [x: number, y: number];

/**
 * An arm or a leg: by the angles of its two parts (upper arm and forearm, thigh and shin),
 * or by where its end (the hand or the ankle) should be, with the elbow or knee bent
 * clockwise or anticlockwise as drawn. An end that stays put, such as a foot on the floor,
 * is best given by where it is, so it doesn't slide as the figure moves. `'bar'` puts the
 * hand on the barbell on the back.
 *
 * Or by a point on the body it should touch, which moves with it: `touch` is how far in
 * front of the shoulders (or to your right, from the front) and how far up the torso from
 * them, so negative is towards the hips. A hand on the chest, say, or behind the head.
 *
 * By angles, a part can be drawn shorter by `scale`, as a part pointing towards you looks:
 * a thigh seen from the front when sitting, say.
 */
export type Limb =
    | {
          readonly angles: readonly [upper: number, lower: number];
          readonly scale?: readonly [upper: number, lower: number];
      }
    | { readonly reach: Point | 'bar'; readonly bend: 'cw' | 'ccw' }
    | { readonly touch: Point; readonly bend: 'cw' | 'ccw' };

/**
 * One position of the figure. From the side, near is the side facing you and far the
 * side behind; from the front, near is on your left.
 */
export interface Pose {
    /** Where the hips are. */
    readonly hips: Point;
    /** The angle of the back, from the hips to the shoulders (180 is upright). */
    readonly torso: number;
    /** The angle of the neck; the torso's if not given. */
    readonly head?: number;
    readonly arms: readonly [near: Limb, far: Limb];
    readonly legs: readonly [near: Limb, far: Limb];
    /** The angle of each foot, from the ankle to the toes; flat on the floor if not given. */
    readonly feet?: readonly [near: number, far: number];
    /** How far the shoulders are drawn up, as in a shrug: the arms rise with them. */
    readonly shrug?: number;
    /**
     * Only for the 3D figure, which can show what a flat drawing can't: how far the shoulders
     * turn about the back, in degrees, positive to the figure's left (as in a Russian twist).
     * The arms and head turn with them.
     */
    readonly twist?: number;
    /**
     * Only for the 3D figure: how far apart the hands are, side to side, when they're held
     * closer than the shoulders (hands together, say). From the side only.
     */
    readonly handsApart?: number;
}

/**
 * Equipment the figure carries, drawn where its hands or feet are: a barbell on the back or
 * in the hands, a dumbbell in each hand or one in the near hand, one kettlebell hanging from
 * the near hand, an ab wheel under the hands, a band between them, a machine's roller on the
 * front of the shins or behind the ankles, or a leg press's plate under the feet.
 */
export type Prop =
    | 'barbell-on-back'
    | 'barbell'
    | 'dumbbells'
    | 'dumbbell'
    | 'kettlebell'
    | 'ab-wheel'
    | 'band'
    | 'roller-on-shins'
    | 'roller-behind-ankles'
    | 'foot-plate';

/**
 * Equipment that stays put, behind the figure: a bench's or seat's cushion (along its middle),
 * a frame's post or rail, a bar end on (to hang from or hold), a step or box (its opposite
 * corners), or a cable from a pulley to the nearer hand.
 */
export type Kit =
    | { readonly kind: 'pad'; readonly from: Point; readonly to: Point }
    | { readonly kind: 'frame'; readonly from: Point; readonly to: Point }
    | { readonly kind: 'bar'; readonly at: Point }
    | { readonly kind: 'block'; readonly from: Point; readonly to: Point }
    | { readonly kind: 'cable'; readonly from: Point };

export interface MotionFrame {
    /** What the position is called, under its still when motion is reduced, e.g. "Bottom". */
    readonly label: string;
    readonly pose: Pose;
    /** How long it stays in this position, in milliseconds, before moving on. */
    readonly hold?: number;
    /** How long it takes to move from this position to the next (or back to the first). */
    readonly ms: number;
}

export interface ExerciseMotion {
    readonly view: MotionView;
    /**
     * In 3D, how far round from its front the figure is first seen, in degrees, towards its
     * right: 0 from the front, 90 from the side. If not given, 60 for a motion drawn from the
     * side and 25 from the front.
     */
    readonly seenFrom?: number;
    readonly props?: readonly Prop[];
    readonly kit?: readonly Kit[];
    readonly frames: readonly MotionFrame[];
}

/** The figure's proportions, about a 175 cm person's. */
export const BODY = {
    torso: 52,
    upperArm: 30,
    /** From the elbow to the middle of the hand. */
    forearm: 30,
    thigh: 44,
    shin: 44,
} as const;

/** How far apart the hands are, side to side, unless a pose says (from the shoulders). */
export const HANDS_APART = 34;

/** How the figure is put together from each view. */
const VIEWS = {
    side: {
        /** How far from the middle each hip and shoulder joint is. */
        hipSpread: 0,
        shoulderSpread: 0,
        /** The angle of a foot flat on the floor. */
        footAngle: 90,
    },
    front: {
        hipSpread: 9,
        shoulderSpread: 17,
        footAngle: 0,
    },
} as const;

/** One of the figure's parts, drawn as in `FIGURE_ART`, placed with its joint at `at`. */
export interface PlacedPart {
    readonly type: 'part';
    readonly name: PartName;
    readonly art: PartArt;
    readonly at: Point;
    /** The way it points from its joint, as the pose's angles are given. */
    readonly angle: number;
    /** Flipped across its length: the near limbs from the front, and the head from the side. */
    readonly mirror: boolean;
    /** How much of its length shows, if less than all (see `Limb`). */
    readonly stretch?: number;
}

/** Kit drawn with the figure: a circle (a plate or dumbbell end on), a bar, or a shape. */
export type PlacedProp =
    | { readonly type: 'circle'; readonly at: Point; readonly r: number; readonly tone: PropTone }
    | {
          readonly type: 'line';
          readonly from: Point;
          readonly to: Point;
          readonly width: number;
          readonly tone: PropTone;
      }
    | { readonly type: 'shape'; readonly points: readonly Point[]; readonly tone: PropTone };

/** Something solid (a plate, a bell, a cushion), metal (a bar), or a cable or band. */
export type PropTone = 'plate' | 'bar' | 'cable';

export type FigureItem = PlacedPart | PlacedProp;

/**
 * What's drawn in drawing order: the kit that stays put, behind the figure (its far side),
 * its body, then in front.
 */
export interface FigureLayers {
    readonly kit: readonly FigureItem[];
    readonly far: readonly FigureItem[];
    readonly body: readonly FigureItem[];
    readonly near: readonly FigureItem[];
}

export interface Box {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** How a muscle is shaded, as on the body map; null for a part that's never shaded. */
export type MuscleTone = 'main' | 'supporting' | 'idle' | 'other';

export function muscleTone(
    muscle: MuscleGroup | null,
    main: readonly MuscleGroup[],
    supporting: readonly MuscleGroup[]
): MuscleTone {
    if (muscle === null) {
        return 'other';
    }
    return main.includes(muscle) ? 'main' : supporting.includes(muscle) ? 'supporting' : 'idle';
}

const dir = (angle: number): Point => {
    const radians = (angle * Math.PI) / 180;
    return [Math.sin(radians), Math.cos(radians)];
};
/** The angle a line points, as `dir()` takes it. */
const angleOf = (from: Point, to: Point) =>
    (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Point, by: number): Point => [a[0] * by, a[1] * by];
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPoint = (a: Point, b: Point, t: number): Point => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
];

/**
 * Where a point of a part's drawing lands on the figure: mirrored if the part is, then turned
 * so its +y runs along `angle` (SVG's `translate() rotate(-angle) scale(-1, 1)`).
 */
export function placePoint(part: PlacedPart, [x, y]: Point): Point {
    const radians = (-part.angle * Math.PI) / 180;
    const across = part.mirror ? -x : x;
    y *= part.stretch ?? 1;
    return [
        part.at[0] + across * Math.cos(radians) - y * Math.sin(radians),
        part.at[1] + across * Math.sin(radians) + y * Math.cos(radians),
    ];
}

/**
 * The elbow or knee and the hand or ankle of a limb from `root`, by its angles, or by two-joint
 * IK to reach where it should end. Out of reach, it stretches straight towards it.
 */
export function solveLimb(
    root: Point,
    limb: Exclude<Limb, { touch: Point }>,
    upper: number,
    lower: number,
    bar: Point
): readonly [mid: Point, end: Point] {
    if ('angles' in limb) {
        const [upperScale, lowerScale] = limb.scale ?? [1, 1];
        const mid = add(root, scale(dir(limb.angles[0]), upper * upperScale));
        return [mid, add(mid, scale(dir(limb.angles[1]), lower * lowerScale))];
    }
    const target = limb.reach === 'bar' ? bar : limb.reach;
    const toTarget = sub(target, root);
    const length = Math.hypot(toTarget[0], toTarget[1]) || 1e-6;
    const reach = Math.min(Math.max(length, Math.abs(upper - lower) + 1e-6), upper + lower);
    const along = scale(toTarget, 1 / length);
    // The angle at the root between the line to the end and the upper part (law of cosines),
    // turned clockwise as drawn (y is down) for 'cw'
    const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
    const turn = Math.acos(Math.min(1, Math.max(-1, cos))) * (limb.bend === 'cw' ? 1 : -1);
    const turned: Point = [
        along[0] * Math.cos(turn) - along[1] * Math.sin(turn),
        along[0] * Math.sin(turn) + along[1] * Math.cos(turn),
    ];
    return [add(root, scale(turned, upper)), add(root, scale(along, reach))];
}

/** An arm or a leg placed: where it hangs from, its elbow or knee, and its hand or ankle. */
export interface SolvedLimb {
    readonly root: Point;
    readonly mid: Point;
    readonly end: Point;
    /** How much of each part's length shows (see `Limb`). */
    readonly upperScale: number;
    readonly lowerScale: number;
}

/** Where the figure's joints are in `pose`, as drawn from the motion's view. */
export interface SolvedPose {
    /** The way the back points, from the hips to the shoulders. */
    readonly up: Point;
    /** Square to the torso: forwards from the side, to your right from the front. */
    readonly across: Point;
    readonly shoulders: Point;
    /** Where a barbell on the back sits. */
    readonly bar: Point;
    readonly arms: readonly [near: SolvedLimb, far: SolvedLimb];
    readonly legs: readonly [near: SolvedLimb, far: SolvedLimb];
}

export function solvePose(pose: Pose, view: MotionView): SolvedPose {
    const spread = VIEWS[view];
    const side = view === 'side';
    const up = dir(pose.torso);
    const across: Point = [-up[1], up[0]];
    const shoulders = add(pose.hips, scale(up, BODY.torso));
    const sideOf = (point: Point, by: number): Point => add(point, scale(across, by));
    const bar = side ? add(sideOf(shoulders, -11), scale(up, -2)) : add(shoulders, scale(up, -2));
    const solve = (limbs: 'arms' | 'legs', index: 0 | 1): SolvedLimb => {
        const legs = limbs === 'legs';
        const root = legs
            ? sideOf(pose.hips, spread.hipSpread * (index === 0 ? -1 : 1))
            : add(
                  sideOf(shoulders, spread.shoulderSpread * (index === 0 ? -1 : 1)),
                  scale(up, (pose.shrug ?? 0) - 4)
              );
        const given = pose[limbs][index];
        const limb =
            'touch' in given
                ? {
                      reach: add(sideOf(shoulders, given.touch[0]), scale(up, given.touch[1])),
                      bend: given.bend,
                  }
                : given;
        const [mid, end] = legs
            ? solveLimb(root, limb, BODY.thigh, BODY.shin, bar)
            : solveLimb(root, limb, BODY.upperArm, BODY.forearm, bar);
        const [upperScale, lowerScale] = ('angles' in limb && limb.scale) || [1, 1];
        return { root, mid, end, upperScale, lowerScale };
    };
    return {
        up,
        across,
        shoulders,
        bar,
        arms: [solve('arms', 0), solve('arms', 1)],
        legs: [solve('legs', 0), solve('legs', 1)],
    };
}

/** The figure in `pose`: its parts placed, and its kit, in drawing order. */
export function drawFigure(pose: Pose, motion: ExerciseMotion): FigureLayers {
    const view = VIEWS[motion.view];
    const art = FIGURE_ART[motion.view];
    const side = motion.view === 'side';
    const props = new Set(motion.props ?? []);
    const { up, across, shoulders, bar, arms, legs } = solvePose(pose, motion.view);
    const hands = [arms[0].end, arms[1].end] as const;
    const place = (
        name: PartName,
        at: Point,
        angle: number,
        mirror = false,
        stretch = 1
    ): PlacedPart => ({
        type: 'part',
        name,
        art: art[name],
        at,
        angle,
        mirror,
        ...(stretch === 1 ? {} : { stretch }),
    });
    const circle = (at: Point, r: number, tone: PropTone = 'plate'): PlacedProp => ({
        type: 'circle',
        at,
        r,
        tone,
    });
    const line = (from: Point, to: Point, width: number, tone: PropTone = 'bar'): PlacedProp => ({
        type: 'line',
        from,
        to,
        width,
        tone,
    });
    /** A cushion or plate `thick` deep along a line, square-ended. */
    const slab = (from: Point, to: Point, thick: number): PlacedProp => {
        const along = sub(to, from);
        const length = Math.hypot(along[0], along[1]) || 1;
        const out = scale([-along[1] / length, along[0] / length], thick / 2);
        return {
            type: 'shape',
            points: [add(from, out), add(to, out), sub(to, out), sub(from, out)],
            tone: 'plate',
        };
    };

    const kit: FigureItem[] = [];
    const far: FigureItem[] = [];
    const body: FigureItem[] = [];
    const near: FigureItem[] = [];
    // From the front nothing is behind, but the legs go under the torso and the arms over it
    const legLayer = side ? [near, far] : [body, body];
    const armLayer = side ? [near, far] : [near, near];
    // From the front the near limbs (on your left) are the far ones flipped, outer side out
    const flip = (index: 0 | 1) => !side && index === 0;

    for (const piece of motion.kit ?? []) {
        if (piece.kind === 'pad') {
            kit.push(slab(piece.from, piece.to, 7));
        } else if (piece.kind === 'frame') {
            kit.push(line(piece.from, piece.to, 3));
        } else if (piece.kind === 'bar') {
            kit.push(circle(piece.at, 2.5, 'bar'));
        } else if (piece.kind === 'block') {
            const [[x1, y1], [x2, y2]] = [piece.from, piece.to];
            kit.push({
                type: 'shape',
                points: [
                    [x1, y1],
                    [x2, y1],
                    [x2, y2],
                    [x1, y2],
                ],
                tone: 'plate',
            });
        } else {
            const hand = distance(piece.from, hands[0]) <= distance(piece.from, hands[1]) ? 0 : 1;
            kit.push(line(piece.from, hands[hand], 0.8, 'cable'), circle(piece.from, 3.5));
        }
    }

    // The lower part of each limb first, so the knee or elbow sits over it
    const drawLeg = (index: 0 | 1, into: FigureItem[]) => {
        const { root, mid, end, upperScale, lowerScale } = legs[index];
        const footAngle = pose.feet?.[index] ?? view.footAngle;
        const foot = place('foot', end, footAngle, flip(index));
        const shinAngle = angleOf(mid, end);
        into.push(place('shin', mid, shinAngle, flip(index), lowerScale), foot);
        if (props.has('foot-plate') && index === 0) {
            // Under the sole, the length of the foot
            into.push(slab(placePoint(foot, [-6, -8]), placePoint(foot, [-6, 22]), 4));
        }
        if (props.has('roller-on-shins') || props.has('roller-behind-ankles')) {
            const front = props.has('roller-on-shins') ? 1 : -1;
            const shin = place('shin', mid, shinAngle, flip(index), lowerScale);
            into.push(circle(placePoint(shin, [front * 9, BODY.shin - 8]), 5));
        }
        into.push(place('thigh', root, angleOf(root, mid), flip(index), upperScale));
    };
    const drawArm = (index: 0 | 1, into: FigureItem[]) => {
        const { root, mid, end, upperScale, lowerScale } = arms[index];
        if (props.has('dumbbells') || (props.has('dumbbell') && index === 0)) {
            // Seen end on, from the side or the front, in the hand
            into.push(circle(end, 7.5));
        }
        if (props.has('kettlebell') && index === 0) {
            // Hanging from the hand, swung out a little along the forearm
            const along = dir(angleOf(mid, end));
            const hang = add(scale(along, 0.6), [0, 1]);
            const length = Math.hypot(hang[0], hang[1]);
            into.push(circle(add(end, scale(hang, 10 / length)), 8), circle(end, 3.5, 'bar'));
        }
        if (props.has('ab-wheel') && index === 0) {
            into.push(circle(end, 10), circle(end, 2.5, 'bar'));
        }
        into.push(
            place('forearm', mid, angleOf(mid, end), flip(index), lowerScale),
            place('upperArm', root, angleOf(root, mid), flip(index), upperScale)
        );
    };
    /** A barbell across the figure, from the front: its bar and a plate at each end. */
    const barAcross = (middle: Point, square: Point, into: FigureItem[]) => {
        const at = (by: number) => add(middle, scale(square, by));
        const plateUp: Point = [-square[1] * 17, square[0] * 17];
        into.push(
            line(at(-62), at(62), 3.5),
            line(sub(at(-52), plateUp), add(at(-52), plateUp), 7, 'plate'),
            line(sub(at(52), plateUp), add(at(52), plateUp), 7, 'plate')
        );
    };
    const onBack = props.has('barbell-on-back');
    const inHands = props.has('barbell');

    drawLeg(1, legLayer[1]);
    drawArm(1, armLayer[1]);
    drawLeg(0, legLayer[0]);
    if (side && (onBack || inHands)) {
        // Behind the body, as in front it would hide the head; the bar's end goes in front
        body.push(circle(onBack ? bar : hands[0], 17));
    }
    body.push(
        // Hanging from the shoulders, so the torso's drawing is the right way up
        place('torso', shoulders, pose.torso + 180),
        // Its drawing faces +x; from the side, flipped to face forwards
        place('head', add(shoulders, scale(up, -1)), pose.head ?? pose.torso, side)
    );
    if (onBack && !side) {
        barAcross(bar, across, body);
    }
    if (inHands && !side) {
        // Level, between the hands, in front of the body and under the fingers
        barAcross(lerpPoint(hands[0], hands[1], 0.5), [1, 0], near);
    }
    if (props.has('band') && !side) {
        near.push(line(hands[0], hands[1], 2, 'cable'));
    }
    drawArm(0, armLayer[0]);
    if (side && (onBack || inHands)) {
        near.push(circle(onBack ? bar : hands[0], 3, 'bar'));
    }
    return { kit, far, body, near };
}

/** The box around an item as drawn: [left, top, right, bottom]. */
export function itemBounds(item: FigureItem): readonly [number, number, number, number] {
    if (item.type === 'circle') {
        return [item.at[0] - item.r, item.at[1] - item.r, item.at[0] + item.r, item.at[1] + item.r];
    }
    if (item.type === 'shape') {
        const xs = item.points.map(([x]) => x);
        const ys = item.points.map(([, y]) => y);
        return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    if (item.type === 'line') {
        const half = item.width / 2;
        return [
            Math.min(item.from[0], item.to[0]) - half,
            Math.min(item.from[1], item.to[1]) - half,
            Math.max(item.from[0], item.to[0]) + half,
            Math.max(item.from[1], item.to[1]) + half,
        ];
    }
    const [left, top, right, bottom] = item.art.bounds;
    const corners = (
        [
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom],
        ] as const
    ).map((corner) => placePoint(item, corner));
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function lerpLimb(a: Limb, b: Limb, t: number): Limb {
    if ('angles' in a && 'angles' in b) {
        const angles = [
            lerp(a.angles[0], b.angles[0], t),
            lerp(a.angles[1], b.angles[1], t),
        ] as const;
        if (!a.scale && !b.scale) {
            return { angles };
        }
        const [scaleA, scaleB] = [a.scale ?? [1, 1], b.scale ?? [1, 1]];
        return {
            angles,
            scale: [lerp(scaleA[0], scaleB[0], t), lerp(scaleA[1], scaleB[1], t)],
        };
    }
    if ('touch' in a && 'touch' in b) {
        return { touch: lerpPoint(a.touch, b.touch, t), bend: a.bend };
    }
    if ('reach' in a && 'reach' in b) {
        if (a.reach === 'bar' || b.reach === 'bar') {
            return t < 0.5 ? a : b;
        }
        return { reach: lerpPoint(a.reach, b.reach, t), bend: a.bend };
    }
    // Given differently in the two positions, so it can't move smoothly between them
    return t < 0.5 ? a : b;
}

/** The pose `t` of the way (0 to 1) from `a` to `b`. */
export function lerpPose(a: Pose, b: Pose, t: number, view: MotionView): Pose {
    const footAngle = VIEWS[view].footAngle;
    const feetA = a.feet ?? [footAngle, footAngle];
    const feetB = b.feet ?? [footAngle, footAngle];
    return {
        hips: lerpPoint(a.hips, b.hips, t),
        torso: lerp(a.torso, b.torso, t),
        head: lerp(a.head ?? a.torso, b.head ?? b.torso, t),
        arms: [lerpLimb(a.arms[0], b.arms[0], t), lerpLimb(a.arms[1], b.arms[1], t)],
        legs: [lerpLimb(a.legs[0], b.legs[0], t), lerpLimb(a.legs[1], b.legs[1], t)],
        feet: [lerp(feetA[0], feetB[0], t), lerp(feetA[1], feetB[1], t)],
        ...(a.shrug || b.shrug ? { shrug: lerp(a.shrug ?? 0, b.shrug ?? 0, t) } : {}),
        ...(a.twist || b.twist ? { twist: lerp(a.twist ?? 0, b.twist ?? 0, t) } : {}),
        ...(a.handsApart !== undefined || b.handsApart !== undefined
            ? {
                  handsApart: lerp(a.handsApart ?? HANDS_APART, b.handsApart ?? HANDS_APART, t),
              }
            : {}),
    };
}

/** How long one loop of the motion takes, in milliseconds. */
export const loopLength = (motion: ExerciseMotion) =>
    motion.frames.reduce((total, frame) => total + (frame.hold ?? 0) + frame.ms, 0);

/**
 * Where the figure is `elapsed` milliseconds into the loop: holding a position, or easing
 * in and out between two (as a body slows into each end of a rep).
 */
export function poseAt(motion: ExerciseMotion, elapsed: number): Pose {
    const frames = motion.frames;
    let time = elapsed % loopLength(motion);
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const hold = frame.hold ?? 0;
        if (time < hold) {
            return frame.pose;
        }
        time -= hold;
        if (time < frame.ms) {
            const eased = (1 - Math.cos((Math.PI * time) / frame.ms)) / 2;
            return lerpPose(frame.pose, frames[(i + 1) % frames.length].pose, eased, motion.view);
        }
        time -= frame.ms;
    }
    return frames[0].pose;
}

/** The box around everything the motion draws, in all its positions, and the floor under it. */
export function motionBox(motion: ExerciseMotion): Box {
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, 0];
    // The key positions, and halfway between each, which an IK limb can swing out past
    const poses = motion.frames.flatMap((frame, i) => [
        frame.pose,
        lerpPose(frame.pose, motion.frames[(i + 1) % motion.frames.length].pose, 0.5, motion.view),
    ]);
    for (const pose of poses) {
        const layers = drawFigure(pose, motion);
        for (const item of [...layers.kit, ...layers.far, ...layers.body, ...layers.near]) {
            const [left, top, right, bottom] = itemBounds(item);
            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        }
    }
    const pad = 6;
    return {
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + 2 * pad,
        height: maxY - minY + 2 * pad,
    };
}
