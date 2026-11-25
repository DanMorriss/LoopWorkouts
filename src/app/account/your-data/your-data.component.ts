import { Component, inject, input, signal } from '@angular/core';
import { BackupService, ImportResult } from '../../shared/backup/backup.service';
import { UndoOffer, UndoService } from '../../shared/undo/undo.service';
import { counted } from '../../shared/format-count';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import {
    PastedImport,
    PastePlanDialogComponent,
} from './paste-plan-dialog/paste-plan-dialog.component';

/**
 * You → Your data: Export backup and Import backup (SYN-1, SYN-2), and Bring in a plan
 * (SYN-6). Clear this device is under Leaving.
 */
@Component({
    selector: 'app-your-data',
    imports: [PastePlanDialogComponent],
    templateUrl: './your-data.component.html',
    styleUrl: './your-data.component.scss',
})
export class YourDataComponent {
    /** Someone is signed in, so what's saved is with their account too. */
    readonly signedIn = input(false);

    private readonly backup = inject(BackupService);
    private readonly undo = inject(UndoService);
    private readonly focusAfterRender = injectFocusAfterRender();

    /** What the last export or import did, read out as it changes. */
    protected readonly status = signal('');
    /** Paste plan's dialog is open. */
    protected readonly pasting = signal(false);

    protected async exportBackup() {
        this.status.set(`Backup saved as ${await this.backup.export()}.`);
    }

    protected async importBackup(input: HTMLInputElement) {
        const file = input.files?.[0];
        // Cleared so choosing the same file again still counts as a change
        input.value = '';
        if (!file) {
            return;
        }
        this.showImport(await this.backup.import(file));
    }

    /** A plan pasted in Paste plan went in: says what came in, as an import of a file does. */
    protected pastedPlan(result: PastedImport) {
        this.closePaste();
        this.showImport(result);
    }

    /** Closes Paste plan, putting focus back on its button. */
    protected closePaste() {
        this.pasting.set(false);
        this.focusAfterRender('paste-plan');
    }

    private showImport(result: ImportResult) {
        const message = importMessage(result);
        this.status.set(message);
        // In the bar at the bottom too, where it's seen on a phone; the line above reads it out
        this.undo.notify(message, { quiet: true, link: importLink(result) });
    }
}

/** "2 workouts, 3 exercises and 14 history entries", leaving out any there are none of. */
function listOf(workouts: number, exercises: number, entries: number): string {
    const items = [
        ...(workouts > 0 ? [counted(workouts, 'workout')] : []),
        ...(exercises > 0 ? [counted(exercises, 'exercise')] : []),
        ...(entries > 0 ? [counted(entries, 'history entry', 'history entries')] : []),
    ];
    return items.length > 1
        ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
        : (items[0] ?? '');
}

/** Where to see what an import brought in: workouts first, then exercises, then history. */
export function importLink(result: ImportResult): UndoOffer['link'] {
    if (!result.ok) {
        return undefined;
    }
    if (result.workoutsAdded + result.workoutsUpdated > 0) {
        return { label: 'View workouts', url: '/library' };
    }
    if (result.exercisesAdded + result.exercisesUpdated > 0) {
        return { label: 'View exercises', url: '/exercises' };
    }
    if (result.entriesAdded + result.entriesUpdated > 0) {
        return { label: 'View history', url: '/history' };
    }
    return undefined;
}

/** e.g. "Added 2 workouts and 14 history entries. Updated 1 workout." */
export function importMessage(result: ImportResult): string {
    if (!result.ok) {
        switch (result.problem) {
            case 'too-new':
                return 'That backup is from a newer version of Loop Workouts. Update the app and try again.';
            case 'too-big':
            case 'not-a-backup':
                return "That file isn't a Loop Workouts backup.";
            case 'unreadable':
                return "That file couldn't be read. Is it a Loop Workouts backup?";
        }
    }
    const added = listOf(result.workoutsAdded, result.exercisesAdded, result.entriesAdded);
    const updated = listOf(result.workoutsUpdated, result.exercisesUpdated, result.entriesUpdated);
    const parts = [
        ...(added ? [`Added ${added}.`] : []),
        ...(updated ? [`Updated ${updated}.`] : []),
        ...(result.removed > 0
            ? [`Removed ${counted(result.removed, 'item')} deleted since on the other device.`]
            : []),
    ];
    const summary =
        parts.length > 0
            ? parts.join(' ')
            : 'Nothing new: everything in that backup is already here.';
    if (result.skipped === 0) {
        return summary;
    }
    return `${summary} ${counted(result.skipped, 'item')} in it couldn't be read, so ${result.skipped === 1 ? 'it was' : 'they were'} left out.`;
}
