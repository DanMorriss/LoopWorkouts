import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { pathOf } from './current-url';

/**
 * Opens each new page at its top, as the window's scroll would otherwise carry over from the
 * last page, whichever tab that was. It's only a starting point: PageSlide then puts a page
 * sliding back where it was left, and a page can scroll to what it's been asked to show
 * (`?saved=`, `?run=`). Staying on a page (a filter in its address) and the browser's own back
 * and forward, which restore the scroll themselves, are left alone. Call it once, in an
 * injection context.
 */
export function openNewPagesAtTop() {
    const router = inject(Router);
    let page = pathOf(router.url);
    router.events
        .pipe(
            filter((event) => event instanceof NavigationEnd),
            takeUntilDestroyed()
        )
        .subscribe((event) => {
            const arrived = pathOf(event.urlAfterRedirects);
            const changed = arrived !== page;
            page = arrived;
            if (changed && router.currentNavigation()?.trigger !== 'popstate') {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        });
}
