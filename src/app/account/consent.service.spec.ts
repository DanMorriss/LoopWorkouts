import { TestBed } from '@angular/core/testing';
import type { AccountClient } from './account-client';
import { ConsentService, PENDING_CONSENT_KEY } from './consent.service';

describe('ConsentService (SYN-10)', () => {
    let consent: ConsentService;
    const rpc = vi.fn();
    const client = { rpc } as unknown as AccountClient;

    beforeEach(() => {
        localStorage.removeItem(PENDING_CONSENT_KEY);
        rpc.mockReset();
        consent = TestBed.inject(ConsentService);
    });
    afterEach(() => localStorage.removeItem(PENDING_CONSENT_KEY));

    it('saves consent ticked before signing in with the account, dated by the server', async () => {
        consent.agree();
        rpc.mockResolvedValue({ data: { at: 1000, notice: '2026-11-08' }, error: null });

        await consent.signedIn(client);

        expect(rpc).toHaveBeenCalledWith('give_health_consent', { notice_date: '2026-11-08' });
        expect(consent.given()).toEqual({ at: 1000, notice: '2026-11-08' });
        expect(localStorage.getItem(PENDING_CONSENT_KEY)).toBeNull();
    });

    it("keeps it to save next time if it couldn't be, looking up the account's meanwhile", async () => {
        consent.agree();
        rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
        rpc.mockResolvedValueOnce({ data: null, error: null });

        await consent.signedIn(client);

        expect(rpc).toHaveBeenLastCalledWith('my_health_consent');
        expect(consent.given()).toBeNull();
        expect(localStorage.getItem(PENDING_CONSENT_KEY)).toBe('2026-11-08');
    });

    it("leaves it unknown when the account's can't be looked up, e.g. offline", async () => {
        rpc.mockRejectedValue(new Error('offline'));

        await consent.signedIn(client);

        expect(consent.given()).toBeUndefined();
    });

    it('forgets it on signing out', async () => {
        rpc.mockResolvedValue({ data: { at: 1000, notice: '2026-11-08' }, error: null });
        await consent.signedIn(client);

        consent.signedOut();

        expect(consent.given()).toBeUndefined();
    });
});
