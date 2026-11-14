import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
    BuiltInPlan,
    builtInPlanEquipment,
    planWorkouts,
    withoutActiveRest,
} from '../../models/built-in-plans';
import { isActiveRest } from '../../models/active-rest';
import { capitalise, equipmentPhrases } from '../../models/exercise';
import { WEEKDAYS } from '../../models/plan';
import { PageSlide } from '../../shared/navigation/page-slide';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch/toggle-switch.component';
import { readyMadeSlug } from '../../workout-library/ready-made/ready-made-card';
import { ShowcaseCountComponent } from '../../shared/components/showcase/showcase-count.component';
import { ShowcaseKitComponent } from '../../shared/components/showcase/showcase-kit.component';

/**
 * Where a plan's card was when one of its workouts was opened: Today, the Ready-made plans
 * page, or that page opened from the Plan page.
 */
export type PlanWorkoutFrom = 'today' | 'plans' | 'plan';

/**
 * A ready-made plan (PLN-6) as a card: its title and what it's for, how many days a week it
 * trains (and, under that, how many are active rest), the week as a strip of days with each
 * training workout numbered and coloured and active rest a quiet ring, those workouts with
 * their days (active rest under "On rest days"), what it needs, a switch to leave its active
 * rest out (the card then shows the plan without it), and Use this plan, which gives the plan
 * as the card shows it. On the
 * Ready-made plans page, and Today's This week and Get started (NAV-6). Each of its workouts
 * slides in its own page, to see what's in it, and back to where the card is.
 *
 * The strip is for the eye; the list of workouts under it says the same, so the strip is
 * hidden from screen readers.
 */
@Component({
    selector: 'app-plan-card',
    imports: [
        IconComponent,
        NgTemplateOutlet,
        ShowcaseCountComponent,
        ShowcaseKitComponent,
        ToggleSwitchComponent,
    ],
    template: `
        <article class="plan-card" [attr.aria-labelledby]="headingId()">
            <div class="plan-card__head">
                <div class="plan-card__intro">
                    <!-- Its heading's level fits the page it's on -->
                    @if (headingLevel() === 3) {
                        <h3 class="plan-card__title" [id]="headingId()">{{ plan().title }}</h3>
                    } @else {
                        <h4 class="plan-card__title" [id]="headingId()">{{ plan().title }}</h4>
                    }
                    <p class="plan-card__description">{{ plan().description }}</p>
                </div>
                <div class="plan-card__counts">
                    <app-showcase-count
                        class="plan-card__count"
                        [number]="trainingDayCount()"
                        label="days a week"
                    />
                    @if (restDayCount()) {
                        <span class="plan-card__rest-count"
                            >+ {{ restDayCount() }} active rest</span
                        >
                    }
                </div>
            </div>

            <ol class="plan-card__week" aria-hidden="true">
                @for (day of days(); track day.name) {
                    <li [class]="day.classes">
                        <span class="plan-card__day-letter">{{ day.letter }}</span>
                        <span class="plan-card__day-marks">
                            @for (workout of day.workouts; track $index) {
                                <span [class]="workout.mark">{{ workout.number }}</span>
                            } @empty {
                                <span class="plan-card__rest"></span>
                            }
                        </span>
                    </li>
                }
            </ol>

            <ul class="plan-card__workouts" aria-label="Its workouts">
                @for (workout of training(); track workout.id) {
                    <li>
                        <ng-container *ngTemplateOutlet="row; context: { $implicit: workout }" />
                    </li>
                }
            </ul>
            @if (activeRest().length) {
                <p class="plan-card__rest-label" [id]="headingId() + '-rest'">On rest days</p>
                <ul class="plan-card__workouts" [attr.aria-labelledby]="headingId() + '-rest'">
                    @for (workout of activeRest(); track workout.id) {
                        <li>
                            <ng-container
                                *ngTemplateOutlet="row; context: { $implicit: workout }"
                            />
                        </li>
                    }
                </ul>
            }

            <ng-template #row let-workout>
                <a
                    class="plan-card__workout"
                    [href]="workout.url"
                    (click)="slide.follow($event, workout.url, 'in')"
                >
                    <span [class]="workout.mark" aria-hidden="true">{{ workout.number }}</span>
                    <span class="plan-card__workout-name">{{ workout.title }}</span>
                    <span class="sr-only">: </span>
                    <span class="plan-card__workout-days">{{ workout.days }}</span>
                    <app-icon class="plan-card__workout-open">chevron_right</app-icon>
                </a>
            </ng-template>

            <app-showcase-kit [needs]="needs()" />

            @if (restOffered()) {
                <div class="plan-card__rest-choice">
                    <div class="plan-card__rest-text">
                        <span [id]="headingId() + '-rest-switch'">Include active rest days</span>
                        <span class="plan-card__rest-hint" [id]="headingId() + '-rest-hint'"
                            >Optional stretching on {{ restOffered() }} rest days.</span
                        >
                    </div>
                    <app-toggle-switch
                        [labelledBy]="headingId() + '-rest-switch'"
                        [describedBy]="headingId() + '-rest-hint'"
                        [(checked)]="includeRest"
                    />
                </div>
            }

            <button
                type="button"
                [class]="main() ? 'btn-main plan-card__use' : 'btn-pill plan-card__use'"
                [attr.aria-label]="'Use ' + plan().title"
                (click)="used.emit(shown())"
            >
                Use this plan
            </button>
        </article>
    `,
    styleUrl: './plan-card.component.scss',
})
export class PlanCardComponent {
    readonly plan = input.required<BuiltInPlan>();
    /** Whether its button is the page's main one, as on Today. */
    readonly main = input(false);
    /** Its title's heading level: 3 on its own page, 4 inside a card (Today's Get started). */
    readonly headingLevel = input<3 | 4>(4);
    /** Where its workouts' pages go back to: Today, or the Ready-made plans page. */
    readonly workoutsFrom = input<PlanWorkoutFrom>('today');
    /** The plan as the card shows it: without its active rest, if that's switched off. */
    readonly used = output<BuiltInPlan>();

