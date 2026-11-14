import { TestBed } from '@angular/core/testing';
import type { AccountClient } from './account-client';
import { ConsentService, PENDING_CONSENT_KEY } from './consent.service';

describe('ConsentService (SYN-10)', () => {
    let consent: ConsentService;
    /** What each function answers, by name; anything not given answers nothing on record. */
    let answers: Record<string, { data: unknown; error: unknown } | Error>;
    const rpc = vi.fn(async (fn: string, _args?: unknown) => {
        const answer = answers[fn] ?? { data: null, error: null };
        if (answer instanceof Error) {
            throw answer;
        }
        return answer;
    });
    const client = { rpc } as unknown as AccountClient;
    const given = { data: { at: 1000, notice: '2026-11-14' }, error: null };

    beforeEach(() => {
        localStorage.removeItem(PENDING_CONSENT_KEY);
        rpc.mockClear();
        answers = {};
        consent = TestBed.inject(ConsentService);
    });
    afterEach(() => localStorage.removeItem(PENDING_CONSENT_KEY));

    it('saves consent ticked before signing in with the account, dated by the server', async () => {
        consent.agree();
        answers['give_health_consent'] = given;

        await consent.signedIn(client);

        expect(rpc).toHaveBeenCalledWith('give_health_consent', { notice_date: '2026-11-14' });
        expect(consent.given()).toEqual({ at: 1000, notice: '2026-11-14' });
        expect(localStorage.getItem(PENDING_CONSENT_KEY)).toBeNull();
    });

    it("keeps it to save next time if it couldn't be, looking up the account's meanwhile", async () => {
        consent.agree();
        answers['give_health_consent'] = { data: null, error: { message: 'down' } };

        await consent.signedIn(client);

        expect(rpc).toHaveBeenCalledWith('my_health_consent');
        expect(consent.given()).toBeNull();
        expect(localStorage.getItem(PENDING_CONSENT_KEY)).toBe('2026-11-14');
    });

    it("leaves it unknown when the account's can't be looked up, e.g. offline", async () => {
        answers['my_health_consent'] = new Error('offline');
        answers['my_body_weight_consent'] = new Error('offline');

        await consent.signedIn(client);

        expect(consent.given()).toBeUndefined();
        expect(consent.weightGiven()).toBeUndefined();
    });

    it('forgets it on signing out', async () => {
        answers['my_health_consent'] = given;
        answers['my_body_weight_consent'] = given;
        await consent.signedIn(client);

        consent.signedOut();

        expect(consent.given()).toBeUndefined();
        expect(consent.weightGiven()).toBeUndefined();
    });

    describe('to keeping the body weight (CAL-6)', () => {
        it('looks it up on signing in, apart from notes', async () => {
            answers['my_health_consent'] = given;

            await consent.signedIn(client);

            expect(rpc).toHaveBeenCalledWith('my_body_weight_consent');
            expect(consent.given()).not.toBeNull();
            expect(consent.weightGiven()).toBeNull();
        });

        it('gives it under the notice, dated by the server, and withdraws it', async () => {
            answers['give_body_weight_consent'] = given;

            expect(await consent.giveWeight(client)).toBe(true);
            expect(rpc).toHaveBeenCalledWith('give_body_weight_consent', {
                notice_date: '2026-11-14',
            });
            expect(consent.weightGiven()).toEqual({ at: 1000, notice: '2026-11-14' });

            expect(await consent.withdrawWeight(client)).toBe(true);
            expect(rpc).toHaveBeenCalledWith('withdraw_body_weight_consent');
            expect(consent.weightGiven()).toBeNull();
        });

        it("says so, changing nothing, when it can't be saved", async () => {
            answers['give_body_weight_consent'] = new Error('offline');
            expect(await consent.giveWeight(client)).toBe(false);
            expect(consent.weightGiven()).toBeUndefined();

            answers['give_body_weight_consent'] = given;
            await consent.giveWeight(client);
            answers['withdraw_body_weight_consent'] = { data: null, error: { message: 'down' } };
            expect(await consent.withdrawWeight(client)).toBe(false);
            expect(consent.weightGiven()).not.toBeNull();
        });
    });
});
