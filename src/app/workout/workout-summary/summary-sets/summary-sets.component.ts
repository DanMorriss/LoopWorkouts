import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { describeSets, sectionsOf, SetsSummary } from '../../../history/history-format';
import { isBuiltIn } from '../../../models/exercise';
import {
    placedHeadings,
    placedSupersets,
    RepSetAmount,
    TimedSetAmount,
} from '../../../models/workout';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StepAmountsDialogComponent } from '../../../shared/components/step-amounts-dialog/step-amounts-dialog.component';
import { injectFocusAfterRender } from '../../../shared/focus-after-render';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { SetLinesComponent } from '../../../history/set-lines/set-lines.component';

/**
 * What a set's exercise is called now, if it's your own (it may have been renamed since).
 * Built-in names never change, so a set keeps the name it ran with, e.g. "Squats".
 */
export function ownExerciseName(exercises: ExerciseStore) {
    return (id: string): string | undefined => {
        const exercise = exercises.byId(id);
        return exercise && !isBuiltIn(exercise) ? exercise.name : undefined;
    };
}

/**
 * The run's sets on the workout summary, one line per step, e.g. "Squats: 10, 10, 8 @ 60 kg".
 * The rep sets can be corrected (the last one was 8 reps, not 10; timed ones ran as set):
 * Change reps or weight makes each rep exercise's line a button, opening its sets' wheels in
 * a dialog, one exercise at a time. Once one is changed, it asks whether to start from them
 * next time.
 */
@Component({
    selector: 'app-summary-sets',
    imports: [IconComponent, MatIconModule, SetLinesComponent, StepAmountsDialogComponent],
    templateUrl: './summary-sets.component.html',
    styleUrl: './summary-sets.component.scss',
})
export class SummarySetsComponent {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly exerciseName = ownExerciseName(inject(ExerciseStore));
    private readonly focusAfterRender = injectFocusAfterRender();

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
    /** The steps with rep sets, which can be changed, and where each is in the run's sets. */
    protected readonly changeable = computed(() => {
        const steps = new Map<number, number[]>();
        this.store.activeSets().forEach((set, index) => {
            steps.set(set.step, [...(steps.get(set.step) ?? []), index]);
        });
        return steps;
    });
    /** The line whose sets are open in the dialog. */
    protected readonly editing = signal<SetsSummary | null>(null);
    protected readonly hint = 'The reps and weight you did in each set.';

    /** The open line's sets as the dialog takes them: reps, and weight in kg. */
    protected readonly editingAmounts = computed((): RepSetAmount[] => {
        const sets = this.store.activeSets();
        return this.editingIndexes().map((index) => {
            const { reps, weight } = sets[index];
            return { reps, ...(weight === undefined ? {} : { weight }) };
        });
    });

    /**
     * Each of the open line's sets named, in the order done: e.g. "Set 2", or "Set 2, left" for
     * an exercise done each side.
     */
    protected readonly editingRowNames = computed(() => {
        const sides = this.editingIndexes().map((index) => this.store.activeSets()[index].side);
        return sides.map((side, i) => {
            const number = sides.slice(0, i).filter((other) => other === side).length + 1;
            return `Set ${number}${side ? `, ${side}` : ''}`;
        });
    });

    /** Where the open line's sets are in the run's sets. */
    private readonly editingIndexes = computed(() => {
        const step = this.editing()?.step;
        return step === undefined ? [] : (this.changeable().get(step) ?? []);
    });

    protected buttonId(step: number): string {
        return `summary-sets-change-${step}`;
    }

    /** Some steps were given a step-up, which "Yes, use next time" leaves as they are. */
    protected readonly steppedUp = computed(() => this.run.steppedUp().size > 0);

    /** null until a set is changed; then asks whether to start from them next time. */
    protected readonly nextTime = signal<'asking' | 'yes' | 'no' | null>(null);
    /** Of a ready-made workout too, as it keeps your reps and weights (ReadyMadeChanges). */
    private readonly canKeep = computed(() => this.run.workout() !== null);

    /** Corrects the step's sets that changed, then asks about next time if any did. */
    protected save(step: number, amounts: RepSetAmount[] | TimedSetAmount[]) {
        const indexes = this.changeable().get(step) ?? [];
        let changed = false;
        amounts.forEach((amount, i) => {
            const set = this.store.activeSets()[indexes[i]];
            // Only rep sets are open to change, so a timed one is never here
            if (
                set &&
                'reps' in amount &&
                (set.reps !== amount.reps || set.weight !== amount.weight)
            ) {
                this.run.changeSet(indexes[i], { reps: amount.reps, weight: amount.weight });
                changed = true;
            }
        });
        if (changed && this.canKeep()) {
            this.nextTime.set('asking');
        }
        this.close(step);
    }

    protected close(step: number) {
        this.editing.set(null);
        this.focusAfterRender(this.buttonId(step));
    }

    protected answerNextTime(use: boolean) {
        if (use) {
            this.run.useSetsNextTime();
        }
        this.nextTime.set(use ? 'yes' : 'no');
    }
}
