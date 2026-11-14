import { BACKUP_VERSION } from '../shared/backup/backup-file';
import { DeviceDataService } from '../shared/state/device-data.service';
import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../models/history';
import { WorkoutFields } from '../models/workout';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { ConsentService } from '../account/consent.service';
import type { AccountClient } from '../account/account-client';
import { SyncClock } from '../shared/state/sync-clock.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import {
    FakeAccountClient,
    fakeAccountClient,
    provideFakeAccountClient,
} from '../shared/testing/fake-account-client';
import { FakeSyncServer, fakeSyncServer } from '../shared/testing/fake-sync';
import { makeWorkout } from '../shared/testing/make-workout';
import { PULL_PAGE_SIZE, SyncService } from './sync.service';
import { SyncStarter } from './sync-starter.service';

// A new workout to add: the shared test workout without its id and date
function newWorkout(title: string): WorkoutFields {
    const { id: _id, updatedAt: _updatedAt, ...workout } = makeWorkout({ title });
    return workout;
}

function entry(id: string, updatedAt: number): HistoryEntry {
    return {
        id,
        workoutId: 'workout-1',
        title: 'Intervals',
        startedAt: 1_000_000,
        endedAt: 1_060_000,
        updatedAt,
        activeSeconds: 60,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
    };
}

