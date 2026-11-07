import type { BodyFigure } from '../../../models/exercise';
import type { ExerciseMotion, Pose } from '../../../models/exercise-motion';
import type { FigureLook } from './figure-scene';

/** What the page asks of the worker that draws the 3D figures (figure.worker.ts). */
export type ToFigureWorker =
    /** Whether it can draw in 3D: answered with `started`. */
    | { readonly type: 'start' }
    /** Makes figure `id`: answered with `made`. */
    | {
          readonly type: 'make';
          readonly id: number;
          readonly motion: ExerciseMotion;
          readonly figure: BodyFigure;
          readonly look: FigureLook;
      }
    | { readonly type: 'look'; readonly id: number; readonly look: FigureLook }
    /** Draws figure `id` in `pose`: answered with `drawn`, for `request`. */
    | {
          readonly type: 'draw';
          readonly id: number;
          readonly request: number;
          readonly pose: Pose;
          readonly yaw: number;
          readonly width: number;
          readonly height: number;
          readonly ratio: number;
      }
    | { readonly type: 'dispose'; readonly id: number };

/** What the worker answers. */
export type FromFigureWorker =
    | { readonly type: 'started'; readonly canDraw: boolean }
    | { readonly type: 'made'; readonly id: number; readonly aspect: number }
    /** The picture drawn, to copy onto the page's canvas; null if it couldn't be drawn. */
    | { readonly type: 'drawn'; readonly request: number; readonly picture: ImageBitmap | null };
