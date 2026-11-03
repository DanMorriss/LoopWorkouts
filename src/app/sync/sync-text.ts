import { SyncStatus } from './sync-starter.service';

/**
 * How sync is going, for the You tab: e.g. "Synced at 12:30.", or "Last synced on 27
 * October." if that wasn't today, by this device's clock and in its language.
 */
export function syncText(status: SyncStatus, now = Date.now()): string {
    if (status.syncing) {
        return 'Syncing…';
    }
    switch (status.problem) {
        case 'offline':
            return "You're offline: it'll sync when you're back online.";
        case 'failed':
            return "It couldn't sync just now, and will try again in a minute.";
        case 'update':
            return 'Some of your data is from a newer version of Loop Workouts. Reload the app to update it, and it will sync too.';
    }
    if (status.lastSyncedAt === null) {
        return 'Not synced yet.';
    }
    const at = new Date(status.lastSyncedAt);
    if (at.toDateString() === new Date(now).toDateString()) {
        return `Synced at ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.`;
    }
    return `Last synced on ${at.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`;
}
