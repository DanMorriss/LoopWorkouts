import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    input,
    output,
    viewChild,
} from '@angular/core';
import { DialogBackComponent } from '../dialog-back/dialog-back.component';
import { growFromClick } from '../../dialog-origin';

/**
 * What every dialog over the page is: the dimmed, blurred page behind, and a card scrolling
 * within itself, with ‹ Back at its top. It grows out of what opened it, and focus is trapped
 * inside, starting on what has `cdkFocusInitial`, or the first thing that takes focus. ‹ Back,
 * Escape or a click outside close it.
 *
 *     <app-dialog labelledBy="thing-title" (closed)="closed.emit()">
 *         <h2 id="thing-title">Thing</h2>
 *     </app-dialog>
 *
 * The component using it has animate.leave="dialog-leave" where it's used, to go as it came
 * (styles/_dialog.scss).
 */
@Component({
    selector: 'app-dialog',
    imports: [CdkTrapFocus, DialogBackComponent],
    template: `
        <div
            class="dialog-overlay"
            role="presentation"
            (click)="closed.emit()"
            (keydown.escape)="closed.emit()"
        >
            <div
                #card
                class="dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                aria-modal="true"
                [attr.role]="alert() ? 'alertdialog' : 'dialog'"
                [attr.aria-labelledby]="labelledBy()"
                [attr.aria-describedby]="describedBy()"
                [style.width]="cardWidth()"
                (click)="$event.stopPropagation()"
            >
                <app-dialog-back (back)="closed.emit()" />
                <ng-content />
            </div>
        </div>
    `,
    styleUrl: './dialog.component.scss',
})
export class DialogComponent {
    /** The id of its title. */
    readonly labelledBy = input.required<string>();
    /** The id of what says more about it, if anything does. */
    readonly describedBy = input<string | null>(null);
    /** Whether it asks something that can't be left unanswered: an `alertdialog`. */
    readonly alert = input(false);
    /** How wide the card can get, in px; narrower screens fit it to them. */
    readonly width = input(480);
    readonly closed = output<void>();

    protected readonly cardWidth = computed(() => `min(${this.width()}px, 100%)`);
    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

    constructor() {
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }
}