    protected readonly slide = inject(PageSlide);

    /** Whether its active rest is kept, as it comes; switched off, its card shows it without. */
    protected readonly includeRest = signal(true);
    /** The plan as it'll be used: as it comes, or without its active rest. */
    protected readonly shown = computed(() =>
        this.includeRest() ? this.plan() : withoutActiveRest(this.plan())
    );

    protected readonly headingId = computed(() => `plan-card-${this.plan().id.split(':')[1]}`);

    /** What it needs: "Machine", "Dumbbells", "Bench", or "No equipment". */
    protected readonly needs = computed(() => {
        const needs = equipmentPhrases(builtInPlanEquipment(this.shown()))
            .map(capitalise)
            .filter((need) => need !== 'No equipment');
        return needs.length ? needs : ['No equipment'];
    });

    /**
     * Its workouts, each once in the order they first come up, with the days they're on: "Mon,
     * Wed, Fri". Training is numbered from 1 and coloured to match (the colours go round again
     * past four); active rest has neither, as it's optional.
     */
    private readonly workouts = computed(() => {
        let number = 0;
        return planWorkouts(this.shown()).map((workout) => {
            const activeRest = isActiveRest(workout);
            if (!activeRest) {
                number++;
            }
            const colour = ((number - 1) % 4) + 1;
            return {
                id: workout.id,
                title: workout.title,
                url: `/ready-made-plans/${readyMadeSlug(workout)}?from=${this.workoutsFrom()}`,
                activeRest,
                number: activeRest ? '' : `${number}`,
                colour,
                mark: activeRest
                    ? 'plan-card__mark plan-card__mark--rest'
                    : `plan-card__mark plan-card--c${colour}`,
                days: WEEKDAYS.filter((_, day) => this.shown().days[day].includes(workout.id))
                    .map((name) => name.slice(0, 3))
                    .join(', '),
            };
        });
    });

    protected readonly training = computed(() => this.workouts().filter((w) => !w.activeRest));
    protected readonly activeRest = computed(() => this.workouts().filter((w) => w.activeRest));

    /**
     * Each day, Monday first: its letter, its workouts' marks, and how it looks: a training day
     * in its first training workout's colour, a day of active rest quieter, a rest day dashed.
     */
    protected readonly days = computed(() => {
        const byId = new Map(this.workouts().map((workout) => [workout.id, workout]));
        return WEEKDAYS.map((name, day) => {
            const workouts = this.shown().days[day].map((id) => byId.get(id)!);
            const lead = workouts.find((workout) => !workout.activeRest);
            return {
                name,
                letter: name[0],
                workouts,
                classes: lead
                    ? `plan-card__day plan-card--c${lead.colour}`
                    : workouts.length
                      ? 'plan-card__day plan-card__day--active-rest'
                      : 'plan-card__day plan-card__day--rest',
            };
        });
    });

    /** The days with training on them: not rest days, nor those of only active rest. */
    protected readonly trainingDayCount = computed(
        () => this.days().filter((day) => day.workouts.some((w) => !w.activeRest)).length
    );

    /** How many days of active rest the plan comes with, to offer leaving them out; 0 if none. */
    protected readonly restOffered = computed(() => {
        const without = withoutActiveRest(this.plan()).days;
        return this.plan().days.filter((day, i) => day.length > 0 && !without[i].length).length;
    });

    /** The days of only active rest. */
    protected readonly restDayCount = computed(
        () =>
            this.days().filter(
                (day) => day.workouts.length > 0 && day.workouts.every((w) => w.activeRest)
            ).length
    );
}
