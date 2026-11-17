import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { describeSets } from '../../../history/history-format';
import { kettlebellSteps } from '../../../models/kettlebell';
import { readyForHeavierKettlebell } from '../../../models/progress';
import { allSteps } from '../../../models/workout';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { ownExerciseName } from '../../own-exercise-name';

/**
 * On the workout summary of a kettlebell workout (PRG-14), where a kettlebell step got every
 * rep at 20 a set or more: a well done, and time for a heavier kettlebell, with the sets that
 * earned it. Follows the sets as they're corrected.
 */
@Component({
    selector: 'app-summary-kettlebell',
    imports: [MatIconModule],
    template: `
        @if (lines().length) {
            <section class="kettlebell" aria-labelledby="summary-kettlebell">
                <mat-icon class="kettlebell__icon" aria-hidden="true">celebration</mat-icon>
                <div>
                    <h3 id="summary-kettlebell">Time for a new kettlebell</h3>
                    <p class="kettlebell__text">
                        Congratulations, you're ready to go up in weight. Every set got its reps, at
                        20 or more:
                    </p>
                    <ul class="kettlebell__list">
                        @for (line of lines(); track line) {
                            <li>{{ line }}</li>
                        }
                    </ul>
                    <p class="kettlebell__hint">
                        With the heavier one, drop back to fewer reps and build up to 20 again.
                    </p>
                </div>
            </section>
        }
    `,
    styleUrl: './summary-kettlebell.component.scss',
})
export class SummaryKettlebellComponent {
    private readonly run = inject(ActiveRunService);
    private readonly exercises = inject(ExerciseStore);
    private readonly weightUnit = inject(SettingsStore).weightUnit;
    private readonly exerciseName = ownExerciseName(this.exercises);

    /** The sets of each step ready for a heavier kettlebell, e.g. "Kettlebell swing: 3 × 20 reps @ 16 kg". */
    protected readonly lines = computed(() => {
        const sets = this.run.sets();
        const steps = allSteps(this.run.workout() ?? { blocks: [] });
        const ready = readyForHeavierKettlebell(
            sets,
            steps,
            kettlebellSteps(steps, (id) => this.exercises.byId(id))
        );
        const texts = ready.flatMap((step) =>
            describeSets(
                sets.filter((set) => set.step === step),
                this.weightUnit(),
                this.exerciseName
            ).map((line) => `${line.name}: ${line.text}`)
        );
        // The same exercise in two steps, done alike, says so once
        return [...new Set(texts)];
    });
}
