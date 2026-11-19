import { Component, computed, inject } from '@angular/core';
import { injectThisWeek } from '../../shared/state/this-week';
import { plansForYou } from '../../models/built-in-plans';
import { PageSlide } from '../../shared/navigation/page-slide';
import { HelpLinkComponent } from '../../shared/components/help-link/help-link.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
    nextPlannedDay,
    PlannedStatus,
    PlannedWorkout,
    weekdayOf,
    WEEKDAYS,
} from '../../models/plan';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { WEEK_EDIT_ID } from '../use-plan-on-today';
import { PlansForYouComponent } from '../plans-for-you/plans-for-you.component';

/**
 * How a day of the strip looks: everything on it done, some missed, still to do, only active
 * rest (not done), or free.
 */
export type DayMark = 'done' | 'missed' | 'planned' | 'rest' | 'free';

export interface StripDay {
    day: number;
    /** "M", "T", … */
    letter: string;
    mark: DayMark;
    today: boolean;
    /** What a screen reader hears for it, e.g. "Monday: Legs day, done". */
    spoken: string;
}

const SPOKEN_STATUS: Record<PlannedStatus, string> = {
    done: 'done',
    missed: 'missed',
    rested: 'rested',
    today: 'due today',
    'next week': 'from next week',
    'to come': 'to come',
};

/**
 * The week on Today (PLN-4): Monday to Sunday, each day marked done, missed, planned or free,
 * today picked out, how many of the week's planned workouts are done and the next one to come,
 * and **Edit plan**, which slides the weekly plan in. With nothing planned, the ready-made
 * weeks for your goal and equipment, swiped between and used in one tap (PLN-6) as on Get
 * started; or All plans, or Make your own plan (NAV-6).
 */
@Component({
    selector: 'app-week-strip',
    imports: [HelpLinkComponent, IconComponent, PlansForYouComponent],
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
                <ol class="week__days">
                    @for (day of days(); track day.day) {
                        <li
                            class="week__day"
                            [class]="'week__day--' + day.mark"
                            [class.week__day--today]="day.today"
                            [attr.aria-current]="day.today ? 'date' : null"
                        >
                            <span class="week__letter" aria-hidden="true">{{ day.letter }}</span>
                            <span class="week__mark" aria-hidden="true">
                                @if (day.mark === 'done') {
                                    <app-icon>check</app-icon>
                                }
                            </span>
                            <span class="sr-only">{{ day.spoken }}</span>
                        </li>
                    }
                </ol>
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

    protected readonly days = computed((): StripDay[] =>
        this.week().map((planned, day) => {
            const name = WEEKDAYS[day];
            return {
                day,
                letter: name[0],
                mark: markFor(planned),
                today: day === this.today,
                spoken: planned.length
                    ? `${name}${day === this.today ? ', today' : ''}: ${planned
                          .map(
                              (item) =>
                                  `${this.name(item.workoutId)}, ${item.activeRest ? 'active rest, ' : ''}${SPOKEN_STATUS[item.status]}`
                          )
                          .join('; ')}`
                    : `${name}${day === this.today ? ', today' : ''}: nothing planned`,
            };
        })
    );

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

/**
 * A day's mark from its workouts: done once they all are, missed if any were, free if none.
 * Those from next week (planned once the day had gone by) don't count for this week. Active
 * rest is optional: a day of it still to come is marked as active rest, once gone by without it
 * it's free, and beside training it's left out.
 */
export function markFor(all: readonly Pick<PlannedWorkout, 'status' | 'activeRest'>[]): DayMark {
    const counted = all.filter((item) => item.status !== 'next week');
    if (counted.length === 0) {
        return 'free';
    }
    if (counted.every((item) => item.status === 'done')) {
        return 'done';
    }
    const training = counted.filter((item) => !item.activeRest).map((item) => item.status);
    if (training.length === 0) {
        // Once its day's gone by without it, it was a rest day like any other
        return counted.every((item) => item.status === 'rested') ? 'free' : 'rest';
    }
    if (training.includes('missed')) {
        return 'missed';
    }
    return training.every((status) => status === 'done') ? 'done' : 'planned';
}
