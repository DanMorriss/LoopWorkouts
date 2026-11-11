import { Component, computed, inject, input, output } from '@angular/core';
import { BuiltInPlan, builtInPlanEquipment, planWorkouts } from '../../models/built-in-plans';
import { capitalise, equipmentPhrases } from '../../models/exercise';
import { WEEKDAYS } from '../../models/plan';
import { PageSlide } from '../../shared/navigation/page-slide';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { readyMadeSlug } from '../../workout-library/ready-made/ready-made-card';
import { ShowcaseCountComponent } from '../../shared/components/showcase/showcase-count.component';
import { ShowcaseKitComponent } from '../../shared/components/showcase/showcase-kit.component';

/**
 * Where a plan's card was when one of its workouts was opened: Today, the Ready-made plans
 * page, or that page opened from the Plan page.
 */
export type PlanWorkoutFrom = 'today' | 'plans' | 'plan';

/**
 * A ready-made plan (PLN-6) as a card: its title and what it's for, how many days a week, the
 * week as a strip of days with each workout numbered and coloured, those workouts with their
 * days, what it needs, and Use this plan. On the Ready-made plans page, and Today's This week
 * and Get started (NAV-6). Each of its workouts slides in its own page, to see what's in it,
 * and back to where the card is.
 *
 * The strip is for the eye; the list of workouts under it says the same, so the strip is
 * hidden from screen readers.
 */
@Component({
    selector: 'app-plan-card',
    imports: [IconComponent, ShowcaseCountComponent, ShowcaseKitComponent],
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
                <app-showcase-count
                    class="plan-card__count"
                    [number]="trainingDayCount()"
                    label="days a week"
                />
            </div>

            <ol class="plan-card__week" aria-hidden="true">
                @for (day of days(); track day.name) {
                    <li
                        [class]="
                            day.workouts.length
                                ? 'plan-card__day plan-card--c' + day.workouts[0].colour
                                : 'plan-card__day plan-card__day--rest'
                        "
                    >
                        <span class="plan-card__day-letter">{{ day.letter }}</span>
                        <span class="plan-card__day-marks">
                            @for (workout of day.workouts; track $index) {
                                <span [class]="'plan-card__mark plan-card--c' + workout.colour">
                                    {{ workout.number }}
                                </span>
                            } @empty {
                                <span class="plan-card__rest"></span>
                            }
                        </span>
                    </li>
                }
            </ol>

            <ul class="plan-card__workouts" aria-label="Its workouts">
                @for (workout of workouts(); track workout.number) {
                    <li>
                        <a
                            class="plan-card__workout"
                            [href]="workout.url"
                            (click)="slide.follow($event, workout.url, 'in')"
                        >
                            <span
                                [class]="'plan-card__mark plan-card--c' + workout.colour"
                                aria-hidden="true"
                                >{{ workout.number }}</span
                            >
                            <span class="plan-card__workout-name">{{ workout.title }}</span>
                            <span class="sr-only">: </span>
                            <span class="plan-card__workout-days">{{ workout.days }}</span>
                            <app-icon class="plan-card__workout-open">chevron_right</app-icon>
                        </a>
                    </li>
                }
            </ul>

            <app-showcase-kit [needs]="needs()" />

            <button
                type="button"
                [class]="main() ? 'btn-main plan-card__use' : 'btn-pill plan-card__use'"
                [attr.aria-label]="'Use ' + plan().title"
                (click)="used.emit()"
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
    readonly used = output<void>();

    protected readonly slide = inject(PageSlide);

    protected readonly headingId = computed(() => `plan-card-${this.plan().id.split(':')[1]}`);

    /** What it needs: "Machine", "Dumbbells", "Bench", or "No equipment". */
    protected readonly needs = computed(() => {
        const needs = equipmentPhrases(builtInPlanEquipment(this.plan()))
            .map(capitalise)
            .filter((need) => need !== 'No equipment');
        return needs.length ? needs : ['No equipment'];
    });

    protected readonly trainingDayCount = computed(
        () => this.plan().days.filter((day) => day.length > 0).length
    );

    /**
     * Its workouts, each once in the order they first come up, numbered from 1 and coloured to
     * match (the colours go round again past four), with the days they're on: "Mon, Wed, Fri".
     */
    protected readonly workouts = computed(() =>
        planWorkouts(this.plan()).map((workout, i) => ({
            id: workout.id,
            title: workout.title,
            url: `/ready-made-plans/${readyMadeSlug(workout)}?from=${this.workoutsFrom()}`,
            number: i + 1,
            colour: (i % 4) + 1,
            days: WEEKDAYS.filter((_, day) => this.plan().days[day].includes(workout.id))
                .map((name) => name.slice(0, 3))
                .join(', '),
        }))
    );

    /** Each day, Monday first: its letter, and its workouts' numbers and colours. */
    protected readonly days = computed(() => {
        const byId = new Map(this.workouts().map((workout) => [workout.id, workout]));
        return WEEKDAYS.map((name, day) => ({
            name,
            letter: name[0],
            workouts: this.plan().days[day].map((id) => byId.get(id)!),
        }));
    });
}
