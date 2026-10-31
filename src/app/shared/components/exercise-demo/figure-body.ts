import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { BODY_MODELS, BodyModel, DrawingPlace } from '../../../models/body-model';
import { BodyFigure, MuscleGroup } from '../../../models/exercise';
import { add3, cross3, normalize3, scale3, sub3, Vec3 } from '../../../models/exercise-skeleton';
import { BODY_FIGURES } from '../body-map/body-shapes';

/**
 * The 3D demo figure's body (EXR-13), made to look as the body map does: shaped from the body
 * map's own figure, measured (`body-model.ts`), and painted with its drawings, front and back,
 * so its muscles are the body map's shapes, in its colours and outlines.
 *
 * Each part is made standing as the body map's figure stands ("at rest"), in cm: x forwards,
 * y up, z to its right. Its front faces are painted with the front drawing as if seen from in
 * front, and its back faces with the back drawing, so standing still and seen from in front
 * or behind, it's the body map.
 */

/** The painted drawings: the front on the left half, the back on the right. */
export const PAINT_SIZE = 2048;
const HALF = PAINT_SIZE / 2;
/** Points round each part: enough that its outline looks smooth. */
const ROUND = 40;

/** How a body map drawing fits its half of the painting: its scale and where its corner is. */
function fit(place: DrawingPlace) {
    const [x, y, w, h] = place.viewBox.split(' ').map(Number);
    return { x, y, scale: Math.min(HALF / w, PAINT_SIZE / h) };
}

/** Where a point at rest lands on the painting, as a texture coordinate, from in front or behind. */
function paintAt(model: BodyModel, [, y, z]: Vec3, behind: boolean): [number, number] {
    const place = behind ? model.back : model.front;
    const { x: left, y: top, scale } = fit(place);
    // From in front the figure's right is on the drawing's left; from behind, on its right
    const drawingX = place.centre + (behind ? z : -z) * place.unitsPerCm;
    const drawingY = place.floor - y * place.unitsPerCm;
    const px = (behind ? HALF : 0) + (drawingX - left) * scale;
    const py = (drawingY - top) * scale;
    return [px / PAINT_SIZE, 1 - py / PAINT_SIZE];
}

/** The colours the drawings are painted in, as CSS colours. */
export interface PaintColors {
    readonly main: string;
    readonly supporting: string;
    readonly idle: string;
    readonly other: string;
    readonly outline: string;
    readonly page: string;
}

/**
 * Paints the body map's drawings of `figure` onto `canvas` as the body map draws them: the page
 * showing between the muscles, each muscle filled by how hard it works and outlined, and the
 * figure's outline round them.
 */
export function paintDrawings(
    canvas: HTMLCanvasElement,
    figure: BodyFigure,
    colors: PaintColors,
    toneOf: (muscle: MuscleGroup | null) => 'main' | 'supporting' | 'idle' | 'other'
) {
    canvas.width = canvas.height = PAINT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }
    context.fillStyle = colors.page;
    context.fillRect(0, 0, PAINT_SIZE, PAINT_SIZE);
    const model = BODY_MODELS[figure];
    for (const side of ['front', 'back'] as const) {
        const drawing = BODY_FIGURES[figure][side];
        const { x, y, scale } = fit(model[side]);
        context.save();
        context.translate(side === 'back' ? HALF : 0, 0);
        context.scale(scale, scale);
        context.translate(-x, -y);
        context.lineJoin = 'round';
        // As thick, on the figure as it's usually seen, as the body map's lines on screen
        context.lineWidth = 4.5;
        context.strokeStyle = colors.outline;
        for (const shape of drawing.shapes) {
            context.fillStyle = colors[toneOf(shape.muscle)];
            for (const d of shape.paths) {
                const path = new Path2D(d);
                context.fill(path);
                context.stroke(path);
            }
        }
        context.lineWidth = 6.5;
        context.stroke(new Path2D(drawing.outline));
        context.restore();
    }
}

/** A ring round a part: its middle, its half width across and front to back, and which ways those are. */
interface Ring {
    readonly centre: Vec3;
    readonly across: Vec3;
    readonly ahead: Vec3;
    readonly half: number;
    readonly depth: number;
}

/**
 * A part through `rings`, closed at each end, painted face by face: a face looking forwards
 * from the front drawing, one looking back from the back drawing. `paintPlace` moves a point
 * before it's looked up on the drawing (for a foot, made apart from where it's drawn).
 */
