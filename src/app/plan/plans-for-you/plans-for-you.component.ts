import { Component, computed, inject, input, output } from '@angular/core';
import { BuiltInPlan } from '../../models/built-in-plans';
import {
    CarouselComponent,
    SlideDirective,
} from '../../shared/components/carousel/carousel.component';
import { PageSlide } from '../../shared/navigation/page-slide';
import { PlanCardComponent } from '../plan-card/plan-card.component';

/**
 * The ready-made weeks offered with nothing planned (NAV-6, PLN-6, PLN-7), on Today's Get started
 * and This week, and the Plan page: the plans for your goal and equipment (`plansForYou()`),
 * swiped between with their dots above them, so they're seen before the long cards; each used in
 * one tap (`used`, which the page does, with Undo), as it comes: changing its days, or leaving
 * out its active rest, is on All plans, so the card asks only the one thing. Then All plans,
 * and on Today, Make your own plan, on the Plan page (`onPlanPage` leaves that out, being there).
 */
@Component({
    selector: 'app-plans-for-you',
    imports: [CarouselComponent, PlanCardComponent, SlideDirective],
    template: `
        <app-carousel label="Plans for you" itemName="Plan" [dotsFirst]="true">
            @for (plan of plans(); track plan.id) {
                <ng-template appSlide>
                    <app-plan-card
                        [plan]="plan"
                        [main]="true"
                        [flat]="true"
                        [editable]="false"
                        (used)="used.emit($event)"
                    />
                </ng-template>
            }
        </app-carousel>
        <div class="plans__actions">
            <a [href]="allPlans()" class="btn-pill" (click)="slide.follow($event, allPlans(), 'in')"
                >All plans</a
            >
            @if (!onPlanPage()) {
                <a href="/plan" class="btn-pill" (click)="slide.follow($event, '/plan', 'in')"
                    >Make your own plan</a
                >
            }
        </div>
    `,
    styleUrl: './plans-for-you.component.scss',
})
export class PlansForYouComponent {
    readonly plans = input.required<readonly BuiltInPlan[]>();
    /** On the Plan page: All plans comes back there, and there's no Make your own plan. */
    readonly onPlanPage = input(false);
    /** One used, as its card shows it, with or without its active rest. */
    readonly used = output<BuiltInPlan>();

    protected readonly slide = inject(PageSlide);
    protected readonly allPlans = computed(() =>
        this.onPlanPage() ? '/ready-made-plans?from=plan' : '/ready-made-plans'
    );
}
