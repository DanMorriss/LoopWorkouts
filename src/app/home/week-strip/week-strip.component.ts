import { Component, computed, inject, signal } from '@angular/core';
import { injectThisWeek } from '../../shared/state/this-week';
import { plansForYou } from '../../models/built-in-plans';
import { PageSlide } from '../../shared/navigation/page-slide';
import { HelpLinkComponent } from '../../shared/components/help-link/help-link.component';
import { nextPlannedDay, weekdayOf, WEEKDAYS } from '../../models/plan';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { WEEK_EDIT_ID } from '../use-plan-on-today';
import { PlansForYouComponent } from '../plans-for-you/plans-for-you.component';
import { DayPanelComponent } from './day-panel.component';
import { WeekDaysComponent } from './week-days.component';
import { weekDays } from './week-view';

/**
 * The week on Today (PLN-4): Monday to Sunday (`WeekDaysComponent`), each day's date, what's on
 * it and how it's going, with today picked to start with and what's on the picked day under them
 * (`DayPanelComponent`), Start on today's (PLN-2); how many of the week's planned workouts are
 * done and the next one to come; and **Edit plan**, which slides the weekly plan in. With
 * nothing planned, the ready-made weeks for your goal and equipment, swiped between and used in
 * one tap (PLN-6) as on Get started; or All plans, or Make your own plan (NAV-6).
 */
@Component({
    selector: 'app-week-strip',
    imports: [DayPanelComponent, HelpLinkComponent, PlansForYouComponent, WeekDaysComponent],
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
                        >Edit plan</a
                    >
                }
            </div>
            @if (planned()) {
                <app-week-days [days]="days()" [picked]="picked()" (pick)="pick($event)" />
                <!-- Made afresh for each day picked, so it slides in from that side -->
                @for (day of shown(); track day.day) {
                    <app-day-panel class="week__panel" [day]="day" [animate.enter]="entering()" />
                }
                <p class="week__so-far">
                    {{ soFar() }}
                    @if (startsNextWeek()) {
                        <app-help-link topic="starts-next-week" />
                    }
                </p>
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
    private readonly thisWeek = injectThisWeek();
    protected readonly weekEditId = WEEK_EDIT_ID;
    private readonly now = Date.now();
    private readonly today = weekdayOf(this.now);

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

    /** Whether everything planned this week is from next week: the plan hasn't started. */
    protected readonly startsNextWeek = computed(() => {
        const all = this.week().flat();
        return all.length > 0 && all.every((item) => item.status === 'next week');
    });

    /**
     * "2 of 5 done this week · Next: Pull on Thursday", or "All 5 done this week". Workouts
     * planned once their day had gone by aren't counted: they start next week; nor is active
     * rest, which is optional.
     */
    protected readonly soFar = computed(() => {
        const counted = this.week()
            .flat()
            .filter((item) => item.status !== 'next week');
        if (counted.length === 0) {
            return 'Your plan starts next week';
        }
        const all = counted.filter((item) => !item.activeRest);
        if (all.length === 0) {
            return 'Only active rest this week';
        }
        const done = all.filter((item) => item.status === 'done').length;
        if (done === all.length) {
            return all.length === 1 ? 'Done for the week' : `All ${all.length} done this week`;
        }
        const tally = `${done} of ${all.length} done this week`;
        const nextDay = nextPlannedDay(this.week(), this.today);
        if (nextDay < 0) {
            return tally;
        }
        const next = this.week()[nextDay].find((item) => !item.activeRest)!;
        return `${tally} · Next: ${this.name(next.workoutId)} on ${WEEKDAYS[nextDay]}`;
    });
}
