import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { describeSets, spokenDuration } from '../../../history/history-format';
import {
    bodyweightSteps,
    progressionSuggestions,
    ProgressionSuggestion,
    restSuggestions,
    steppedUp,
    TIME_INCREASE,
    withLongerTime,
} from '../../../models/progress';
import { kettlebellSteps } from '../../../models/kettlebell';
import { weightToKg } from '../../../models/weight';
import { allSteps, Step, withEachRepSet } from '../../../models/workout';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { ownExerciseName } from '../../own-exercise-name';
import { injectFocusAfterRender } from '../../../shared/focus-after-render';

/**
 * What to step up next time on the workout summary (PRG-10), e.g. "Squats: try 62.5 kg, up
 * from 60 kg", for each rep step where every set got its reps: a weight step up (as PRG-5
 * offers mid-workout), or one more rep with no weight; and for each timed exercise where every
 * set ran its whole time, a few seconds longer; and for a kettlebell or bodyweight ladder done
 * in full, a shorter rest (PRG-15). Follows the sets as they're corrected.
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
                <p class="step-ups__hint">Every set was done in full, so step up:</p>
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
    private readonly exercises = inject(ExerciseStore);
    private readonly exerciseName = ownExerciseName(this.exercises);
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
        const workout = this.run.workout() ?? { blocks: [] };
        const steps = allSteps(workout);
        // A kettlebell workout's go up in reps (PRG-14), or a ladder's rest down (PRG-15),
        // in place of a rep more on each set
        const exercise = (id: string) => this.exercises.byId(id);
        const kettlebell = kettlebellSteps(steps, exercise);
        const rests = restSuggestions(sets, workout, kettlebell, bodyweightSteps(steps, exercise));
        const resting = new Set(rests.map(({ step }) => step));
        return [
            ...applied.values(),
            ...[
                ...progressionSuggestions(sets, steps, unit, kettlebell).filter(
                    ({ step }) => !resting.has(step)
                ),
                ...rests,
            ].filter(({ step }) => !applied.has(step) && !swappedAway(step)),
        ]
            .sort((a, b) => a.step - b.step)
            .map((suggestion) => {
                const { step } = suggestion;
                // Named as its line in Sets is
                const [line] = describeSets(
                    sets.filter((set) => set.step === step),
                    unit,
                    this.exerciseName
                );
                const text = `${line.name}: ${stepUpText(suggestion, unit)}`;
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
     * wheel would; a longer time or a shorter rest only on the saved workout. Focus moves to
     * its Applied.
     */
    protected apply(text: string, step: number) {
        const steps = allSteps(this.run.workout() ?? { blocks: [] });
        const next = new Map(this.applied());
        for (const { suggestion } of this.items().filter((item) => item.text === text)) {
            // A shorter rest is for next time only, as a longer time is (PRG-15)
            if (suggestion.kind === 'rest') {
                this.store.updateSavedRest(suggestion.step, suggestion.to);
                next.set(suggestion.step, suggestion);
                continue;
            }
            const current = steps[suggestion.step];
            const stepped = current && this.steppedUp(current, suggestion);
            if (!stepped) {
                continue;
            }
            // A longer time is for next time only: on this run it would move the clock
            if (suggestion.kind === 'time') {
                this.store.updateSavedStep(suggestion.step, stepped);
            } else {
                this.store.updateActiveStep(suggestion.step, stepped);
            }
            next.set(suggestion.step, suggestion);
            this.run.keepStepUp(suggestion.step);
        }
        this.applied.set(next);
        this.focusAfterRender(`step-up-${step}`);
    }

    /**
     * The step with its step-up on, on each set of a step whose sets vary, so it keeps its
     * shape (BLD-11). Null if it's no longer the kind of step the step-up is for.
     */
    private steppedUp(step: Step, suggestion: ProgressionSuggestion): Step | null {
        const unit = this.weightUnit();
        if (step.kind === 'work') {
            return suggestion.kind === 'time' ? withLongerTime(step) : null;
        }
        if (step.kind !== 'reps' || suggestion.kind === 'time' || suggestion.kind === 'rest') {
            return null;
        }
        if (suggestion.eachSet) {
            return withEachRepSet(step, (amount) =>
                suggestion.kind === 'weight'
                    ? steppedUp(amount, unit)
                    : { ...amount, reps: amount.reps + 1 }
            );
        }
        return suggestion.kind === 'weight'
            ? { ...step, weight: weightToKg(suggestion.to, unit) }
            : { ...step, reps: suggestion.to };
    }
}

/** How a step-up reads after the exercise's name, e.g. "try 62.5 kg, up from 60 kg". */
function stepUpText({ kind, from, to, eachSet }: ProgressionSuggestion, unit: string): string {
    if (kind === 'rest') {
        return `try resting ${spokenDuration(to)} between sets, down from ${spokenDuration(from)}`;
    }
    if (eachSet) {
        return kind === 'weight'
            ? `try ${to - from} ${unit} more on each set`
            : kind === 'reps'
              ? 'try 1 more rep on each set'
              : `try ${spokenDuration(TIME_INCREASE)} more on each set`;
    }
    return kind === 'weight'
        ? `try ${to} ${unit}, up from ${from} ${unit}`
        : kind === 'reps'
          ? `try ${to} reps, up from ${from}`
          : `try ${spokenDuration(to)}, up from ${spokenDuration(from)}`;
}
