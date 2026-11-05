import { Component, input, output } from '@angular/core';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';

/**
 * Asks before leaving Create with unsaved changes. Focus starts on Keep editing, the safe
 * choice, and is trapped inside while it's open; ‹ Back, Escape or a click outside keep editing
 * too. Where it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-unsaved-changes-dialog',
    imports: [DialogComponent],
    template: `
        <app-dialog
            labelledBy="unsaved-title"
            describedBy="unsaved-hint"
            [alert]="true"
            [width]="420"
            (closed)="keepEditing.emit()"
        >
            <h2 class="unsaved__title" id="unsaved-title">Discard your changes?</h2>
            <p class="unsaved__hint" id="unsaved-hint">{{ hint() }}</p>
            <div class="unsaved__actions">
                <button
                    type="button"
                    class="btn-main unsaved__keep"
                    cdkFocusInitial
                    (click)="keepEditing.emit()"
                >
                    Keep editing
                </button>
                <button
                    type="button"
                    class="btn-pill btn-pill--danger unsaved__discard"
                    (click)="discard.emit()"
                >
                    Discard changes
                </button>
            </div>
        </app-dialog>
    `,
    styleUrl: './unsaved-changes-dialog.component.scss',
})
export class UnsavedChangesDialogComponent {
    /** What would be lost, e.g. "Your changes to Legs haven't been saved." */
    readonly hint = input.required<string>();
    readonly keepEditing = output<void>();
    readonly discard = output<void>();
}
