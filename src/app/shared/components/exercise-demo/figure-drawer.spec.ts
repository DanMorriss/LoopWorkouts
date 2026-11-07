import { BUILT_IN_EXERCISE_MOTION } from '../../../models/built-in-exercise-motion';
import { poseAt } from '../../../models/exercise-motion';
import { figureMaker } from './figure-drawer';
import { FigureLook, FigureScene } from './figure-scene';

const look: FigureLook = {
    colors: {
        main: '#e04040',
        supporting: '#e09040',
        idle: '#808080',
        other: '#606060',
        outline: '#202020',
        page: '#ffffff',
        metal: '#404040',
    },
    main: ['chest'],
    supporting: ['triceps'],
};

describe('figureMaker (EXR-13)', () => {
    const hasWebGL = !!document.createElement('canvas').getContext('webgl2');

    it.runIf(hasWebGL)('draws the figure in a worker, onto the page’s canvas', async () => {
        const make = await figureMaker();
        const motion = BUILT_IN_EXERCISE_MOTION['builtin:push-up']!;
        const figure = await make!(
            motion,
            'male',
            () => look,
            () => false
        );
        // Drawn in the worker, not by a FigureScene of the page's
        expect(figure).not.toBeInstanceOf(FigureScene);
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 100;

        figure!.draw(poseAt(motion, 0), 0, canvas);

        const context = canvas.getContext('2d')!;
        const drawnOn = () =>
            context.getImageData(0, 0, 200, 100).data.some((value, i) => i % 4 === 3 && value);
        await vi.waitFor(() => expect(drawnOn()).toBe(true), { timeout: 10000 });
        expect(figure!.aspect).toBeGreaterThan(0);
        figure!.dispose();
    });
});
