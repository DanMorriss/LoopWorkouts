import { BUILT_IN_EXERCISE_MOTION } from './built-in-exercise-motion';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { MUSCLE_LABELS } from './exercise';
import { FIGURE_ART } from './exercise-figure-art';
import {
    BODY,
    drawFigure,
    ExerciseMotion,
    FigureLayers,
    itemBounds,
    Limb,
    loopLength,
    motionBox,
    muscleTone,
    PlacedPart,
    placePoint,
    Point,
    Pose,
    poseAt,
    solveLimb,
} from './exercise-motion';

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const noBar: Point = [0, 0];

const standing: Pose = {
    hips: [0, -92],
    torso: 180,
    arms: [{ angles: [0, 0] }, { angles: [0, 0] }],
    legs: [
        { reach: [0, -4], bend: 'ccw' },
        { reach: [0, -4], bend: 'ccw' },
    ],
};
const squatting: Pose = { ...standing, hips: [-20, -50], torso: 140 };
const squat: ExerciseMotion = {
    view: 'side',
    frames: [
        { label: 'Standing', pose: standing, hold: 200, ms: 1000 },
        { label: 'Bottom', pose: squatting, ms: 800 },
    ],
};

describe('solveLimb', () => {
    it('lays the parts along their angles', () => {
        const [elbow, hand] = solveLimb([0, 0], { angles: [90, 180] }, 30, 30, noBar);

        expect(elbow[0]).toBeCloseTo(30);
        expect(elbow[1]).toBeCloseTo(0);
        expect(hand[0]).toBeCloseTo(30);
        expect(hand[1]).toBeCloseTo(-30);
    });

    it('reaches where the end should be, keeping both parts their length', () => {
        const [knee, ankle] = solveLimb([0, -60], { reach: [20, 0], bend: 'ccw' }, 44, 44, noBar);

        expect(ankle[0]).toBeCloseTo(20);
        expect(ankle[1]).toBeCloseTo(0);
        expect(distance([0, -60], knee)).toBeCloseTo(44);
        expect(distance(knee, ankle)).toBeCloseTo(44);
    });

    it('bends the middle joint the way it is told', () => {
        // Hip above the ankle: anticlockwise as drawn puts the knee in front (to the right)
        const forward: Limb = { reach: [0, 0], bend: 'ccw' };
        const back: Limb = { reach: [0, 0], bend: 'cw' };

        expect(solveLimb([0, -70], forward, 44, 44, noBar)[0][0]).toBeGreaterThan(0);
        expect(solveLimb([0, -70], back, 44, 44, noBar)[0][0]).toBeLessThan(0);
    });

    it('stretches straight towards an end out of reach', () => {
        const [knee, ankle] = solveLimb([0, -200], { reach: [0, 0], bend: 'ccw' }, 44, 44, noBar);

        expect(knee[0]).toBeCloseTo(0);
        expect(knee[1]).toBeCloseTo(-156);
        expect(ankle[1]).toBeCloseTo(-112);
    });

    it("puts the hand on the bar for 'bar'", () => {
        const [, hand] = solveLimb([0, 0], { reach: 'bar', bend: 'ccw' }, 30, 30, [-10, -5]);

        expect(hand[0]).toBeCloseTo(-10);
        expect(hand[1]).toBeCloseTo(-5);
    });
});

