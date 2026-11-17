import { MuscleGroup } from './exercise';

/**
 * The drawing of each part of an exercise demo's figure (EXR-13), in the body map's style:
 * a silhouette with muscles as separate outlined pieces on it, each shaded on its own.
 *
 * Each part is drawn hanging from the joint it moves about, at (0, 0), with +y running along
 * it (to the next joint at its length in `BODY`) and +x to its front from the side, or to its
 * outer side from the front. The torso hangs from the shoulders, and the head and neck stand
 * up from them (+y up), face to +x. Units are about a centimetre.
 *
 * Shapes are written as points, smoothed into curves through them.
 */

export interface ArtPiece {
    /** The muscle group it is, or null for a part never shaded (head, hands, shins, feet). */
    readonly muscle: MuscleGroup | null;
    readonly d: string;
}

export interface PartArt {
    readonly outline: string;
    readonly pieces: readonly ArtPiece[];
    /** The box around it: [left, top, right, bottom]. */
    readonly bounds: readonly [number, number, number, number];
}

export type PartName = 'torso' | 'head' | 'upperArm' | 'forearm' | 'thigh' | 'shin' | 'foot';

type Points = readonly (readonly [number, number])[];

const round = (n: number) => Math.round(n * 100) / 100;

/** A closed curve through the points (a Catmull-Rom spline, as cubic Béziers). */
function smooth(points: Points): string {
    const at = (i: number) => points[(i + points.length) % points.length];
    let d = `M${round(points[0][0])} ${round(points[0][1])}`;
    for (let i = 0; i < points.length; i++) {
        const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`;
    }
    return `${d}Z`;
}

/** The same points, mirrored across x = 0. */
const mirrored = (points: Points): Points => points.map(([x, y]) => [-x, y] as const);

/**
 * A part's drawing. A part that's all one piece never shaded (the head, a foot) is filled
 * as one too, with `fillAt` saying which of its pieces go under it (e.g. the neck) and
 * which over (an ear).
 */
function part(
    outline: Points,
    pieces: readonly [MuscleGroup | null, Points][],
    fillAt?: number
): PartArt {
    if (fillAt !== undefined) {
        pieces = [...pieces.slice(0, fillAt), [null, outline], ...pieces.slice(fillAt)];
    }
    const all = [outline, ...pieces.map(([, points]) => points)].flat();
    const xs = all.map(([x]) => x);
    const ys = all.map(([, y]) => y);
    // A little more, for the curves bulging past their points
    return {
        outline: smooth(outline),
        pieces: pieces.map(([muscle, points]) => ({ muscle, d: smooth(points) })),
        bounds: [
            Math.min(...xs) - 1,
            Math.min(...ys) - 1,
            Math.max(...xs) + 1,
            Math.max(...ys) + 1,
        ],
    };
}

/** A piece and its mirror image, for the two sides of the torso from the front. */
const pair = (muscle: MuscleGroup, points: Points): [MuscleGroup, Points][] => [
    [muscle, points],
    [muscle, mirrored(points)],
];

const SIDE: Record<PartName, PartArt> = {
    // From the shoulders (y = 0) to the hips (y = 52), front to +x
    torso: part(
        [
            [4, -5],
            [9, -1],
            [12.5, 8],
            [11, 18],
            [9.5, 30],
            [10, 42],
            [8.5, 51],
            [4, 56],
            [-6, 55],
            [-9.5, 48],
            [-8, 38],
            [-10, 24],
            [-11.5, 12],
            [-9, 0],
            [-4.5, -6],
        ],
        [
            [
                'traps',
                [
                    [-4, -5.5],
                    [-8.5, -0.5],
                    [-10, 5],
                    [-6.5, 4],
                    [-3.5, -1],
                ],
            ],
            [
                'upper-back',
                [
                    [-10.5, 8],
                    [-11, 14],
                    [-9.5, 24],
                    [-6.5, 26],
                    [-7, 15],
                    [-8, 8],
                ],
            ],
            [
                'lower-back',
                [
                    [-7.5, 30],
                    [-8, 38],
                    [-8.5, 46],
                    [-5.5, 46],
                    [-5, 36],
                    [-5.5, 30],
                ],
            ],
            [
                'chest',
                [
                    [3.5, 0],
                    [9, 0.5],
                    [12, 8],
                    [10.5, 16],
                    [5, 17],
                    [2.5, 8],
                ],
            ],
            [
                'abs',
                [
                    [6.5, 20],
                    [10, 20],
                    [9.6, 28],
                    [6.2, 28],
                ],
            ],
            [
                'abs',
                [
                    [6.2, 29.5],
                    [9.6, 29.5],
                    [9.6, 37],
                    [6, 37],
                ],
            ],
            [
                'abs',
                [
                    [6, 38.5],
                    [9.7, 38.5],
                    [9.2, 48],
                    [6.5, 48],
                ],
            ],
            [
                'obliques',
                [
                    [-4, 22],
                    [0, 19],
                    [4.5, 20],
                    [4.5, 36],
                    [4.5, 46],
                    [0, 44],
                    [-4, 34],
                ],
            ],
        ]
    ),
    // Standing up from the shoulders (+y up), face to +x
    head: part(
        [
            [-1, 7],
            [5, 7.5],
            [8, 10.5],
            [9.5, 14],
            [11.5, 16.5],
            [9.5, 18],
            [10, 24],
            [6.5, 28.5],
            [0, 30],
            [-7, 27],
            [-10, 20],
            [-9, 12],
            [-4.5, 8],
        ],
        [
            [
                'traps',
                [
                    [-3.5, -1],
                    [3, -1],
                    [3.8, 8],
                    [-3.6, 8],
                ],
            ],
            [
                null,
                [
                    [-2.5, 15],
                    [-0.5, 14.5],
                    [0, 19],
                    [-2, 19.5],
                ],
            ],
        ],
        1
    ),
    // From the shoulder joint to the elbow (y = 30)
    upperArm: part(
        [
            [0, -8],
            [6, -5],
            [7.5, 3],
            [6, 14],
            [4.8, 26],
            [4, 31],
            [0, 34],
            [-4, 31],
            [-5, 24],
            [-6.5, 13],
            [-7.5, 2],
            [-5.5, -5.5],
        ],
        [
            [
                'shoulders',
                [
                    [-5, -4],
                    [0, -7],
                    [5.5, -4],
                    [6.8, 3],
                    [4, 11],
                    [0, 13],
                    [-4, 11],
                    [-6.5, 3],
                ],
            ],
            [
                'biceps',
                [
                    [1.5, 14],
                    [5, 16],
                    [4.5, 24],
                    [2.5, 29],
                    [0.8, 24],
                    [0.8, 18],
                ],
            ],
            [
                'triceps',
                [
                    [-1, 14],
                    [-5.8, 14],
                    [-5.2, 22],
                    [-3.5, 29],
                    [-1.2, 25],
                    [-0.6, 18],
                ],
            ],
        ]
    ),
    // From the elbow to the middle of the hand (y = 30)
    forearm: part(
        [
            [0, -4],
            [4.5, -2],
            [4.5, 8],
            [3, 22],
            [4.2, 26],
            [4.8, 31],
            [3, 35.5],
            [-1, 36],
            [-3.8, 32],
            [-4, 26],
            [-2.8, 22],
            [-4.5, 10],
            [-4.5, -1.5],
        ],
        [
            [
                'forearms',
                [
                    [0.6, 0],
                    [4, 1],
                    [3.8, 9],
                    [2.5, 21],
                    [0.8, 21],
                    [0.6, 8],
                ],
            ],
            [
                'forearms',
                [
                    [-0.6, 0],
                    [-4, 1],
                    [-4, 9],
                    [-2.5, 21],
                    [-0.8, 21],
                    [-0.6, 8],
                ],
            ],
            [
                null,
                [
                    [-3, 25],
                    [3, 25],
                    [4.3, 30],
                    [2.5, 34.5],
                    [-1, 34.8],
                    [-3.5, 31],
                ],
            ],
        ]
    ),
    // From the hip to the knee (y = 44)
    thigh: part(
        [
            [3, -5],
            [8.5, 0],
            [9.5, 12],
            [9, 26],
            [7.5, 38],
            [6.5, 44],
            [3, 48],
            [-2.5, 48],
            [-6, 44],
            [-7, 36],
            [-9.5, 24],
            [-11, 12],
            [-13, 4],
            [-11.5, -4],
            [-5, -7.5],
        ],
        [
            [
                'glutes',
                [
                    [-4, -6],
                    [-11, -3],
                    [-12.5, 4],
                    [-10.5, 12],
                    [-5, 10],
                    [-3, 3],
                ],
            ],
            [
                'abductors',
                [
                    [-1.5, 0],
                    [2, -2.5],
                    [2, 4],
                    [-1, 10],
                    [-2.5, 6],
                ],
            ],
            [
                'quads',
                [
                    [3.5, 1],
                    [8, 4],
                    [8.8, 16],
                    [8, 30],
                    [5.5, 40],
                    [3.5, 38],
                    [3.5, 20],
                ],
            ],
            [
                'quads',
                [
                    [-1.5, 13],
                    [1.8, 7],
                    [2.5, 20],
                    [2.2, 36],
                    [-0.5, 38],
                    [-2.5, 28],
                ],
            ],
            [
                'hamstrings',
                [
                    [-4, 13],
                    [-9, 14],
                    [-9, 26],
                    [-6, 40],
                    [-3.5, 40],
                    [-3.2, 26],
                ],
            ],
            [
                null,
                [
                    [4, 41],
                    [7, 42],
                    [7, 46],
                    [4, 46.5],
                ],
            ],
        ]
    ),
    // From the knee to the ankle (y = 44)
    shin: part(
        [
            [4.5, -3],
            [5.2, 8],
            [4, 30],
            [3, 42],
            [2.5, 46],
            [-2, 46.5],
            [-3, 42],
            [-3.8, 34],
            [-7.5, 20],
            [-8, 8],
            [-5, -2.5],
        ],
        [
            [
                'calves',
                [
                    [-2, 3],
                    [-6.5, 6],
                    [-7.5, 14],
                    [-5.5, 26],
                    [-3, 33],
                    [-1.8, 22],
                ],
            ],
            [
                null,
                [
                    [1, 3],
                    [4.3, 6],
                    [4, 18],
                    [3, 32],
                    [1.5, 34],
                    [0.8, 18],
                ],
            ],
        ]
    ),
    // From the ankle towards the toes (+y), the top of the foot to +x
    foot: part(
        [
            [2.5, -5],
            [3.5, 4],
            [2.2, 13],
            [0.5, 17],
            [-2, 18.5],
            [-3.6, 15],
            [-3.6, 2],
            [-3.2, -5],
            [-0.5, -7.5],
        ],
        [],
        0
    ),
};

const FRONT: Record<PartName, PartArt> = {
    // From the shoulders (y = 0) to the hips (y = 52), the figure's left to +x
    torso: part(
        [
            [-5, -6],
            [5, -6],
            [13, -2],
            [19, 2],
            [17, 10],
            [14, 18],
            [12.5, 30],
            [14.5, 44],
            [12, 52],
            [5, 56],
            [0, 57],
            [-5, 56],
            [-12, 52],
            [-14.5, 44],
            [-12.5, 30],
            [-14, 18],
            [-17, 10],
            [-19, 2],
            [-13, -2],
        ],
        [
            ...pair('traps', [
                [5, -5],
                [12.5, -1.5],
                [15, 1],
                [8, 0.5],
                [4.5, -1.5],
            ]),
            ...pair('chest', [
                [1, 2],
                [9, 1.5],
                [15, 4],
                [15, 10],
                [10, 15],
                [1.2, 14],
            ]),
            ...pair('upper-back', [
                [14, 11],
                [16, 10],
                [13.8, 22],
                [12.8, 17],
            ]),
            ...pair('obliques', [
                [7, 17],
                [12.3, 15],
                [11.8, 28],
                [13.3, 42],
                [8, 44],
                [7, 30],
            ]),
            ...pair('abs', [
                [1, 17],
                [5.5, 17],
                [5.5, 23.5],
                [1, 23.5],
            ]),
            ...pair('abs', [
                [1, 25],
                [5.5, 25],
                [5.5, 31.5],
                [1, 31.5],
            ]),
            ...pair('abs', [
                [1, 33],
                [5.5, 33],
                [5.3, 39.5],
                [1, 39.5],
            ]),
            ...pair('abs', [
                [1, 41],
                [5, 41],
                [4, 50],
                [1, 52],
            ]),
        ]
    ),
    // Standing up from the shoulders (+y up)
    head: part(
        [
            [0, 30],
            [7, 27],
            [9, 19],
            [8, 12],
            [4, 7.5],
            [0, 6.5],
            [-4, 7.5],
            [-8, 12],
            [-9, 19],
            [-7, 27],
        ],
        [
            [
                'traps',
                [
                    [-4, -2],
                    [4, -2],
                    [3.8, 8],
                    [-3.8, 8],
                ],
            ],
        ],
        1
    ),
    // From the shoulder joint to the elbow (y = 30), the outer side to +x
    upperArm: part(
        [
            [-4, -6],
            [2, -8],
            [7, -4],
            [8, 3],
            [6.5, 14],
            [5, 27],
            [3.5, 32],
            [-3.5, 32],
            [-5, 27],
            [-5.5, 14],
            [-5, 4],
        ],
        [
            [
                'shoulders',
                [
                    [-3, -5],
                    [2, -7],
                    [6.5, -3.5],
                    [7.5, 3],
                    [5.5, 10],
                    [1, 12.5],
                    [-2.5, 8],
                    [-4, 1],
                ],
            ],
            [
                'biceps',
                [
                    [-3.5, 13],
                    [1.5, 13],
                    [3, 20],
                    [1.5, 29],
                    [-2, 29],
                    [-4, 20],
                ],
            ],
            [
                'triceps',
                [
                    [3.8, 13],
                    [6, 14],
                    [5, 25],
                    [3.6, 27],
                    [3.4, 19],
                ],
            ],
        ]
    ),
    // From the elbow to the middle of the hand (y = 30)
    forearm: part(
        [
            [-4, -3],
            [4.5, -3],
            [5, 8],
            [3, 22],
            [4, 26],
            [4.5, 32],
            [2.5, 36],
            [-2.5, 36],
            [-4.5, 32],
            [-4, 26],
            [-3, 22],
            [-4.8, 8],
        ],
        [
            [
                'forearms',
                [
                    [-3.5, 0],
                    [-0.5, 0],
                    [-0.5, 21],
                    [-2.5, 21],
                    [-3.8, 8],
                ],
            ],
            [
                'forearms',
                [
                    [0.5, 0],
                    [4, 0],
                    [4.2, 8],
                    [2.5, 21],
                    [0.5, 21],
                ],
            ],
            [
                null,
                [
                    [-3.5, 25],
                    [3.5, 25],
                    [4, 31],
                    [2, 35],
                    [-2, 35],
                    [-4, 31],
                ],
            ],
        ]
    ),
    // From the hip to the knee (y = 44), the outer side to +x
    thigh: part(
        [
            [-6, -1],
            [2, -3],
            [9, 0],
            [9.5, 12],
            [8, 28],
            [6, 40],
            [5, 46],
            [0, 48],
            [-5, 46],
            [-5.5, 40],
            [-6.5, 28],
            [-7, 12],
        ],
        [
            [
                'adductors',
                [
                    [-6, 1],
                    [-1.5, 2],
                    [-2, 22],
                    [-5.5, 18],
                ],
            ],
            [
                'abductors',
                [
                    [5, -1.5],
                    [8.5, 1],
                    [8, 9],
                    [4.5, 4],
                ],
            ],
            [
                'quads',
                [
                    [-0.5, 4],
                    [3, 4],
                    [4, 22],
                    [2, 38],
                    [-1, 36],
                    [-1.5, 20],
                ],
            ],
            [
                'quads',
                [
                    [4.8, 7],
                    [8, 11],
                    [7.5, 28],
                    [5, 40],
                    [3.5, 38],
                    [4.7, 22],
                ],
            ],
            [
                'quads',
                [
                    [-2.5, 27],
                    [-5.5, 32],
                    [-4.5, 41],
                    [-1.2, 40],
                    [-1.4, 33],
                ],
            ],
            [
                null,
                [
                    [-2.5, 41.5],
                    [2.5, 41.5],
                    [2.5, 46],
                    [-2.5, 46],
                ],
            ],
        ]
    ),
    // From the knee to the ankle (y = 44)
    shin: part(
        [
            [-5, -2],
            [5, -2],
            [6, 8],
            [5, 26],
            [3, 42],
            [2.5, 46],
            [-2.5, 46],
            [-3, 42],
            [-5, 26],
            [-6, 9],
        ],
        [
            [
                'calves',
                [
                    [2.5, 3],
                    [5.5, 7],
                    [5, 22],
                    [3, 26],
                    [2.5, 14],
                ],
            ],
            [
                'calves',
                [
                    [-2.5, 3],
                    [-5.5, 8],
                    [-5, 24],
                    [-3, 27],
                    [-2.3, 14],
                ],
            ],
            [
                null,
                [
                    [-1.5, 3],
                    [1.8, 3],
                    [2, 26],
                    [0.5, 38],
                    [-1, 26],
                ],
            ],
        ]
    ),
    // Down from the ankle, seen toes on
    foot: part(
        [
            [-3.5, -3],
            [3, -3],
            [5, 4],
            [4.5, 9],
            [1, 11],
            [-3, 10.5],
            [-4, 5],
        ],
        [],
        0
    ),
};

export const FIGURE_ART: Record<'side' | 'front', Record<PartName, PartArt>> = {
    side: SIDE,
    front: FRONT,
};
