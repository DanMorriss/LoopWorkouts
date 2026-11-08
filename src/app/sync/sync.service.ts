import { DestroyRef, DOCUMENT, effect, inject, Service, untracked } from '@angular/core';
import { DeviceDataService } from '../shared/state/device-data.service';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AccountClient, ACCOUNT_CLIENT } from '../account/account-client';
import { BackupService } from '../shared/backup/backup.service';
import { ReadyMadeFavourites } from '../shared/state/ready-made-favourites.service';
import { ReadyMadeChanges } from '../shared/state/ready-made-changes.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { DeletionStore } from '../shared/state/deletion-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { SyncClock } from '../shared/state/sync-clock.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { changedSince, CopyHere, keyOf, markOf, readPulled, recordsHere } from './sync-records';
import { LAST_SYNCED_KEY, SyncStarter } from './sync-starter.service';

/** What's been sent and fetched, for the account signed in, in localStorage. */
const STATE_KEY = 'sync';

/** A few seconds after a change, so a burst of them goes as one. */
export const CHANGE_DELAY_MS = 3000;
/** After a sync that didn't finish, before trying again. */
export const RETRY_DELAY_MS = 60_000;
/** Records fetched at a time. */
export const PULL_PAGE_SIZE = 500;
/** Records sent at a time. */
export const PUSH_BATCH_SIZE = 200;

interface SyncState {
    /** The account's user id. */
    user: string;
    /** The highest seq fetched: next time, only what's been written since is fetched. */
    seq: number;
    /** Each record's mark (`markOf()`) when it was last sent or fetched, by key. */
    seen: Record<string, string>;
}

/**
 * Syncs this device with the account signed in (see docs/features/backup-and-sync.md, Sync):
 * fetches what's been written to the account since last time and merges it in as an import
 * does, then sends what's changed here. It syncs on signing in and opening the app, a few
 * seconds after a change, on coming back online and on coming back to the app. Signing out
 * forgets what was sent and fetched, so the next sign-in merges everything again. Started by
 * `SyncStarter`, which loads its code.
 */
@Service()
export class SyncService {
    private readonly makeClient = inject(ACCOUNT_CLIENT);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly deletions = inject(DeletionStore);
    private readonly backup = inject(BackupService);
    private readonly favourites = inject(ReadyMadeFavourites);
    private readonly readyMadeChanges = inject(ReadyMadeChanges);
    private readonly plan = inject(PlanStore);
    private readonly settings = inject(SettingsStore);
    private readonly clock = inject(SyncClock);
    private readonly starter = inject(SyncStarter);
    private readonly status = this.starter.status;
    private readonly deviceData = inject(DeviceDataService);
    private readonly document = inject(DOCUMENT);

