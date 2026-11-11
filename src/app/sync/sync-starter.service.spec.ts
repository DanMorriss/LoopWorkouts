import { TestBed } from '@angular/core/testing';
import { AUTH_STORAGE_KEY } from '../shared/state/auth-storage-key';
import { fakeAccountClient, provideFakeAccountClient } from '../shared/testing/fake-account-client';
import { SyncStarter } from './sync-starter.service';

describe('SyncStarter', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    function create(signedInAs: string | null = 'me@example.com') {
        const client = fakeAccountClient(signedInAs);
        TestBed.configureTestingModule({ providers: [provideFakeAccountClient(client)] });
        return { starter: TestBed.inject(SyncStarter), client };
    }

    // Loading sync's code is what loads Supabase's, so it's left alone until it's needed
    it("doesn't start sync on a device that isn't signed in", async () => {
        const { starter, client } = create(null);

        starter.startIfSignedIn();
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(client.auth.onAuthStateChange).not.toHaveBeenCalled();
    });

    it('starts sync on a device that is signed in', async () => {
        localStorage.setItem(AUTH_STORAGE_KEY, '{}');
        const { starter, client } = create();

        starter.startIfSignedIn();
        await vi.waitFor(() => expect(client.auth.onAuthStateChange).toHaveBeenCalled());
    });

    it('remembers when this device last synced', () => {
        localStorage.setItem('synced-at', '1800000000000');

        expect(create().starter.status().lastSyncedAt).toBe(1_800_000_000_000);
    });
});
