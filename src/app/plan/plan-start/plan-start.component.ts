import { Component, computed, inject } from '@angular/core';
import { BuiltInPlan, plansForYou } from '../../models/built-in-plans';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { PageSlide } from '../../shared/navigation/page-slide';
import { ReadyMadePlans, weekPlannedText } from '../../shared/state/ready-made-plans.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { PlanCardComponent } from '../plan-card/plan-card.component';

/**
 * The Plan page with nothing planned (PLN-6): the ready-made week that best fits your goal and
 * equipment, used in one tap as on Today, with Undo; then All ready-made plans; then, under it,
 * the week to add workouts to day by day. Once a plan's used, the page's week takes its place,
 * and focus goes to the page's title.
 */
@Component({
    selector: 'app-plan-start',
    imports: [PlanCardComponent],
    template: `
        <section class="start" aria-labelledby="plan-start-title" data-tour="plan-ready-made">
            <h3 class="start__title" id="plan-start-title">Start with a ready-made week</h3>
            <p class="start__lead">
                The best fit for your goal and equipment. You can change it after.
            </p>
            @if (best(); as plan) {
                <app-plan-card
                    [plan]="plan"
                    [main]="true"
                    [editable]="false"
                    (used)="use($event)"
                />
            }
            <a
                href="/ready-made-plans?from=plan"
                class="btn-pill start__all"
                (click)="slide.follow($event, '/ready-made-plans?from=plan', 'in')"
                >All ready-made plans</a
            >
            <p class="start__own">Or add your own workouts day by day:</p>
        </section>
    `,
    styleUrl: './plan-start.component.scss',
})
export class PlanStartComponent {
    private readonly settings = inject(SettingsStore);
    private readonly readyMade = inject(ReadyMadePlans);
    private readonly undo = inject(UndoService);
    private readonly focusAfterRender = injectFocusAfterRender();
    protected readonly slide = inject(PageSlide);

    /** The first of the plans for your goal and equipment, best first (PLN-7). */
    protected readonly best = computed(
        () => plansForYou(this.settings.trainingGoal(), this.settings.myEquipment())[0] ?? null
    );

    protected use(plan: BuiltInPlan) {
        const undoUse = this.readyMade.use(plan);
        this.undo.offerUndo({ message: weekPlannedText(plan), undo: undoUse, keepFocus: true });
        this.focusAfterRender('plan-title');
    }
}
