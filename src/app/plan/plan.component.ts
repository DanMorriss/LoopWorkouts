import { CdkDrag, CdkDragDrop, CdkDragMove, CdkDropList } from '@angular/cdk/drag-drop';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TopBarComponent } from '../nav/top-bar/top-bar.component';
import { PageSlide } from '../shared/navigation/page-slide';
import { SwipeBackDirective } from '../nav/swipe-back.directive';
import { WEEKDAYS } from '../models/plan';
import { WorkoutChoiceDialogComponent } from '../shared/components/workout-choice-dialog/workout-choice-dialog.component';
import { IconComponent } from '../shared/components/icon/icon.component';
import {
    WEEK_PANEL_ID,
    WeekDaysComponent,
} from '../shared/components/week-days/week-days.component';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { injectFocusAfterRender } from '../shared/focus-after-render';
import { TourService } from '../tour/tour.service';
import { PlanMusclesComponent } from './plan-muscles/plan-muscles.component';
import { AddToPlanDialogComponent } from '../shared/components/add-to-plan-dialog/add-to-plan-dialog.component';
import { injectPlanOnDays } from '../shared/plan-on-days';
import { injectStartWorkout } from '../shared/run/start-workout';
import { UndoService } from '../shared/undo/undo.service';
import { Workout } from '../models/workout';
import { PlanDaySwap, planSwapId } from './plan-day-swap';
import { PlanDrag, PlannedDrag } from './plan-drag';
import { planMoveId, PlanMoves } from './plan-moves';
import { PlanPageView, PlanRow } from './plan-page-view';
import { PlanStartComponent } from './plan-start/plan-start.component';
import {
    PlanAction,
    planNameId,
    PlanWorkoutComponent,
} from './plan-workout/plan-workout.component';

/**
 * The weekly plan (PLN-1), as Today's week, made to change: Monday to Sunday as tabs
 * (`WeekDaysComponent`), and under them the picked day's workouts, the same every week, with
 * where each is this week (PLN-3): done, missed, due today or to come. A day adds a workout,
 * yours or ready-made, or takes one off; the dialog's **Make a new workout** opens Create, whose
 * Save plans it on that day and comes back here (PLN-5). A workout's handle drags it to another
 * place on its day, or onto a day in the week over it; pressed, it opens the days to plan it on.
 * Its name opens a menu: Start, Details, Do it today instead, this week only (or, done so, Put
 * back), and Move up or down. Swap, then another day, swaps the two (`PlanDaySwap`). With
 * nothing planned, a ready-made week first (`PlanStartComponent`). What it shows is
 * `PlanPageView`, and the moves are `PlanMoves`. It slides in over Today, from its week
 * (PLN-4), and back off with ‹ Today or a swipe right.
 */
@Component({
    selector: 'app-plan',
    imports: [
        AddToPlanDialogComponent,
        TopBarComponent,
        CdkDrag,
        CdkDropList,
        IconComponent,
        PlanMusclesComponent,
        PlanStartComponent,
        PlanWorkoutComponent,
        SwipeBackDirective,
        WeekDaysComponent,
        WorkoutChoiceDialogComponent,
    ],
    providers: [PlanPageView],
    host: { '(document:click)': 'menuFor.set(null)' },
    templateUrl: './plan.component.html',
    styleUrl: './plan.component.scss',
})
export class PlanComponent {
    private readonly planStore = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly undo = inject(UndoService);
    protected readonly view = inject(PlanPageView);
    private readonly focusAfterRender = injectFocusAfterRender();
    protected readonly slide = inject(PageSlide);
    private readonly planOnDays = injectPlanOnDays();
    private readonly start = injectStartWorkout();
    protected readonly drag = new PlanDrag(this.planStore.plan);
    protected readonly hasPlan = this.planStore.hasPlan;
    protected readonly panelId = WEEK_PANEL_ID;
    protected readonly weekdays = WEEKDAYS;
    protected readonly swapId = planSwapId;

    /** The day shown under the week: today, to start with. */
    protected readonly picked = signal(this.view.today);

    /** Shows `day`, and puts focus on `id` on it once it's on the page. */
    private focusOn(day: number, id: string) {
        this.picked.set(day);
        this.focusAfterRender(id);
    }

    private readonly moves = new PlanMoves(this.planStore, this.undo, this.view, (day, id) =>
        this.focusOn(day, id)
    );
    protected readonly swap = new PlanDaySwap(
        this.planStore,
        this.undo,
        (said) => this.announcement.set(said),
        (id) => this.focusOn(Number(id.slice(id.lastIndexOf('-') + 1)), id)
    );

    constructor() {
        // The first time it opens on this device, a tour of it (PLN-8)
        inject(TourService).startOnce('plan');
        // Back from Save in Create, made for a day here: that day, pointing it out, and saying so
        const saved = inject(ActivatedRoute).snapshot.queryParamMap.get('saved');
        const day = saved ? this.planStore.plan().days.findIndex((ids) => ids.includes(saved)) : -1;
        if (saved && day >= 0) {
            this.saved.set({ id: saved, day });
            this.focusOn(day, this.view.canAdd(day) ? `plan-add-${day}` : 'plan-title');
            // Once the live region's on the page, as one filled before it isn't heard
            const said = `Saved ${this.name(saved)}, planned on ${WEEKDAYS[day]}`;
            afterNextRender(() => this.announcement.set(said));
        }
    }

    /** A day picked in the week, by a tap or the arrow keys: its workouts show under it. */
    protected pick(day: number) {
        this.picked.set(day);
        this.menuFor.set(null);
    }

