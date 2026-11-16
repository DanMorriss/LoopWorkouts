import { NgTemplateOutlet } from '@angular/common';
import {
    Component,
    ComponentRef,
    computed,
    inject,
    input,
    linkedSignal,
    output,
    viewChild,
    ViewContainerRef,
} from '@angular/core';
import { BuiltInPlan, builtInPlanEquipment, withoutActiveRest } from '../../models/built-in-plans';
import { capitalise, equipmentPhrases } from '../../models/exercise';
import { fitToDays, inDayOrder, inOrder, trainingDays } from '../../models/fit-plan';
import { WEEKDAYS } from '../../models/plan';
import { joinAnd } from '../../models/text';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { activeRestDays, cardDays, cardWorkouts } from './plan-card-view';
import { PageSlide } from '../../shared/navigation/page-slide';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch/toggle-switch.component';
import { ShowcaseCountComponent } from '../../shared/components/showcase/showcase-count.component';
import { ShowcaseKitComponent } from '../../shared/components/showcase/showcase-kit.component';
import { PlanMarkComponent } from './plan-mark.component';
import type { PlanWeekComponent } from './plan-week.component';
import { lazyComponent } from '../../shared/lazy-component';
import { DayMove } from './plan-week-day';

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
 * rest out (the card then shows the plan without it; remembered, for every card), and Use this
 * plan, which gives the plan as the card shows it. With the days you can train picked (on the
 * Ready-made plans page), it's fitted to them, if it can be (`fitToDays`). On the
 * Ready-made plans page, and Today's This week and Get started (NAV-6). Each of its workouts
 * slides in its own page, to see what's in it, and back to where the card is. Its days can be
 * moved about the week, dragged or pressed (`PlanWeekComponent`), and the card, its list and
 * Use this plan then go by its days as moved.
 */
@Component({
    selector: 'app-plan-card',
    imports: [
        IconComponent,
        NgTemplateOutlet,
        PlanMarkComponent,
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

            @if (fitNote()) {
                <p class="plan-card__fit">{{ fitNote() }}</p>
            }

            <!-- The week, its days moved about by drag and drop, in its own chunk so Today's
                 first load is no bigger; its space is kept till it comes -->
            <div class="plan-card__week">
                <ng-container #week />
            </div>

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
                    <app-plan-mark
                        aria-hidden="true"
                        [number]="workout.number"
                        [colour]="workout.colour"
                    />
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
                        [checked]="includeRest()"
                        (checkedChange)="settings.update({ includeActiveRest: $event })"
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
    /** The plan as the card shows it: its days as moved, and without its active rest if that's off. */
    readonly used = output<BuiltInPlan>();

    protected readonly slide = inject(PageSlide);
    protected readonly settings = inject(SettingsStore);
    /** The week, made in `#week` once its code's loaded. */
    private readonly weekSlot = viewChild('week', { read: ViewContainerRef });

    constructor() {
        lazyComponent({
            load: () => import('./plan-week.component').then((loaded) => loaded.PlanWeekComponent),
            slot: this.weekSlot,
            inputs: () => ({
                days: this.days(),
                title: this.plan().title,
                id: this.headingId(),
                changed: this.moved(),
            }),
            made: (week: ComponentRef<PlanWeekComponent>) => {
                week.instance.moved.subscribe((move) => this.moveDay(move));
                week.instance.reset.subscribe(() => this.order.set(this.fitted()));
            },
        });
    }

    /** Whether its active rest is kept: as it comes, unless it was last switched off. */
    protected readonly includeRest = this.settings.includeActiveRest;

    /** Its days fitted to the days you can train, if any are picked and it fits; else as it comes. */
    private readonly fitted = computed(() => {
        const days = this.settings.canTrainOn();
        return (days.length && fitToDays(this.plan(), days)) || inOrder();
    });

    /** Said over the week when the days you can train are picked: fitted, or why not. */
    protected readonly fitNote = computed(() => {
        const days = this.settings.canTrainOn();
        if (!days.length) {
            return '';
        }
        const needs = trainingDays(this.plan()).length;
        return days.length >= needs
            ? `Fitted to your days: ${joinAnd(days.map((day) => WEEKDAYS[day].slice(0, 3)))}.`
            : `Trains ${needs} days a week: pick ${needs - days.length} more of your days to fit it.`;
    });

    /**
     * Which of the plan's days is on each day of the week, Monday first: fitted to your days,
     * or as it comes, until its days are moved about.
     */
    protected readonly order = linkedSignal<readonly number[]>(() => this.fitted());
    protected readonly moved = computed(() =>
        this.order().some((day, i) => day !== this.fitted()[i])
    );

    /** A day dragged, or picked and put, to another place in the week; the others shift along. */
    private moveDay({ from, to }: DayMove) {
        // Not the CDK's moveItemInArray, which would bring the drag and drop into Today
        const order = [...this.order()];
        order.splice(to, 0, ...order.splice(from, 1));
        this.order.set(order);
    }

    /** The plan as it'll be used: its days as moved, and as it comes or without its active rest. */
    protected readonly shown = computed(() => {
        const plan = this.includeRest() ? this.plan() : withoutActiveRest(this.plan());
        return { ...plan, days: inDayOrder(plan.days, this.order()) };
    });

    protected readonly headingId = computed(() => `plan-card-${this.plan().id.split(':')[1]}`);

    /** What it needs: "Machine", "Dumbbells", "Bench", or "No equipment". */
    protected readonly needs = computed(() => {
        const needs = equipmentPhrases(builtInPlanEquipment(this.shown()))
            .map(capitalise)
            .filter((need) => need !== 'No equipment');
        return needs.length ? needs : ['No equipment'];
    });

    private readonly workouts = computed(() => cardWorkouts(this.shown(), this.workoutsFrom()));
    protected readonly training = computed(() => this.workouts().filter((w) => !w.activeRest));
    protected readonly activeRest = computed(() => this.workouts().filter((w) => w.activeRest));
    protected readonly days = computed(() => cardDays(this.shown(), this.workouts()));

    /** The days with training on them: not rest days, nor those of only active rest. */
    protected readonly trainingDayCount = computed(
        () => this.days().filter((day) => day.kind === 'training').length
    );
    /** How many days of active rest the plan comes with, to offer leaving them out; 0 if none. */
    protected readonly restOffered = computed(() => activeRestDays(this.plan()));
    /** The days of only active rest. */
    protected readonly restDayCount = computed(
        () => this.days().filter((day) => day.kind === 'active-rest').length
    );
}
