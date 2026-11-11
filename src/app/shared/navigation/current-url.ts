import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** The address the app is showing, e.g. "/exercises?muscles=quads". Call it in an injection context. */
export function injectCurrentUrl(): Signal<string> {
    const router = inject(Router);
    return toSignal(
        router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects)
        ),
        { initialValue: router.url }
    );
}

/** A url's page, without its query or fragment. */
export function pathOf(url: string): string {
    return url.split(/[?#]/)[0];
}

/** Whether a url is on a page, or a page under it: "/exercises/squat" is on "/exercises". */
export function isOnPage(url: string, path: string): boolean {
    const page = pathOf(url);
    return page === path || page.startsWith(`${path}/`);
}
