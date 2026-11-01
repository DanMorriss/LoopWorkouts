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
        centre: 350,
        headTop: 130,
        chin: 280,
        neckBase: 305,
        shoulder: [232, 355],
        armpit: 460,
        elbow: { at: [185, 515], snap: true },
        wrist: { at: [120, 680], snap: true },
        fingertip: [78, 795],
        hip: [295, 700],
        crotch: 775,
        knee: { at: [290, 1030], snap: true },
        ankle: { at: [300, 1350], snap: true },
        sole: 1470,
    },
};
const BACK = {
    male: { centre: 1087, shoulder: 330, sole: 1350 },
    female: { centre: 1120, shoulder: 325, sole: 1425 },
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
    const extent = ([px, py], [dx, dy], limit) => {
        let a = 0;
        while (a < limit && inside(px + dx * (a + 1), py + dy * (a + 1))) a++;
        let b = 0;
        while (b < limit && inside(px - dx * (b + 1), py - dy * (b + 1))) b++;
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
     * Where it's joined to the body, it's no wider than `limit` units from the bone either way.
     */
    const across = (from, to, t0, t1, steps, limit) => {
        const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
        const length = Math.hypot(dx, dy);
        // Square to the bone, towards the figure's right, which is the drawing's left (-x)
        const square = dy >= 0 ? [-dy / length, dx / length] : [dy / length, -dx / length];
        const rows = [];
        for (let i = 0; i <= steps; i++) {
            const t = t0 + ((t1 - t0) * i) / steps;
            const point = [from[0] + dx * t, from[1] + dy * t];
            const [toRight, toLeft] = extent(point, square, limit);
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
        head: level(at.headTop + 2, at.chin, 12, 62),
        neck: level(at.chin, at.neckBase + 10, 4, 45),
        torso: level(at.neckBase, at.crotch, 24, shoulderHalf),
        upperArm: across(joints.shoulder, joints.elbow, -0.15, 1.1, 14, 0.42 * shoulderHalf),
        forearm: across(joints.elbow, joints.wrist, -0.1, 1.08, 12, 60),
        hand: across(joints.wrist, joints.fingertip, 0, 1, 6, 45),
        thigh: across(joints.hip, joints.knee, -0.05, 1.08, 14, at.centre - joints.hip[0]),
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
