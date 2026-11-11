import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_STORAGE_KEY } from '../../shared/state/auth-storage-key';
import { makeWorkout } from '../../shared/testing/make-workout';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { SyncStarter, SyncStatus } from '../../sync/sync-starter.service';
import { AddressMove, NEW_ADDRESS, OLD_HOST } from './address-move.service';

type Address = Pick<Location, 'hostname' | 'pathname' | 'hash' | 'search'>;

describe('AddressMove', () => {
    let address: Address;
    let homeScreenApp: boolean;
    let go: (to: string) => void;
    let status: ReturnType<typeof signal<SyncStatus>>;
    let syncAll: () => Promise<boolean>;

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        address = { hostname: OLD_HOST, pathname: '/workouts', hash: '', search: '' };
        homeScreenApp = false;
        go = vi.fn<(to: string) => void>();
        status = signal<SyncStatus>({ syncing: false, lastSyncedAt: null, problem: null });
        syncAll = vi.fn(async () => true);
        const proto = AddressMove.prototype as unknown as {
            address: () => Address;
            isHomeScreenApp: () => boolean;
            go: (to: string) => void;
        };
        vi.spyOn(proto, 'address').mockImplementation(() => address);
        vi.spyOn(proto, 'isHomeScreenApp').mockImplementation(() => homeScreenApp);
        vi.spyOn(proto, 'go').mockImplementation(go);
        TestBed.configureTestingModule({
            providers: [{ provide: SyncStarter, useValue: { status, syncAll: () => syncAll() } }],
        });
    });
    afterEach(() => localStorage.clear());

    /** Starts it, and waits for it to settle on what to do. */
    async function started(): Promise<AddressMove> {
        const move = TestBed.inject(AddressMove);
        move.start();
        await vi.waitFor(() => expect(move.state()).not.toBe('checking'));
        return move;
    }

    function saveAWorkout() {
        TestBed.inject(WorkoutStore).addWorkout({
            title: 'Legs',
            blocks: makeWorkout().blocks,
            repeats: 3,
        });
    }

    it('does nothing on loopworkouts.com', async () => {
        address = { ...address, hostname: 'loopworkouts.com' };
        const move = TestBed.inject(AddressMove);
        move.start();
        await Promise.resolve();

        expect(move.state()).toBe('checking');
        expect(go).not.toHaveBeenCalled();
    });

    it('moves straight away, to the same page, with nothing saved here', async () => {
        const move = await started();

        expect(move.state()).toBe('moving');
        expect(go).toHaveBeenCalledExactlyOnceWith(`${NEW_ADDRESS}/workouts`);
    });

    it("stays, saying so, while a guest's workouts are only here", async () => {
        saveAWorkout();
        const move = await started();

        expect(move.state()).toBe('guest');
        expect(go).not.toHaveBeenCalled();
    });

    it('moves once signed in and everything has synced', async () => {
        saveAWorkout();
        const move = await started();
        expect(move.state()).toBe('guest');

        // Signed in here, and its first sync goes through
        localStorage.setItem(AUTH_STORAGE_KEY, '{}');
        status.set({ syncing: false, lastSyncedAt: Date.now(), problem: null });

        await vi.waitFor(() => expect(go).toHaveBeenCalledOnce());
        expect(move.state()).toBe('moving');
    });

    it("waits while signed in with changes that haven't synced, until they have", async () => {
        localStorage.setItem(AUTH_STORAGE_KEY, '{}');
        syncAll = vi.fn(async () => false);
        const move = await started();
        expect(move.state()).toBe('unsynced');
        expect(go).not.toHaveBeenCalled();

        syncAll = vi.fn(async () => true);
        await move.check();

        expect(go).toHaveBeenCalledOnce();
    });

    it("doesn't move away from a sign-in coming back", async () => {
        address = { ...address, pathname: '/account', hash: '#access_token=abc' };
        const move = TestBed.inject(AddressMove);
        move.start();
        await new Promise((done) => setTimeout(done));

        expect(move.state()).toBe('checking');
        expect(go).not.toHaveBeenCalled();
    });

    it("doesn't move a Home Screen app, which tells you to add the new address instead", async () => {
        homeScreenApp = true;
        const move = await started();

        expect(move.state()).toBe('ready');
        expect(go).not.toHaveBeenCalled();
    });
});
