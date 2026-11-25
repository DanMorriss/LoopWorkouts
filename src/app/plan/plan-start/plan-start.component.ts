import { Component, computed, inject } from '@angular/core';
import { BuiltInPlan, plansForYou } from '../../models/built-in-plans';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { ReadyMadePlans, weekPlannedText } from '../../shared/state/ready-made-plans.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { PlansForYouComponent } from '../plans-for-you/plans-for-you.component';

/**
 * The Plan page with nothing planned (PLN-6): the ready-made weeks for your goal and equipment,
 * best first, swiped between as on Today (`PlansForYouComponent`), each used in one tap, with
 * Undo; then All plans; then, under it, the week to add workouts to day by day. Once a plan's used, the page's week takes its place,
 * and focus goes to the page's title.
 */
@Component({
    selector: 'app-plan-start',
    imports: [PlansForYouComponent],
    template: `
        <section class="start" aria-labelledby="plan-start-title" data-tour="plan-ready-made">
            <h3 class="start__title" id="plan-start-title">Start with a ready-made week</h3>
            <p class="start__lead">
                For your goal and equipment, best first: swipe to compare them. You can change it
                after.
            </p>
            <app-plans-for-you [plans]="plans()" [onPlanPage]="true" (used)="use($event)" />
        </section>
        <p class="start__own">Or add your own workouts day by day:</p>
    `,
    styleUrl: './plan-start.component.scss',
})
export class PlanStartComponent {
    private readonly settings = inject(SettingsStore);
    private readonly readyMade = inject(ReadyMadePlans);
    private readonly undo = inject(UndoService);
    private readonly focusAfterRender = injectFocusAfterRender();

    /** The plans for your goal and equipment, best first (PLN-7), swiped between. */
    protected readonly plans = computed(() =>
        plansForYou(this.settings.trainingGoal(), this.settings.myEquipment())
    );

    protected use(plan: BuiltInPlan) {
        const undoUse = this.readyMade.use(plan);
        this.undo.offerUndo({ message: weekPlannedText(plan), undo: undoUse, keepFocus: true });
        this.focusAfterRender('plan-title');
    }
}
