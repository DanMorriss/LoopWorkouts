import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { describeSets, sectionsOf } from '../../../history/history-format';
import { ownExerciseName } from '../../own-exercise-name';
import { placedHeadings, placedSupersets } from '../../../models/workout';
import {
    ChangeSetLinesComponent,
    SetsChanged,
} from '../../../history/set-lines/change-set-lines.component';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { SetLinesComponent } from '../../../history/set-lines/set-lines.component';

/**
 * The run's sets on the workout summary, one line per step, e.g. "Squats: 10, 10, 8 @ 60 kg".
 * The rep sets can be corrected (the last one was 8 reps, not 10; timed ones ran as set):
 * Change reps or weight makes each rep exercise's line a button, opening its sets' wheels in
 * a dialog, one exercise at a time. Once one is changed, it asks whether to start from them
 * next time.
 */
@Component({
    selector: 'app-summary-sets',
    imports: [ChangeSetLinesComponent, MatIconModule, SetLinesComponent],
    templateUrl: './summary-sets.component.html',
    styleUrl: './summary-sets.component.scss',
})
export class SummarySetsComponent {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly exerciseName = ownExerciseName(inject(ExerciseStore));

    /** One line per step, e.g. "Squats: 10, 10, 8 @ 60 kg" or "Plank: 3 × 0:45". */
    protected readonly setLines = computed(() =>
        describeSets(this.run.sets(), this.settings.weightUnit(), this.exerciseName)
    );

    /**
     * The lines under the workout's headings, and with its supersets, as the history will have
     * them (BLD-12, BLD-13).
     */
    protected readonly sections = computed(() => {
        const workout = this.run.workout();
        return workout
            ? sectionsOf(this.setLines(), placedHeadings(workout), placedSupersets(workout))
            : sectionsOf(this.setLines());
    });

    protected readonly changingSets = signal(false);
    /** The run's rep sets, which can be corrected. */
    protected readonly repSets = this.store.activeSets;

    /** Some steps were given a step-up, which "Yes, use next time" leaves as they are. */
    protected readonly steppedUp = computed(() => this.run.steppedUp().size > 0);

    /** null until a set is changed; then asks whether to start from them next time. */
    protected readonly nextTime = signal<'asking' | 'yes' | 'no' | null>(null);
    /** Of a ready-made workout too, as it keeps your reps and weights (ReadyMadeChanges). */
    private readonly canKeep = computed(() => this.run.workout() !== null);

    /** Corrects the sets that changed, then asks whether to start from them next time. */
    protected save({ changes }: SetsChanged) {
        for (const { index, reps, weight } of changes) {
            this.run.changeSet(index, { reps, weight });
        }
        if (this.canKeep()) {
            this.nextTime.set('asking');
        }
    }

    protected answerNextTime(use: boolean) {
        if (use) {
            this.run.useSetsNextTime();
        }
        this.nextTime.set(use ? 'yes' : 'no');
    }
}
