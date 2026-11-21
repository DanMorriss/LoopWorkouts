import { computed, Service, signal, WritableSignal } from '@angular/core';
import type { AccountClient } from './account-client';
import { PRIVACY_NOTICE_DATE } from '../legal/notice-date';

/** The account asked on this device whether to keep its notes, by its email (SYN-10). */
export const NOTES_ASKED_KEY = 'notes-asked';

/** Consent to keeping notes that may mention health with the account (SYN-10). */
export interface HealthConsent {
    /** When it was given, by the server's clock, in ms since the epoch. */
    at: number;
    /** The date of the privacy notice it was given under (ISO), e.g. '2026-11-08'. */
    notice: string;
}

/**
 * Explicit consent to keeping notes, which may mention health (special category data under
 * UK GDPR), with the account (SYN-10): asked once just after signing in, or switched on and
 * off on the You tab, dated by the server with the privacy notice's date, and looked up on
 * each sign-in. Without it, sync keeps notes on the device.
 */
@Service()
export class ConsentService {
    private readonly _given = signal<HealthConsent | null | undefined>(undefined);
    /**
     * The account's consent; null if it has none on record; undefined while signed out, not
     * yet looked up, or if the server couldn't be reached.
     */
    readonly given = this._given.asReadonly();
    /** Whether notes are kept with the account: not while it's unknown. */
    readonly notesKept = computed(() => !!this._given());

    private readonly _notesAskedFor = signal(readNotesAsked());
    /**
     * The email of the account that's answered here whether to keep notes, just after signing
     * in or with the You tab's switch, so it isn't asked again on this device.
     */
    readonly notesAskedFor = this._notesAskedFor.asReadonly();

    /** `email`'s account has answered whether to keep notes, so isn't asked again here. */
    notesAnswered(email: string) {
        try {
            localStorage.setItem(NOTES_ASKED_KEY, email);
        } catch {
            // Storage blocked: asked again next time the app opens
        }
        this._notesAskedFor.set(email);
    }

    private readonly _weightGiven = signal<HealthConsent | null | undefined>(undefined);
    /**
     * The account's consent to keeping your body weight with it (CAL-6), apart from notes';
     * null if it has none; undefined while signed out, not yet looked up, or unreachable.
     */
    readonly weightGiven = this._weightGiven.asReadonly();

    /** Signed in: looks up the account's answers. Leaves them unknown if it can't. */
    async signedIn(client: AccountClient) {
        await Promise.all([this.checkNotes(client), this.checkWeight(client)]);
    }

    /** Looks up the account's consent to keeping notes again, e.g. as it couldn't be before. */
    async checkNotes(client: AccountClient) {
        await check(client, 'my_health_consent', this._given);
    }

    /** Agreed, signed in, to keeping notes with the account. Gives whether it was saved. */
    give(client: AccountClient): Promise<boolean> {
        return give(client, 'give_health_consent', this._given);
    }

    /**
     * Switched off: the account stops keeping notes, which the server deletes. Gives whether
     * it was done.
     */
    withdraw(client: AccountClient): Promise<boolean> {
        return withdraw(client, 'withdraw_health_consent', this._given);
    }

    /** Ticked on Profile, signed in: keeps the body weight with the account. Gives whether. */
    giveWeight(client: AccountClient): Promise<boolean> {
        return give(client, 'give_body_weight_consent', this._weightGiven);
    }

    /**
     * Unticked: the account stops keeping the body weight, which the server deletes. Gives
     * whether it was done.
     */
    withdrawWeight(client: AccountClient): Promise<boolean> {
        return withdraw(client, 'withdraw_body_weight_consent', this._weightGiven);
    }

    private async checkWeight(client: AccountClient) {
        await check(client, 'my_body_weight_consent', this._weightGiven);
    }

    signedOut() {
        this._given.set(undefined);
        this._weightGiven.set(undefined);
    }
}

function readNotesAsked(): string | null {
    try {
        return localStorage.getItem(NOTES_ASKED_KEY);
    } catch {
        return null;
    }
}

type Answer = WritableSignal<HealthConsent | null | undefined>;

/** Looks up the account's consent of one kind into `into`, leaving it if it can't. */
async function check(
    client: AccountClient,
    fn: 'my_health_consent' | 'my_body_weight_consent',
    into: Answer
) {
    const { data, error } = await client.rpc(fn).then(
        (result) => result,
        () => ({ data: null, error: true })
    );
    if (!error) {
        into.set(toConsent(data));
    }
}

/** Gives consent of one kind under the current notice. Gives whether it was saved. */
async function give(
    client: AccountClient,
    fn: 'give_health_consent' | 'give_body_weight_consent',
    into: Answer
): Promise<boolean> {
    try {
        const { data, error } = await client.rpc(fn, { notice_date: PRIVACY_NOTICE_DATE });
        const consent = error ? null : toConsent(data);
        if (consent) {
            into.set(consent);
        }
        return consent !== null;
    } catch {
        return false;
    }
}

/** Withdraws consent of one kind, which the server deletes. Gives whether it was done. */
async function withdraw(
    client: AccountClient,
    fn: 'withdraw_health_consent' | 'withdraw_body_weight_consent',
    into: Answer
): Promise<boolean> {
    try {
        const { error } = await client.rpc(fn);
        if (error) {
            return false;
        }
        into.set(null);
        return true;
    } catch {
        return false;
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
