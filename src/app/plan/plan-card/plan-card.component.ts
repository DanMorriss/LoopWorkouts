import { Component, computed, input, output } from '@angular/core';
import { BuiltInPlan, builtInPlanEquipment, trainingDays } from '../../models/built-in-plans';
import { BUILT_IN_WORKOUTS } from '../../models/built-in-workouts';
import { capitalise, equipmentPhrases } from '../../models/exercise';
import { WEEKDAYS } from '../../models/plan';

/**
 * A ready-made plan (PLN-6) as a card: its title, what it's for, its training days and what
 * it needs, the week day by day, and Use this plan. On the Ready-made plans page, and Today's
 * Get started (NAV-6).
 */
@Component({
    selector: 'app-plan-card',
    template: `
        <article class="plan-card" [attr.aria-labelledby]="headingId()">
            <!-- Its heading's level fits the page it's on -->
            @if (headingLevel() === 3) {
                <h3 class="plan-card__title" [id]="headingId()">{{ plan().title }}</h3>
            } @else {
                <h4 class="plan-card__title" [id]="headingId()">{{ plan().title }}</h4>
            }
            <p class="plan-card__description">{{ plan().description }}</p>
            <p class="plan-card__meta">{{ meta() }}</p>
            <ul class="plan-card__days" aria-label="The week">
                @for (day of days(); track day.name) {
                    <li class="plan-card__day" [class.plan-card__day--rest]="!day.workouts">
                        <span class="plan-card__day-name">{{ day.short }}</span>
                        {{ ' ' }}
                        <span class="plan-card__day-workouts">{{ day.workouts || 'Rest' }}</span>
                    </li>
                }
            </ul>
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
    readonly used = output<void>();

    protected readonly headingId = computed(() => `plan-card-${this.plan().id.split(':')[1]}`);

    /** "Mon, Wed and Fri · Machine, Dumbbells, Bench". */
    protected readonly meta = computed(() => {
        const needs = equipmentPhrases(builtInPlanEquipment(this.plan())).map(capitalise);
        return `${trainingDays(this.plan())} · ${needs.join(', ')}`;
    });

    /** Each day, Monday first, with its workouts' titles, or none for a rest day. */
    protected readonly days = computed(() =>
        WEEKDAYS.map((name, day) => ({
            name,
            short: name.slice(0, 3),
            workouts: this.plan()
                .days[day].map((id) => BUILT_IN_WORKOUTS.find((w) => w.id === id)!.title)
                .join(', '),
        }))
    );
}
