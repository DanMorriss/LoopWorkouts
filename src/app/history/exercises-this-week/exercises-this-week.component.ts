import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { describeWeek, WeekLine } from '../../exercises/progress-format';
import { exercisePath } from '../../models/exercise';
import { lastSevenDaysFrom } from '../../models/history';
import { exerciseWeeks } from '../../models/progress';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { ShownHistory } from '../shown-history';

/** How many show before Show all. */
const SHOWN = 6;

interface WeekRow extends WeekLine {
    id: string;
    name: string;
    path: string;
    sets: number;
}

/**
 * Each exercise done in the last 7 days, on Progress (PRG-13): its reps (or time) and sets,
 * and the personal bests it set, those with one first, then most sets, then A to Z. The first
 * few show, and the rest on Show all. Nothing shows with nothing done.
 */
@Component({
    selector: 'app-exercises-this-week',
    imports: [RouterLink],
    templateUrl: './exercises-this-week.component.html',
    styleUrl: './exercises-this-week.component.scss',
})
export class ExercisesThisWeekComponent {
    private readonly history = inject(ShownHistory);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly now = Date.now();

    protected readonly shownCount = SHOWN;
    protected readonly showAll = signal(false);

    protected readonly rows = computed((): WeekRow[] => {
        const rows: WeekRow[] = [];
        for (const week of exerciseWeeks(this.history.entries(), lastSevenDaysFrom(this.now))) {
            // One since deleted isn't anyone's
            const exercise = this.exercises.byId(week.exerciseId);
            if (exercise) {
                rows.push({
                    id: week.exerciseId,
                    name: exercise.name,
                    path: exercisePath(exercise),
                    sets: week.sets,
                    ...describeWeek(week, this.settings.weightUnit()),
                });
            }
        }
        return rows.sort(
            (a, b) =>
                Number(b.bests.length > 0) - Number(a.bests.length > 0) ||
                b.sets - a.sets ||
                a.name.localeCompare(b.name)
        );
    });

    protected readonly shown = computed(() =>
        this.showAll() ? this.rows() : this.rows().slice(0, SHOWN)
    );
}
