import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogComponent } from '../dialog/dialog.component';
import { ReadyMadeBadgeComponent } from '../ready-made-badge/ready-made-badge.component';

/** A workout to pick: its name, a word on it (e.g. "6 steps"), and whether it can be. */
export interface WorkoutChoice {
    id: string;
    name: string;
    detail: string;
    disabled: boolean;
    /** A ready-made workout (LIB-6), which has its badge. */
    readyMade?: boolean;
    /** Its icon, if not a workout's, e.g. `event` for a day. */
    icon?: string;
}

let nextId = 0;

/**
 * A dialog to pick one of the library's workouts: to add an exercise to (EXR-12), or to plan on
 * a day (PLN-1); or, with each choice's `icon`, something else, such as the day to plan one on. With `newLabel`, a row for a new workout comes first, which picks null. Focus
 * starts on the first row and is trapped inside while it's open; ‹ Back, Escape or a click outside
 * close it. Where it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-workout-choice-dialog',
    imports: [DialogComponent, MatIconModule, ReadyMadeBadgeComponent],
    template: `
        <app-dialog
            [labelledBy]="id + '-title'"
            [describedBy]="hint() ? id + '-hint' : null"
            [width]="420"
            (closed)="closed.emit()"
        >
            <h2 class="choice__title" [id]="id + '-title'">{{ heading() }}</h2>
            @if (hint()) {
                <p class="choice__hint" [id]="id + '-hint'">{{ hint() }}</p>
            }
            @if (newLabel() || choices().length) {
                <ul class="choice__choices">
                    @if (newLabel(); as label) {
                        <li>
                            <button
                                type="button"
                                class="menu__item choice__choice"
                                cdkFocusInitial
                                (click)="picked.emit(null)"
                            >
                                <mat-icon aria-hidden="true">add</mat-icon>
                                <span class="choice__name">{{ label }}</span>
                            </button>
                        </li>
                    }
                    @for (choice of choices(); track choice.id; let first = $first) {
                        <li>
                            <button
                                type="button"
                                class="menu__item choice__choice"
                                [disabled]="choice.disabled"
                                [attr.cdkFocusInitial]="first && !newLabel() ? '' : null"
                                (click)="picked.emit(choice.id)"
                            >
                                <mat-icon aria-hidden="true">{{
                                    choice.icon ?? 'view_list'
                                }}</mat-icon>
                                <span class="choice__name">{{ choice.name }}</span>
                                @if (choice.readyMade) {
                                    <app-ready-made-badge />
                                }
                                <span class="choice__detail">{{ choice.detail }}</span>
                            </button>
                        </li>
                    }
                </ul>
            } @else {
                <p class="choice__none">{{ emptyText() }}</p>
            }
        </app-dialog>
    `,
    styleUrl: './workout-choice-dialog.component.scss',
})
export class WorkoutChoiceDialogComponent {
    readonly heading = input.required<string>();
    readonly hint = input('');
    /** A row for a new workout, first, e.g. "New workout"; none if empty. */
    readonly newLabel = input('');
    readonly choices = input.required<readonly WorkoutChoice[]>();
    /** Said in place of the list when there's nothing to pick. */
    readonly emptyText = input('');
    readonly closed = output<void>();
    /** The workout picked, or null for a new one. */
    readonly picked = output<string | null>();

    protected readonly id = `workout-choice-${nextId++}`;
}
