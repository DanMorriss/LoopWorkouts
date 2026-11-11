import { BUILT_IN_EXERCISE_MOTION } from './built-in-exercise-motion';
import { ExerciseMotion, Pose } from './exercise-motion';
import { motionCode, poseCode } from './motion-code';

describe('poseCode', () => {
    it("writes a pose with the motions' helpers, two places at most", () => {
        const pose: Pose = {
            hips: [82.904, -47.5],
            torso: 109.55,
            elbowsOut: 0.45,
            arms: [
                { reach: [128, -5.5], bend: 'cw' },
                { reach: [125, -5.5], bend: 'cw' },
            ],
            legs: [{ angles: [-70.45, -70.45] }, { angles: [-70.45, -70.45] }],
            feet: [15, 15],
        };

        expect(poseCode(pose)).toBe(
            [
                '{',
                '    hips: [82.9, -47.5],',
                '    torso: 109.55,',
                '    elbowsOut: 0.45,',
                "    arms: [reach(128, -5.5, 'cw'), reach(125, -5.5, 'cw')],",
                '    legs: both(angles(-70.45, -70.45)),',
                '    feet: [15, 15],',
                '}',
            ].join('\n')
        );
    });

    it('writes touches, scaled angles, and a hand on the bar', () => {
        const pose: Pose = {
            hips: [0, -58],
            torso: 180,
            arms: [
                { touch: [40, -26], bend: 'cw' },
                { reach: 'bar', bend: 'ccw' },
            ],
            legs: [
                { angles: [-10, -6], scale: [0.25, 0.85] },
                { angles: [10, 6], scale: [0.25, 0.85] },
            ],
        };

        const code = poseCode(pose);

        expect(code).toContain("arms: [touch(40, -26, 'cw'), { reach: 'bar', bend: 'ccw' }]");
        expect(code).toContain(
            'legs: [angles(-10, -6, [0.25, 0.85]), angles(10, 6, [0.25, 0.85])]'
        );
    });

    it('reads back as the same pose, for every built-in motion', () => {
        const helpers = {
            reach: (x: number, y: number, bend: string) => ({ reach: [x, y], bend }),
            touch: (forward: number, up: number, bend: string) => ({
                touch: [forward, up],
                bend,
            }),
            angles: (upper: number, lower: number, scale?: number[]) =>
                scale ? { angles: [upper, lower], scale } : { angles: [upper, lower] },
            both: (limb: unknown) => [limb, limb],
        };
        const read = (code: string): unknown =>
            new Function(...Object.keys(helpers), `return (${code});`)(...Object.values(helpers));
        const round = (value: unknown): unknown =>
            JSON.parse(JSON.stringify(value), (_, each: unknown) =>
                typeof each === 'number' ? Math.round(each * 100) / 100 : each
            );

        for (const motion of Object.values(BUILT_IN_EXERCISE_MOTION) as ExerciseMotion[]) {
            expect(read(motionCode(motion))).toEqual(round(motion));
        }
    });
});