describe('poseAt', () => {
    it('holds the first position, then eases into the next and back, in a loop', () => {
        expect(loopLength(squat)).toBe(2000);
        expect(poseAt(squat, 100)).toBe(standing);
        expect(poseAt(squat, 200).hips).toEqual(standing.hips);
        expect(poseAt(squat, 1200).hips[1]).toBeCloseTo(-50);
        // Halfway through the move, halfway between
        expect(poseAt(squat, 700).hips[1]).toBeCloseTo(-71);
        expect(poseAt(squat, 700).torso).toBeCloseTo(160);
        // Eased: slow at the start of a move
        expect(poseAt(squat, 300).hips[1]).toBeGreaterThan(-93);
        expect(poseAt(squat, 2100)).toBe(standing);
    });

    it('passes through a position marked through without slowing, easing the whole move', () => {
        const halfway: Pose = { ...standing, hips: [-10, -71], torso: 160 };
        const frames = (through: boolean): ExerciseMotion => ({
            view: 'side',
            frames: [
                { label: 'Standing', pose: standing, ms: 500 },
                { label: 'Halfway', pose: halfway, ms: 500, through },
                { label: 'Bottom', pose: squatting, ms: 1000 },
            ],
        });
        const stopping = frames(false);
        const smooth = frames(true);

        expect(loopLength(smooth)).toBe(2000);
        // Halfway through the whole move, it's at the position in the middle
        expect(poseAt(smooth, 500).hips[1]).toBeCloseTo(-71);
        // Still moving as it passes it, where it would have slowed to a stop
        const moved = (motion: ExerciseMotion) =>
            Math.abs(poseAt(motion, 550).hips[1] - poseAt(motion, 450).hips[1]);
        expect(moved(smooth)).toBeGreaterThan(5);
        expect(moved(smooth)).toBeGreaterThan(4 * moved(stopping));
        // And gets to the end of the move, then back, as before
        expect(poseAt(smooth, 1000).hips[1]).toBeCloseTo(-50);
        expect(poseAt(smooth, 1500).hips[1]).toBeCloseTo(-71);
    });
});

describe('muscleTone', () => {
    it('shades a muscle as the body map does: main over supporting, else unworked', () => {
        expect(muscleTone('quads', ['quads'], ['quads'])).toBe('main');
        expect(muscleTone('hamstrings', ['quads'], ['hamstrings'])).toBe('supporting');
        expect(muscleTone('calves', ['quads'], ['hamstrings'])).toBe('idle');
        expect(muscleTone(null, ['quads'], [])).toBe('other');
    });
});