    /** A day pressed while another's picked to swap: the two swap (or, itself, it's put down). */
    protected pressed(day: number) {
        if (this.swap.picked() !== null) {
            this.swap.press(day);
        }
    }

    protected cancelSwap() {
        const first = this.swap.picked();
        this.swap.cancel();
        if (first !== null) {
            this.focusOn(first, planSwapId(first));
        }
    }

    /** The workout just made in Create for a day here, which is pointed out on that day. */
    protected readonly saved = signal<{ id: string; day: number } | null>(null);

    protected isSaved(day: number, workoutId: string): boolean {
        const saved = this.saved();
        return saved?.day === day && saved.id === workoutId;
    }

    /** The day a workout is being added to, while its dialog is open. */
    protected readonly addingTo = signal<number | null>(null);
    /** Said to screen readers after a change, e.g. "Leg day planned on Monday". */
    protected readonly announcement = signal('');

    private name(workoutId: string): string {
        return this.view.names().get(workoutId) ?? 'Untitled workout';
    }

    /**
     * A workout picked for the day; or, picking Make a new workout (null), Create, whose Save
     * plans it on the day and comes back here (PLN-5).
     */
    protected add(day: number, workoutId: string | null) {
        this.addingTo.set(null);
        if (workoutId === null) {
            this.slide.navigate(`/setup?planOn=${day}&from=/plan`, 'in');
            return;
        }
        this.planStore.add(day, workoutId);
        this.announcement.set(`${this.name(workoutId)} planned on ${WEEKDAYS[day]}`);
        this.focusAfterRender(`plan-add-${day}`);
    }

    protected closeAdding() {
        const day = this.addingTo();
        this.addingTo.set(null);
        if (day !== null) {
            this.focusAfterRender(`plan-add-${day}`);
        }
    }

    /** The day in the week a dragged workout is over, which it'd go to if let go; or null. */
    protected readonly dropOn = signal<number | null>(null);

    /** As it's dragged: over a day in the week it can go to, that day's outlined. */
    protected draggedOver(event: CdkDragMove<PlannedDrag>) {
        this.drag.drop.moved(event);
        const { x, y } = event.pointerPosition;
        const tab = document.elementFromPoint(x, y)?.closest<HTMLElement>('[role="tab"]');
        const day = tab ? Number(tab.id.slice(tab.id.lastIndexOf('-') + 1)) : null;
        const { day: from, workoutId } = event.source.data;
        this.dropOn.set(
            day !== null && day !== from && this.drag.canGo(workoutId, from, day) ? day : null
        );
    }

    protected dropped(event: CdkDragDrop<number, number, PlannedDrag>) {
        this.moves.dropped(event, this.dropOn());
    }

    protected dragEnded() {
        this.drag.ended();
        // The drop that follows, if any, comes first, and reads where it was let go
        setTimeout(() => this.dropOn.set(null));
    }

    /** Which row's menu is open, by `menuKey`; null for none. */
    protected readonly menuFor = signal<string | null>(null);

    protected menuKey(row: PlanRow): string {
        return planNameId(row.day, row.workoutId);
    }

    /** Its name pressed, or Escape in its menu: opens it, or closes it, focus on the name. */
    protected toggleMenu(row: PlanRow) {
        const key = this.menuKey(row);
        const open = this.menuFor() === key;
        this.menuFor.set(open ? null : key);
        if (open) {
            this.focusAfterRender(key);
        }
    }

    /** Something done from a workout's row: its handle, its ✕, or its menu. */
    protected act(row: PlanRow, action: PlanAction) {
        this.menuFor.set(null);
        const planned = row.movedFrom ?? row.day;
        const workout = this.workouts.findAnyWorkout(row.workoutId);
        switch (action) {
            case 'days':
                return this.pickDays(row.day, row.workoutId);
            case 'remove':
                return this.moves.remove(planned, row.workoutId);
            case 'up':
            case 'down':
                return this.moves.nudge(row, action === 'up' ? -1 : 1);
            case 'start':
                return workout && this.start(workout);
            case 'details':
                return this.slide.navigate(`/library/${row.workoutId}?from=plan`, 'in');
            case 'today':
                return this.moves.doToday(row);
            case 'back':
                this.planStore.moveThisWeek(row.workoutId, planned, null);
                this.announcement.set(`${row.name} back on ${WEEKDAYS[planned]}`);
                this.focusOn(planned, planNameId(planned, row.workoutId));
        }
    }

    /** The workout whose days are being picked, from its handle, while the dialog's open. */
    protected readonly moving = signal<string | null>(null);
    protected readonly movingWorkout = computed(() => {
        const id = this.moving();
        return id === null ? null : this.workouts.findAnyWorkout(id);
    });
    /** The day its handle was pressed on, for focus to go back to. */
    private movingFrom = -1;

    private pickDays(day: number, workoutId: string) {
        if (this.drag.pressed()) {
            this.movingFrom = day;
            this.moving.set(workoutId);
        }
    }

    protected closeMoving() {
        const id = this.moving();
        this.moving.set(null);
        if (id !== null) {
            this.focusAfterRender(planMoveId(this.movingFrom, id));
        }
    }

    /**
     * Its days picked: planned on just those, with Undo. Focus goes back to its handle on the
     * day it was pressed on, or, taken off that, on the first it's on, or that day's Add.
     */
    protected planOn(workout: Workout, days: number[]) {
        const from = this.movingFrom;
        this.moving.set(null);
        const on = days.includes(from) ? from : (days[0] ?? -1);
        this.picked.set(on < 0 ? from : on);
        this.planOnDays(workout, days, on < 0 ? `plan-add-${from}` : planMoveId(on, workout.id));
    }
}