describe('SyncService', () => {
    let client: FakeAccountClient;
    let server: FakeSyncServer;
    let sync: SyncService;
    let clear: ReturnType<typeof vi.fn>;
    const workouts = () => TestBed.inject(WorkoutStore);
    const history = () => TestBed.inject(HistoryStore);
    const exercises = () => TestBed.inject(ExerciseStore);
    const status = () => TestBed.inject(SyncStarter).status();

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        server = fakeSyncServer(Date.now());
        signIn('me@example.com');
    });
    afterEach(() => localStorage.clear());

    /** Signed in as `email`, or not, with the fake server. Before anything's injected. */
    function signIn(email: string | null) {
        client = fakeAccountClient(email);
        client.rpc.mockImplementation(server.rpc);
        clear = vi.fn(async () => undefined);
        TestBed.configureTestingModule({
            providers: [
                provideFakeAccountClient(client),
                { provide: DeviceDataService, useValue: { clear } },
            ],
        });
    }

    /** Starts sync once what's saved here is in, and lets its first sync finish. */
    async function start() {
        await history().ready;
        sync = TestBed.inject(SyncService);
        await heard();
        await sync.sync();
    }

    /** Lets sync hear who's signed in, which it does a moment after the client says. */
    async function heard() {
        for (let i = 0; i < 2; i++) {
            await new Promise((resolve) => setTimeout(resolve));
        }
    }

    const pushes = () => client.rpc.mock.calls.filter(([fn]) => fn === 'push_records');
    const onServer = (kind: string, id: string) => server.records.get(`${kind}:${id}`);

    it('sends everything here on the first sync', async () => {
        const workout = workouts().addWorkout(newWorkout('Sprints'));
        history().record(entry('run-1', 1));
        const own = exercises().addOwn('Sled push', 'reps');
        const hills = workouts().addWorkout(newWorkout('Hills'));
        // An order moved on another device, as it can't be here any more
        workouts().mergeLibraryOrder({ ids: [hills.id, workout.id], updatedAt: 1 });

        await start();

        expect(onServer('workout', workout.id)).toMatchObject({
            updated_at: workout.updatedAt,
            deleted_at: null,
            data: workout,
            version: BACKUP_VERSION,
        });
        expect(onServer('history', 'run-1')!.data).toMatchObject({ title: 'Intervals' });
        expect(onServer('exercise', own.id)!.data).toMatchObject({ name: 'Sled push' });
        expect(onServer('library-order', 'library')!.data).toMatchObject({
            ids: workouts().libraryOrder().ids,
        });
        expect(status()).toMatchObject({ syncing: false, problem: null });
        expect(status().lastSyncedAt).not.toBeNull();
    });

    it('sends only what changed since', async () => {
        const workout = workouts().addWorkout(newWorkout('Sprints'));
        workouts().addWorkout(newWorkout('Hills'));
        await start();
        expect(pushes()).toHaveLength(1);

        await sync.sync();
        expect(pushes()).toHaveLength(1);

        workouts().updateWorkout(workout.id, newWorkout('Sprints, longer'));
        await sync.sync();
        expect(pushes()).toHaveLength(2);
        const [, args] = pushes()[1];
        expect((args as { changes: { id: string }[] }).changes.map((r) => r.id)).toEqual([
            workout.id,
        ]);
    });

    describe('the body weight (CAL-6)', () => {
        const settings = () => TestBed.inject(SettingsStore);
        /** The account consents to keeping it, as the server says on signing in. */
        async function consenting() {
            client.rpc.mockImplementation(async (fn: string, args?: unknown) =>
                fn === 'my_body_weight_consent'
                    ? { data: { at: 1000, notice: '2026-11-14' }, error: null }
                    : server.rpc(fn, args)
            );
            await TestBed.inject(ConsentService).signedIn(client as unknown as AccountClient);
        }

        it("isn't sent without consent to keeping it with the account", async () => {
            settings().update({ bodyWeight: 80 });

            await start();

            expect(onServer('body-weight', 'me')).toBeUndefined();
        });

        it('is sent with consent, and changes to it after', async () => {
            await consenting();
            settings().update({ bodyWeight: 80 });

            await start();
            expect(onServer('body-weight', 'me')!.data).toMatchObject({ kg: 80 });

            settings().update({ bodyWeight: null });
            await sync.sync();
            expect(onServer('body-weight', 'me')!.data).toMatchObject({ kg: null });
        });

        it("takes another device's, if it's newer", async () => {
            server.write({
                kind: 'body-weight',
                id: 'me',
                updated_at: 5,
                deleted_at: null,
                data: { id: 'me', kg: 72.5, updatedAt: 5 },
            });

            await start();

            expect(settings().bodyWeight()).toBe(72.5);
        });
    });

    it("merges in what's been written from another device", async () => {
        const there = makeWorkout({ id: 'from-there', title: 'From the laptop', updatedAt: 5 });
        server.write({
            kind: 'workout',
            id: there.id,
            updated_at: 5,
            deleted_at: null,
            data: there,
        });
        server.write({
            kind: 'history',
            id: 'run-there',
            updated_at: 5,
            deleted_at: null,
            data: entry('run-there', 5),
        });

        await start();

        expect(workouts().findWorkoutById('from-there')?.title).toBe('From the laptop');
        expect(
            history()
                .entries()
                .map((e) => e.id)
        ).toEqual(['run-there']);
        // What came from there isn't sent back
        expect(pushes()).toHaveLength(0);
    });

    it('a deletion there removes the record here, and one here reaches the server', async () => {
        const kept = workouts().addWorkout(newWorkout('Kept'));
        const gone = workouts().addWorkout(newWorkout('Deleted there'));
        await start();

        server.write({
            kind: 'workout',
            id: gone.id,
            updated_at: gone.updatedAt + 1,
            deleted_at: gone.updatedAt + 1,
            data: null,
        });
        workouts().deleteWorkout(kept.id);
        await sync.sync();

        expect(workouts().workouts()).toEqual([]);
        expect(onServer('workout', kept.id)).toMatchObject({ data: null });
        expect(onServer('workout', kept.id)!.deleted_at).not.toBeNull();
    });

    it('keeps the most recent change, either way', async () => {
        const ours = workouts().addWorkout(newWorkout('Changed here'));
        const theirs = workouts().addWorkout(newWorkout('Changed there'));
        await start();

        server.write({
            kind: 'workout',
            id: ours.id,
            updated_at: ours.updatedAt - 1000,
            deleted_at: null,
            data: { ...ours, title: 'Older there' },
        });
        server.write({
            kind: 'workout',
            id: theirs.id,
            updated_at: theirs.updatedAt + 1000,
            deleted_at: null,
            data: { ...theirs, title: 'Newer there', updatedAt: theirs.updatedAt + 1000 },
        });
        await sync.sync();

        expect(workouts().findWorkoutById(ours.id)?.title).toBe('Changed here');
        expect(workouts().findWorkoutById(theirs.id)?.title).toBe('Newer there');
    });

    it("dates changes by the server's clock once it's heard it", async () => {
        server.now = Date.now() + 3_600_000;
        await start();

        const workout = workouts().addWorkout(newWorkout('Sprints'));

        expect(Math.abs(workout.updatedAt - server.now)).toBeLessThan(5000);
        expect(TestBed.inject(SyncClock).now()).toBeGreaterThan(Date.now() + 3_500_000);
    });

    it("fetches a page at a time until it's fetched everything", async () => {
        for (let i = 0; i <= PULL_PAGE_SIZE; i++) {
            server.write({
                kind: 'hidden-exercise',
                id: `exercise-${i}`,
                updated_at: 5,
                deleted_at: null,
                data: { id: `exercise-${i}`, updatedAt: 5 },
            });
        }

        await start();

        expect(exercises().hidden()).toHaveLength(PULL_PAGE_SIZE + 1);
        const pulls = client.rpc.mock.calls.filter(([fn]) => fn === 'pull_records');
        expect(pulls.map(([, args]) => (args as { after: number }).after)).toEqual([
            0,
            PULL_PAGE_SIZE,
        ]);
    });

    it('leaves what a newer version of the app wrote for when this one is updated', async () => {
        server.write({
            kind: 'workout',
            id: 'new-format',
            updated_at: 5,
            deleted_at: null,
            data: makeWorkout({ id: 'new-format' }),
            version: 99,
        });

        await start();

        expect(workouts().findWorkoutById('new-format')).toBeNull();
        expect(status().problem).toBe('update');

        // Fetched again next time
        await sync.sync();
        const pulls = client.rpc.mock.calls.filter(([fn]) => fn === 'pull_records');
        expect((pulls.at(-1)![1] as { after: number }).after).toBe(0);
    });

    it("says when it couldn't sync", async () => {
        client.rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
        await start();

        expect(status()).toMatchObject({ syncing: false, problem: 'failed', lastSyncedAt: null });
    });

    it('says whether everything here has been sent, before signing out', async () => {
        await start();
        workouts().addWorkout(newWorkout('Sprints'));

        expect(await sync.syncAll()).toBe(true);
        expect(onServer('workout', workouts().workouts()[0].id)).toBeDefined();

        // Offline: the change can't go
        client.rpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
        workouts().addWorkout(newWorkout('Hills'));
        expect(await sync.syncAll()).toBe(false);
    });

    it("doesn't sync while signed out", async () => {
        TestBed.resetTestingModule();
        signIn(null);
        workouts().addWorkout(newWorkout('Sprints'));
        await start();

        expect(client.rpc).not.toHaveBeenCalled();
    });

    it('signing out forgets what was synced, so signing in again merges everything', async () => {
        workouts().addWorkout(newWorkout('Sprints'));
        await start();
        expect(localStorage.getItem('sync')).not.toBeNull();

        // As Sign out does, which clears the device itself
        TestBed.inject(SyncStarter).leaving = true;
        await client.auth.signOut();
        await heard();

        expect(localStorage.getItem('sync')).toBeNull();
        expect(localStorage.getItem('synced-at')).toBeNull();
        expect(status().lastSyncedAt).toBeNull();
        expect(clear).not.toHaveBeenCalled();
    });

    it('clears the device when signed out without asking, e.g. the account deleted elsewhere', async () => {
        await start();

        await client.auth.signOut();
        await heard();

        expect(clear).toHaveBeenCalledWith({ leaving: 'ended' });
    });
});
