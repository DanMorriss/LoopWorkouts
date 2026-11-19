import { Component, computed, inject } from '@angular/core';
import { plansForYou } from '../../models/built-in-plans';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { PlansForYouComponent } from '../plans-for-you/plans-for-you.component';

/**
 * Today with no workouts yet (NAV-6): a week to start with, planned for you (PLN-7). The
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
            <h3 class="start__label" id="get-started-title">Get started</h3>
            <p class="start__lead">Start with a week of workouts, planned for you. {{ lead() }}</p>
            <app-plans-for-you [plans]="plans()" />
        </section>
    `,
    styleUrl: './get-started.component.scss',
})
export class GetStartedComponent {
    private readonly settings = inject(SettingsStore);

    protected readonly plans = computed(() =>
        plansForYou(this.settings.trainingGoal(), this.settings.myEquipment())
    );

    protected readonly lead = computed(() =>
        this.plans().length > 1
            ? 'Here are some for your goal and equipment, best first:'
            : "Here's one for your goal and equipment:"
    );
}
