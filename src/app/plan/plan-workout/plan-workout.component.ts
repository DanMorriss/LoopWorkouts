import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { WEEKDAYS } from '../../models/plan';
import { MenuPlacementDirective } from '../../shared/menu-placement.directive';
import { PlanRow } from '../plan-page-view';

/**
 * What's done to a planned workout from its row: its days picked (its handle pressed), taken
 * off its day, started, its details opened, done today instead this week, or put back on its
 * day.
 */
export type PlanAction = 'days' | 'remove' | 'start' | 'details' | 'today' | 'back';

/**
 * A planned workout's row on the Plan page (PLN-1): its handle, which drags it (the row is the
 * page's `cdkDrag`) or, pressed, opens its days; its name, which opens a menu (Start, Details,
 * Do it today instead, or Put back); where it is this week; and ✕ to take it off its day. One
 * moved here this week only says where from. The page decides which row's menu is open.
 */
@Component({
    selector: 'app-plan-workout',
    imports: [CdkDragHandle, MatIconModule, MenuPlacementDirective],
    host: {
        '[class.row--done]': "row().status === 'done'",
        '[class.row--missed]': "row().status === 'missed'",
        '[class.row--today]': "row().status === 'today'",
        '[class.row--later]': "row().status === 'next week'",
    },
    template: `
        @let item = row();
        <button
            type="button"
            class="btn-icon row__move"
            cdkDragHandle
            aria-haspopup="dialog"
            title="Drag to another day, or press to pick its days"
            [id]="'plan-move-' + item.day + '-' + item.workoutId"
            [attr.aria-label]="'Move ' + item.name + ' to other days'"
            (click)="acted.emit('days')"
        >
            <mat-icon aria-hidden="true">drag_indicator</mat-icon>
        </button>
        <div
            class="row__menu-wrap"
            (click)="$event.stopPropagation()"
            (keydown.escape)="menuToggled.emit()"
        >
            <button
                type="button"
                class="row__name"
                [id]="nameId()"
                [attr.aria-expanded]="menuOpen()"
                [attr.aria-controls]="nameId() + '-menu'"
                (click)="menuToggled.emit()"
            >
                <span class="row__title">{{ item.name }}</span>
                @if (movedFrom(); as from) {
                    <span class="row__moved">From {{ from }}, this week</span>
                }
            </button>
            @if (menuOpen()) {
                <div
                    class="menu row__menu"
                    appMenuPlacement
                    animate.leave="menu--leaving"
                    role="group"
                    [id]="nameId() + '-menu'"
                    [attr.aria-label]="item.name"
                >
                    <button type="button" class="menu__item" (click)="acted.emit('start')">
                        <mat-icon aria-hidden="true">play_arrow</mat-icon>
                        Start
                    </button>
                    <button type="button" class="menu__item" (click)="acted.emit('details')">
                        <mat-icon aria-hidden="true">info</mat-icon>
                        Details
                    </button>
                    @if (item.canDoToday) {
                        <button type="button" class="menu__item" (click)="acted.emit('today')">
                            <mat-icon aria-hidden="true">today</mat-icon>
                            Do it today instead
                        </button>
                    }
                    @if (movedFrom(); as from) {
                        <button type="button" class="menu__item" (click)="acted.emit('back')">
                            <mat-icon aria-hidden="true">undo</mat-icon>
                            Put back on {{ from }}
                        </button>
                    }
                </div>
            }
        </div>
        @if (item.label; as status) {
            <span class="row__status">
                @if (item.status === 'done') {
                    <mat-icon aria-hidden="true">check</mat-icon>
                }
                {{ status }}
            </span>
        }
        <button
            type="button"
            class="btn-icon row__remove"
            [attr.aria-label]="'Take ' + item.name + ' off ' + plannedOn()"
            (click)="acted.emit('remove')"
        >
            <mat-icon aria-hidden="true">close</mat-icon>
        </button>
    `,
    styleUrl: './plan-workout.component.scss',
})
export class PlanWorkoutComponent {
    readonly row = input.required<PlanRow>();
    readonly menuOpen = input(false);
    readonly menuToggled = output<void>();
    readonly acted = output<PlanAction>();

    protected readonly nameId = computed(() => planNameId(this.row().day, this.row().workoutId));
    /** The day it's planned on, when it's moved here this week only: "Tuesday". */
    protected readonly movedFrom = computed(() => {
        const from = this.row().movedFrom;
        return from === undefined ? '' : WEEKDAYS[from];
    });
    protected readonly plannedOn = computed(() => WEEKDAYS[this.row().movedFrom ?? this.row().day]);
}

/** The id of a planned workout's name, which opens its menu, for focus to go back to. */
export function planNameId(day: number, workoutId: string): string {
    return `plan-name-${day}-${workoutId}`;
}
