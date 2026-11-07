import type { FromFigureWorker, ToFigureWorker } from './figure-messages';
import { canDraw3d, FigureScene } from './figure-scene';

/**
 * Draws the exercise demos' 3D figures (EXR-13) away from the page, so building, painting and
 * drawing them never holds it up: on the page, getting the first figure ready took over half a
 * second of a slow phone's main thread. The page sends what to draw, and copies each picture
 * sent back onto its canvas (figure-drawer.ts).
 */

// Typed by hand: the app's code is checked against the page's types, which this file shares
const scope = self as unknown as {
    onmessage: ((event: MessageEvent<ToFigureWorker>) => void) | null;
    postMessage(message: FromFigureWorker, transfer?: Transferable[]): void;
};

const scenes = new Map<number, FigureScene>();

scope.onmessage = ({ data }) => {
    switch (data.type) {
        case 'start':
            scope.postMessage({ type: 'started', canDraw: canDraw3d() });
            break;
        case 'make': {
            const scene = new FigureScene(data.motion, data.figure);
            scene.setLook(data.look);
            scene.paintIfStale();
            scenes.set(data.id, scene);
            scope.postMessage({ type: 'made', id: data.id, aspect: scene.aspect });
            break;
        }
        case 'look':
            scenes.get(data.id)?.setLook(data.look);
            break;
        case 'draw': {
            const { id, request, pose, yaw, width, height, ratio } = data;
            const picture = scenes.get(id)?.picture(pose, yaw, width, height, ratio) ?? null;
            scope.postMessage({ type: 'drawn', request, picture }, picture ? [picture] : []);
            break;
        }
        case 'dispose':
            scenes.get(data.id)?.dispose();
            scenes.delete(data.id);
            break;
    }
};
