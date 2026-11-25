import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { injectWeekRows } from '../week-rows';

/** How many show before Show all. */
const SHOWN = 6;

/**
 * Each exercise done in the last 7 days, on Progress (PRG-13), most sets first, then A to Z,
 * with a pip for each set and its reps (or time) and volume. The first few show, and the rest
 * on Show all. Nothing shows with nothing done. Each links to its page, whose ‹ comes back with
 * `?exercise=<slug>`, which brings its row back into view and focuses it. The week's new bests
 * are at the top of the page (`WeekBestsComponent`).
 */
@Component({
    selector: 'app-exercises-this-week',
    imports: [RouterLink, IconComponent],
    templateUrl: './exercises-this-week.component.html',
    styleUrl: './exercises-this-week.component.scss',
})
export class ExercisesThisWeekComponent {
    protected readonly shownCount = SHOWN;
    protected readonly showAll = signal(false);

    protected readonly rows = injectWeekRows().rows;

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
