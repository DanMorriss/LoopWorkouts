import { isDevMode } from '@angular/core';
import { inject as injectAnalytics } from '@vercel/analytics';

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
 * Counts page views with Vercel Web Analytics: anonymous, with no cookies (see the privacy
 * notice). Its script comes from our own site (`/_vercel/insights/`), and it counts the
 * router's page changes too. Not in development builds, which would load Vercel's debug script.
 */
export function startAnalytics() {
    if (isDevMode()) {
        return;
    }
    injectAnalytics({
        mode: 'production',
        beforeSend: (event) => ({ ...event, url: withoutPrivateParts(event.url) }),
    });
}
