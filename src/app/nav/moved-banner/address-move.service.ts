import { DOCUMENT, effect, inject, Injector, Service, signal } from '@angular/core';
import { AUTH_STORAGE_KEY } from '../../shared/state/auth-storage-key';
import { hasSignInTokens } from '../../account/sign-in-landing';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { SyncStarter } from '../../sync/sync-starter.service';

/** Where the app was first, before it moved to loopworkouts.com (on 2026-10-28). */
export const OLD_HOST = 'loop-workouts.vercel.app';
/** Where it is now. */
export const NEW_ADDRESS = 'https://loopworkouts.com';

/**
 * How moving off the old address is going, for the banner there: `checking` (nothing to
 * say yet, or a sign-in coming back), `guest` (workouts and history here, not signed in),
 * `unsynced` (signed in, with changes not sent yet), `ready` (nothing left here to take, in
 * a Home Screen app, which can't move itself), or `moving` (on the way).
 */
export type MoveState = 'checking' | 'guest' | 'unsynced' | 'ready' | 'moving';

/**
 * Moves everyone from the old address to loopworkouts.com, without leaving anything behind:
 * each address keeps its own data, so the app goes there by itself only once nothing here
 * would be lost (nothing saved, or all of it synced to the account, which signing in there
 * brings back). Until then, `MovedBannerComponent` says it's moved and how to take your data.
 * A Home Screen app is told to add the new address instead, as it stays on the old one.
 */
@Service()
export class AddressMove {
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private readonly sync = inject(SyncStarter);

    readonly state = signal<MoveState>('checking');
    /** Opened from the Home Screen, rather than in the browser. */
    readonly homeScreenApp = this.isHomeScreenApp();
    private checking = false;
    /** The page opened, before the app's own redirects (to the welcome screen, say). */
    private page = '/';

    /** On the old address: moves now if nothing would be lost, or as soon as nothing would. */
    start() {
        if (this.address().hostname !== OLD_HOST) {
            return;
        }
        this.page = this.address().pathname;
        // Once a sync goes through (signing in here, or back online), look again
        effect(
            () => {
                const { syncing, problem, lastSyncedAt } = this.sync.status();
                const waiting = ['checking', 'guest', 'unsynced'].includes(this.state());
                if (waiting && !syncing && problem === null && lastSyncedAt !== null) {
                    void this.check();
                }
            },
            { injector: this.injector }
        );
        void this.check();
    }

    /** Looks whether anything here would be lost, and moves if not. */
    async check() {
        if (this.checking) {
            return;
        }
        this.checking = true;
        try {
            this.state.set(await this.whatsLeft());
        } finally {
            this.checking = false;
        }
        if (this.state() === 'ready' && !this.homeScreenApp) {
            this.state.set('moving');
            this.go(NEW_ADDRESS + this.page);
        }
    }

    private async whatsLeft(): Promise<MoveState> {
        if (localStorage.getItem(AUTH_STORAGE_KEY) !== null) {
            return (await this.sync.syncAll()) ? 'ready' : 'unsynced';
        }
        if (hasSignInTokens(this.address())) {
            // Signing in as the page opens: it's looked at again once that's synced
            return 'checking';
        }
        return (await this.anythingSaved()) ? 'guest' : 'ready';
    }

    private async anythingSaved(): Promise<boolean> {
        const history = this.injector.get(HistoryStore);
        const exercises = this.injector.get(ExerciseStore);
        await history.ready;
        return (
            this.injector.get(WorkoutStore).workouts().length > 0 ||
            history.entries().length > 0 ||
            exercises.own().length > 0 ||
            exercises.notes().length > 0 ||
            exercises.hidden().length > 0 ||
            this.injector.get(PlanStore).hasPlan()
        );
    }

    /** This page's address. */
    protected address(): Pick<Location, 'hostname' | 'pathname' | 'hash' | 'search'> {
        return this.document.location;
    }

    /** Leaves for `address`, in place of this page. */
    protected go(address: string) {
        this.document.location.replace(address);
    }

    protected isHomeScreenApp(): boolean {
        const view = this.document.defaultView;
        return (
            view?.matchMedia('(display-mode: standalone)').matches === true ||
            (view?.navigator as { standalone?: boolean } | undefined)?.standalone === true
        );
    }
}