describe('drawFigure', () => {
    const items = (layers: FigureLayers) => [
        ...layers.kit,
        ...layers.far,
        ...layers.body,
        ...layers.near,
    ];
    const hands = (layers: FigureLayers) =>
        parts(layers)
            .filter((part) => part.name === 'forearm')
            .map((forearm) => placePoint(forearm, [0, BODY.forearm]));
    const parts = (layers: FigureLayers) =>
        items(layers).filter((item): item is PlacedPart => item.type === 'part');

    it('draws every part: a torso and head, and two of each limb part', () => {
        const names = parts(drawFigure(standing, squat)).map((part) => part.name);

        expect(names.filter((name) => name === 'torso')).toHaveLength(1);
        expect(names.filter((name) => name === 'head')).toHaveLength(1);
        for (const name of ['upperArm', 'forearm', 'thigh', 'shin', 'foot'] as const) {
            expect(names.filter((other) => other === name)).toHaveLength(2);
        }
    });

    it('puts each part at its joint, pointing along the limb', () => {
        const thighs = parts(drawFigure(standing, squat)).filter((part) => part.name === 'thigh');

        // Straight down from the hips to the feet
        for (const thigh of thighs) {
            expect(thigh.at[0]).toBeCloseTo(0);
            expect(thigh.at[1]).toBeCloseTo(-92);
            expect(thigh.angle).toBeCloseTo(0);
            // The knee, at the thigh's length along it
            const knee = placePoint(thigh, [0, BODY.thigh]);
            expect(knee[1]).toBeCloseTo(-48);
        }
    });

    it("turns a part's front the way the figure faces", () => {
        const layers = drawFigure(squatting, squat);
        const torso = parts(layers).find((part) => part.name === 'torso')!;
        const head = parts(layers).find((part) => part.name === 'head')!;

        // Leaning forwards, the chest (+x in its drawing) is in front of the back (-x)
        expect(placePoint(torso, [10, 10])[0]).toBeGreaterThan(placePoint(torso, [-10, 10])[0]);
        // The face (+x) is to the right of the back of the head, and the crown (+y) above
        expect(placePoint(head, [10, 18])[0]).toBeGreaterThan(placePoint(head, [-10, 18])[0]);
        expect(placePoint(head, [0, 30])[1]).toBeLessThan(head.at[1]);
    });

    it('puts the far arm and leg behind the body from the side, and nothing from the front', () => {
        expect(drawFigure(standing, squat).far.length).toBeGreaterThan(0);
        expect(drawFigure(standing, { ...squat, view: 'front' }).far).toHaveLength(0);
    });

    it('flips the near limbs from the front, so their outer sides face out', () => {
        const front = parts(drawFigure(standing, { ...squat, view: 'front' }));
        const thighs = front.filter((part) => part.name === 'thigh');

        expect(thighs.map((thigh) => thigh.mirror).sort()).toEqual([false, true]);
        for (const thigh of thighs) {
            // The outer side (+x) is further from the middle than the inner
            expect(Math.abs(placePoint(thigh, [8, 10])[0])).toBeGreaterThan(
                Math.abs(placePoint(thigh, [-6, 10])[0])
            );
        }
    });

    it('draws its props', () => {
        const props = (motion: ExerciseMotion) =>
            items(drawFigure(standing, motion)).filter((item) => item.type !== 'part').length;

        expect(props(squat)).toBe(0);
        expect(props({ ...squat, props: ['dumbbells'] })).toBe(2);
        // The plate behind and the bar's end in front
        expect(props({ ...squat, props: ['barbell-on-back'] })).toBe(2);
        expect(props({ ...squat, props: ['barbell'] })).toBe(2);
        // The bar and two plates, from the front
        expect(props({ ...squat, view: 'front', props: ['barbell'] })).toBe(3);
        // One, in the near hand: the bell and its handle
        expect(props({ ...squat, props: ['kettlebell'] })).toBe(2);
        // One in each hand
        expect(props({ ...squat, props: ['kettlebells'] })).toBe(4);
        expect(props({ ...squat, props: ['dumbbell'] })).toBe(1);
    });

    it('draws kit that stays put behind the figure, a cable running to the nearer hand', () => {
        const layers = drawFigure(standing, {
            ...squat,
            view: 'front',
            kit: [
                { kind: 'pad', from: [-20, -50], to: [20, -50] },
                { kind: 'cable', from: [-80, -200] },
            ],
        });
        const near = hands(layers).find((hand) => hand[0] < 0)!;
        const cable = layers.kit.find((item) => item.type === 'line');

        expect(layers.kit.map((item) => item.type)).toEqual(['shape', 'line', 'circle']);
        expect(cable?.type === 'line' && cable.to).toEqual(near);
        expect(near[0]).toBeLessThan(0);
    });

    it('keeps a hand that touches the body on it as the body moves', () => {
        const touching: Pose = {
            ...standing,
            arms: [
                { touch: [12, -2], bend: 'cw' },
                { touch: [12, -2], bend: 'cw' },
            ],
        };
        const upright = hands(drawFigure(touching, squat))[0];
        const leaning = hands(drawFigure({ ...touching, torso: 90 }, squat))[0];

        // 12 in front of the shoulders and 2 down: upright, in front; lying forwards, below
        expect(upright[0]).toBeCloseTo(12);
        expect(upright[1]).toBeCloseTo(-92 - BODY.torso + 2);
        expect(leaning[0]).toBeCloseTo(BODY.torso - 2);
        expect(leaning[1]).toBeCloseTo(-92 + 12);
    });

    it('draws a part shorter by its scale, and raises the arms with a shrug', () => {
        const short = drawFigure(
            { ...standing, arms: [{ angles: [0, 0], scale: [0.5, 0.5] }, { angles: [0, 0] }] },
            squat
        );
        // The far arm is drawn first, behind
        const [far, near] = hands(short);
        const [shruggedFar] = hands(drawFigure({ ...standing, shrug: 5 }, squat));

        expect(far[1] - near[1]).toBeCloseTo(30);
        expect(
            parts(short)
                .filter((part) => part.name === 'upperArm')
                .map((part) => part.stretch)
        ).toEqual([undefined, 0.5]);
        expect(shruggedFar[1]).toBeCloseTo(far[1] - 5);
    });
});