function tube(
    model: BodyModel,
    rings: readonly Ring[],
    paintPlace: (point: Vec3) => Vec3 = (point) => point
): BufferGeometry {
    const points: Vec3[] = [];
    /**
     * Where each point is painted from, front and back: the drawings wrapped round each part,
     * the front drawing's width spread evenly over the front half and the back's over the
     * back, so its sides don't smear the drawing's edge across them.
     */
    const wrapped: { front: Vec3; back: Vec3 }[] = [];
    for (const ring of rings) {
        for (let j = 0; j < ROUND; j++) {
            const angle = (j / ROUND) * Math.PI * 2;
            // From the front (0) round to the side (±1) and on to the back (0 again)
            const round = Math.atan2(Math.sin(angle), Math.cos(angle)) / (Math.PI / 2);
            const front = round;
            const back = Math.sign(round) * (2 - Math.abs(round));
            wrapped.push({
                front: add3(
                    ring.centre,
                    scale3(ring.across, ring.half * Math.max(-1, Math.min(1, front)))
                ),
                back: add3(ring.centre, scale3(ring.across, ring.half * back)),
            });
            points.push(
                add3(
                    ring.centre,
                    add3(
                        scale3(ring.across, Math.sin(angle) * ring.half),
                        scale3(ring.ahead, Math.cos(angle) * ring.depth)
                    )
                )
            );
        }
    }
    const first = points.length;
    points.push(rings[0].centre, rings[rings.length - 1].centre);
    wrapped.push(
        { front: rings[0].centre, back: rings[0].centre },
        { front: rings[rings.length - 1].centre, back: rings[rings.length - 1].centre }
    );
    const faces: [number, number, number][] = [];
    const at = (ring: number, j: number) => ring * ROUND + (j % ROUND);
    for (let i = 0; i < rings.length - 1; i++) {
        for (let j = 0; j < ROUND; j++) {
            faces.push(
                [at(i, j), at(i + 1, j), at(i + 1, j + 1)],
                [at(i, j), at(i + 1, j + 1), at(i, j + 1)]
            );
        }
    }
    const last = rings.length - 1;
    for (let j = 0; j < ROUND; j++) {
        faces.push([first, at(0, j), at(0, j + 1)], [first + 1, at(last, j + 1), at(last, j)]);
    }

    // Faces wound to face outwards: checked on the middle ring, as `across` and `ahead` may
    // make the rings run either way round
    const middle = Math.floor(rings.length / 2);
    const [a, b, c] = faces[middle * ROUND * 2].map((i) => new Vector3(...points[i]));
    const facing = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    const outwards = a.clone().sub(new Vector3(...rings[middle].centre));
    const flip = facing.dot(outwards) < 0;

    const position: number[] = [];
    const uv: number[] = [];
    const normal: number[] = [];
    // Smooth normals, each point's from the faces round it
    const smooth = points.map(() => new Vector3());
    const wound = faces.map(([i, j, k]) => (flip ? [i, k, j] : [i, j, k]));
    for (const [i, j, k] of wound) {
        const [p, q, r] = [i, j, k].map((n) => new Vector3(...points[n]));
        const n = new Vector3().crossVectors(q.sub(p), r.sub(p));
        smooth[i].add(n);
        smooth[j].add(n);
        smooth[k].add(n);
    }
    smooth.forEach((n) => n.normalize());
    for (const [i, j, k] of wound) {
        // Which way the face looks along its part's front: from the front drawing, or the back
        const centre = new Vector3(...points[i])
            .add(new Vector3(...points[j]))
            .add(new Vector3(...points[k]));
        const ring = rings[Math.min(rings.length - 1, Math.floor(Math.min(i, j, k) / ROUND))];
        const middle = new Vector3(...ring.centre).multiplyScalar(3);
        const behind = centre.sub(middle).dot(new Vector3(...ring.ahead)) < 0;
        for (const n of [i, j, k]) {
            position.push(...points[n]);
            normal.push(smooth[n].x, smooth[n].y, smooth[n].z);
            uv.push(
                ...paintAt(model, paintPlace(behind ? wrapped[n].back : wrapped[n].front), behind)
            );
        }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    return geometry;
}

const FORWARDS: Vec3 = [1, 0, 0];
const RIGHT: Vec3 = [0, 0, 1];

/** How deep each part is front to back, for its width across: the drawings only show its width. */
const DEPTH = {
    head: 1.15,
    neck: 1,
    upperArm: 1,
    forearm: 0.85,
    hand: 0.45,
    thigh: 1.05,
    shin: 1,
} as const;
/** The torso: shallower across the shoulders than at the chest and belly. */
const torsoDepth = (y: number, model: BodyModel) => (y > model.levels.armpit + 3 ? 0.55 : 0.7);

/** A joint at rest, on the figure's right (1) or left (-1). */
export const restJoint = (
    model: BodyModel,
    name: keyof BodyModel['joints'],
    side: 1 | -1
): Vec3 => {
    const [z, y] = model.joints[name];
    return [0, y, z * side];
};

/** The middle of the hand at rest, which the skeleton's hand is at. */
export const restHand = (model: BodyModel, side: 1 | -1): Vec3 => {
    const wrist = restJoint(model, 'wrist', side);
    return add3(wrist, scale3(sub3(restJoint(model, 'fingertip', side), wrist), 0.4));
};

/** A limb part along a bone at rest, from the measured rows across it. */
function limbPart(
    model: BodyModel,
    part: 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin',
    from: Vec3,
    to: Vec3,
    side: 1 | -1
) {
    const along = sub3(to, from);
    const way = normalize3(along);
    // Square to the bone in the drawing, to the figure's right for a bone going down
    const across: Vec3 = normalize3([0, way[2], -way[1]]);
    return tube(
        model,
        model[part].rows.map(([t, offset, half]) => ({
            centre: add3(add3(from, scale3(along, t)), scale3(across, offset * side)),
            across,
            ahead: FORWARDS,
            half: Math.max(half, 0.6),
            depth: Math.max(half, 0.6) * DEPTH[part],
        }))
    );
}

/** The head, neck or torso at rest, from the measured rows across it. */
function levelPart(
    model: BodyModel,
    rows: readonly (readonly [number, number])[],
    depth: (y: number) => number
) {
    return tube(
        model,
        rows.map(([y, half]) => ({
            centre: [0, y, 0] as Vec3,
            across: RIGHT,
            ahead: FORWARDS,
            half: Math.max(half, 0.6),
            depth: Math.max(half, 0.6) * depth(y),
        }))
    );
}

/** How far below the skeleton's ankle the sole is. */
export const ANKLE_HEIGHT = 5;

/**
 * A foot, made about its ankle (at the origin) pointing forwards, its sole `ANKLE_HEIGHT` below:
 * x towards the toes, y up, z to the figure's right. Painted from where the drawings have it.
 */
function footPart(model: BodyModel, side: 1 | -1) {
    const ankle = restJoint(model, 'ankle', side);
    // Heel to toes: how far along, half its width and height, from the drawings' feet
    const profile = [
        [-8, 3.2, 3.2],
        [-6.5, 3.8, 4],
        [-3, 4.2, 4.2],
        [3, 4.6, 3.6],
        [10, 5, 2.8],
        [16, 4.6, 2],
        [19, 3.6, 1.5],
    ] as const;
    return tube(
        model,
        profile.map(([x, half, height]) => ({
            centre: [x, -ANKLE_HEIGHT + height, 0] as Vec3,
            across: RIGHT,
            ahead: [0, 1, 0] as Vec3,
            half,
            depth: height,
        })),
        // On the drawings the feet are seen end on, below the ankles
        ([x, y, z]) => [
            x,
            Math.max(0, (y + ANKLE_HEIGHT) * (ankle[1] / ANKLE_HEIGHT) * 0.75),
            z + ankle[2],
        ]
    );
}

/**
 * Rows rounding off the top of a part above its top row, as the top of a head is: the drawings
 * end a head where its hair starts.
 */
function dome([y, half]: readonly [number, number]): [number, number][] {
    if (half < 4) {
        return [];
    }
    return [80, 60, 40, 20].map((degrees) => {
        const angle = (degrees * Math.PI) / 180;
        return [y + half * 0.85 * Math.sin(angle), half * Math.cos(angle)];
    });
}

/** Every part of the body, at rest, for `figure`. Index 0 of a pair is the figure's right. */
export function buildBody(figure: BodyFigure) {
    const model = BODY_MODELS[figure];
    const sides = [1, -1] as const;
    return {
        model,
        torso: levelPart(model, model.torso, (y) => torsoDepth(y, model)),
        neck: levelPart(model, model.neck, () => DEPTH.neck),
        head: levelPart(model, [...dome(model.head[0]), ...model.head], () => DEPTH.head),
        upperArms: sides.map((side) =>
            limbPart(
                model,
                'upperArm',
                restJoint(model, 'shoulder', side),
                restJoint(model, 'elbow', side),
                side
            )
        ),
        forearms: sides.map((side) =>
            limbPart(
                model,
                'forearm',
                restJoint(model, 'elbow', side),
                restJoint(model, 'wrist', side),
                side
            )
        ),
        hands: sides.map((side) =>
            limbPart(
                model,
                'hand',
                restJoint(model, 'wrist', side),
                restJoint(model, 'fingertip', side),
                side
            )
        ),
        thighs: sides.map((side) =>
            limbPart(
                model,
                'thigh',
                restJoint(model, 'hip', side),
                restJoint(model, 'knee', side),
                side
            )
        ),
        shins: sides.map((side) =>
            limbPart(
                model,
                'shin',
                restJoint(model, 'knee', side),
                restJoint(model, 'ankle', side),
                side
            )
        ),
        feet: sides.map((side) => footPart(model, side)),
    };
}

export type Body = ReturnType<typeof buildBody>;

/** A part's way of facing: its x (front) and y (along it) axes; z follows. */
export const frame = (y: Vec3, x: Vec3): [Vec3, Vec3, Vec3] => [x, y, cross3(x, y)];
