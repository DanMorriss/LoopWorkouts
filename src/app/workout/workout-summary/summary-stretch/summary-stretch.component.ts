import { Component, computed, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { isActiveRest } from '../../../models/active-rest';
import { MUSCLE_LABELS } from '../../../models/exercise';
import {
    ROUTINE_HOLD_SECONDS,
    routineStretches,
    stretchRoutine,
} from '../../../models/stretch-routine';
import { estimateText, estimateWorkout } from '../../../models/workout-estimate';
import { Workout } from '../../../models/workout';
import { musclesInSets } from '../../../models/workout-muscles';
import { WorkoutOutlineComponent } from '../../../shared/components/workout-outline/workout-outline.component';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';

/** "Glutes, Quads and Calves". */
const LIST = new Intl.ListFormat('en-GB');

/**
 * A few stretches for the muscles this workout worked hardest, on its summary, made for it
 * from a stretch for each muscle group (see `routineStretches()`): what they are, how long
 * they take, and Start, which ends this run and starts them. Not after a workout of only
 * stretches, nor one with nothing logged that works a muscle.
 */
@Component({
    selector: 'app-summary-stretch',
    imports: [MatIconModule, WorkoutOutlineComponent],
    template: `
        @if (routine(); as workout) {
            <section class="stretch" aria-labelledby="summary-stretch">
                <h3 id="summary-stretch">Stretch what you worked</h3>
                <p class="stretch__hint">
                    {{ time().text }} for your {{ muscles() }}, each held {{ holdSeconds }} seconds.
                </p>
                <app-workout-outline class="stretch__outline" [workout]="workout" />
                <button
                    type="button"
                    class="btn-pill stretch__start"
                    [attr.aria-label]="'Start stretches, ' + time().spoken"
                    (click)="start.emit(workout)"
                >
                    <mat-icon aria-hidden="true">play_arrow</mat-icon>
                    Start stretches
                </button>
            </section>
        }
    `,
    styleUrl: './summary-stretch.component.scss',
})
export class SummaryStretchComponent {
    private readonly run = inject(ActiveRunService);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);

    /** Start stretches: the routine, to run in this one's place. */
    readonly start = output<Workout>();

    protected readonly holdSeconds = ROUTINE_HOLD_SECONDS;

    private readonly stretches = computed(() => {
        const workout = this.run.workout();
        return !workout || isActiveRest(workout)
            ? []
            : routineStretches(this.run.sets(), (id) => this.exercises.byId(id));
    });
    protected readonly routine = computed(() => stretchRoutine(this.stretches()));

    /**
     * The muscles the stretches are for, as the app names them: the ones this workout mainly
     * worked that they stretch, "Chest, Upper back and Quads".
     */
    protected readonly muscles = computed(() => {
        const stretched = new Set(this.stretches().flatMap((stretch) => stretch.mainMuscles));
        const worked = musclesInSets(this.run.sets(), (id) => this.exercises.byId(id)).main;
        return LIST.format(
            worked.filter((muscle) => stretched.has(muscle)).map((muscle) => MUSCLE_LABELS[muscle])
        );
    });

    /** "About 4 min", with each side and the switch between sides. */
    protected readonly time = computed(() => {
        const workout = this.routine();
        const sides = {
            first: this.settings.eachSideFirst(),
            switchSeconds: this.settings.switchSidesSeconds(),
        };
        const estimate = workout && estimateWorkout({ ...workout, sides }, []);
        return estimate ? estimateText(estimate) : { text: '', spoken: '' };
    });
}
