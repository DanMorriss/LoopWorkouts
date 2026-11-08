import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { describeSets } from '../../../history/history-format';
import { progressionSuggestions, ProgressionSuggestion, steppedUp } from '../../../models/progress';
import { weightToKg } from '../../../models/weight';
import { allSteps, withEachRepSet } from '../../../models/workout';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { ownExerciseName } from '../summary-sets/summary-sets.component';
import { injectFocusAfterRender } from '../../../shared/focus-after-render';

/**
 * What to step up next time on the workout summary (PRG-10), e.g. "Squats: try 62.5 kg, up
 * from 60 kg", for each rep step where every set got its reps: a weight step up (as PRG-5
 * offers mid-workout), or one more rep with no weight. Follows the sets as they're corrected.
 * Apply puts a step-up on the saved workout's step, and it stays said as applied; "Yes, use
 * next time" in Sets leaves it there (ActiveRunService.keepStepUp()).
 */
@Component({
    selector: 'app-summary-step-ups',
    imports: [MatIconModule],
    template: `
        @if (lines().length) {
            <section class="step-ups" aria-labelledby="summary-step-ups">
                <h3 id="summary-step-ups">Next time</h3>
                <p class="step-ups__hint">Every set got its reps, so step up:</p>
                <ul class="step-ups__list">
                    @for (line of lines(); track line.step) {
                        <li>
                            <mat-icon aria-hidden="true">arrow_upward</mat-icon>
                            <span class="step-ups__text">{{ line.text }}</span>
                            @if (line.applied) {
                                <span
                                    class="step-ups__applied"
                                    [id]="'step-up-' + line.step"
                                    tabindex="-1"
                                >
                                    <mat-icon aria-hidden="true">check</mat-icon>
                                    Applied
                                    <span class="sr-only">: {{ line.text }}</span>
                                </span>
                            } @else if (canApply()) {
                                <button
                                    type="button"
                                    class="btn-pill step-ups__apply"
                                    [attr.aria-label]="'Apply: ' + line.text"
                                    (click)="apply(line.text, line.step)"
                                >
                                    Apply
                                </button>
                            }
                        </li>
                    }
                </ul>
            </section>
        }
    `,
    styleUrl: './summary-step-ups.component.scss',
})
export class SummaryStepUpsComponent {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);
    private readonly weightUnit = inject(SettingsStore).weightUnit;
    private readonly exerciseName = ownExerciseName(inject(ExerciseStore));
    private readonly focusAfterRender = injectFocusAfterRender();

    /**
     * The step-ups applied, by step. Kept as they were: once applied, the step's reps are the
     * new ones, which this run's sets no longer reach.
     */
    private readonly applied = signal<ReadonlyMap<number, ProgressionSuggestion>>(new Map());

    /**
     * Only a workout still in the library has a step to put it on: yours, or a ready-made one,
     * which keeps your reps and weights.
     */
    protected readonly canApply = computed(() => {
        const id = this.run.workout()?.id;
        return id !== undefined && this.store.findAnyWorkout(id) !== null;
    });

    /** Every step-up, a step at a time, with how it reads. */
    private readonly items = computed(() => {
        const sets = this.run.sets();
        const unit = this.weightUnit();
        const applied = this.applied();
        // A step swapped for another exercise (RUN-11) has the old one on the saved workout, so
        // nothing to step up from, unless it was kept for next time
        const swappedAway = (step: number) =>
            this.run.swappedSteps().has(step) && !this.run.keptSwaps().has(step);
        return [
            ...applied.values(),
            ...progressionSuggestions(
                sets,
                allSteps(this.run.workout() ?? { blocks: [] }),
                unit
            ).filter(({ step }) => !applied.has(step) && !swappedAway(step)),
        ]
            .sort((a, b) => a.step - b.step)
            .map((suggestion) => {
                const { step, kind, from, to } = suggestion;
                // Named as its line in Sets is
                const [line] = describeSets(
                    sets.filter((set) => set.step === step),
                    unit,
                    this.exerciseName
                );
                const text = suggestion.eachSet
                    ? kind === 'weight'
                        ? `${line.name}: try ${to - from} ${unit} more on each set`
                        : `${line.name}: try 1 more rep on each set`
                    : kind === 'weight'
                      ? `${line.name}: try ${to} ${unit}, up from ${from} ${unit}`
                      : `${line.name}: try ${to} reps, up from ${from}`;
                return { step, text, suggestion, applied: applied.has(step) };
            });
    });

    /** The same exercise in two steps, both stepping up alike, says so once. */
    protected readonly lines = computed(() => {
        const seen = new Set<string>();
        return this.items().filter((item) => !seen.has(item.text) && !!seen.add(item.text));
    });

    /**
     * Puts the step-up on its step (and its twin's, where it's said once), of the saved
     * workout and of this run, so Back to workout carries on with it, as turning the face's
     * wheel would. Focus moves to its Applied.
     */
    protected apply(text: string, step: number) {
        const steps = allSteps(this.run.workout() ?? { blocks: [] });
        const next = new Map(this.applied());
        for (const { suggestion } of this.items().filter((item) => item.text === text)) {
            const current = steps[suggestion.step];
            if (current?.kind !== 'reps') {
                continue;
            }
            // On each set of a step whose sets vary, so it keeps its shape (BLD-11)
            this.store.updateActiveStep(
                suggestion.step,
                suggestion.eachSet
                    ? withEachRepSet(current, (amount) =>
                          suggestion.kind === 'weight'
                              ? steppedUp(amount, this.weightUnit())
                              : { ...amount, reps: amount.reps + 1 }
                      )
                    : suggestion.kind === 'weight'
                      ? { ...current, weight: weightToKg(suggestion.to, this.weightUnit()) }
                      : { ...current, reps: suggestion.to }
            );
            next.set(suggestion.step, suggestion);
            this.run.keepStepUp(suggestion.step);
        }
        this.applied.set(next);
        this.focusAfterRender(`step-up-${step}`);
    }
}