    /** Listening to the client for signing in and out, once it's loaded. */
    private connected: Promise<AccountClient> | null = null;
    /** For the account signed in, or null when no one is. */
    private state: SyncState | null = null;
    private running: Promise<void> | null = null;
    /** The sync to run once the one going has finished. */
    private queued: Promise<void> | null = null;
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        effect(() => {
            this.workouts.workouts();
            this.workouts.libraryOrder();
            this.plan.plan();
            this.settings.profile();
            this.history.entries();
            this.exercises.own();
            this.exercises.notes();
            this.exercises.hidden();
            this.favourites.list();
            this.readyMadeChanges.list();
            untracked(() => this.soon(CHANGE_DELAY_MS));
        });
        const view = this.document.defaultView;
        const online = () => this.soon(0);
        const visible = () => {
            if (this.document.visibilityState === 'visible') {
                this.soon(0);
            }
        };
        view?.addEventListener('online', online);
        this.document.addEventListener('visibilitychange', visible);
        inject(DestroyRef).onDestroy(() => {
            // A sync still going stops at its next step
            this.state = null;
            clearTimeout(this.timer);
            view?.removeEventListener('online', online);
            this.document.removeEventListener('visibilitychange', visible);
        });
        void this.connect().catch(() => undefined);
    }

    /**
     * Syncs now, or once the sync going has finished, as it may have missed a change; settles
     * when it has.
     */
    sync(): Promise<void> {
        clearTimeout(this.timer);
        if (this.running) {
            this.queued ??= this.running.then(() => {
                this.queued = null;
                return this.sync();
            });
            return this.queued;
        }
        this.running = this.run().finally(() => (this.running = null));
        return this.running;
    }

    /**
     * Syncs, then gives whether everything here has been sent: before signing out, which
     * removes it from this device.
     */
    async syncAll(): Promise<boolean> {
        await this.sync();
        const state = this.state;
        return (
            state !== null && changedSince(recordsHere(this.copyHere()), state.seen).length === 0
        );
    }

    private soon(delayMs: number) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.sync(), delayMs);
    }

    private connect(): Promise<AccountClient> {
        this.connected ??= this.makeClient().then(
            (client) => {
                client.auth.onAuthStateChange((event, session) => {
                    // Not from inside the client's own callback, which mustn't call it back
                    setTimeout(() => this.follow(event, session));
                });
                return client;
            },
            (error: unknown) => {
                this.connected = null;
                throw error;
            }
        );
        return this.connected;
    }

    private follow(event: AuthChangeEvent, session: Session | null) {
        if (event === 'SIGNED_OUT') {
            this.forget();
            // Not from Sign out here: the account deleted on another device, say, or the
            // sign-in not renewed. What's here is the account's, so it goes, as on signing out
            if (!this.starter.leaving) {
                void this.deviceData.clear({ leaving: 'ended' });
            }
        }
        const user = session?.user.id ?? null;
        if (user === null) {
            this.state = null;
            return;
        }
        if (this.state?.user !== user) {
            this.state = loadState(user);
            this.soon(0);
        }
    }

    /** What was sent and fetched, when this device last synced: the next sign-in starts afresh. */
    private forget() {
        this.state = null;
        localStorage.removeItem(STATE_KEY);
        localStorage.removeItem(LAST_SYNCED_KEY);
        this.status.set({ syncing: false, lastSyncedAt: null, problem: null });
    }

    private async run() {
        let client: AccountClient;
        try {
            client = await this.connect();
        } catch {
            this.failed();
            return;
        }
        const state = this.state;
        if (state === null) {
            return;
        }
        this.status.update((status) => ({ ...status, syncing: true }));
        try {
            await this.history.ready;
            const tooNew = await this.pull(client, state);
            await this.push(client, state);
            if (state !== this.state) {
                return;
            }
            const lastSyncedAt = Date.now();
            localStorage.setItem(LAST_SYNCED_KEY, String(lastSyncedAt));
            this.status.set({ syncing: false, lastSyncedAt, problem: tooNew ? 'update' : null });
        } catch {
            if (state === this.state) {
                this.failed();
            }
        } finally {
            if (state === this.state) {
                saveState(state);
            }
        }
    }

    private failed() {
        const offline = this.document.defaultView?.navigator.onLine === false;
        this.status.update((status) => ({
            ...status,
            syncing: false,
            problem: offline ? 'offline' : 'failed',
        }));
        // Coming back online syncs straight away
        this.soon(RETRY_DELAY_MS);
    }

    /**
     * Fetches what's been written to the account since `state.seq` and merges it in. Gives
     * whether some of it was written by a newer version of the app: that's fetched again
     * next time, until the app's updated.
     */
    private async pull(client: AccountClient, state: SyncState): Promise<boolean> {
        let tooNewAt: number | null = null;
        let after = state.seq;
        for (;;) {
            const sentAt = Date.now();
            const { data, error } = await client.rpc('pull_records', {
                after,
                page_size: PULL_PAGE_SIZE,
            });
            if (error) {
                throw error;
            }
            const page = readPage(data);
            this.clock.heard(page.now, sentAt, Date.now());
            if (state !== this.state) {
                return false;
            }
            const pulled = readPulled(page.records);
            this.backup.merge(pulled.copy);
            // A record that's here as fetched needn't go back; one changed here since, that
            // won the merge, is sent
            const here = new Map(
                recordsHere(this.copyHere()).map((record) => [keyOf(record), markOf(record)])
            );
            for (const record of pulled.read) {
                if (here.get(keyOf(record)) === markOf(record)) {
                    state.seen[keyOf(record)] = markOf(record);
                }
            }
            if (pulled.tooNewAt !== null) {
                tooNewAt = Math.min(tooNewAt ?? Infinity, pulled.tooNewAt);
            }
            after = pulled.lastSeq ?? after;
            state.seq = tooNewAt === null ? after : Math.min(after, tooNewAt - 1);
            if (page.records.length < PULL_PAGE_SIZE) {
                return tooNewAt !== null;
            }
        }
    }

    /** Sends what's changed here since it was last sent or fetched. */
    private async push(client: AccountClient, state: SyncState) {
        const changed = changedSince(recordsHere(this.copyHere()), state.seen);
        for (let i = 0; i < changed.length && state === this.state; i += PUSH_BATCH_SIZE) {
            const batch = changed.slice(i, i + PUSH_BATCH_SIZE);
            const sentAt = Date.now();
            const { data, error } = await client.rpc('push_records', { changes: batch });
            if (error) {
                throw error;
            }
            const now = Number(data);
            if (Number.isSafeInteger(now)) {
                this.clock.heard(now, sentAt, Date.now());
            }
            for (const record of batch) {
                state.seen[keyOf(record)] = markOf(record);
            }
        }
    }

    private copyHere(): CopyHere {
        return {
            workouts: this.workouts.workouts(),
            history: this.history.entries(),
            exercises: this.exercises.own(),
            exerciseNotes: this.exercises.notes(),
            hiddenExercises: this.exercises.hidden(),
            readyMadeFavourites: this.favourites.list(),
            readyMadeChanges: this.readyMadeChanges.list(),
            libraryOrder: this.workouts.libraryOrder(),
            plan: this.plan.plan(),
            profile: this.settings.profile(),
            deleted: [...this.deletions.all()],
        };
    }
}

/** A page of `pull_records()`. */
function readPage(data: unknown): { now: number; records: unknown[] } {
    const page = (data ?? {}) as Record<string, unknown>;
    if (!Number.isSafeInteger(page['now']) || !Array.isArray(page['records'])) {
        throw new Error('Not a page of records');
    }
    return { now: page['now'] as number, records: page['records'] };
}

function loadState(user: string): SyncState {
    try {
        const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') as Partial<SyncState>;
        if (
            saved?.user === user &&
            Number.isSafeInteger(saved.seq) &&
            typeof saved.seen === 'object' &&
            saved.seen !== null
        ) {
            return { user, seq: saved.seq!, seen: saved.seen };
        }
    } catch {
        // Unreadable: start afresh
    }
    return { user, seq: 0, seen: {} };
}

function saveState(state: SyncState) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}
