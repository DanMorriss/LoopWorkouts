import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogBackComponent } from '../../shared/components/dialog-back/dialog-back.component';
import { Exercise, MuscleGroup } from '../../models/exercise';
import { findByName } from '../../models/exercise-links';
import {
    exerciseCard,
    ExerciseCardComponent,
} from '../../exercises/exercise-card/exercise-card.component';
import { filterExercises } from '../../exercises/exercise-filter';
import { MuscleChipsComponent } from '../../exercises/muscle-chips/muscle-chips.component';
import { EquipmentFilterComponent } from '../../shared/components/equipment-filter/equipment-filter.component';
import { growFromClick } from '../../shared/dialog-origin';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';

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
        CdkTrapFocus,
        DialogBackComponent,
        MatIconModule,
        EquipmentFilterComponent,
        ExerciseCardComponent,
        MuscleChipsComponent,
    ],
    template: `
        <div
            class="browse-overlay dialog-overlay"
            role="presentation"
            (click)="closed.emit()"
            (keydown.escape)="closed.emit()"
        >
            <div
                #card
                class="browse dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby="browse-title"
                aria-describedby="browse-hint"
                (click)="$event.stopPropagation()"
            >
                <app-dialog-back (back)="closed.emit()" />
                <h2 id="browse-title" class="browse__title">Browse exercises</h2>
                <p id="browse-hint" class="browse__hint">Pick one for step {{ stepNumber() }}.</p>

                <label class="picker-field browse__search" for="browse-search">
                    <span class="picker-field__label">Search</span>
                    <span class="browse__search-box">
                        <mat-icon class="browse__search-icon" aria-hidden="true">search</mat-icon>
                        <input
                            id="browse-search"
                            class="picker-field__input browse__search-input"
                            type="search"
                            autocomplete="off"
                            placeholder="Name, e.g. squat"
                            cdkFocusInitial
                            [value]="query()"
                            (input)="onSearch($event)"
                        />
                    </span>
                </label>

                <app-equipment-filter class="browse__kit" idPrefix="browse" things="Exercises" />

                <app-muscle-chips class="browse__chips" [(selected)]="muscles" />

                <p class="browse__count" role="status">
                    {{ cards().length }} {{ cards().length === 1 ? 'exercise' : 'exercises' }}
                </p>

                @if (cards().length === 0) {
                    <div class="browse__empty">
                        <p>No exercises match.</p>
                        <button type="button" class="btn-pill" (click)="clearFilters()">
                            Clear search and filters
                        </button>
                    </div>
                }

                <ul class="browse__list" aria-label="Exercises">
                    @for (item of cards(); track item.exercise.id) {
                        <li>
                            <app-exercise-card
                                [card]="item"
                                [picks]="true"
                                (picked)="picked.emit($event)"
                            />
                        </li>
                    }
                </ul>
            </div>
        </div>
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
        const all = this.exercises.exercises();
        // Hidden ones are left out, unless their name is typed in full
        const named = findByName(this.query().trim(), all);
        const shown = all.filter(
            (exercise) => !this.exercises.isHidden(exercise.id) || exercise === named
        );
        return filterExercises(shown, {
            query: this.query(),
            muscles: this.muscles(),
            onlyMine: this.settings.onlyMyEquipment(),
            myEquipment: this.settings.myEquipment(),
        }).map(({ exercise, otherName }) => exerciseCard(exercise, otherName));
    });

    protected onSearch(event: Event) {
        this.query.set((event.target as HTMLInputElement).value);
    }

    protected clearFilters() {
        this.query.set('');
        this.muscles.set([]);
        this.settings.update({ onlyMyEquipment: false });
        document.getElementById('browse-search')?.focus();
    }

    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

    constructor() {
        // Grows out of the button that opened it, and shrinks back into it
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }
}
