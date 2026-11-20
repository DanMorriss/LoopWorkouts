// Builds src/app/models/body-model.ts, the shape of the 3D demo figure (EXR-13), from the body
// map's own drawings (src/app/shared/components/body-map/body-shapes.ts), so the 3D figure has
// the body map's proportions and its drawings fit it when painted on.
//
//     node tools/build-body-model.mjs
//
// Each drawing's outline is filled in a browser (Playwright), then measured: how wide each part
// is across, along its bone, between the joints set by eye below (in the drawing's units). The
// right side is measured and the left mirrors it.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'src/app/models/body-model.ts');

// Where the joints are on each front drawing, by eye. The figure's right is on the drawing's
// left. `[x, y]` for a joint; a joint with `snap` has its x moved to the middle of the limb
// there. The back drawings are mirrors of the fronts, registered by their middle line, the
// floor and the shoulders' height.
const FRONT = {
    male: {
        centre: 362,
        headTop: 97,
        chin: 250,
        neckBase: 290,
        shoulder: [240, 330],
        armpit: 450,
        elbow: { at: [195, 500], snap: true },
        wrist: { at: [127, 690], snap: true },
        fingertip: [104, 810],
        hip: [305, 665],
        crotch: 750,
        knee: { at: [292, 965], snap: true },
        ankle: { at: [290, 1275], snap: true },
        sole: 1350,
    },
    female: {
        centre: 320,
        // The top of the head under the hair: the drawing's hair stands well up above it
        headTop: 50,
        chin: 241,
        neckBase: 265,
        shoulder: [198, 322],
        armpit: 418,
        elbow: { at: [142, 491], snap: true },
        wrist: { at: [65, 652], snap: true },
        fingertip: [23, 764],
        hip: [258, 660],
        crotch: 735,
        knee: { at: [262, 1000], snap: true },
        ankle: { at: [279, 1332], snap: true },
        sole: 1432,
        // Her shoulders round off from the neck to the arms, and her hips and thighs are
        // measured out to the drawing's edge, where his stop at his shoulders' and hips' width
        rounded: true,
        headHalf: 58,
    },
};
const BACK = {
    male: { centre: 1087, shoulder: 330, sole: 1350 },
    female: { centre: 1142, shoulder: 330, sole: 1432 },
};
/** The figure's height in cm from the soles to the top of the head, as BODY in exercise-motion.ts. */
const HEIGHT = 178;

// The drawings, from the generated TypeScript (compiled to a scratch file, as it's only data)
const scratch = mkdtempSync(join(tmpdir(), 'body-model-'));
const compiled = join(scratch, 'body-shapes.mjs');
execFileSync(join(ROOT, 'node_modules/.bin/esbuild'), [
    join(ROOT, 'src/app/shared/components/body-map/body-shapes.ts'),
    '--format=esm',
    `--outfile=${compiled}`,
    '--log-level=error',
]);
const { BODY_FIGURES } = await import(compiled);

/** Each drawing's outline, filled, as a mask of its viewBox at one pixel a unit. */
async function masks() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const result = {};
    for (const sex of ['male', 'female']) {
        // The outline leaves out the top of the head (the hair is a shape of its own), so
        // every shape is filled with it
        const { viewBox, outline, shapes } = BODY_FIGURES[sex].front;
        const paths = [outline, ...shapes.flatMap((shape) => shape.paths)];
        const [x, y, w, h] = viewBox.split(' ').map(Number);
        const data = await page.evaluate(
            ([paths, x, y, w, h]) => {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const context = canvas.getContext('2d');
                context.translate(-x, -y);
                paths.forEach((d) => context.fill(new Path2D(d)));
                const pixels = context.getImageData(0, 0, w, h).data;
                const mask = [];
                for (let i = 3; i < pixels.length; i += 4) {
                    mask.push(pixels[i] > 127 ? 1 : 0);
                }
                return mask;
            },
            [paths, x, y, w, h]
        );
        result[sex] = { x, y, w, h, data };
    }
    await browser.close();
    return result;
}

const round = (value) => Math.round(value * 10) / 10;

