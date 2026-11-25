import { Component, ElementRef, inject, input, viewChild } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { isBuiltIn } from '../../models/exercise';
import { focusLeft } from '../../shared/focus-left';
import { MenuPlacementDirective } from '../../shared/menu-placement.directive';
import { SetupExercises } from '../setup-exercises';
import { SetupSteps } from '../setup-steps';
import { StepModel } from '../step-model';
import { WorkoutSetupForm } from '../workout-setup-form';

/**
 * An open step's ⋮, and the menu it opens: its exercise's Details, Swap (BLD-14) and note,
 * then moving it up or down (for keyboards and screen readers, as dragging is by pointer) and
 * deleting it. Which step's menu is open is up to Create, which keeps only one open. Moving
 * keeps it open on the same item, as the step moves, so it can go several places.
 */
@Component({
    selector: 'app-step-menu',
    imports: [MatIconModule, MenuPlacementDirective],
    templateUrl: './step-menu.component.html',
    styleUrl: './step-menu.component.scss',
    host: {
        '(keydown.escape)': 'escape()',
        '(focusout)': 'focusOut($event)',
    },
})
export class StepMenuComponent {
    readonly field = input.required<FieldTree<StepModel, number>>();
    /** Which row it is. */
    readonly index = input.required<number>();

    protected readonly setup = inject(WorkoutSetupForm);
    protected readonly steps = inject(SetupSteps);
    protected readonly exercises = inject(SetupExercises);
    protected readonly isBuiltIn = isBuiltIn;
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

    /** Escape: closes the menu and goes back to its ⋮. */
    protected escape() {
        if (this.isOpen()) {
            this.setup.view.stepMenuFor.set(null);
            this.button().nativeElement.focus();
        }
    }

    /** Tabbing out of the menu closes it. */
    protected focusOut(event: FocusEvent) {
        if (this.isOpen() && focusLeft(event)) {
            this.setup.view.stepMenuFor.set(null);
        }
    }

    /**
     * Whether its menu is showing, by the page rather than its step, as focus leaves it as the
     * step is deleted, when the step's field is gone.
     */
    private isOpen(): boolean {
        return this.host.querySelector('.step-menu:not(.menu--leaving)') !== null;
    }

    /** An item that opens a dialog, or deletes the step: the menu goes first. */
    protected closeAnd(action: () => void) {
        this.setup.view.stepMenuFor.set(null);
        action();
    }
}
