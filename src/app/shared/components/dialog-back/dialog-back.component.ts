import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * ‹ and what it goes back to, at the top of every dialog: the one way to close it, as the
 * back link is at the top of a page that slides in (BackLinkComponent), so a dialog and a page
 * are left the same way. Held at the top of the card while the rest scrolls under it, so it's
 * always in reach. Escape and a click outside still close the dialog too.
 *
 * DialogComponent puts it first in its card. With a label, e.g.
 * `<app-dialog-back label="Workouts" (back)="closed.emit()" />`, screen readers hear
 * "Back to Workouts".
 */
@Component({
    selector: 'app-dialog-back',
    imports: [IconComponent],
    template: `
        <button type="button" class="dialog-back" (click)="back.emit()">
            <app-icon>chevron_left</app-icon>
            @if (label() === 'Back') {
                Back
            } @else {
                <span class="sr-only">Back to</span> {{ label() }}
            }
        </button>
    `,
    styleUrl: './dialog-back.component.scss',
})
export class DialogBackComponent {
    /** Where it goes back to, e.g. "Workouts"; just "Back" where that depends on where it opened. */
    readonly label = input('Back');
    readonly back = output<void>();
}
