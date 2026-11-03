import { Component, computed, inject } from '@angular/core';
import { PageSlide } from '../../nav/page-slide';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PlannedStatus, thisWeek, weekdayOf, WEEKDAYS } from '../../models/plan';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';

/** How a day of the strip looks: everything on it done, some missed, still to do, or free. */
export type DayMark = 'done' | 'missed' | 'planned' | 'free';

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
    today: 'due today',
    'to come': 'to come',
};

/**
 * The week on Today (PLN-4): Monday to Sunday, each day marked done, missed, planned or free,
 * today picked out, how many of the week's planned workouts are done and the next one to come,
 * and **Edit plan**, which slides the weekly plan in. With nothing planned, a way to plan the
 * week instead.
 */
@Component({
    selector: 'app-week-strip',
    imports: [IconComponent],
    template: `
        <section class="week" aria-labelledby="week-title">
            <div class="week__head">
                <h3 class="week__label" id="week-title">This week</h3>
                @if (planned()) {
                    <a href="/plan" class="week__edit" (click)="slide.follow($event, '/plan', 'in')"
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
                <p class="week__so-far">{{ soFar() }}</p>
            } @else {
                <p class="week__empty">
                    Nothing planned yet. Choose which workouts you do on which days.
                </p>
                <a
                    href="/plan"
                    class="btn-pill week__plan"
                    (click)="slide.follow($event, '/plan', 'in')"
                    >Plan your week</a
                >
            }
        </section>
    `,
    styleUrl: './week-strip.component.scss',
})
export class WeekStripComponent {
    private readonly plan = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    protected readonly slide = inject(PageSlide);
    private readonly now = Date.now();
    private readonly today = weekdayOf(this.now);

    private name(id: string): string {
        return this.workouts.findWorkoutById(id)?.title.trim() || 'Untitled workout';
    }

    private readonly week = computed(() =>
        thisWeek(
            this.plan.plan(),
            this.history.entries(),
            this.now,
            (id) => this.workouts.findWorkoutById(id) !== null
        )
    );

    /** Whether anything's planned this week, of the workouts still in the library. */
    protected readonly planned = computed(() => this.week().some((day) => day.length > 0));

    protected readonly days = computed((): StripDay[] =>
        this.week().map((planned, day) => {
            const name = WEEKDAYS[day];
            return {
                day,
                letter: name[0],
                mark: markFor(planned.map((item) => item.status)),
                today: day === this.today,
                spoken: planned.length
                    ? `${name}${day === this.today ? ', today' : ''}: ${planned
                          .map(
                              (item) =>
                                  `${this.name(item.workoutId)}, ${SPOKEN_STATUS[item.status]}`
                          )
                          .join('; ')}`
                    : `${name}${day === this.today ? ', today' : ''}: nothing planned`,
            };
        })
    );

    /** "2 of 5 done this week · Next: Pull on Thursday", or "All 5 done this week". */
    protected readonly soFar = computed(() => {
        const all = this.week().flat();
        const done = all.filter((item) => item.status === 'done').length;
        if (done === all.length) {
            return all.length === 1 ? 'Done for the week' : `All ${all.length} done this week`;
        }
        const tally = `${done} of ${all.length} done this week`;
        const nextDay = this.week().findIndex(
            (planned, day) => day > this.today && planned.length > 0
        );
        if (nextDay < 0) {
            return tally;
        }
        return `${tally} · Next: ${this.name(this.week()[nextDay][0].workoutId)} on ${WEEKDAYS[nextDay]}`;
    });
}

/** A day's mark from its workouts: done once they all are, missed if any were, free if none. */
export function markFor(statuses: readonly PlannedStatus[]): DayMark {
    if (statuses.length === 0) {
        return 'free';
    }
    if (statuses.every((status) => status === 'done')) {
        return 'done';
    }
    return statuses.includes('missed') ? 'missed' : 'planned';
}
