import { DestroyRef, inject, Signal, signal } from '@angular/core';

/** Whether the user has asked their system for reduced motion, right now. */
export function prefersReducedMotion(): boolean {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Whether the user has asked their system for reduced motion. Updates if they change the setting.
 *
 * CSS animations can use `@media (prefers-reduced-motion: reduce)` directly; this is for
 * things CSS can't stop, such as SVG `<animateMotion>`. Call it in an injection context.
 */
export function injectPrefersReducedMotion(): Signal<boolean> {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = signal(query.matches);
    const onChange = (event: MediaQueryListEvent) => reduced.set(event.matches);

    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));

    return reduced.asReadonly();
}
