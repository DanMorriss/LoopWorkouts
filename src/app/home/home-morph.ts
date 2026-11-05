import { ApplicationRef } from '@angular/core';
import { letInputThrough } from '../nav/let-input-through';
import { FADING_CLASS } from '../nav/page-slide';
import { criticallyDampedSpring } from '../shared/spring';
import { prefersReducedMotion } from '../shared/reduced-motion';

/** On <html> while Today's cards change shape, naming the parts that move. */
export const HOME_MORPH_CLASS = 'home-morphing';

/** Apple's spring for moving and resizing something: no bounce, a 0.4s response. */
const reshape = criticallyDampedSpring(0.4);

/**
 * Makes a change to Today's cards smoothly, as using a ready-made plan does: the card that
 * changes (Get started or This week, becoming the week) grows or shrinks to its new size on
 * Apple's no-bounce spring for moving things about, its old content fading out as the new fades in, and the cards
 * under it glide to their new places (styles/_home-morph.scss). A card new to the page fades
 * in. With reduced motion it's a short cross-fade; in a browser without view transitions,
 * the change just happens. A press part-way through ends it and lands.
 *
 * `change` makes the change; it's rendered at once, so what it renders after (focus moving to
 * Edit plan, say) is on the page by the time the new picture is taken.
 */
export function morphHome(appRef: ApplicationRef, change: () => void) {
    if (!document.startViewTransition) {
        change();
        return;
    }
    const reduced = prefersReducedMotion();
    const root = document.documentElement;
    const name = reduced ? FADING_CLASS : HOME_MORPH_CLASS;
    root.classList.add(name);
    root.style.setProperty('--home-morph-easing', reshape.easing);
    root.style.setProperty('--home-morph-duration', `${reshape.duration}ms`);
    const transition = document.startViewTransition(() => {
        change();
        appRef.tick();
    });
    letInputThrough(transition);
    transition.ready.catch(() => undefined);
    transition.finished.finally(() => {
        root.classList.remove(name);
        root.style.removeProperty('--home-morph-easing');
        root.style.removeProperty('--home-morph-duration');
    });
}
