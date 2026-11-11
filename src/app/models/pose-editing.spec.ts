import { Limb, Pose, solvePose } from './exercise-motion';
import { limbAs, limbKind, withFramePose, withLimb } from './pose-editing';

/** Standing from the side, an arm bent forwards and a leg straight down. */
const POSE: Pose = {
    hips: [0, -92],
    torso: 180,
    arms: [{ angles: [30, 120] }, { reach: [20, -110], bend: 'ccw' }],
    legs: [{ angles: [0, 0] }, { reach: [0, -4], bend: 'ccw' }],
};

const close = (a: readonly number[], b: readonly number[]) =>
    a.forEach((value, i) => expect(value).toBeCloseTo(b[i], 1));

describe('limbAs', () => {
    it('gives a limb by its angles, where it is now', () => {
        const limb = limbAs(POSE, 'side', 'arms', 1, 'angles');
        const before = solvePose(POSE, 'side').arms[1];
        const after = solvePose(withLimb(POSE, 'arms', 1, limb), 'side').arms[1];

        expect(limbKind(limb)).toBe('angles');
        close(after.mid, before.mid);
        close(after.end, before.end);
    });

    it('gives a limb by where its end reaches, bent the way it is', () => {
        for (const bendTo of [30, -30]) {
            const pose = withLimb(POSE, 'arms', 0, { angles: [bendTo, 0] });
            const limb = limbAs(pose, 'side', 'arms', 0, 'reach');
            const before = solvePose(pose, 'side').arms[0];
            const after = solvePose(withLimb(pose, 'arms', 0, limb), 'side').arms[0];

            close(after.mid, before.mid);
            close(after.end, before.end);
        }
    });

    it('gives a hand by the point on the body it touches, which moves with it', () => {
        const limb = limbAs(POSE, 'side', 'arms', 0, 'touch');
        const touching = withLimb(POSE, 'arms', 0, limb);
        close(solvePose(touching, 'side').arms[0].end, solvePose(POSE, 'side').arms[0].end);

        // Leaning forward, the hand goes with the body
        const leaning = solvePose({ ...touching, torso: 135 }, 'side');
        const fromShoulders = (solved: ReturnType<typeof solvePose>) => [
            solved.arms[0].end[0] - solved.shoulders[0],
            solved.arms[0].end[1] - solved.shoulders[1],
        ];
        const upright = solvePose(touching, 'side');
        expect(Math.hypot(...fromShoulders(leaning))).toBeCloseTo(
            Math.hypot(...fromShoulders(upright)),
            1
        );
        expect(leaning.arms[0].end).not.toEqual(upright.arms[0].end);
    });

    it('keeps the way a straight limb bends', () => {
        const straight: Limb = limbAs(POSE, 'side', 'legs', 0, 'reach');
        expect(straight).toEqual({ reach: [0, -4], bend: 'cw' });

        const ccw = withLimb(POSE, 'legs', 0, { reach: [0, -4], bend: 'ccw' });
        expect(limbAs(ccw, 'side', 'legs', 0, 'reach')).toBe(ccw.legs[0]);
        expect(limbAs(ccw, 'side', 'legs', 0, 'touch')).toMatchObject({ bend: 'ccw' });
        // Given by angles, which don't say, it bends the way it's told
        expect(limbAs(POSE, 'side', 'legs', 0, 'reach', 'ccw')).toEqual({
            reach: [0, -4],
            bend: 'ccw',
        });
    });

    it("gives a hand on the barbell by where the bar is, once it's moved", () => {
        const onBar = withLimb(POSE, 'arms', 0, { reach: 'bar', bend: 'ccw' });
        const limb = limbAs(onBar, 'side', 'arms', 0, 'reach');

        expect('reach' in limb && Array.isArray(limb.reach)).toBe(true);
        close(
            solvePose(withLimb(onBar, 'arms', 0, limb), 'side').arms[0].end,
            solvePose(onBar, 'side').bar
        );
    });
});

describe('withFramePose', () => {
    it('changes one position, leaving the others as they are', () => {
        const motion = {
            view: 'side' as const,
            frames: [
                { label: 'Top', ms: 1000, pose: POSE },
                { label: 'Bottom', ms: 1000, pose: POSE },
            ],
        };
        const moved = { ...POSE, torso: 150 };

        const changed = withFramePose(motion, 1, moved);

        expect(changed.frames[0]).toBe(motion.frames[0]);
        expect(changed.frames[1]).toEqual({ label: 'Bottom', ms: 1000, pose: moved });
        expect(motion.frames[1].pose).toBe(POSE);
    });
});
