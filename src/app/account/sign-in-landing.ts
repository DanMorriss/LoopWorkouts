import { SIGN_IN_PATH } from './account-client';

/**
 * Whether the address carries a sign-in coming back (an email link's or Google's tokens, as
 * `#access_token=…`) or why one didn't work (`error_code`, `error_description`).
 */
export function isSignInReturn(location: Pick<Location, 'hash' | 'search'>): boolean {
    const keys = ['access_token', 'error_code', 'error_description'];
    return [location.hash.slice(1), location.search.slice(1)].some((part) => {
        const params = new URLSearchParams(part);
        return keys.some((key) => params.has(key));
    });
}

/** Whether the address carries a sign-in that worked: the account's tokens. */
export function hasSignInTokens(location: Pick<Location, 'hash' | 'search'>): boolean {
    return [location.hash.slice(1), location.search.slice(1)].some((part) =>
        new URLSearchParams(part).has('access_token')
    );
}

/**
 * Sends a sign-in coming back to the You tab, where Supabase's code reads it, if it's
 * landed anywhere else: Supabase goes to the site's home page instead of /account when it
 * doesn't take the address it was given, and nothing else picks the tokens up. Run before the
 * first navigation, so the router starts there.
 */
export function sendSignInToAccount(location: Location, history: History) {
    if (location.pathname !== SIGN_IN_PATH && isSignInReturn(location)) {
        history.replaceState(history.state, '', SIGN_IN_PATH + location.search + location.hash);
    }
}
