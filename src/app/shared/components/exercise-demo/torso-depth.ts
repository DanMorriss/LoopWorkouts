import { BodyFigure } from '../../../models/exercise';

/** A table of [where, value] pairs, read in a straight line between them. */
type Table = readonly (readonly [number, number])[];

/** A value read off a table of [where, value] pairs, in a straight line between them. */
export function lookUp(table: Table, at: number): number {
    if (at <= table[0][0]) {
        return table[0][1];
    }
    for (let i = 1; i < table.length; i++) {
        const [x1, y1] = table[i];
        if (at <= x1) {
            const [x0, y0] = table[i - 1];
            return y0 + ((y1 - y0) * (at - x0)) / (x1 - x0);
        }
    }
    return table[table.length - 1][1];
}

/**
 * A pair of mounds on the torso, one either side of its middle: how far each stands out, in cm,
 * from where (`from` to `to`, up the torso as `TorsoDepth` measures it) and how far either side
 * of the middle its peak is and how wide it is, in cm.
 */
interface Mounds {
    readonly from: number;
    readonly peak: number;
    readonly to: number;
    readonly height: number;
    readonly out: number;
    readonly width: number;
}

/**
 * How deep a figure's torso is, front to back, as the drawings only show its width: how far it
 * reaches forwards and backwards from its middle line, in cm, from the crotch (0) up to the base
 * of the neck (1), and any mounds standing out from that in front or behind.
 */
interface TorsoDepth {
    readonly front: Table;
    readonly back: Table;
    readonly frontMounds?: Mounds;
    readonly backMounds?: Mounds;
}

export const TORSO_DEPTH: Record<BodyFigure, TorsoDepth> = {
    // The chest stands out further than the belly, the seat rounds out behind the hips, the
    // lower back curves in, and the traps rise behind the neck
    male: {
        front: [
            [0, 7.5],
            [0.15, 8.5],
            [0.35, 9],
            [0.5, 8.6],
            [0.62, 9.6],
            [0.72, 11.2],
            [0.82, 11.2],
            [0.92, 8.6],
            [1, 5.5],
        ],
        back: [
            [0, 9.5],
            [0.1, 11.5],
            [0.2, 11.5],
            [0.32, 8.4],
            [0.5, 8.4],
            [0.68, 9.4],
            [0.82, 10],
            [0.92, 9.6],
            [1, 7.5],
        ],
    },
    // A slimmer chest with a bust, a narrow waist, the lower back curving in further, and a
    // fuller seat, lower down
    female: {
        front: [
            [0, 7],
            [0.15, 8],
            [0.3, 8.2],
            [0.42, 7.4],
            [0.55, 7.6],
            [0.66, 8.4],
            [0.78, 8.8],
            [0.88, 8],
            [0.95, 6.6],
            [1, 5],
        ],
        back: [
            [0, 9.5],
            [0.07, 11.6],
            [0.15, 12.2],
            [0.25, 10.2],
            [0.36, 7.4],
            [0.5, 7.2],
            [0.64, 8.2],
            [0.8, 9],
            [0.92, 8.4],
            [1, 6.5],
        ],
        frontMounds: { from: 0.54, peak: 0.68, to: 0.86, height: 4.2, out: 8.5, width: 4.8 },
        backMounds: { from: 0, peak: 0.13, to: 0.3, height: 1.2, out: 6.5, width: 5 },
    },
};

/** How far `mounds` stand out at `up` the torso (0 to 1) and `across` it (cm, either way). */
export function moundsAt(mounds: Mounds | undefined, up: number, across: number): number {
    if (!mounds || up <= mounds.from || up >= mounds.to) {
        return 0;
    }
    const { from, peak, to } = mounds;
    // Rounded above and below the peak, up to it and down from it
    const t = up < peak ? (up - from) / (peak - from) : (to - up) / (to - peak);
    const rise = Math.sin((Math.PI / 2) * t);
    const side = (Math.abs(across) - mounds.out) / mounds.width;
    return mounds.height * rise * Math.exp(-side * side);
}
