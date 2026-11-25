import { computed, inject, LOCALE_ID, Signal } from '@angular/core';
import { describeWeek, WeekBest, WeekLine } from '../exercises/progress-format';
import { exercisePath, exerciseSlug } from '../models/exercise';
import { lastSevenDaysFrom } from '../models/history';
import { exerciseWeeks } from '../models/progress';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { ShownHistory } from './shown-history';

/** An exercise done in the last 7 days, as Progress lists it (PRG-13). */
export interface WeekRow extends WeekLine {
    id: string;
    name: string;
    /** The last part of its page's address, e.g. "back-squat". */
    slug: string;
    path: string;
    sets: number;
    /** A pip for each set: solid, or hollow for a timed set. */
    pips: ('reps' | 'timed')[];
}

/** A new best set this week, and the exercise it's for. */
export interface WeekBestOf extends WeekBest {
    name: string;
    path: string;
}

/**
 * Each exercise done in the last 7 days, most sets first, then A to Z, with its totals and new
 * bests, from the history Progress shows; and the new bests on their own, in the same order.
 * Call it in an injection context.
 */
export function injectWeekRows(): {
    rows: Signal<WeekRow[]>;
    bests: Signal<WeekBestOf[]>;
} {
    const history = inject(ShownHistory);
    const exercises = inject(ExerciseStore);
    const settings = inject(SettingsStore);
    const locale = inject(LOCALE_ID);
    const now = Date.now();
    const rows = computed((): WeekRow[] => {
        const rows: WeekRow[] = [];
        for (const week of exerciseWeeks(history.entries(), lastSevenDaysFrom(now))) {
            // One since deleted isn't anyone's
            const exercise = exercises.byId(week.exerciseId);
            if (exercise) {
                rows.push({
                    id: week.exerciseId,
                    name: exercise.name,
                    slug: exerciseSlug(exercise),
                    path: exercisePath(exercise),
                    sets: week.sets,
                    pips: [
                        ...Array<'reps'>(week.sets - week.timedSets).fill('reps'),
                        ...Array<'timed'>(week.timedSets).fill('timed'),
                    ],
                    ...describeWeek(week, settings.weightUnit(), locale),
                });
            }
        }
        return rows.sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
    });
    const bests = computed((): WeekBestOf[] =>
        rows().flatMap((row) =>
            row.bests.map((best) => ({ ...best, name: row.name, path: row.path }))
        )
    );
    return { rows, bests };
}
