import { DOCUMENT, inject } from '@angular/core';
import { NavigationError } from '@angular/router';

/** In sessionStorage: when this tab last reloaded to fetch new code, in ms since 1970. */
const RELOADED_AT = 'loop-workouts.stale-code-reload';
/** How soon after one reload another isn't tried, so code that's really missing can't loop. */
const RETRY_AFTER_MS = 10_000;

/**
 * Whether `error` is a page's code failing to load. Each deploy renames the pages' code files,
 * and the host answers for the old names with index.html, so a tab still running an older
 * build (e.g. one the browser kept in the background) can't open a page it hasn't opened yet.
 * Each browser words it differently.
 */
export function isStaleCode(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /dynamically imported module|importing a module script failed|not a valid javascript mime type/i.test(
        message
    );
}

/**
 * For `withNavigationErrorHandler`: when a page's code fails to load, loads that page afresh,
 * which picks up the current build. Without it the tap does nothing.
 */
export function reloadOnStaleCode(navigation: NavigationError) {
    const window = inject(DOCUMENT).defaultView;
    if (isStaleCode(navigation.error) && window) {
        reloadForNewCode(window, navigation.url);
    }
}

/**
 * Loads `url` afresh, picking up the current build, when some code failed to load (a page's,
 * or the tour's). Only once in a short while, so code that really is missing shows as broken
 * rather than reloading forever.
 */
export function reloadForNewCode(window: Window, url: string) {
    const now = Date.now();
    try {
        if (now - Number(window.sessionStorage.getItem(RELOADED_AT)) < RETRY_AFTER_MS) {
            return;
        }
        window.sessionStorage.setItem(RELOADED_AT, String(now));
    } catch {
        // Storage blocked: reload anyway, as one stale page is likelier than missing code
    }
    window.location.assign(url);
}
