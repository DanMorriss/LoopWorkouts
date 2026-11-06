import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { muscleBalance, setsByMuscle } from '../../models/muscle-balance';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { ShownHistory } from '../shown-history';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { MuscleBarsComponent } from '../muscle-bars/muscle-bars.component';

const DAY_MS = 24 * 60 * 60 * 1000;

let nextId = 0;

/**
 * A card with the muscles used in the last seven days, on the Progress page and Today: a body
 * map shaded by sets (PRG-6), then a bar per muscle group against the sets a week aimed for
 * (PRG-8). Nothing shows with no sets in the week, so a blank map is never shown. `compact`
 * (Today) leaves the bars out, with a link to them on Progress.
 */
@Component({
    selector: 'app-muscles-this-week',
    imports: [BodyMapComponent, IconComponent, MuscleBarsComponent, RouterLink],
    template: `
        @if (musclesWorked().hasData) {
            <section class="muscles-week" [attr.aria-labelledby]="id">
                <h3 class="muscles-week__title" [id]="id">Muscles worked this week</h3>
                <app-body-map
                    [main]="musclesWorked().main"
                    [supporting]="musclesWorked().supporting"
                />
                @if (compact()) {
                    <a class="muscles-week__more" routerLink="/history">
                        How each muscle's doing against its aim, on Progress
                        <app-icon>chevron_right</app-icon>
                    </a>
                } @else {
                    <app-muscle-bars
                        class="muscles-week__bars"
                        [balance]="musclesWorked().balance"
                        [goal]="settings.trainingGoal()"
                    />
                }
            </section>
        }
    `,
    styleUrl: './muscles-this-week.component.scss',
})
export class MusclesThisWeekComponent {
    /** Just the body map, with a link to the bars on Progress (Today). */
    readonly compact = input(false);

    private readonly history = inject(ShownHistory);
    private readonly exercises = inject(ExerciseStore);
    protected readonly settings = inject(SettingsStore);
    private readonly now = Date.now();
    protected readonly id = `muscles-week-title-${nextId++}`;

    /** Sets per muscle in the last seven days. */
    private readonly weekSets = computed(() =>
        setsByMuscle(
            this.history.entries().filter((entry) => entry.startedAt >= this.now - 7 * DAY_MS),
            (id) => this.exercises.byId(id)
        )
    );

    /**
     * A muscle with a set or more shades as main on the body map, under that as supporting;
     * the bars go most worked first.
     */
    protected readonly musclesWorked = computed(() => {
        const balance = muscleBalance(this.weekSets(), this.settings.trainingGoal());
        return {
            hasData: this.weekSets().size > 0,
            main: balance.filter(({ sets }) => sets >= 1).map(({ muscle }) => muscle),
            supporting: balance
                .filter(({ sets }) => sets > 0 && sets < 1)
                .map(({ muscle }) => muscle),
            balance,
        };
    });
}
