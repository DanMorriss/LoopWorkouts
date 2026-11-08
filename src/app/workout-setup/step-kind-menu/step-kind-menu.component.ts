import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StepKind, stepKindName } from '../../models/workout';
import { MenuPlacementDirective } from '../../shared/menu-placement.directive';

/**
 * A step's kind as a pill, which opens a menu of the kinds under it. Which step's menu is
 * open is up to Create, which keeps only one open: this asks to open, close or pick.
 */
@Component({
    selector: 'app-step-kind-menu',
    imports: [MatIconModule, MenuPlacementDirective],
    templateUrl: './step-kind-menu.component.html',
    styleUrl: './step-kind-menu.component.scss',
    host: {
        '(keydown.escape)': 'escape()',
        '(focusout)': 'focusOut($event)',
    },
})
export class StepKindMenuComponent {
    readonly kind = input.required<StepKind>();
    /** The step's key, for ids that are unique on the page. */
    readonly stepKey = input.required<number>();
    /** Counting from 1, as the step is named. */
    readonly stepNumber = input.required<number>();
    readonly open = input(false);

    /** The pill was pressed. */
    readonly toggled = output<void>();
    /** Escape, or focus left the menu. */
    readonly closed = output<void>();
    readonly picked = output<StepKind>();

    protected readonly kinds: readonly StepKind[] = ['reps', 'work', 'rest'];
    protected readonly kindName = stepKindName;
    private readonly pill = viewChild.required<ElementRef<HTMLButtonElement>>('pill');

    /** Escape: closes the menu and goes back to its pill. */
    protected escape() {
        if (this.open()) {
            this.closed.emit();
            this.pill().nativeElement.focus();
        }
    }

    /** Tabbing out of the menu closes it. */
    protected focusOut(event: FocusEvent) {
        const wrap = event.currentTarget as HTMLElement;
        if (
            this.open() &&
            event.relatedTarget instanceof Node &&
            !wrap.contains(event.relatedTarget)
        ) {
            this.closed.emit();
        }
    }
}
