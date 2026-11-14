import type { Page, Request, Route } from '@playwright/test';
import { SUPABASE } from './fixtures';

// A stand-in for Loop Workouts' Supabase project (sign-in by GoTrue, sync by PostgREST), answering
// as they do, for the tests of signing in, sync and the account. Install it with
// `new FakeSupabase(page).install()` before the first page loads; it records each call, and each
// answer can be changed as the test goes (`fake.verify = 403`).

/** Where the app keeps its Supabase sign-in in localStorage. */
export const AUTH_KEY = 'sb-cpgacyzlfyskifzhkotu-auth-token';

const USER_ID = '5d1f0c7e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';

/** What GoTrue answers with once signed in, for `email`, valid for an hour from `now`. */
export function session(email: string, now: number) {
    return {
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(now / 1000) + 3600,
        refresh_token: 'test-refresh-token',
        user: {
            id: USER_ID,
            aud: 'authenticated',
            role: 'authenticated',
            email,
            app_metadata: { provider: 'email' },
            user_metadata: {},
            created_at: new Date(now).toISOString(),
        },
    };
}

/** The localStorage that has a device signed in as `email` (welcomed as signed in). */
export function signedIn(email: string, now: number): Record<string, string> {
    return { [AUTH_KEY]: JSON.stringify(session(email, now)), welcomed: 'signed-in' };
}

/** A record as `pull_records` gives it (see supabase/schema.sql). */
export interface PulledRecord {
    seq: number;
    kind: string;
    id: string;
    updated_at: number;
    deleted_at: number | null;
    data: unknown;
    version: number;
}

export interface Call {
    method: string;
    path: string;
    body: unknown;
}

/** An HTTP status to answer with, or `abort` for no answer at all (offline). */
type Answer = number | 'abort';

export class FakeSupabase {
    /** Every call made to it, in order. */
    readonly calls: Call[] = [];

    otp: Answer = 200;
    verify: Answer = 200;
    /** The account's records, as pull_records gives them; or a status for an error. */
    pull: PulledRecord[] | Answer = [];
    push: Answer = 200;
    deleteAccount: Answer = 204;
    /** GET /user, and refreshing the token: 401 for a session the server's ended. */
    user: Answer = 200;
    authorize: Answer = 'abort';
    /** give_health_consent and my_health_consent (SYN-10): a status, or 'abort' when offline. */
    consentAnswer: Answer = 200;
    /** The account's consent to keeping notes, as the server keeps it: null for none on record. */
    consent: { at: number; notice: string } | null = null;
    /** And to keeping the body weight (CAL-6), answered as `consentAnswer` says. */
    weightConsent: { at: number; notice: string } | null = null;

    constructor(private readonly page: Page) {}

    async install() {
        await this.page.route(SUPABASE, (route, request) => this.answer(route, request));
    }

    /** The calls to one endpoint, e.g. `rpc/push_records` or `auth/v1/otp`. */
    callsTo(path: string): Call[] {
        return this.calls.filter((call) => call.path.endsWith(path));
    }

    private async answer(route: Route, request: Request) {
        const url = new URL(request.url());
        const cors = {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        };
        if (request.method() === 'OPTIONS') {
            return route.fulfill({ status: 204, headers: cors });
        }
        let body: unknown = null;
        try {
            body = request.postDataJSON();
        } catch {
            body = request.postData();
        }
        this.calls.push({ method: request.method(), path: url.pathname, body });
        // The page's (fake) time, for the session's expiry and the server's clock; not asked of a
        // page on its way elsewhere (to Google, say), which wouldn't answer
        const now =
            url.pathname === '/auth/v1/authorize'
                ? Date.now()
                : await Promise.race([
                      this.page.evaluate(() => Date.now()).catch(() => Date.now()),
                      new Promise<number>((resolve) => setTimeout(() => resolve(Date.now()), 2000)),
                  ]);
        const json = (status: Answer, value: unknown) =>
            status === 'abort'
                ? route.abort('internetdisconnected')
                : route.fulfill({
                      status,
                      headers: { ...cors, 'content-type': 'application/json' },
                      body:
                          status < 300
                              ? JSON.stringify(value)
                              : JSON.stringify({ code: status, msg: 'error', message: 'error' }),
                  });

        const email = (this.callsTo('auth/v1/otp').at(-1)?.body as { email?: string } | null)
            ?.email;
        switch (url.pathname) {
            case '/auth/v1/otp':
                return json(this.otp, {});
            case '/auth/v1/verify':
                return json(this.verify, session(email ?? 'me@example.com', now));
            case '/auth/v1/user':
                return json(this.user, session(email ?? 'me@example.com', now).user);
            case '/auth/v1/token':
                // A refresh the server turns down, as GoTrue does once a session's ended
                return this.user === 200
                    ? json(200, session(email ?? 'me@example.com', now))
                    : route.fulfill({
                          status: 400,
                          headers: { ...cors, 'content-type': 'application/json' },
                          body: JSON.stringify({
                              code: 400,
                              error_code: 'refresh_token_not_found',
                              msg: 'Invalid Refresh Token: Refresh Token Not Found',
                          }),
                      });
            case '/auth/v1/logout':
                return route.fulfill({ status: 204, headers: cors });
            case '/auth/v1/authorize':
                return this.authorize === 'abort'
                    ? route.abort('internetdisconnected')
                    : route.fulfill({ status: this.authorize, headers: cors });
            case '/rest/v1/rpc/pull_records':
                return Array.isArray(this.pull)
                    ? json(200, { now, records: this.pull })
                    : json(this.pull, null);
            case '/rest/v1/rpc/push_records':
                return json(this.push, now);
            case '/rest/v1/rpc/give_health_consent':
                if (this.consentAnswer === 200) {
                    const { notice_date } = body as { notice_date: string };
                    this.consent = { at: now, notice: notice_date };
                }
                return json(this.consentAnswer, this.consent);
            case '/rest/v1/rpc/my_health_consent':
                return json(this.consentAnswer, this.consent);
            case '/rest/v1/rpc/give_body_weight_consent':
                if (this.consentAnswer === 200) {
                    const { notice_date } = body as { notice_date: string };
                    this.weightConsent = { at: now, notice: notice_date };
                }
                return json(this.consentAnswer, this.weightConsent);
            case '/rest/v1/rpc/my_body_weight_consent':
                return json(this.consentAnswer, this.weightConsent);
            case '/rest/v1/rpc/withdraw_body_weight_consent':
                if (this.consentAnswer === 200) {
                    this.weightConsent = null;
                }
                return json(this.consentAnswer, null);
            case '/rest/v1/rpc/delete_my_account':
                return this.deleteAccount === 'abort'
                    ? route.abort('internetdisconnected')
                    : route.fulfill({ status: this.deleteAccount, headers: cors });
            default:
                return route.fulfill({ status: 404, headers: cors });
        }
    }
}
