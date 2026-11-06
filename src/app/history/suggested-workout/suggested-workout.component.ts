import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { MUSCLE_LABELS } from '../../models/exercise';
import { setsByMuscle, suggestNextWorkout, weeklyAim } from '../../models/muscle-balance';
import { Workout } from '../../models/workout';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Glutes, Quads and Calves". */
const LIST = new Intl.ListFormat('en-GB');

let nextId = 0;

/**
 * A card with the saved workout for the muscles furthest short of their aims in the last seven
 * days (PRG-9), on the history page and the workout summary. Nothing shows with no workout to suggest.
 */
@Component({
    selector: 'app-suggested-workout',
    template: `
        @if (suggestion(); as suggested) {
            <section class="suggestion" [attr.aria-labelledby]="id">
                <h3 class="suggestion__label" [id]="id">Suggested next workout</h3>
                <p class="suggestion__title">{{ suggested.workout.title }}</p>
                <p class="suggestion__reason">{{ suggested.reason }}</p>
                @if (startable()) {
                    <button
                        type="button"
                        class="btn-main"
                        [attr.aria-label]="'Start ' + suggested.workout.title"
                        (click)="start(suggested.workout)"
                    >
                        Start
                    </button>
                }
            </section>
        }
    `,
    styleUrl: './suggested-workout.component.scss',
})
export class SuggestedWorkoutComponent {
    /** With a Start button, as the library's Start. */
    readonly startable = input(true);

    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly now = Date.now();
    protected readonly id = `suggestion-title-${nextId++}`;

    /** Sets per muscle in the last seven days. */
    private readonly weekSets = computed(() =>
        setsByMuscle(
            this.history.entries().filter((entry) => entry.startedAt >= this.now - 7 * DAY_MS),
            (id) => this.exercises.byId(id)
        )
    );

    protected readonly suggestion = computed(() => {
        const lastDone = new Map<string, number>();
        // Newest first, so the first of each workout is when it was last done
        for (const entry of this.history.entries()) {
            if (!lastDone.has(entry.workoutId)) {
                lastDone.set(entry.workoutId, entry.startedAt);
            }
        }
        const suggested = suggestNextWorkout(
            this.workouts.allWorkouts(),
            this.weekSets(),
            (id) => this.exercises.byId(id),
            lastDone,
            this.settings.trainingGoal()
        );
        if (!suggested) {
            return null;
        }
        const muscles = suggested.muscles.slice(0, 3).map((muscle) => {
            const sets = this.weekSets().get(muscle) ?? 0;
            const count = Number.isInteger(sets) ? `${sets}` : sets.toFixed(1);
            const { low } = weeklyAim(muscle, this.settings.trainingGoal());
            return `${MUSCLE_LABELS[muscle]} (${count} of ${low} sets)`;
        });
        return {
            workout: suggested.workout,
            reason: `For ${LIST.format(muscles)}, the least worked this week.`,
        };
    });

    protected start(workout: Workout) {
        this.run.start(workout);
        this.router.navigate(['/workout']);
    }
}
