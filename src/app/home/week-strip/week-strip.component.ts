import { afterNextRender, Component, computed, EnvironmentInjector, inject } from '@angular/core';
import { firstPlan } from '../../models/built-in-plans';
import { PageSlide } from '../../nav/page-slide';
import { PlanCardComponent } from '../../plan/plan-card/plan-card.component';
import { HelpLinkComponent } from '../../shared/components/help-link/help-link.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PlannedStatus, thisWeek, weekdayOf, WEEKDAYS } from '../../models/plan';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { ReadyMadePlans } from '../../shared/state/ready-made-plans.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { UndoService } from '../../shared/undo/undo.service';
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
    'next week': 'from next week',
    'to come': 'to come',
};

/**
 * The week on Today (PLN-4): Monday to Sunday, each day marked done, missed, planned or free,
 * today picked out, how many of the week's planned workouts are done and the next one to come,
 * and **Edit plan**, which slides the weekly plan in. With nothing planned, a ready-made week
 * for your goal and equipment, used in one tap (PLN-6) as on Get started; or More plans, or
 * Plan your week (NAV-6).
 */
@Component({
    selector: 'app-week-strip',
    imports: [HelpLinkComponent, IconComponent, PlanCardComponent],
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
                <p class="week__so-far">
                    {{ soFar() }}
                    @if (startsNextWeek()) {
                        <app-help-link topic="starts-next-week" />
                    }
                </p>
            } @else {
                <!-- A week ready-made for your goal and equipment (PLN-6), used in one tap,
                     as the main way; or the other plans, or planning your own workouts -->
                <p class="week__empty">
                    Nothing planned yet. Here's a week for your goal and equipment, which adds its
                    workouts to yours, or plan your own and Today shows what's due each day.
                </p>
                <app-plan-card [plan]="suggestedPlan()" [main]="true" (used)="use()" />
                <div class="week__actions">
                    <a
                        href="/ready-made-plans"
                        class="btn-pill week__ready-made"
                        (click)="slide.follow($event, '/ready-made-plans', 'in')"
                        >More plans</a
                    >
                    <a
                        href="/plan"
                        class="btn-pill week__plan"
                        (click)="slide.follow($event, '/plan', 'in')"
                        >Plan your week</a
                    >
                </div>
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
    private readonly settings = inject(SettingsStore);
    private readonly readyMade = inject(ReadyMadePlans);
    private readonly undo = inject(UndoService);
    /** The app's, not this card's part, which is gone by the time focus moves on. */
    private readonly injector = inject(EnvironmentInjector);
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

    /** With nothing planned, the ready-made plan to suggest, for your goal and equipment. */
    protected readonly suggestedPlan = computed(() =>
        firstPlan(this.settings.trainingGoal(), this.settings.myEquipment())
    );

    /**
     * Uses it, with Undo: its workouts added (or yours of the same name), and the week planned.
     * The week then shows in its place, so focus moves to Edit plan.
     */
    protected use() {
        const plan = this.suggestedPlan();
        const undo = this.readyMade.use(plan);
        this.undo.offerUndo({ message: `Your week is planned: ${plan.title}`, undo });
        afterNextRender(() => document.querySelector<HTMLElement>('.week__edit')?.focus(), {
            injector: this.injector,
        });
    }

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

    /** Whether everything planned this week is from next week: the plan hasn't started. */
    protected readonly startsNextWeek = computed(() => {
        const all = this.week().flat();
        return all.length > 0 && all.every((item) => item.status === 'next week');
    });

    /**
     * "2 of 5 done this week · Next: Pull on Thursday", or "All 5 done this week". Workouts
     * planned once their day had gone by aren't counted: they start next week.
     */
    protected readonly soFar = computed(() => {
        const all = this.week()
            .flat()
            .filter((item) => item.status !== 'next week');
        if (all.length === 0) {
            return 'Your plan starts next week';
        }
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

/**
 * A day's mark from its workouts: done once they all are, missed if any were, free if none.
 * Those from next week (planned once the day had gone by) don't count for this week.
 */
export function markFor(all: readonly PlannedStatus[]): DayMark {
    const statuses = all.filter((status) => status !== 'next week');
    if (statuses.length === 0) {
        return 'free';
    }
    if (statuses.every((status) => status === 'done')) {
        return 'done';
    }
    return statuses.includes('missed') ? 'missed' : 'planned';
}
