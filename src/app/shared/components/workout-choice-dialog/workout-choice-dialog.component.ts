import { Component, input, linkedSignal, output } from '@angular/core';
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
    /** A line under its name, e.g. what's planned on a day already. */
    note?: string;
}

let nextId = 0;

/**
 * A dialog to pick one of the library's workouts: to add an exercise to (EXR-12), or to plan on
 * a day (PLN-1); or, with each choice's `icon`, something else, such as the days to plan one on,
 * choosing several (`chosen`) with a Done button. With `newLabel`, a row for a new workout
 * comes first, which picks null. Focus
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
                        @let on = picks()?.has(choice.id) ?? false;
                        <li>
                            <button
                                type="button"
                                class="menu__item choice__choice"
                                [class.choice__choice--on]="on"
                                [disabled]="choice.disabled && !on"
                                [attr.aria-pressed]="picks() ? on : null"
                                [attr.cdkFocusInitial]="first && !newLabel() ? '' : null"
                                (click)="press(choice.id)"
                            >
                                <mat-icon aria-hidden="true">{{
                                    on ? 'check' : (choice.icon ?? 'view_list')
                                }}</mat-icon>
                                <span class="choice__name">
                                    {{ choice.name }}
                                    @if (choice.note) {
                                        <span class="choice__note">{{ choice.note }}</span>
                                    }
                                </span>
                                @if (choice.readyMade) {
                                    <app-ready-made-badge />
                                }
                                <span class="choice__detail">{{ choice.detail }}</span>
                            </button>
                        </li>
                    }
                </ul>
                @if (picks(); as picks) {
                    <button type="button" class="btn-main choice__done" (click)="finish(picks)">
                        Done
                    </button>
                }
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
    /**
     * To choose several rather than pick one: those chosen to start with. Each row is then
     * pressed to choose it or not, and Done gives the ones chosen (`done`), in the list's order.
     * One chosen can be unchosen even when it's disabled, e.g. a full day it's on already.
     */
    readonly chosen = input<readonly string[] | null>(null);
    readonly done = output<string[]>();

    protected readonly id = `workout-choice-${nextId++}`;
    /** What's chosen so far, choosing several; null picking one. */
    protected readonly picks = linkedSignal(() => {
        const chosen = this.chosen();
        return chosen ? new Set(chosen) : null;
    });

    protected press(id: string) {
        const picks = this.picks();
        if (!picks) {
            this.picked.emit(id);
            return;
        }
        const next = new Set(picks);
        if (!next.delete(id)) {
            next.add(id);
        }
        this.picks.set(next);
    }

    protected finish(picks: ReadonlySet<string>) {
        this.done.emit(
            this.choices()
                .map((choice) => choice.id)
                .filter((id) => picks.has(id))
        );
    }
}
