import { inject, Service } from '@angular/core';
import { BuiltInPlan, planWorkouts } from '../../models/built-in-plans';
import { copyOfBuiltIn } from '../../models/built-in-workouts';
import { copyPlan } from '../../models/plan';
import { PlanStore } from './plan-store.service';
import { WorkoutStore } from './workout-store.service';

/** What the Undo bar says once a ready-made plan is used. */
export function weekPlannedText(plan: BuiltInPlan): string {
    return `Your week is planned: ${plan.title}`;
}

/**
 * Using a ready-made plan (PLN-6): its workouts are copied into yours, unless you have one of
 * the same title already, which is used instead; then your plan is replaced by its week.
 */
@Service()
export class ReadyMadePlans {
    private readonly workouts = inject(WorkoutStore);
    private readonly planStore = inject(PlanStore);

    /**
     * Uses `plan`, and gives what puts everything back as it was: the plan it replaced, and
     * none of the workouts it added.
     */
    use(plan: BuiltInPlan): () => void {
        const before = copyPlan(this.planStore.plan());
        const byTitle = new Map(
            this.workouts.workouts().map((workout) => [workout.title.trim().toLowerCase(), workout])
        );
        const added: string[] = [];
        const ids = new Map<string, string>();
        for (const builtIn of planWorkouts(plan)) {
            let workout = byTitle.get(builtIn.title.toLowerCase());
            if (!workout) {
                workout = this.workouts.addWorkout(copyOfBuiltIn(builtIn));
                added.push(workout.id);
            }
            ids.set(builtIn.id, workout.id);
        }
        this.planStore.replace(plan.days.map((day) => day.map((id) => ids.get(id)!)));
        return () => {
            this.planStore.restore(before);
            added.forEach((id) => this.workouts.deleteWorkout(id));
        };
    }
}
