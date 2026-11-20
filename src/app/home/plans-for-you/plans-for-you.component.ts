import { Component, inject, input } from '@angular/core';
import { BuiltInPlan } from '../../models/built-in-plans';
import {
    CarouselComponent,
    SlideDirective,
} from '../../shared/components/carousel/carousel.component';
import { PageSlide } from '../../shared/navigation/page-slide';
import { PlanCardComponent } from '../../plan/plan-card/plan-card.component';
import { injectUsePlanOnToday } from '../use-plan-on-today';

/**
 * Today's offer of a ready-made week (NAV-6, PLN-6, PLN-7), on Get started and on This week
 * with nothing planned: the plans for your goal and equipment (`plansForYou()`), swiped
 * between with their dots above them, so they're seen before the long cards; each used in one
 * tap, with Undo. Then All plans, on their page, or Make your own plan, on the Plan page.
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
                        (used)="usePlan($event)"
                    />
                </ng-template>
            }
        </app-carousel>
        <div class="plans__actions">
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
    `,
    styleUrl: './plans-for-you.component.scss',
})
export class PlansForYouComponent {
    readonly plans = input.required<readonly BuiltInPlan[]>();

    protected readonly slide = inject(PageSlide);
    /**
     * Uses it as its card shows it, with or without its active rest, with Undo. The week then
     * takes this card's place, so focus moves there, to Edit plan.
     */
    protected readonly usePlan = injectUsePlanOnToday();
}
