import { CdkTrapFocus } from '@angular/cdk/a11y';
import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { DialogBackComponent } from '../../shared/components/dialog-back/dialog-back.component';
import { growFromClick } from '../../shared/dialog-origin';

/**
 * Asks before leaving Create with unsaved changes. Focus starts on Keep editing, the safe
 * choice, and is trapped inside while it's open; ‹ Back, Escape or a click outside keep editing
 * too. Where it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-unsaved-changes-dialog',
    imports: [CdkTrapFocus, DialogBackComponent],
    template: `
        <div
            class="unsaved-overlay dialog-overlay"
            role="presentation"
            (click)="keepEditing.emit()"
            (keydown.escape)="keepEditing.emit()"
        >
            <div
                #card
                class="unsaved dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="unsaved-title"
                aria-describedby="unsaved-hint"
                (click)="$event.stopPropagation()"
            >
                <app-dialog-back (back)="keepEditing.emit()" />
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
            </div>
        </div>
    `,
    styleUrl: './unsaved-changes-dialog.component.scss',
})
export class UnsavedChangesDialogComponent {
    /** What would be lost, e.g. "Your changes to Legs haven't been saved." */
    readonly hint = input.required<string>();
    readonly keepEditing = output<void>();
    readonly discard = output<void>();

    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

    constructor() {
        // Grows out of what was pressed to leave, and shrinks back into it
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }
}
