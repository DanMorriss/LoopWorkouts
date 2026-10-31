import { BODY_MODELS } from '../../../models/body-model';
import { BODY_FIGURE_CHOICES, MuscleGroup } from '../../../models/exercise';
import { muscleTone } from '../../../models/exercise-motion';
import { buildBody, paintDrawings, PAINT_SIZE, restJoint } from './figure-body';

describe('buildBody', () => {
    it.each(BODY_FIGURE_CHOICES)(
        "makes the %s figure's every part, painted from within the drawings",
        (figure) => {
            const body = buildBody(figure);
            const parts = [
                body.torso,
                body.neck,
                body.head,
                ...body.upperArms,
                ...body.forearms,
                ...body.hands,
                ...body.thighs,
                ...body.shins,
                ...body.feet,
            ];
            expect(parts).toHaveLength(15);
            for (const part of parts) {
                const uv = part.getAttribute('uv').array;
                expect(part.getAttribute('position').count).toBeGreaterThan(100);
                expect(Math.min(...uv)).toBeGreaterThanOrEqual(0);
                expect(Math.max(...uv)).toBeLessThanOrEqual(1);
            }
        }
    );

    it.each(BODY_FIGURE_CHOICES)(
        "stands the %s figure as the body map's: arms out, feet down",
        (figure) => {
            const model = BODY_MODELS[figure];
            const [shoulder, wrist, ankle] = (['shoulder', 'wrist', 'ankle'] as const).map(
                (joint) => restJoint(model, joint, 1)
            );

            // Its right hand hangs out to its right, below the shoulder; the left mirrors it
            expect(wrist[2]).toBeGreaterThan(shoulder[2]);
            expect(wrist[1]).toBeLessThan(shoulder[1]);
            expect(restJoint(model, 'wrist', -1)[2]).toBe(-wrist[2]);
            expect(ankle[1]).toBeLessThan(20);
            expect(model.levels.headTop).toBeGreaterThan(170);
        }
    );
});

describe('paintDrawings', () => {
    it("paints the body map's drawings, the exercise's main muscles in the main colour", () => {
        const canvas = document.createElement('canvas');
        const main: MuscleGroup[] = ['quads'];
        paintDrawings(
            canvas,
            'male',
            {
                main: 'rgb(255, 0, 0)',
                supporting: 'rgb(0, 255, 0)',
                idle: 'rgb(0, 0, 255)',
                other: 'rgb(255, 255, 0)',
                outline: 'rgb(0, 0, 0)',
                page: 'rgb(255, 255, 255)',
            },
            (muscle) => muscleTone(muscle, main, [])
        );

        expect(canvas.width).toBe(PAINT_SIZE);
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, PAINT_SIZE, PAINT_SIZE).data;
        let red = 0;
        let blue = 0;
        for (let i = 0; i < pixels.length; i += 4 * 97) {
            if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 0) {
                red++;
            }
            if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 255) {
                blue++;
            }
        }
        // The quads, front only, are much less of the figure than its unworked muscles
        expect(red).toBeGreaterThan(50);
        expect(blue).toBeGreaterThan(red * 3);
    });
});
