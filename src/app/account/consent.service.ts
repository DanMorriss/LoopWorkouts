import { Service, signal } from '@angular/core';
import type { AccountClient } from './account-client';
import { PRIVACY_NOTICE_DATE } from '../legal/notice-date';

/**
 * Agreed to on this device, ahead of signing in (by Google, or an email link, which may come
 * back in another tab), and not yet saved with the account: in localStorage until it is.
 */
export const PENDING_CONSENT_KEY = 'health-consent';

/** Consent to keeping notes that may mention health with the account (SYN-10). */
export interface HealthConsent {
    /** When it was given, by the server's clock, in ms since the epoch. */
    at: number;
    /** The date of the privacy notice it was given under (ISO), e.g. '2026-11-08'. */
    notice: string;
}

/**
 * Explicit consent to keeping notes, which may mention health (special category data under
 * UK GDPR), with the account (SYN-10): ticked before signing in, then saved with the account
 * once it's signed in, dated by the server with the privacy notice's date, and looked up on
 * each sign-in, so the You tab can say when it was given.
 */
@Service()
export class ConsentService {
    private readonly _given = signal<HealthConsent | null | undefined>(undefined);
    /**
     * The account's consent; null if it has none on record; undefined while signed out, not
     * yet looked up, or if the server couldn't be reached.
     */
    readonly given = this._given.asReadonly();

    private readonly _weightGiven = signal<HealthConsent | null | undefined>(undefined);
    /**
     * The account's consent to keeping your body weight with it (CAL-6), apart from notes';
     * null if it has none; undefined while signed out, not yet looked up, or unreachable.
     */
    readonly weightGiven = this._weightGiven.asReadonly();

    /** Ticked, ahead of signing in: saved with the account once it's signed in. */
    agree() {
        try {
            localStorage.setItem(PENDING_CONSENT_KEY, PRIVACY_NOTICE_DATE);
        } catch {
            // Storage blocked: the account is asked once it's signed in instead
        }
    }

    /**
     * Signed in: saves consent given here ahead of signing in, or otherwise looks up the
     * account's. Leaves it unknown if the server can't be reached.
     */
    async signedIn(client: AccountClient) {
        await Promise.all([this.checkNotes(client), this.checkWeight(client)]);
    }

    /** Ticked on Profile, signed in: keeps the body weight with the account. Gives whether. */
    async giveWeight(client: AccountClient): Promise<boolean> {
        try {
            const { data, error } = await client.rpc('give_body_weight_consent', {
                notice_date: PRIVACY_NOTICE_DATE,
            });
            const consent = error ? null : toConsent(data);
            if (consent) {
                this._weightGiven.set(consent);
            }
            return consent !== null;
        } catch {
            return false;
        }
    }

    /**
     * Unticked: the account stops keeping the body weight, which the server deletes. Gives
     * whether it was done.
     */
    async withdrawWeight(client: AccountClient): Promise<boolean> {
        try {
            const { error } = await client.rpc('withdraw_body_weight_consent');
            if (error) {
                return false;
            }
            this._weightGiven.set(null);
            return true;
        } catch {
            return false;
        }
    }

    private async checkNotes(client: AccountClient) {
        const pending = readPending();
        if (pending !== null && (await this.give(client, pending))) {
            return;
        }
        const looked = await lookUp(client, 'my_health_consent');
        if (looked !== undefined) {
            this._given.set(looked);
        }
    }

    private async checkWeight(client: AccountClient) {
        const looked = await lookUp(client, 'my_body_weight_consent');
        if (looked !== undefined) {
            this._weightGiven.set(looked);
        }
    }

    /** Agreed on the You tab, signed in already. Gives whether it was saved. */
    agreeSignedIn(client: AccountClient): Promise<boolean> {
        return this.give(client, PRIVACY_NOTICE_DATE);
    }

    signedOut() {
        this._given.set(undefined);
        this._weightGiven.set(undefined);
    }

    private async give(client: AccountClient, notice: string): Promise<boolean> {
        try {
            const { data, error } = await client.rpc('give_health_consent', {
                notice_date: notice,
            });
            const consent = error ? null : toConsent(data);
            if (!consent) {
                return false;
            }
            removePending();
            this._given.set(consent);
            return true;
        } catch {
            return false;
        }
    }
}

/** The account's consent of one kind, null for none, or undefined if it can't be reached. */
async function lookUp(
    client: AccountClient,
    fn: 'my_health_consent' | 'my_body_weight_consent'
): Promise<HealthConsent | null | undefined> {
    const { data, error } = await client.rpc(fn).then(
        (result) => result,
        () => ({ data: null, error: true })
    );
    return error ? undefined : toConsent(data);
}

function readPending(): string | null {
    try {
        return localStorage.getItem(PENDING_CONSENT_KEY);
    } catch {
        return null;
    }
}

function removePending() {
    try {
        localStorage.removeItem(PENDING_CONSENT_KEY);
    } catch {
        // Storage blocked: nothing was saved there
    }
}

/** The server's `{at, notice}`, or null for anything else (none on record). */
function toConsent(data: unknown): HealthConsent | null {
    if (typeof data !== 'object' || data === null) {
        return null;
    }
    const { at, notice } = data as Record<string, unknown>;
    return typeof at === 'number' && typeof notice === 'string' ? { at, notice } : null;
}
