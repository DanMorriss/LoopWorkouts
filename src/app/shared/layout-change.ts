import { afterNextRender, Injector } from '@angular/core';
import { criticallyDampedSpring } from './spring';
import { prefersReducedMotion } from './reduced-motion';

/** Names the slides this starts, so a newer change can stop them. */
const SLIDE = 'layout-change';

/** Apple's spring for moving something about: no bounce, a 0.4s response. */
const glide = criticallyDampedSpring(0.4);

/**
 * Smooths a change to a list, such as a row deleted or put back. Call it before the change,
 * with the elements (under `root`, matching `selector`) that may move; call what it returns
 * once the change has rendered. Those still there slide on the app's spring from where they
 * were to their new places, so the rest of the list closes up (or opens out) rather than
 * jumping; any new ones fade in. A change part-way through another carries on from where
 * everything is on screen.
 *
 * Matches inside other matches (an entry inside a day) move with the one around them, and
 * only slide by however much more they moved themselves. With reduced motion nothing slides,
 * but new ones still fade in. In a component, `changeSmoothly` does the lot.
 */
export function captureLayout(root: HTMLElement, selector: string): () => void {
    // Where each is on screen now, mid-slide included
    const before = new Map<Element, DOMRect>();
    root.querySelectorAll(selector).forEach((element) =>
        before.set(element, element.getBoundingClientRect())
    );

    return () => {
        const elements = [...root.querySelectorAll<HTMLElement>(selector)];
        // Stop any slide still going, so each is measured where its new place is
        for (const element of elements) {
            element
                .getAnimations()
                .filter((animation) => animation.id === SLIDE)
                .forEach((animation) => animation.cancel());
        }

        const moved = new Map<Element, { x: number; y: number }>();
        for (const element of elements) {
            const was = before.get(element);
            const now = element.getBoundingClientRect();
            if (!was) {
                element.animate([{ opacity: 0 }, { opacity: 1 }], {
                    duration: 200,
                    easing: 'ease-out',
                });
                continue;
            }
            moved.set(element, { x: was.left - now.left, y: was.top - now.top });
        }

        if (prefersReducedMotion()) {
            return;
        }
        for (const [element, by] of moved) {
            // The match around it carries it that far already
            const around = element.parentElement?.closest(selector);
            const carried = (around && moved.get(around)) || { x: 0, y: 0 };
            const x = by.x - carried.x;
            const y = by.y - carried.y;
            if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) {
                continue;
            }
            element.animate([{ translate: `${x}px ${y}px` }, { translate: '0 0' }], {
                id: SLIDE,
                duration: glide.duration,
                easing: glide.easing,
            });
        }
    };
}

/**
 * Makes `change` (to a list under `root`) with the elements matching `selector` sliding to
 * their new places once it has rendered, as `captureLayout` describes. Call it from a
 * component, with its injector.
 */
export function changeSmoothly(
    root: HTMLElement,
    selector: string,
    injector: Injector,
    change: () => void
) {
    const slide = captureLayout(root, selector);
    change();
    afterNextRender(slide, { injector });
}