function measure(sex, mask) {
    const at = FRONT[sex];
    const inside = (px, py) => {
        const [ix, iy] = [Math.round(px - mask.x), Math.round(py - mask.y)];
        return (
            ix >= 0 && iy >= 0 && ix < mask.w && iy < mask.h && mask.data[iy * mask.w + ix] === 1
        );
    };
    /** From a point, how far the outline is each way along `[dx, dy]`, up to `limit`. */
    const extent = ([px, py], [dx, dy], limit, limitBack = limit) => {
        let a = 0;
        while (a < limit && inside(px + dx * (a + 1), py + dy * (a + 1))) a++;
        let b = 0;
        while (b < limitBack && inside(px - dx * (b + 1), py - dy * (b + 1))) b++;
        return [a, b];
    };
    const joint = (given) => {
        if (Array.isArray(given)) return given;
        const [x, y] = given.at;
        const [right, left] = extent([x, y], [1, 0], 200);
        return [x + (right - left) / 2, y];
    };
    const floorUnitsPerCm = (at.sole - at.headTop) / HEIGHT;
    // In cm: z to the figure's right (the drawing's left), y up from the floor
    const cm = ([x, y]) => [
        round((at.centre - x) / floorUnitsPerCm),
        round((at.sole - y) / floorUnitsPerCm),
    ];
    const joints = {
        shoulder: joint(at.shoulder),
        elbow: joint(at.elbow),
        wrist: joint(at.wrist),
        fingertip: joint(at.fingertip),
        hip: joint(at.hip),
        knee: joint(at.knee),
        ankle: joint(at.ankle),
    };

    /**
     * Across a bone from `from` to `to`, at `steps` places from `t0` to `t1` along it: how far
     * its middle is off the bone (positive to the figure's right) and half its width, in cm.
     * Where it's joined to the body, it's no wider than `limit` units from the bone to the
     * figure's right, and `limitLeft` to its left.
     */
    const across = (from, to, t0, t1, steps, limit, limitLeft = limit) => {
        const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
        const length = Math.hypot(dx, dy);
        // Square to the bone, towards the figure's right, which is the drawing's left (-x)
        const square = dy >= 0 ? [-dy / length, dx / length] : [dy / length, -dx / length];
        const rows = [];
        for (let i = 0; i <= steps; i++) {
            const t = t0 + ((t1 - t0) * i) / steps;
            const point = [from[0] + dx * t, from[1] + dy * t];
            const [toRight, toLeft] = extent(point, square, limit, limitLeft);
            rows.push([
                Math.round(t * 100) / 100,
                round((toRight - toLeft) / 2 / floorUnitsPerCm),
                round((toRight + toLeft) / 2 / floorUnitsPerCm),
            ]);
        }
        return { length: round(length / floorUnitsPerCm), rows };
    };
    /** Across the body at each height from `y0` down to `y1` (units), its half width in cm. */
    const level = (y0, y1, steps, limit) => {
        const rows = [];
        for (let i = 0; i <= steps; i++) {
            const y = y0 + ((y1 - y0) * i) / steps;
            const [a, b] = extent([at.centre, y], [1, 0], limit);
            rows.push([
                round((at.sole - y) / floorUnitsPerCm),
                round((a + b) / 2 / floorUnitsPerCm),
            ]);
        }
        return rows;
    };
    const shoulderHalf = at.centre - joints.shoulder[0];
    /**
     * The torso, its shoulders rounded: from the neck it follows the drawing's outline out to
     * the shoulders' width, then narrows to its width under the arms, the arms covering the
     * shoulders' sides; below the armpits, out to the drawing's edge.
     */
    /**
     * The head, rounded: the drawing's hair fills out the sides of the face, so it's as wide as
     * the drawing or a skull's rounded outline, whichever is less, the jaw narrowing to the chin.
     */
    const roundedHead = () =>
        level(at.headTop + 2, at.chin, 12, at.headHalf).map(([y, half]) => {
            const top = (at.sole - at.headTop) / floorUnitsPerCm;
            const chin = (at.sole - at.chin) / floorUnitsPerCm;
            // From the widest, a little above the middle, up to the top (1) or down to the chin (-1)
            const widest = chin + (top - chin) * 0.58;
            const t = y >= widest ? (y - widest) / (top - widest) : (y - widest) / (widest - chin);
            const power = t >= 0 ? 2.2 : 1.7;
            const skull = (at.headHalf / floorUnitsPerCm) * (1 - Math.abs(t) ** power) ** (1 / power);
            return [y, round(Math.min(half, Math.max(skull, t < 0 ? 4 : 0)))];
        });
    const roundedTorso = () => {
        const halfAt = (y) => {
            const [a, b] = extent([at.centre, y], [1, 0], 220);
            return (a + b) / 2;
        };
        const underArms = halfAt(at.armpit + 6);
        const shoulderY = joints.shoulder[1];
        const smooth = (t) => t * t * (3 - 2 * t);
        const rows = [];
        const steps = 32;
        for (let i = 0; i <= steps; i++) {
            const y = at.neckBase + ((at.crotch - at.neckBase) * i) / steps;
            let half = halfAt(y);
            if (y <= at.armpit) {
                const down = Math.max(0, (y - shoulderY) / (at.armpit - shoulderY));
                half = Math.min(half, shoulderHalf + (underArms - shoulderHalf) * smooth(down));
            }
            rows.push([round((at.sole - y) / floorUnitsPerCm), round(half / floorUnitsPerCm)]);
        }
        return rows;
    };
    const back = BACK[sex];
    return {
        front: {
            viewBox: BODY_FIGURES[sex].front.viewBox,
            centre: at.centre,
            floor: at.sole,
            unitsPerCm: round(floorUnitsPerCm * 1000) / 1000,
        },
        back: {
            viewBox: BODY_FIGURES[sex].back.viewBox,
            centre: back.centre,
            floor: back.sole,
            unitsPerCm:
                Math.round(
                    ((back.sole - back.shoulder) / (at.sole - at.shoulder[1])) *
                        floorUnitsPerCm *
                        1000
                ) / 1000,
        },
        joints: Object.fromEntries(
            Object.entries(joints).map(([name, point]) => [name, cm(point)])
        ),
        levels: {
            headTop: cm([at.centre, at.headTop])[1],
            chin: cm([at.centre, at.chin])[1],
            neckBase: cm([at.centre, at.neckBase])[1],
            armpit: cm([at.centre, at.armpit])[1],
            crotch: cm([at.centre, at.crotch])[1],
        },
        // The head, neck and torso, level by level, top down
        // No wider than a head, so a ponytail isn't
        head: at.rounded ? roundedHead() : level(at.headTop + 2, at.chin, 12, 62),
        neck: level(at.chin, at.neckBase + 10, 4, 45),
        torso: at.rounded ? roundedTorso() : level(at.neckBase, at.crotch, 24, shoulderHalf),
        upperArm: across(joints.shoulder, joints.elbow, -0.15, 1.1, 14, 0.42 * shoulderHalf),
        forearm: across(joints.elbow, joints.wrist, -0.1, 1.08, 12, 60),
        hand: across(joints.wrist, joints.fingertip, 0, 1, 6, 45),
        // Out to the hip's edge; in, as far as the middle line
        thigh: at.rounded
            ? across(joints.hip, joints.knee, -0.05, 1.08, 14, 140, at.centre - joints.hip[0])
            : across(joints.hip, joints.knee, -0.05, 1.08, 14, at.centre - joints.hip[0]),
        shin: across(joints.knee, joints.ankle, -0.06, 1.05, 14, 70),
    };
}

