import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isStretch } from '../../models/built-in-stretches';
import { MUSCLE_LABELS } from '../../models/exercise';
import { setsByMuscle, SuggestionAvoid, suggestNextWorkout } from '../../models/muscle-balance';
import { nextPlannedDay, thisWeek, weekdayOf, WEEKDAYS } from '../../models/plan';
import { musclesWorked } from '../../models/workout-muscles';
import { Workout } from '../../models/workout';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { injectStartWorkout } from '../../shared/run/start-workout';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Glutes, Quads and Calves". */
const LIST = new Intl.ListFormat('en-GB');

let nextId = 0;

/**
 * A card with the workout for the muscles furthest short of their aims in the last seven days
 * (PRG-9), on the history page, the workout summary and Today. Nothing shows with no workout to
 * suggest.
 *
 * On a rest day in a planned week (`restDay`), it's offered, not pressed: resting is fine too.
 * It steers clear of the workout planned next this week and of most of its main muscles, and
 * says so, e.g. "and leaves your Quads and Glutes fresh for Legs day on Thursday".
 *
 * It says which muscles in words, not their sets and aims, with a link to the bars on Progress
 * for those.
 */
@Component({
    selector: 'app-suggested-workout',
    imports: [IconComponent, RouterLink],
    template: `
        @if (suggestion(); as suggested) {
            <section class="suggestion" [attr.aria-labelledby]="id">
                <h3 class="suggestion__label" [id]="id">
                    {{ restDay() ? 'Fancy a workout today?' : 'Suggested next workout' }}
                </h3>
                @if (restDay()) {
                    <p class="suggestion__reason">
                        Nothing's planned today, so resting is fine too. If you'd like to train:
                    </p>
                }
                <p class="suggestion__title">{{ suggested.workout.title }}</p>
                <p class="suggestion__reason">{{ suggested.reason }}</p>
                <a class="suggestion__more" routerLink="/history">
                    See your week
                    <app-icon>chevron_right</app-icon>
                </a>
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
    /** On Today, on a day of a planned week with nothing planned (PLN-2). */
    readonly restDay = input(false);

    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly plan = inject(PlanStore);
    protected readonly start = injectStartWorkout();
    private readonly now = Date.now();
    protected readonly id = `suggestion-title-${nextId++}`;

    /** Sets per muscle in the last seven days. */
    private readonly weekSets = computed(() =>
        setsByMuscle(
            this.history.entries().filter((entry) => entry.startedAt >= this.now - 7 * DAY_MS),
            (id) => this.exercises.byId(id)
        )
    );

    /**
     * On a rest day, the workouts planned on the next day this week with any, to leave alone,
     * with their main muscles; null with none to come.
     */
    private readonly nextPlanned = computed(() => {
        if (!this.restDay()) {
            return null;
        }
        const week = thisWeek(
            this.plan.plan(),
            this.history.entries(),
            this.now,
            (id) => this.workouts.findAnyWorkout(id) !== null
        );
        const day = nextPlannedDay(week, weekdayOf(this.now));
        if (day < 0) {
            return null;
        }
        const workouts = week[day].map(
            (planned) => this.workouts.findAnyWorkout(planned.workoutId)!
        );
        // A stretch leaves nothing to keep fresh, so a mobility day's muscles aren't avoided
        const { main } = musclesWorked(workouts, (id) =>
            isStretch(id) ? undefined : this.exercises.byId(id)
        );
        return { day, workouts, muscles: new Set(main) };
    });

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
            this.settings.trainingGoal(),
            this.avoid()
        );
        if (!suggested) {
            return null;
        }
        const muscles = suggested.muscles.slice(0, 3);
        const untrained = muscles.every((muscle) => !this.weekSets().get(muscle));
        const labels = muscles.map((muscle) => MUSCLE_LABELS[muscle]);
        const which = untrained
            ? `which you haven't trained in the last 7 days`
            : `which you've trained least in the last 7 days`;
        return {
            workout: suggested.workout,
            reason: `It works your ${LIST.format(labels)}, ${which}${this.leavesFresh(suggested.workout)}.`,
        };
    });

    private readonly avoid = computed((): SuggestionAvoid | undefined => {
        const next = this.nextPlanned();
        return next
            ? { workoutIds: new Set(next.workouts.map((w) => w.id)), muscles: next.muscles }
            : undefined;
    });

    /**
     * ", and leaves your Quads and Glutes fresh for Legs day on Thursday": the main muscles
     * of the next planned workout that `workout` doesn't work as main ones, up to two. Nothing
     * when there's none to come, or it works them all.
     */
    private leavesFresh(workout: Workout): string {
        const next = this.nextPlanned();
        if (!next) {
            return '';
        }
        const { main } = musclesWorked([workout], (id) => this.exercises.byId(id));
        const fresh = [...next.muscles].filter((muscle) => !main.includes(muscle)).slice(0, 2);
        if (fresh.length === 0) {
            return '';
        }
        const name = next.workouts[0].title.trim() || 'your next workout';
        return `, and leaves your ${LIST.format(fresh.map((m) => MUSCLE_LABELS[m]))} fresh for ${name} on ${WEEKDAYS[next.day]}`;
    }
}
