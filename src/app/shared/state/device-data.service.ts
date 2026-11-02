import { DestroyRef, DOCUMENT, inject, Service } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { AUTH_STORAGE_KEY } from '../../account/account-client';
import { UndoService } from '../undo/undo.service';
import { deleteDatabase } from './history-database';
import { SettingsStore } from './settings-store.service';
import { WorkoutStore } from './workout-store.service';

/** Where a tab clearing this device tells the app's other open tabs. */
export const DEVICE_CHANNEL = 'loop-workouts-device';
const CLEARED = 'cleared';

/** This device's own choices, which signing out keeps: the settings, and its clock's offset. */
const DEVICE_KEYS = ['settings', 'clock-offset'];

/**
 * Left in sessionStorage by leaving the account, to say so once the app's reloaded: signed
 * out here, the account deleted, or signed out without asking (`ended`: the account deleted
 * on another device, say, or the sign-in not renewed).
 */
export const SIGNED_OUT_NOTE = 'signed-out';

export type LeftAccount = 'signed-out' | 'deleted' | 'ended';

/** What's said once the app's reloaded, for each way of leaving the account. */
export const LEFT_ACCOUNT_TEXT: Record<LeftAccount, string> = {
    'signed-out': 'Signed out. Your data was removed from this device; your account keeps it',
    deleted: 'Your account has been deleted, and its data removed from this device',
    ended: 'You were signed out, so your data was removed from this device. Signing in again brings back what your account has',
};

/**
 * Everything the app keeps on this device, as a whole: Clear this device (SYN-9) removes it,
 * e.g. on a shared computer, and starts the app again empty. It's started with the app, so
 * every open tab hears when another clears the device.
 */
@Service()
export class DeviceDataService {
    private readonly workouts = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly document = inject(DOCUMENT);
    private readonly router = inject(Router);
    private readonly undo = inject(UndoService);
    private readonly channel =
        typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(DEVICE_CHANNEL);

    constructor() {
        this.sayWhyItWasCleared();
        // Signed in in another tab: this one starts again when it's next looked at, so it has
        // the account's data and syncs too, rather than saving what it had over what was fetched
        const view = this.document.defaultView;
        let signedInElsewhere = false;
        const heard = (event: StorageEvent) => {
            if (event.key === AUTH_STORAGE_KEY && event.oldValue === null && event.newValue) {
                signedInElsewhere = true;
            }
        };
        const shown = () => {
            if (signedInElsewhere && this.document.visibilityState === 'visible') {
                this.reload();
            }
        };
        view?.addEventListener('storage', heard);
        this.document.addEventListener('visibilitychange', shown);
        inject(DestroyRef).onDestroy(() => {
            view?.removeEventListener('storage', heard);
            this.document.removeEventListener('visibilitychange', shown);
        });
        // Another tab cleared the device: what this one has in memory would be saved back
        // the next time anything changed, so drop it and start again empty too
        this.channel?.addEventListener('message', (event: MessageEvent) => {
            if (event.data === CLEARED) {
                this.workouts.stop();
                this.reload();
            }
        });
        inject(DestroyRef).onDestroy(() => this.channel?.close());
    }

    /**
     * Removes the workouts, history, exercises, notes, plan, deletions and settings from this
     * device, then reloads the app, and the app's other open tabs. A workout going is
     * dropped, not logged: logging it as the page unloads would put it straight back in the
     * history. Signing out or deleting the account (`leaving`) keeps this device's settings,
     * less the account's name and when the profile changed, and leaves a note for the Account
     * tab to say it's done.
     */
    async clear({ leaving }: { leaving?: LeftAccount } = {}) {
        const signingOut = leaving !== undefined;
        this.workouts.stop();
        if (signingOut) {
            this.settings.forgetProfile();
        }
        const kept = signingOut
            ? DEVICE_KEYS.flatMap((key) => {
                  const value = localStorage.getItem(key);
                  return value === null ? [] : [[key, value] as const];
              })
            : [];
        // Storage is cleared, and the history's deletion asked for, in this same task, so
        // it's all done before another tab hears this and reloads
        this.channel?.postMessage(CLEARED);
        localStorage.clear();
        sessionStorage.clear();
        for (const [key, value] of kept) {
            localStorage.setItem(key, value);
        }
        if (signingOut) {
            sessionStorage.setItem(SIGNED_OUT_NOTE, leaving);
        }
        await deleteDatabase();
        this.reload();
    }

    /**
     * Back from leaving the account, which reloaded the app: says so in the bar, on the page
     * it opened on, once it's open.
     */
    private sayWhyItWasCleared() {
        const left = sessionStorage.getItem(SIGNED_OUT_NOTE) as LeftAccount | null;
        if (left === null || !(left in LEFT_ACCOUNT_TEXT)) {
            return;
        }
        sessionStorage.removeItem(SIGNED_OUT_NOTE);
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                take(1)
            )
            .subscribe(() => this.undo.notify(LEFT_ACCOUNT_TEXT[left]));
    }

    /** Starts the app again, with nothing in memory from before. */
    protected reload() {
        this.document.location.reload();
    }
}
