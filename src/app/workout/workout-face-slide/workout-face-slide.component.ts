import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { describeSets } from '../../history/history-format';
import { lastRepSets } from '../../history/last-sets';
import { Exercise } from '../../models/exercise';
import { canStepUpEachSet, steppedUp, suggestedWeight } from '../../models/progress';
import { WEIGHT_INCREASE, weightOptions, weightToKg } from '../../models/weight';
import { allSteps, MAX_REPS } from '../../models/workout';
import { WheelPickerComponent } from '../../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { ClockDigitsComponent } from '../clock-digits/clock-digits.component';
import { placeAt } from '../../models/workout-state';
import { FaceSlide, WorkoutView } from '../workout-view';

/**
 * A step's text on the workout's face: its name, the time or the reps and weight, which can be
 * changed there, what to try next time, and what's coming after a rest.
 */
@Component({
    selector: 'app-workout-face-slide',
    imports: [ClockDigitsComponent, MatIconModule, WheelPickerComponent],
    templateUrl: './workout-face-slide.component.html',
    styleUrl: './workout-face-slide.component.scss',
})
export class WorkoutFaceSlideComponent {
    readonly slide = input.required<FaceSlide>();
    /** The (i) was pressed: the exercise, and whether it's the next step's, during a rest. */
    readonly details = output<{ exercise: Exercise; next: boolean }>();

    private readonly run = inject(ActiveRunService);
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly view = inject(WorkoutView);
    protected readonly weightUnit = this.view.weightUnit;

    /**
     * The sets from the most recent workout with this exercise, in the same format as history
     * (PRG-1). Not this run's: it's in the history too once it's been ended or the page closed.
     * Where the step's sets vary (BLD-11), just the same set last time, e.g. set 2's.
     */
    protected readonly lastTime = computed(() => {
        const saved = this.savedStep();
        const lastSets = saved?.varies
            ? this.lastSets().filter((set) => (set.set ?? 0) === saved.set)
            : this.lastSets();
        const summary = describeSets(
            lastSets,
            this.settings.weightUnit(),
            (id) => this.exercises.byId(id)?.name
        )
            .map((line) => line.text)
            .join(' + ');
        return summary ? `Last time: ${summary}` : '';
    });
    /**
     * The weight to try (PRG-5), when every set hit the reps last time: one step up from last
     * time's weight, while the step is still at it. Changed since, it's the user's call.
     */
    protected readonly nextWeight = computed(() => {
        const step = this.view.state()?.step;
        if (step?.kind !== 'reps' || this.savedStep()?.varies) {
            return null;
        }
        const suggestion = suggestedWeight(this.lastSets(), step.reps, this.view.weightUnit());
        return suggestion &&
            suggestion.next > suggestion.last &&
            this.view.weightValue() === suggestion.last
            ? suggestion.next
            : null;
    });
    /**
     * On set 1 of a step whose sets vary (BLD-11), how much more to try on each set (PRG-5),
     * e.g. 2.5 (kg), where every set got its own reps last time and none has been changed
     * since; otherwise null. Once, on set 1, as it moves the whole step up.
     */
    protected readonly eachSetStepUp = computed(() => {
        const saved = this.savedStep();
        const unit = this.view.weightUnit();
        return saved?.varies &&
            saved.set === 0 &&
            saved.step.kind === 'reps' &&
            canStepUpEachSet(this.lastSets(), saved.step, unit)
            ? WEIGHT_INCREASE[unit]
            : null;
    });
    /**
     * The saved step being run (the face's `state.step` being just this set of it), which set
     * of it this is, and whether its sets vary. Null between steps' sets, e.g. on a rest.
     */
    private readonly savedStep = computed(() => {
        const state = this.view.state();
        const workout = this.view.running();
        const place = state && workout ? placeAt(workout, state.stepIndex) : null;
        const step = place && workout ? allSteps(workout)[place.step] : undefined;
        return step && place
            ? { step, set: place.set, varies: step.kind !== 'rest' && step.sets !== undefined }
            : null;
    });
    /** The rep sets of the rep step's exercise from the most recent workout with any. */
    private readonly lastSets = computed(() => {
        const step = this.view.state()?.step;
        return step?.kind === 'reps' && step.exerciseId !== undefined
            ? lastRepSets(this.history.entries(), step.exerciseId, this.run.runId())
            : [];
    });
    protected readonly repOptions = Array.from({ length: MAX_REPS }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));
    /** The face's weight wheel: as in setup, but no weight shows as "+", to add one. */
    protected readonly faceWeightOptions = computed(() =>
        weightOptions(this.view.weightUnit()).map((option) =>
            option.value === 0 ? { ...option, label: '+' } : option
        )
    );
    protected setReps(reps: number) {
        this.run.changeReps({ reps });
    }

    protected setWeight(value: number) {
        this.run.changeReps({
            weight: value > 0 ? weightToKg(value, this.view.weightUnit()) : undefined,
        });
    }

    /** Try more on each set: one weight step up on every set with a weight, keeping the shape. */
    protected stepUpEachSet() {
        const unit = this.view.weightUnit();
        this.run.changeEachSet((amount) => steppedUp(amount, unit));
    }
}
