import { isDevMode } from '@angular/core';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

/** Query parameters that say where a visit came from (e.g. `?ref=reddit`), the only ones sent. */
const SOURCE_PARAMS = /^(ref|utm_\w+)$/;

/**
 * A page's address as sent to analytics: without its `#…` (where a sign-in's tokens come back)
 * and with only the query parameters that say where the visit came from.
 */
export function withoutPrivateParts(url: string): string {
    const address = new URL(url);
    address.hash = '';
    for (const key of [...address.searchParams.keys()]) {
        if (!SOURCE_PARAMS.test(key)) {
            address.searchParams.delete(key);
        }
    }
    return address.href;
}

/**
 * The route a page's address belongs to, in Vercel's form (`/exercises/[id]` for
 * `/exercises/push-up`), so Speed Insights adds up every exercise's page as one. `paths` are
 * the router's paths (`exercises/:id`); an address that matches none is given as it is.
 */
export function routeOf(url: string, paths: readonly string[]): string {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const matches = (path: string) => {
        const parts = path.split('/').filter(Boolean);
        return (
            parts.length === segments.length &&
            parts.every((part, i) => part.startsWith(':') || part === segments[i])
        );
    };
    // An exact page (`library`) before one with a parameter in the same place
    const found = paths.find((path) => !path.includes(':') && matches(path)) ?? paths.find(matches);
    const route = found?.split('/').filter(Boolean) ?? segments;
    return (
        '/' + route.map((part) => (part.startsWith(':') ? `[${part.slice(1)}]` : part)).join('/')
    );
}

/**
 * Counts page views with Vercel Web Analytics, and measures how fast pages load and respond on
 * visitors' phones with Speed Insights: both anonymous, with no cookies (see the privacy
 * notice). Their scripts come from our own site (`/_vercel/…`), and both follow the router's
 * page changes. Not in development builds, which would load Vercel's debug scripts (or none).
 */
export function startAnalytics(paths: readonly string[]) {
    if (isDevMode()) {
        return;
    }
    injectAnalytics({
        mode: 'production',
        beforeSend: (event) => ({ ...event, url: withoutPrivateParts(event.url) }),
    });
    injectSpeedInsights({
        beforeSend: (event) => ({
            ...event,
            url: withoutPrivateParts(event.url),
            route: routeOf(event.url, paths),
        }),
    });
}
