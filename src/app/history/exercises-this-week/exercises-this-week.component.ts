import { Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { describeWeek, WeekLine } from '../../exercises/progress-format';
import { exercisePath, exerciseSlug } from '../../models/exercise';
import { lastSevenDaysFrom } from '../../models/history';
import { exerciseWeeks } from '../../models/progress';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { ShownHistory } from '../shown-history';
import { NewBestTile, NewBestTilesComponent } from './new-best-tiles/new-best-tiles.component';

/** How many show before Show all. */
const SHOWN = 6;

interface WeekRow extends WeekLine {
    id: string;
    name: string;
    /** The last part of its page's address, e.g. "back-squat". */
    slug: string;
    path: string;
    sets: number;
    /** A pip for each set, in the rep violet or, for a timed set, the rest blue. */
    pips: ('reps' | 'timed')[];
}

/**
 * Each exercise done in the last 7 days, on Progress (PRG-13). Over them, the personal bests
 * set this week, as tiles swiped between; then each exercise, most sets first, then A to Z,
 * with a pip for each set and its reps (or time) and volume. The first few show, and the rest
 * on Show all. Nothing shows with nothing done. Each links to its page, whose ‹ comes back with
 * `?exercise=<slug>`, which brings its row back into view and focuses it.
 */
@Component({
    selector: 'app-exercises-this-week',
    imports: [RouterLink, IconComponent, NewBestTilesComponent],
    templateUrl: './exercises-this-week.component.html',
    styleUrl: './exercises-this-week.component.scss',
})
export class ExercisesThisWeekComponent {
    private readonly history = inject(ShownHistory);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly locale = inject(LOCALE_ID);
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
                    slug: exerciseSlug(exercise),
                    path: exercisePath(exercise),
                    sets: week.sets,
                    pips: [
                        ...Array<'reps'>(week.sets - week.timedSets).fill('reps'),
                        ...Array<'timed'>(week.timedSets).fill('timed'),
                    ],
                    ...describeWeek(week, this.settings.weightUnit(), this.locale),
                });
            }
        }
        return rows.sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
    });

    /** Every new best this week, in the order of the exercises they're for. */
    protected readonly bests = computed((): NewBestTile[] =>
        this.rows().flatMap((row) =>
            row.bests.map((best) => ({ ...best, name: row.name, path: row.path }))
        )
    );

    protected readonly shown = computed(() =>
        this.showAll() ? this.rows() : this.rows().slice(0, SHOWN)
    );

    constructor() {
        // Back from an exercise's page: its row, shown even if it's past the first few
        const back = inject(ActivatedRoute).snapshot.queryParamMap.get('exercise');
        const index = this.rows().findIndex((row) => row.slug === back);
        if (index >= 0) {
            this.showAll.set(index >= SHOWN);
            injectFocusAfterRender()(`week-${back}`);
        }
    }
}
