import { computed, inject, Signal } from '@angular/core';
import { isStretch } from '../../models/built-in-stretches';
import { MUSCLE_LABELS } from '../../models/exercise';
import { inLastSevenDays } from '../../models/history';
import { setsByMuscle, SuggestionAvoid, suggestNextWorkouts } from '../../models/muscle-balance';
import { nextPlannedDay, thisWeek, weekdayOf, WEEKDAYS } from '../../models/plan';
import { Workout } from '../../models/workout';
import { canDoWorkoutWith } from '../../models/workout-filter';
import { musclesWorked } from '../../models/workout-muscles';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';

/** "Glutes, Quads and Calves". */
const LIST = new Intl.ListFormat('en-GB');

/** A workout to do next, and why, as the suggestion card says it. */
export interface WorkoutSuggestion {
    workout: Workout;
    /** "It works your Chest, which you haven't trained in the last 7 days." */
    reason: string;
}

/**
 * The workouts to suggest next (PRG-9), best first, up to `most`, each with why: for the
 * muscles furthest short of their aims in the last seven days, that you've the equipment
 * for. On a rest day in a planned week (`restDay`), steering clear of the next planned
 * workout and most of its muscles, and saying which it leaves fresh. Call it in an injection
 * context; `now` is when the page opened.
 */
export function injectSuggestedWorkouts(options: SuggestionOptions): Signal<WorkoutSuggestion[]> {
    return new SuggestedWorkouts(options).suggestions;
}

interface SuggestionOptions {
    restDay: Signal<boolean>;
    most: Signal<number>;
    now: number;
}

class SuggestedWorkouts {
    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly plan = inject(PlanStore);
    constructor(private readonly options: SuggestionOptions) {}

    /** Sets per muscle in the last seven days. */
    private readonly weekSets = computed(() =>
        setsByMuscle(inLastSevenDays(this.history.entries(), this.options.now), (id) =>
            this.exercises.byId(id)
        )
    );

    /**
     * On a rest day, the workouts planned on the next day this week with any, to leave alone,
     * with their main muscles; null with none to come.
     */
    private readonly nextPlanned = computed(() => {
        if (!this.options.restDay()) {
            return null;
        }
        const week = thisWeek(
            this.plan.plan(),
            this.history.entries(),
            this.options.now,
            (id) => this.workouts.findAnyWorkout(id) !== null,
            (id) => this.workouts.isActiveRest(id)
        );
        const day = nextPlannedDay(week, weekdayOf(this.options.now));
        if (day < 0) {
            return null;
        }
        // Its training: active rest on the same day leaves nothing to keep fresh
        const workouts = week[day]
            .filter((planned) => !planned.activeRest)
            .map((planned) => this.workouts.findAnyWorkout(planned.workoutId)!);
        // Nor does a stretch among its exercises
        const { main } = musclesWorked(workouts, (id) =>
            isStretch(id) ? undefined : this.exercises.byId(id)
        );
        return { day, workouts, muscles: new Set(main) };
    });

    /** The workouts to suggest, best first, each with why. */
    readonly suggestions = computed((): WorkoutSuggestion[] => {
        const lastDone = new Map<string, number>();
        // Newest first, so the first of each workout is when it was last done
        for (const entry of this.history.entries()) {
            if (!lastDone.has(entry.workoutId)) {
                lastDone.set(entry.workoutId, entry.startedAt);
            }
        }
        return suggestNextWorkouts(
            this.doable(),
            this.weekSets(),
            (id) => this.exercises.byId(id),
            lastDone,
            this.settings.weeklySets(),
            this.avoid(),
            this.options.most()
        ).map((suggested) => {
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
    });

    /** The workouts you can do with your equipment: all of them, with none picked yet. */
    private readonly doable = computed(() => {
        const kit = this.settings.myEquipment();
        const all = this.workouts.allWorkouts();
        return kit.length === 0
            ? all
            : all.filter((workout) =>
                  canDoWorkoutWith(workout, kit, (id) => this.exercises.byId(id))
              );
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
