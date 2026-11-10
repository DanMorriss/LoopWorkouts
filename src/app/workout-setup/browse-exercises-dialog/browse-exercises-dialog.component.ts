import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { Exercise, MuscleGroup } from '../../models/exercise';
import { exerciseCard } from '../../exercises/exercise-card/exercise-card.component';
import { ExerciseCardsComponent } from '../../exercises/exercise-cards/exercise-cards.component';
import { filterExercises } from '../../exercises/exercise-filter';
import { MuscleChipsComponent } from '../../shared/components/muscle-chips/muscle-chips.component';
import { EquipmentFilterComponent } from '../../shared/components/equipment-filter/equipment-filter.component';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';

/**
 * Browse for a step's exercise in Create (BLD-16): the exercises as the Exercises list has
 * them (search, Only what I have, the main-muscle chips, a card each with its muscles and
 * equipment), over Create so the workout being made stays as it is. Picking a card emits it.
 * Hidden ones are left out, as the picker leaves them out, unless their whole name is typed.
 * Focus starts on the search box and is trapped inside while it's open; ‹ Back, Escape or a click
 * outside close it. Where it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-browse-exercises-dialog',
    imports: [
        DialogComponent,
        SearchFieldComponent,
        EquipmentFilterComponent,
        ExerciseCardsComponent,
        MuscleChipsComponent,
    ],
    template: `
        <app-dialog labelledBy="browse-title" describedBy="browse-hint" (closed)="closed.emit()">
            <h2 id="browse-title" class="browse__title">Browse exercises</h2>
            <p id="browse-hint" class="browse__hint">Pick one for step {{ stepNumber() }}.</p>

            <app-search-field
                class="browse__search"
                inputId="browse-search"
                [focusFirst]="true"
                [(value)]="query"
            />

            <app-equipment-filter class="browse__kit" idPrefix="browse" things="Exercises" />

            <app-muscle-chips class="browse__chips" [(selected)]="muscles" />

            <app-exercise-cards
                label="Exercises"
                [cards]="cards()"
                [picks]="true"
                (picked)="picked.emit($event)"
                (cleared)="clearFilters()"
            />
        </app-dialog>
    `,
    styleUrl: './browse-exercises-dialog.component.scss',
})
export class BrowseExercisesDialogComponent {
    /** The step it's picking for, as Create numbers it. */
    readonly stepNumber = input.required<number>();
    readonly closed = output<void>();
    readonly picked = output<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);

    protected readonly query = signal('');
    protected readonly muscles = signal<MuscleGroup[]>([]);

    protected readonly cards = computed(() => {
        return filterExercises(this.exercises.shownFor(this.query().trim()), {
            query: this.query(),
            muscles: this.muscles(),
            onlyMine: this.settings.onlyMyEquipment(),
            myEquipment: this.settings.myEquipment(),
        }).map(({ exercise, otherName }) => exerciseCard(exercise, otherName));
    });

    protected clearFilters() {
        this.query.set('');
        this.muscles.set([]);
        this.settings.update({ onlyMyEquipment: false });
        document.getElementById('browse-search')?.focus();
    }
}
