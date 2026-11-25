import { Component, computed, inject, signal } from '@angular/core';
import { injectThisWeek } from '../../shared/state/this-week';
import { plansForYou } from '../../models/built-in-plans';
import { PageSlide } from '../../shared/navigation/page-slide';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { PlanStore } from '../../shared/state/plan-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { missedToDoToday, weekdayOf } from '../../models/plan';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { WEEK_EDIT_ID } from '../use-plan-on-today';
import { PlansForYouComponent } from '../plans-for-you/plans-for-you.component';
import { DayPanelComponent, dayDoTodayId, dayStartId } from './day-panel.component';
import { WeekDaysComponent } from '../../shared/components/week-days/week-days.component';
import { WeekWorkout, weekDays, weekTally } from '../../shared/components/week-days/week-view';

/**
 * The week on Today (PLN-4): Monday to Sunday (`WeekDaysComponent`), each day's date, what's on
 * it and how it's going, with today picked to start with and what's on the picked day under them
 * (`DayPanelComponent`), Start on today's (PLN-2) and Do it today on another day's, this week
 * only (PLN-3); how many of the week's planned workouts are done and the next one to come; and
 * **Edit plan**, which slides the weekly plan in. With nothing planned, the ready-made weeks for your goal and equipment, swiped between and used in
 * one tap (PLN-6) as on Get started; or All plans, or Make your own plan (NAV-6).
 */
@Component({
    selector: 'app-week-strip',
    imports: [DayPanelComponent, IconComponent, PlansForYouComponent, WeekDaysComponent],
    template: `
        <section class="week" aria-labelledby="week-title">
            <div class="week__head">
                <h3 class="week__label" id="week-title">This week</h3>
                @if (planned()) {
                    <a
                        [id]="weekEditId"
                        href="/plan"
                        class="week__edit"
                        (click)="slide.follow($event, '/plan', 'in')"
                    >
                        <app-icon class="icon-outline">edit</app-icon>
                        Edit plan
                    </a>
                }
            </div>
            @if (planned()) {
                <app-week-days [days]="days()" [picked]="picked()" (pick)="pick($event)" />
                <!-- Made afresh for each day picked, so it slides in from that side -->
                @for (day of shown(); track day.day) {
                    <app-day-panel
                        class="week__panel"
                        [day]="day"
                        [missed]="day.day === today ? missed() : null"
                        [animate.enter]="entering()"
                        (doToday)="doToday(day.day, $event)"
                    />
                }
                <p class="week__so-far">{{ soFar() }}</p>
            } @else {
                <!-- Weeks ready-made for your goal and equipment (PLN-6), used in one tap,
                     as the main way; or the other plans, or planning your own workouts -->
                <p class="week__empty">{{ emptyLead() }}</p>
                <app-plans-for-you [plans]="suggestedPlans()" />
            }
        </section>
    `,
    styleUrl: './week-strip.component.scss',
})
export class WeekStripComponent {
    private readonly workouts = inject(WorkoutStore);
    protected readonly slide = inject(PageSlide);
    private readonly settings = inject(SettingsStore);
    private readonly planStore = inject(PlanStore);
    private readonly undo = inject(UndoService);
    private readonly focusAfterRender = injectFocusAfterRender();
    private readonly thisWeek = injectThisWeek();
    protected readonly weekEditId = WEEK_EDIT_ID;
    private readonly now = Date.now();
    protected readonly today = weekdayOf(this.now);

    private name(id: string): string {
        return this.workouts.findAnyWorkout(id)?.title.trim() || 'Untitled workout';
    }

    private readonly week = computed(() => this.thisWeek(this.now));

    /** With nothing planned, the ready-made plans to suggest, for your goal and equipment. */
    protected readonly suggestedPlans = computed(() =>
        plansForYou(this.settings.trainingGoal(), this.settings.myEquipment())
    );

    protected readonly emptyLead = computed(
        () =>
            `Nothing planned yet. ${
                this.suggestedPlans().length > 1
                    ? 'Here are some weeks of ready-made workouts for your goal and equipment, best first'
                    : "Here's a week of ready-made workouts for your goal and equipment"
            }, or plan your own and Today shows what's due each day.`
    );

    /** Whether anything's planned this week, of the workouts still in the library. */
    protected readonly planned = computed(() => this.week().some((day) => day.length > 0));

    protected readonly days = computed(() =>
        weekDays(this.week(), this.now, (id) => this.name(id))
    );

    /**
     * On a rest day, the training missed this week to offer today instead, with the day it was
     * on, e.g. "Monday's Legs" (PLN-3).
     */
    protected readonly missed = computed(() => {
        const missed = missedToDoToday(this.week(), this.today);
        const day = missed && this.days()[missed.day];
        const item = day?.workouts.find((one) => one.workoutId === missed!.workoutId);
        return day && item ? { day: day.name, from: day.day, item } : null;
    });

    /** The day shown under the days: today, until another's picked. */
    protected readonly picked = signal(this.today);
    /** The picked day, as a list of one, so its panel is made afresh for each day. */
    protected readonly shown = computed(() => [this.days()[this.picked()]]);
    /** How the next day's panel comes in: from the side of the day picked. */
    protected readonly entering = signal('');

    protected pick(day: number) {
        if (day === this.picked()) {
            return;
        }
        this.entering.set(day > this.picked() ? 'day-panel--from-right' : 'day-panel--from-left');
        this.picked.set(day);
    }

    /**
     * Done today instead, this week only (PLN-3), as the Plan page's menu does: today's picked,
     * with it on, due. With Undo, which picks the day it was pressed on again (its own, or
     * today's for one offered on a rest day), focus back on its Do it today; focus goes to the
     * Undo bar, then its Start, today.
     */
    protected doToday(day: number, item: WeekWorkout) {
        const before = this.planStore.plan();
        const missed = this.missed();
        const from = missed?.item.workoutId === item.workoutId ? missed.from : day;
        this.planStore.moveThisWeek(item.workoutId, from, this.today);
        this.pick(this.today);
        this.undo.offerUndo({
            message: `${item.name} moved to today`,
            undo: () => {
                this.planStore.restore(before);
                this.pick(day);
                this.focusAfterRender(dayDoTodayId(item.workoutId));
            },
            dismissed: () => this.focusAfterRender(dayStartId(item.workoutId)),
        });
    }

    /** "2 of 5 done this week · Next: Pull on Thursday", or "All 5 done this week". */
    protected readonly soFar = computed(() =>
        weekTally(this.week(), this.today, (id) => this.name(id))
    );
}
