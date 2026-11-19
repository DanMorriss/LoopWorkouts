import { Component, computed, inject } from '@angular/core';
import { PageSlide } from '../../shared/navigation/page-slide';
import { BUILT_IN_PLANS, BuiltInPlan, plansFor } from '../../models/built-in-plans';
import {
    CarouselComponent,
    SlideDirective,
} from '../../shared/components/carousel/carousel.component';
import { PlanCardComponent } from '../../plan/plan-card/plan-card.component';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { injectUsePlanOnToday } from '../use-plan-on-today';

/**
 * Today with no workouts yet (NAV-6): a week to start with, planned for you (PLN-7). The
 * ready-made plans your equipment allows, swiped between, the best for your goal first, each
 * used in one tap (your week planned with its ready-made workouts); All plans, on their page;
 * or making your own on the Plan page, whose Add offers the ready-made workouts as well as
 * your own.
 */
@Component({
    selector: 'app-get-started',
    imports: [CarouselComponent, PlanCardComponent, SlideDirective],
    template: `
        <section class="start" aria-labelledby="get-started-title">
            <h3 class="start__label" id="get-started-title">Get started</h3>
            <p class="start__lead">Start with a week of workouts, planned for you. {{ lead() }}</p>
            <app-carousel label="Plans for you" itemName="Plan">
                @for (plan of plans(); track plan.id) {
                    <ng-template appSlide>
                        <app-plan-card [plan]="plan" [main]="true" (used)="use($event)" />
                    </ng-template>
                }
            </app-carousel>
            <!-- The other ways, as on This week once there are workouts: side by side -->
            <div class="start__actions">
                <a
                    href="/ready-made-plans"
                    class="btn-pill"
                    (click)="slide.follow($event, '/ready-made-plans', 'in')"
                    >All plans</a
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

    /**
     * The ready-made plans your equipment allows, those for your goal first. No-equipment
     * plans need nothing, so there's always one; the first of all, as `firstPlan()` has, else.
     */
    protected readonly plans = computed(() => {
        const mine = plansFor(this.settings.trainingGoal(), this.settings.myEquipment(), true);
        return mine.length ? mine : BUILT_IN_PLANS.slice(0, 1);
    });

    protected readonly lead = computed(() =>
        this.plans().length > 1
            ? 'Here are some for your goal and equipment, best first:'
            : "Here's one for your goal and equipment:"
    );

    /**
     * Uses it as its card shows it, with or without its active rest, with Undo. This card then
     * goes, and the week takes its place, so focus moves there, to Edit plan.
     */
    protected use(plan: BuiltInPlan) {
        this.usePlan(plan);
    }
}
