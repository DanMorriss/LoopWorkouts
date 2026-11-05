import { afterNextRender, DOCUMENT, inject, Injector } from '@angular/core';

/**
 * Gives what moves focus to the element with an id, once it's on the page: for what a change
 * has only just shown, such as a warning or the next step. Call it in an injection context.
 */
export function injectFocusAfterRender(): (id: string) => void {
    const injector = inject(Injector);
    const document = inject(DOCUMENT);
    return (id) => {
        afterNextRender(() => document.getElementById(id)?.focus(), { injector });
    };
}