describe('FIGURE_ART', () => {
    it('draws every muscle group the body map has, from the side and from the front', () => {
        const drawn = (view: 'side' | 'front') =>
            new Set(
                Object.values(FIGURE_ART[view]).flatMap((art) =>
                    art.pieces.map((piece) => piece.muscle).filter((muscle) => muscle !== null)
                )
            );
        const muscles = Object.keys(MUSCLE_LABELS);

        // Not the inner thigh from the side, nor the lower back from the front
        expect([...drawn('side')].sort()).toEqual(muscles.filter((m) => m !== 'adductors').sort());
        expect([...drawn('front')].sort()).toEqual(
            muscles.filter((m) => !['glutes', 'hamstrings', 'lower-back'].includes(m)).sort()
        );
    });
});

describe('motionBox', () => {
    it('holds the figure in every position, and the floor', () => {
        const box = motionBox(squat);

        // The top of the head, above the shoulders
        expect(box.y).toBeLessThan(standing.hips[1] - BODY.torso - 30);
        expect(box.y + box.height).toBeGreaterThan(0);
    });
});

describe('BUILT_IN_EXERCISE_MOTION', () => {
    const motions = Object.entries(BUILT_IN_EXERCISE_MOTION) as [string, ExerciseMotion][];
    const kindOf = (limb: Limb) =>
        'angles' in limb
            ? 'angles'
            : 'touch' in limb
              ? `touch ${limb.bend}`
              : limb.reach === 'bar'
                ? 'bar'
                : `reach ${limb.bend}`;

    it('has a demo for every built-in exercise', () => {
        const missing = BUILT_IN_EXERCISES.filter(
            (exercise) => !(exercise.id in BUILT_IN_EXERCISE_MOTION)
        );

        expect(missing.map((exercise) => exercise.id)).toEqual([]);
    });

    it.each(motions)('%s is a built-in exercise', (id) => {
        expect(BUILT_IN_EXERCISES.some((exercise) => exercise.id === id)).toBe(true);
    });

    it.each(motions)('%s moves between labelled positions, or holds one', (_, motion) => {
        expect(motion.frames.length).toBeGreaterThanOrEqual(1);
        for (const frame of motion.frames) {
            expect(frame.label.trim()).not.toBe('');
            expect(frame.ms).toBeGreaterThan(0);
        }
        // Passed through without stopping, so not held, and never where it starts
        expect(motion.frames[0].through).toBeFalsy();
        for (const frame of motion.frames.filter((frame) => frame.through)) {
            expect(frame.hold).toBeUndefined();
        }
        // A kettlebell set down is set down somewhere in every position, if in any
        const setDown = motion.frames.filter((frame) => frame.pose.bellAt).length;
        expect([0, motion.frames.length]).toContain(setDown);
    });

    it.each(motions)(
        '%s gives each limb the same way in every position, so it moves smoothly',
        (_, motion) => {
            const first = motion.frames[0].pose;
            for (const { pose } of motion.frames) {
                for (const limbs of ['arms', 'legs'] as const) {
                    expect(pose[limbs].map(kindOf)).toEqual(first[limbs].map(kindOf));
                }
                expect(pose.feet === undefined).toBe(first.feet === undefined);
            }
        }
    );

    it.each(motions)('%s keeps the figure on the floor, not through it', (_, motion) => {
        const steps = 40;
        for (let i = 0; i < steps; i++) {
            const pose = poseAt(motion, (loopLength(motion) * i) / steps);
            const layers = drawFigure(pose, motion);
            for (const item of [...layers.far, ...layers.body, ...layers.near]) {
                // A part's lowest point drawn: the points its curves run through and bend to
                const lowest =
                    item.type === 'part'
                        ? Math.max(
                              ...[item.art.outline, ...item.art.pieces.map((piece) => piece.d)]
                                  .flatMap((d) => d.match(/-?[\d.]+ -?[\d.]+/g) ?? [])
                                  .map((pair) => pair.split(' ').map(Number) as [number, number])
                                  .map((point) => placePoint(item, point)[1])
                          )
                        : itemBounds(item)[3];
                expect(lowest).toBeLessThan(2);
            }
        }
    });
});
