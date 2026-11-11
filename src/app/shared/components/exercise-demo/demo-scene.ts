import {
    afterNextRender,
    computed,
    effect,
    ElementRef,
    inject,
    InjectionToken,
    Signal,
    signal,
    untracked,
} from '@angular/core';
import { MuscleGroup } from '../../../models/exercise';
import { ExerciseMotion } from '../../../models/exercise-motion';
import { ThemeService } from '../../theme/theme.service';
import type { FigureDrawer, MakeFigure } from './figure-drawer';
import type { FigureColors, FigureLook } from './figure-scene';

/** Whether to draw the figure in 3D where the browser can; the flat figure if not. */
export const DEMO_IN_3D = new InjectionToken<boolean>('DEMO_IN_3D', { factory: () => true });

/** Whether to draw the 3D figure in a worker where the browser can; on the page if not. */
export const DEMO_IN_WORKER = new InjectionToken<boolean>('DEMO_IN_WORKER', {
    factory: () => true,
});

/** The muscles a figure shades, main and supporting. */
export interface FigureMuscles {
    readonly main: readonly MuscleGroup[];
    readonly supporting: readonly MuscleGroup[];
}

/** A 3D figure for a motion, as `injectDemoScene()` gives it. */
export interface DemoScene {
    /** How it's drawn: in 3D, flat (no WebGL), or not yet known (three.js loading). */
    readonly drawing: Signal<'loading' | '3d' | 'flat'>;
    /** The 3D figure of the motion, once it's made. */
    readonly scene: Signal<FigureDrawer | null>;
    /** Counts each time the scene is repainted, so its figures are drawn again. */
    readonly paint: Signal<number>;
}

/**
 * The 3D figure of `motion` (EXR-13), its muscles shaded in the theme's colours: three.js is
 * loaded after the page first draws, in a worker where the browser can, so it never holds the
 * page up, and on the page otherwise. Without WebGL, `drawing` says to draw it flat. Made again
 * whenever the motion changes. Call it from a component, which it reads the theme's colours on.
 */
export function injectDemoScene(
    motion: () => ExerciseMotion | undefined,
    muscles: () => FigureMuscles
): DemoScene {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const theme = inject(ThemeService);
    const inWorker = inject(DEMO_IN_WORKER);
    const drawing = signal<'loading' | '3d' | 'flat'>(inject(DEMO_IN_3D) ? 'loading' : 'flat');
    /** What makes a 3D figure, once it's known how they can be drawn here. */
    const makeFigure = signal<MakeFigure | null>(null);
    const scene = signal<FigureDrawer | null>(null);
    const paint = signal(0);

    /** How the figure's shaded: the theme's colours, read from the page, and its muscles. */
    const look = computed((): FigureLook => {
        theme.applied();
        const { main, supporting } = muscles();
        return { colors: colorsOf(host), main, supporting };
    });

    effect((onCleanup) => {
        const make = makeFigure();
        const shown = motion();
        if (!make || !shown) {
            return;
        }
        // The male figure, whichever is picked in Profile: the female one isn't right in 3D
        // yet (see TODO.md). The body map still draws the one picked
        let cancelled = false;
        let made: FigureDrawer | null = null;
        void make(
            shown,
            'male',
            () => untracked(look),
            () => cancelled
        ).then((drawer) => {
            made = drawer;
            scene.set(drawer);
        });
        onCleanup(() => {
            cancelled = true;
            scene.set(null);
            made?.dispose();
        });
    });

    // Its muscles, in the theme's colours, read from the page once the theme has changed
    effect(() => {
        const drawer = scene();
        const shading = look();
        if (drawer) {
            drawer.setLook(shading);
            paint.update((count) => count + 1);
        }
    });

    // Made after the page has shown, keeping its space till then
    afterNextRender(() => {
        if (drawing() !== 'loading') {
            return;
        }
        import('./figure-drawer')
            .then((module) => module.figureMaker(inWorker))
            .then(
                (maker) => {
                    makeFigure.set(maker);
                    drawing.set(maker ? '3d' : 'flat');
                },
                () => drawing.set('flat')
            );
    });

    return { drawing: drawing.asReadonly(), scene: scene.asReadonly(), paint: paint.asReadonly() };
}

/** The theme's colours for the figure, as the body map shades its muscles. */
function colorsOf(host: HTMLElement): FigureColors {
    const style = getComputedStyle(host);
    const css = (name: string) => style.getPropertyValue(name).trim() || '#808080';
    return {
        main: css('--muscle-main'),
        supporting: css('--muscle-supporting'),
        idle: css('--muscle-idle'),
        other: css('--muscle-other'),
        outline: css('--muscle-outline'),
        page: css('--page-bg'),
        metal: css('--text-muted'),
    };
}
