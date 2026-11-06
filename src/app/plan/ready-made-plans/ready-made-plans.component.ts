import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BUILT_IN_PLANS, BuiltInPlan, plansFor } from '../../models/built-in-plans';
import { BackLinkComponent } from '../../nav/back-link/back-link.component';
import { SwipeBackDirective } from '../../nav/swipe-back.directive';
import { EquipmentFilterComponent } from '../../shared/components/equipment-filter/equipment-filter.component';
import { ReadyMadePlans, weekPlannedText } from '../../shared/state/ready-made-plans.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { PlanCardComponent } from '../plan-card/plan-card.component';
import { hiddenByEquipmentText } from '../../models/exercise';

/**
 * The ready-made plans (PLN-6): a week of ready-made workouts each, those for your goal
 * first, and with Only what I have on, only those your equipment allows. Using one plans its
 * ready-made workouts as they are, in place of your plan, and goes to Today, with Undo. It slides in
 * over the page it was opened from, Today or the Plan page (`?from=plan`), and back to it.
 */
@Component({
    selector: 'app-ready-made-plans',
    imports: [BackLinkComponent, EquipmentFilterComponent, PlanCardComponent, SwipeBackDirective],
    template: `
        <div class="flex justify-center" [appSwipeBack]="back.url">
            <div class="w-full max-w-md p-4">
                <app-back-link [url]="back.url" [label]="back.label" />
                <h2 class="plans__title">Ready-made plans</h2>
                <p class="plans__hint">
                    A week of ready-made workouts, the same every week. Using one replaces your plan
                    with it, with Undo; its workouts are ready to start as they are.
                </p>

                <app-equipment-filter class="plans__kit" idPrefix="plans" things="Plans" />
                @if (hiddenText()) {
                    <p class="plans__hint">{{ hiddenText() }}</p>
                }

                <ul class="plans__list">
                    @for (plan of plans(); track plan.id) {
                        <li>
                            <app-plan-card
                                [plan]="plan"
                                [headingLevel]="3"
                                [workoutsFrom]="back.url === '/plan' ? 'plan' : 'plans'"
                                (used)="use(plan)"
                            />
                        </li>
                    }
                </ul>
            </div>
        </div>
    `,
    styleUrl: './ready-made-plans.component.scss',
})
export class ReadyMadePlansComponent {
    private readonly settings = inject(SettingsStore);
    private readonly readyMade = inject(ReadyMadePlans);
    private readonly undo = inject(UndoService);
    private readonly router = inject(Router);

    /** Back to where it was opened from: the Plan page, or Today. */
    protected readonly back =
        inject(ActivatedRoute).snapshot.queryParamMap.get('from') === 'plan'
            ? { url: '/plan', label: 'Plan' }
            : { url: '/home', label: 'Today' };

    protected readonly plans = computed(() =>
        plansFor(
            this.settings.trainingGoal(),
            this.settings.myEquipment(),
            this.settings.onlyMyEquipment()
        )
    );

    /** How many Only what I have hides, to say so. */
    protected readonly hiddenText = computed(() =>
        hiddenByEquipmentText(BUILT_IN_PLANS.length - this.plans().length)
    );

    /** Uses it, then on to Today to see the week, with Undo there. */
    protected async use(plan: BuiltInPlan) {
        const undo = this.readyMade.use(plan);
        await this.router.navigateByUrl('/home');
        this.undo.offerUndo({ message: weekPlannedText(plan), undo });
    }
}
