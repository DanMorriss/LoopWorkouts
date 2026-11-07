import type { BodyFigure } from '../../../models/exercise';
import type { ExerciseMotion, Pose } from '../../../models/exercise-motion';
import type { FromFigureWorker, ToFigureWorker } from './figure-messages';
import type { FigureLook } from './figure-scene';

/** A 3D figure, drawn in a worker or on the page, as the demo's canvases see it. */
export interface FigureDrawer {
    /** The width of the drawing over its height, at its best. */
    readonly aspect: number;
    /** Its colours and muscles, painted before it's next drawn if they've changed. */
    setLook(look: FigureLook): void;
    /** Draws it in `pose`, turned `yaw` degrees round, onto `canvas`, filling it. */
    draw(pose: Pose, yaw: number, canvas: HTMLCanvasElement): void;
    dispose(): void;
}

/** Makes the figure of `motion`, shaded as `look`; null if `cancelled()` by then. */
export type MakeFigure = (
    motion: ExerciseMotion,
    figure: BodyFigure,
    look: () => FigureLook,
    cancelled: () => boolean
) => Promise<FigureDrawer | null>;

/**
 * How the 3D figures are made here: in a worker, where the browser can draw 3D in one (then
 * three.js never loads on the page), otherwise on the page; null if it can't draw 3D at all.
 * `inWorker` false always draws them on the page.
 */
export async function figureMaker(inWorker = true): Promise<MakeFigure | null> {
    const worker = inWorker ? await startWorker() : null;
    if (worker) {
        return (motion, figure, look, cancelled) => worker.make(motion, figure, look(), cancelled);
    }
    const onPage = await import('./figure-scene');
    return onPage.canDraw3d() ? onPage.prepareScene : null;
}

/** How long to wait for the worker to say whether it can draw, before drawing on the page. */
const START_MS = 10_000;

let started: Promise<FigureWorker | null> | undefined;

/** The one worker every figure is drawn in, started the first time; null if it can't draw. */
function startWorker(): Promise<FigureWorker | null> {
    return (started ??= new Promise((resolve) => {
        // WebGL in a worker needs OffscreenCanvas (an iPhone's Safari since 17)
        if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
            resolve(null);
            return;
        }
        let worker: Worker;
        try {
            worker = new Worker(new URL('./figure.worker', import.meta.url), { type: 'module' });
        } catch {
            resolve(null);
            return;
        }
        // Couldn't load (e.g. blocked), or can't draw there: drawn on the page instead
        const fail = () => {
            clearTimeout(timer);
            worker.terminate();
            resolve(null);
        };
        const timer = setTimeout(fail, START_MS);
        worker.onerror = fail;
        worker.onmessage = ({ data }: MessageEvent<FromFigureWorker>) => {
            if (data.type !== 'started') {
                return;
            }
            clearTimeout(timer);
            worker.onerror = null;
            if (data.canDraw) {
                resolve(new FigureWorker(worker));
            } else {
                fail();
            }
        };
        worker.postMessage({ type: 'start' } satisfies ToFigureWorker);
    }));
}

/** The page's side of the worker: what it's been asked, and the answers to wait for. */
class FigureWorker {
    private lastId = 0;
    private lastRequest = 0;
    private readonly made = new Map<number, (aspect: number) => void>();
    private readonly drawn = new Map<number, (picture: ImageBitmap | null) => void>();

    constructor(private readonly worker: Worker) {
        worker.onmessage = ({ data }: MessageEvent<FromFigureWorker>) => {
            if (data.type === 'made') {
                this.made.get(data.id)?.(data.aspect);
                this.made.delete(data.id);
            } else if (data.type === 'drawn') {
                this.drawn.get(data.request)?.(data.picture);
                this.drawn.delete(data.request);
            }
        };
    }

    async make(
        motion: ExerciseMotion,
        figure: BodyFigure,
        look: FigureLook,
        cancelled: () => boolean
    ): Promise<FigureDrawer | null> {
        const id = ++this.lastId;
        const aspect = await new Promise<number>((resolve) => {
            this.made.set(id, resolve);
            this.send({ type: 'make', id, motion, figure, look });
        });
        if (cancelled()) {
            this.send({ type: 'dispose', id });
            return null;
        }
        return new WorkerFigure(this, id, aspect);
    }

    /** Asks for figure `id` drawn as `job`, and hands the picture to `done`. */
    draw(id: number, job: DrawJob, done: (picture: ImageBitmap | null) => void) {
        const request = ++this.lastRequest;
        this.drawn.set(request, done);
        this.send({ type: 'draw', id, request, ...job });
    }

    send(message: ToFigureWorker) {
        this.worker.postMessage(message);
    }
}

interface DrawJob {
    readonly pose: Pose;
    readonly yaw: number;
    readonly width: number;
    readonly height: number;
    readonly ratio: number;
}

/**
 * A figure drawn in the worker. Each canvas has at most one picture on its way: one asked for
 * meanwhile waits, and one asked for after it takes its place, so a worker slower than the
 * page's frames draws the latest pose rather than falling behind.
 */
class WorkerFigure implements FigureDrawer {
    private disposed = false;
    /** The canvases with a picture on its way, and what to draw on each next, if anything. */
    private readonly waiting = new Map<HTMLCanvasElement, DrawJob | null>();

    constructor(
        private readonly worker: FigureWorker,
        private readonly id: number,
        readonly aspect: number
    ) {}

    setLook(look: FigureLook) {
        this.worker.send({ type: 'look', id: this.id, look });
    }

    draw(pose: Pose, yaw: number, canvas: HTMLCanvasElement) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const job = { pose, yaw, width: canvas.width, height: canvas.height, ratio };
        if (this.waiting.has(canvas)) {
            this.waiting.set(canvas, job);
        } else {
            this.send(job, canvas);
        }
    }

    dispose() {
        this.disposed = true;
        this.waiting.clear();
        this.worker.send({ type: 'dispose', id: this.id });
    }

    private send(job: DrawJob, canvas: HTMLCanvasElement) {
        this.waiting.set(canvas, null);
        this.worker.draw(this.id, job, (picture) => {
            const context = canvas.getContext('2d');
            // Not if the canvas has changed size since: the picture asked for then is next
            if (picture && context && !this.disposed && canvas.width === job.width) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(picture, 0, 0);
            }
            picture?.close();
            const next = this.waiting.get(canvas);
            this.waiting.delete(canvas);
            if (next && !this.disposed) {
                this.send(next, canvas);
            }
        });
    }
}
