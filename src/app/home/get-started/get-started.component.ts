import { Component, computed, inject } from '@angular/core';
import { PageSlide } from '../../shared/navigation/page-slide';
import { firstPlan } from '../../models/built-in-plans';
import { PlanCardComponent } from '../../plan/plan-card/plan-card.component';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { injectUsePlanOnToday } from '../use-plan-on-today';

/**
 * Today with no workouts yet (NAV-6): a week to start with, planned for you (PLN-7). A
 * ready-made plan for your goal and equipment, used in one tap (your week planned with its
 * ready-made workouts), the rest of the ready-made plans, or making your own on the Plan page,
 * whose Add offers the ready-made workouts as well as your own.
 */
@Component({
    selector: 'app-get-started',
    imports: [PlanCardComponent],
    template: `
        <section class="start" aria-labelledby="get-started-title">
            <h3 class="start__label" id="get-started-title">Get started</h3>
            <p class="start__lead">
                Start with a week of workouts, planned for you. Here's one for your goal and
                equipment:
            </p>
            <app-plan-card [plan]="plan()" [main]="true" (used)="use()" />
            <!-- The other ways, as on This week once there are workouts: side by side -->
            <div class="start__actions">
                <a
                    href="/ready-made-plans"
                    class="btn-pill"
                    (click)="slide.follow($event, '/ready-made-plans', 'in')"
                    >More plans</a
                >
                <a href="/plan" class="btn-pill" (click)="slide.follow($event, '/plan', 'in')"
                    >Make your own plan</a
                >
            </div>
        </section>
    `,
    styleUrl: './get-started.component.scss',
})
export class GetStartedComponent {
    protected readonly slide = inject(PageSlide);
    private readonly settings = inject(SettingsStore);
    private readonly usePlan = injectUsePlanOnToday();

    /** The ready-made plan to start with, for your goal and equipment. */
    protected readonly plan = computed(() =>
        firstPlan(this.settings.trainingGoal(), this.settings.myEquipment())
    );

    /**
     * Uses it, with Undo. This card then goes, and the week takes its place, so focus moves
     * there, to Edit plan.
     */
    protected use() {
        this.usePlan(this.plan());
    }
}
