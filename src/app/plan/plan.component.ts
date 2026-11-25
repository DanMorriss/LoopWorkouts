import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TopBarComponent } from '../nav/top-bar/top-bar.component';
import { PageSlide } from '../shared/navigation/page-slide';
import { SwipeBackDirective } from '../nav/swipe-back.directive';
import { WEEKDAYS } from '../models/plan';
import { WorkoutChoiceDialogComponent } from '../shared/components/workout-choice-dialog/workout-choice-dialog.component';
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
import { PlanPageView, PlanRow } from './plan-page-view';
import {
    PlanAction,
    planNameId,
    PlanWorkoutComponent,
} from './plan-workout/plan-workout.component';

/**
 * The weekly plan (PLN-1): Monday to Sunday, the workouts planned on each, the same every week,
 * with where each is this week (PLN-3): done, missed, due today or to come. Each day adds a
 * workout, yours or ready-made, or takes one off; the dialog's **Make a new workout** opens
 * Create, whose Save plans it on that day and comes back here (PLN-5). A workout's handle drags
 * it to another day, or another place on its own; pressed, it opens the days to plan it on.
 * Its name opens a menu: Start, Details, and Do it today instead, this week only (or, done so,
 * Put back). A day's ⇄, then another's, swaps the two (`PlanDaySwap`). What it shows is `PlanPageView`. It slides in over Today, from its week (PLN-4), and back off with ‹ Today or a swipe right.
 */
@Component({
    selector: 'app-plan',
    imports: [
        AddToPlanDialogComponent,
        TopBarComponent,
        CdkDrag,
        CdkDropList,
        CdkDropListGroup,
        MatIconModule,
        PlanMusclesComponent,
        PlanWorkoutComponent,
        SwipeBackDirective,
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
    protected readonly swap = new PlanDaySwap(
        this.planStore,
        this.undo,
        (said) => this.announcement.set(said),
        (id) => this.focusAfterRender(id)
    );
    /** Days are swapped once there's something planned to swap. */
    protected readonly canSwap = this.planStore.hasPlan;
    protected readonly swapId = planSwapId;

    constructor() {
        // The first time it opens on this device, a tour of it (PLN-8)
        inject(TourService).startOnce('plan');
        // Back from Save in Create, made for a day here: point it out, and say so
        const saved = inject(ActivatedRoute).snapshot.queryParamMap.get('saved');
        const day = saved ? this.planStore.plan().days.findIndex((ids) => ids.includes(saved)) : -1;
        if (saved && day >= 0) {
            this.saved.set({ id: saved, day });
            this.focusAfterRender(this.view.canAdd(day) ? `plan-add-${day}` : 'plan-title');
            // Once the live region's on the page, as one filled before it isn't heard
            const said = `Saved ${this.name(saved)}, planned on ${WEEKDAYS[day]}`;
            afterNextRender(() => this.announcement.set(said));
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

    /**
     * A workout dragged by its handle and let go: on another day, it's moved there, and on its
     * own, to its new place.
     */
    protected dropped(event: CdkDragDrop<number, number, PlannedDrag>) {
        const { day: from, workoutId } = event.item.data;
        const to = event.container.data;
        if (from === to && event.previousIndex === event.currentIndex) {
            return;
        }
        // Where it's let go among those shown there, without it
        const shown = this.view
            .days()
            [to].workouts.map((planned) => planned.workoutId)
            .filter((id) => id !== workoutId);
        const before = this.planStore.plan();
        this.planStore.move(workoutId, from, to, shown[event.currentIndex] ?? null);
        const ids = this.planStore.plan().days[to];
        if (!ids.includes(workoutId)) {
            return;
        }
        const name = this.name(workoutId);
        // Focus stays on its handle, where it's gone; Undo puts the whole week back, so one
        // dragged off a day gone by isn't left "From next week" when it's dragged back
        this.undo.offerUndo({
            message:
                from === to
                    ? `${name} moved to ${ids.indexOf(workoutId) + 1} of ${ids.length} on ${WEEKDAYS[to]}`
                    : `${name} moved to ${WEEKDAYS[to]}`,
            undo: () => {
                this.planStore.restore(before);
                this.focusAfterRender(`plan-move-${from}-${workoutId}`);
            },
            keepFocus: true,
        });
        this.focusAfterRender(`plan-move-${to}-${workoutId}`);
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
                return this.remove(planned, row.workoutId);
            case 'start':
                return workout && this.start(workout);
            case 'details':
                return this.slide.navigate(`/library/${row.workoutId}?from=plan`, 'in');
            case 'today':
                return this.doToday(row);
            case 'back':
                this.planStore.moveThisWeek(row.workoutId, planned, null);
                this.announcement.set(`${row.name} back on ${WEEKDAYS[planned]}`);
                this.focusAfterRender(planNameId(planned, row.workoutId));
        }
    }

    /**
     * Done today instead, this week only (PLN-3): it shows today, due, and isn't missed on its
     * own day. With Undo; focus to the Undo bar, then its name, today.
     */
    private doToday(row: PlanRow) {
        const before = this.planStore.plan();
        const today = this.view.today;
        this.planStore.moveThisWeek(row.workoutId, row.day, today);
        this.undo.offerUndo({
            message: `${row.name} moved to today`,
            undo: () => {
                this.planStore.restore(before);
                this.focusAfterRender(planNameId(row.day, row.workoutId));
            },
            dismissed: () => this.focusAfterRender(planNameId(today, row.workoutId)),
        });
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
            this.focusAfterRender(`plan-move-${this.movingFrom}-${id}`);
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
        this.planOnDays(
            workout,
            days,
            on < 0 ? `plan-add-${from}` : `plan-move-${on}-${workout.id}`
        );
    }

    /** Takes it off the day, with Undo: focus to the Undo bar, then the day's Add. */
    private remove(day: number, workoutId: string) {
        const before = this.planStore.plan();
        this.planStore.remove(day, workoutId);
        this.undo.offerUndo({
            message: `${this.name(workoutId)} taken off ${WEEKDAYS[day]}`,
            undo: () => {
                this.planStore.restore(before);
                this.focusAfterRender(`plan-move-${day}-${workoutId}`);
            },
            dismissed: () => this.focusAfterRender(`plan-add-${day}`),
        });
    }
}
