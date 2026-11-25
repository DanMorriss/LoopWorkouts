import { Component, computed, inject } from '@angular/core';
import { plansForYou } from '../../models/built-in-plans';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { PlansForYouComponent } from '../../plan/plans-for-you/plans-for-you.component';
import { injectUsePlanOnToday } from '../use-plan-on-today';

/**
 * Today with no workouts yet (NAV-6): a week to start with, planned for you (PLN-7); "Plan
 * your week" once a workout's been done, as it's no longer getting started. The
 * ready-made plans your equipment allows, swiped between, the best for your goal first, each
 * used in one tap (your week planned with its ready-made workouts); All plans, on their page;
 * or making your own on the Plan page, whose Add offers the ready-made workouts as well as
 * your own.
 */
@Component({
    selector: 'app-get-started',
    imports: [PlansForYouComponent],
    template: `
        <section class="start" aria-labelledby="get-started-title">
            <h3 class="start__label" id="get-started-title">{{ title() }}</h3>
            <p class="start__lead">{{ lead() }}</p>
            <app-plans-for-you [plans]="plans()" (used)="usePlan($event)" />
        </section>
    `,
    styleUrl: './get-started.component.scss',
})
export class GetStartedComponent {
    /** Uses a plan offered, with Undo; the week then takes Get started's place. */
    protected readonly usePlan = injectUsePlanOnToday();
    private readonly settings = inject(SettingsStore);
    private readonly history = inject(HistoryStore);

    protected readonly plans = computed(() =>
        plansForYou(this.settings.trainingGoal(), this.settings.myEquipment())
    );

    /** Whether a workout's been done: then it's planning a week, not getting started. */
    private readonly trained = computed(() => this.history.entries().length > 0);

    protected readonly title = computed(() => (this.trained() ? 'Plan your week' : 'Get started'));

    /**
     * What it's offering, and what for: your goal and equipment once there's equipment to go by
     * (given in the setup, with the goal), or else plans that need none, as that's all they are.
     */
    protected readonly lead = computed(() => {
        const start = this.trained()
            ? 'A week of workouts, planned for you.'
            : 'Start with a week of workouts, planned for you.';
        const some = this.plans().length > 1;
        const fit = this.settings.myEquipment().length
            ? some
                ? 'Here are some for your goal and equipment, best first:'
                : "Here's one for your goal and equipment:"
            : some
              ? 'Here are some that need no equipment, best first:'
              : "Here's one that needs no equipment:";
        return `${start} ${fit}`;
    });
}
