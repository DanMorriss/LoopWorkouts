import { afterNextRender, Component, computed, EnvironmentInjector, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { builtInWorkoutEquipment, copyOfBuiltIn } from '../../models/built-in-workouts';
import { capitalise, equipmentPhrases } from '../../models/exercise';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { firstWorkout } from '../first-workout';

/**
 * Today with no workouts yet (NAV-6): a way to add some, so there's something to plan the week
 * with. A ready-made workout for your goal and equipment to add in one tap, the rest of the
 * ready-made workouts, or making your own. Once one's added, Today offers to plan the week.
 */
@Component({
    selector: 'app-get-started',
    imports: [RouterLink],
    template: `
        <section class="start" aria-labelledby="get-started-title">
            <h3 class="start__label" id="get-started-title">Get started</h3>
            <p class="start__lead">
                Add some workouts, then plan which days you do them. Here's one to start with:
            </p>
            <div class="start__workout">
                <h4 class="start__name">{{ first().workout.title }}</h4>
                <p class="start__description">{{ first().workout.description }}</p>
                <p class="start__needs">{{ first().needs }}</p>
            </div>
            <div class="start__actions">
                <button type="button" class="btn-main" (click)="add()">Add to my workouts</button>
                <a routerLink="/ready-made" class="btn-pill">Browse ready-made workouts</a>
                <a routerLink="/setup" class="start__link">Or make your own</a>
            </div>
        </section>
    `,
    styleUrl: './get-started.component.scss',
})
export class GetStartedComponent {
    private readonly settings = inject(SettingsStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly undo = inject(UndoService);
    /** The app's, not this card's, which is gone by the time focus moves on. */
    private readonly injector = inject(EnvironmentInjector);

    /** The ready-made workout to start with, for your goal and equipment. */
    protected readonly first = computed(() => {
        const workout = firstWorkout(this.settings.trainingGoal(), this.settings.myEquipment());
        const needs = equipmentPhrases(builtInWorkoutEquipment(workout)).map(capitalise);
        return { workout, needs: needs.join(', ') };
    });

    /**
     * Adds a copy to your workouts, with Undo. This card then goes, and the week takes its
     * place, so focus moves on to planning it.
     */
    protected add() {
        const added = this.workouts.addWorkout(copyOfBuiltIn(this.first().workout));
        this.undo.offerUndo({
            message: `Added "${added.title}" to your workouts`,
            undo: () => this.workouts.deleteWorkout(added.id),
        });
        afterNextRender(() => document.querySelector<HTMLElement>('.week__plan')?.focus(), {
            injector: this.injector,
        });
    }
}
