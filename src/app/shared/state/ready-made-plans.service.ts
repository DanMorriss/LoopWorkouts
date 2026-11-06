import { inject, Service } from '@angular/core';
import { BuiltInPlan } from '../../models/built-in-plans';
import { copyPlan } from '../../models/plan';
import { PlanStore } from './plan-store.service';

/** What the Undo bar says once a ready-made plan is used. */
export function weekPlannedText(plan: BuiltInPlan): string {
    return `Your week is planned: ${plan.title}`;
}

/**
 * Using a ready-made plan (PLN-6): your plan is replaced by its week of ready-made workouts,
 * planned as they are (since 2026-11-06; until then each was copied into your workouts).
 */
@Service()
export class ReadyMadePlans {
    private readonly planStore = inject(PlanStore);

    /** Uses `plan`, and gives what puts back the plan it replaced. */
    use(plan: BuiltInPlan): () => void {
        const before = copyPlan(this.planStore.plan());
        this.planStore.replace(plan.days);
        return () => this.planStore.restore(before);
    }
}