const all = await masks();
const model = { male: measure('male', all.male), female: measure('female', all.female) };
for (const sex of ['male', 'female']) {
    const m = model[sex];
    console.log(
        sex,
        'upper arm',
        m.upperArm.length,
        'forearm',
        m.forearm.length,
        'thigh',
        m.thigh.length,
        'shin',
        m.shin.length,
        'joints',
        JSON.stringify(m.joints)
    );
}

writeFileSync(
    OUT,
    `// Generated by tools/build-body-model.mjs from the body map's drawings: don't edit by hand.

import { BodyFigure } from './exercise';

/** A row across a limb part: how far along its bone (0 at its joint, 1 at the next), how far its
 * middle is off the bone to the figure's right, and half its width, in cm. */
export type LimbRow = readonly [t: number, offset: number, half: number];
/** A row across the head, neck or torso: its height off the floor and half its width, in cm. */
export type LevelRow = readonly [y: number, half: number];

/** Where a body map drawing is: its viewBox, and its middle line, floor and scale in its units. */
export interface DrawingPlace {
    readonly viewBox: string;
    readonly centre: number;
    readonly floor: number;
    readonly unitsPerCm: number;
}

/** The body map's figure, standing as drawn, measured in cm: z to its right, y up. */
export interface BodyModel {
    readonly front: DrawingPlace;
    readonly back: DrawingPlace;
    /** The right side's joints, as [z, y]; the left's mirror them. */
    readonly joints: Readonly<
        Record<'shoulder' | 'elbow' | 'wrist' | 'fingertip' | 'hip' | 'knee' | 'ankle', readonly [number, number]>
    >;
    readonly levels: Readonly<Record<'headTop' | 'chin' | 'neckBase' | 'armpit' | 'crotch', number>>;
    readonly head: readonly LevelRow[];
    readonly neck: readonly LevelRow[];
    readonly torso: readonly LevelRow[];
    readonly upperArm: { readonly length: number; readonly rows: readonly LimbRow[] };
    readonly forearm: { readonly length: number; readonly rows: readonly LimbRow[] };
    readonly hand: { readonly length: number; readonly rows: readonly LimbRow[] };
    readonly thigh: { readonly length: number; readonly rows: readonly LimbRow[] };
    readonly shin: { readonly length: number; readonly rows: readonly LimbRow[] };
}

export const BODY_MODELS: Record<BodyFigure, BodyModel> = ${JSON.stringify(model)};
`
);
execFileSync(join(ROOT, 'node_modules/.bin/prettier'), ['--write', OUT]);
console.log('wrote', OUT);
