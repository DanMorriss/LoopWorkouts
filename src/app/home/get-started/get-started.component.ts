import {
    afterNextRender,
    ApplicationRef,
    Component,
    computed,
    EnvironmentInjector,
    inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageSlide } from '../../nav/page-slide';
import { firstPlan } from '../../models/built-in-plans';
import { PlanCardComponent } from '../../plan/plan-card/plan-card.component';
import { ReadyMadePlans } from '../../shared/state/ready-made-plans.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { morphHome } from '../home-morph';

/**
 * Today with no workouts yet (NAV-6): a week to start with, planned for you (PLN-7). A
 * ready-made plan for your goal and equipment, used in one tap (its workouts added, your week
 * planned), the rest of the ready-made plans, or picking workouts yourself.
 */
@Component({
    selector: 'app-get-started',
    imports: [PlanCardComponent, RouterLink],
    template: `
        <section class="start" aria-labelledby="get-started-title">
            <h3 class="start__label" id="get-started-title">Get started</h3>
            <p class="start__lead">
                Start with a week of workouts, planned for you. Here's one for your goal and
                equipment:
            </p>
            <app-plan-card [plan]="plan()" [main]="true" (used)="use()" />
            <!-- The other ways, as on This week once there are workouts: side by side -->
            <div class="start__actions">
                <a
                    href="/ready-made-plans"
                    class="btn-pill"
                    (click)="slide.follow($event, '/ready-made-plans', 'in')"
                    >More plans</a
                >
                <a routerLink="/library" class="btn-pill">Pick your own workouts</a>
            </div>
        </section>
    `,
    styleUrl: './get-started.component.scss',
})
export class GetStartedComponent {
    protected readonly slide = inject(PageSlide);
    private readonly settings = inject(SettingsStore);
    private readonly readyMade = inject(ReadyMadePlans);
    private readonly undo = inject(UndoService);
    /** The app's, not this card's, which is gone by the time focus moves on. */
    private readonly injector = inject(EnvironmentInjector);
    private readonly appRef = inject(ApplicationRef);

    /** The ready-made plan to start with, for your goal and equipment. */
    protected readonly plan = computed(() =>
        firstPlan(this.settings.trainingGoal(), this.settings.myEquipment())
    );

    /**
     * Uses it, with Undo. This card then goes, and the week takes its place, so focus moves
     * there, to Edit plan.
     */
    protected use() {
        const plan = this.plan();
        // The card grows or shrinks into the week, rather than the page jumping
        morphHome(this.appRef, () => {
            const undo = this.readyMade.use(plan);
            this.undo.offerUndo({ message: `Your week is planned: ${plan.title}`, undo });
            afterNextRender(() => document.querySelector<HTMLElement>('.week__edit')?.focus(), {
                injector: this.injector,
            });
        });
    }
}
