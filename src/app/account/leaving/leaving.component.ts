import { Component, computed, inject, signal } from '@angular/core';
import { ClearDeviceComponent } from '../../shared/components/clear-device/clear-device.component';
import { DeviceDataService } from '../../shared/state/device-data.service';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { AccountService } from '../account.service';
import { ConsentService } from '../consent.service';

/**
 * You → Leaving, at the foot of the tab: the ways to take your things off this device, or out
 * of Loop Workouts. Signed in, Sign out (SYN-3), Clear this device (SYN-9) and Delete account
 * (SYN-8); signed out, just Clear this device. Kept together, and away from the top of the
 * page, so the rarest, least undoable actions aren't the first you meet.
 */
@Component({
    selector: 'app-leaving',
    imports: [ClearDeviceComponent],
    templateUrl: './leaving.component.html',
    styleUrl: './leaving.component.scss',
})
export class LeavingComponent {
    private readonly account = inject(AccountService);
    private readonly deviceData = inject(DeviceDataService);
    private readonly focus = injectFocusAfterRender();
    /** Whether notes are kept with the account: if not, signing out loses them (SYN-10). */
    protected readonly notesKept = inject(ConsentService).notesKept;

    protected readonly signedIn = computed(() => this.account.state().status === 'signed-in');
    /** Waiting on the server, so the buttons can't be pressed twice. */
    protected readonly busy = signal(false);
    /** What signing out is doing, read out as it changes. */
    protected readonly message = signal('');
    /** Delete account was pressed: its warning is open. */
    protected readonly confirmingDelete = signal(false);
    /** The account couldn't be deleted, e.g. offline. */
    protected readonly deleteFailed = signal(false);
    /** Signing out would lose changes that haven't synced, so it's asking first. */
    protected readonly confirmingSignOut = signal(false);

    /**
     * Signs out, removing the account's data from this device so the next person to use it
     * doesn't see it, or have it merged into their account; this device's settings stay.
     * It syncs first, and if anything couldn't be sent (offline, say), asks before losing it,
     * unless `anyway`. Clearing reloads the app, which then says it's signed out.
     */
    protected async signOut(anyway = false) {
        this.confirmingSignOut.set(false);
        this.busy.set(true);
        if (!anyway) {
            this.message.set('Syncing before signing out…');
            if (!(await this.account.syncAll())) {
                this.busy.set(false);
                this.message.set('');
                this.confirmingSignOut.set(true);
                this.focus('account-sign-out-warning');
                return;
            }
        }
        this.message.set('Signing out…');
        // Signed out here either way, as clearing takes the sign-in with it
        await this.account.signOut();
        await this.deviceData.clear({ leaving: 'signed-out' });
    }

    protected cancelSignOut() {
        this.confirmingSignOut.set(false);
        this.focus('account-sign-out');
    }

    protected askToDelete() {
        this.deleteFailed.set(false);
        this.confirmingDelete.set(true);
        this.focus('account-delete-warning');
    }

    protected cancelDelete() {
        this.confirmingDelete.set(false);
        this.focus('account-delete');
    }

    /**
     * Deletes the account and everything of it on the server, then clears this device as
     * signing out does, keeping its settings; the app reloads and says so. If it can't, the
     * warning closes, saying why, with focus back on Delete account to try again.
     */
    protected async deleteAccount() {
        this.busy.set(true);
        const deleted = await this.account.deleteAccount();
        if (deleted) {
            await this.deviceData.clear({ leaving: 'deleted' });
        } else {
            this.busy.set(false);
            this.confirmingDelete.set(false);
            this.deleteFailed.set(true);
            this.focus('account-delete');
        }
    }
}
