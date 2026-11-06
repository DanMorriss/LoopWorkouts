import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogComponent } from '../dialog/dialog.component';
import {
    Equipment,
    Exercise,
    exerciseHint,
    hasNoEquipment,
    MeasuredBy,
} from '../../../models/exercise';
import { searchExercises } from '../../../models/exercise-links';
import { swapSuggestions } from './swap-suggestions';
import { ExerciseStore } from '../../state/exercise-store.service';
import { SettingsStore } from '../../state/settings-store.service';
import { counted } from '../../format-count';
import { SearchFieldComponent } from '../search-field/search-field.component';

/**
 * Something to do instead of a step's exercise: mid-workout (RUN-11), e.g. when the machine is
 * taken, or while setting a workout up (BLD-14): the closest few by the muscles they work,
 * doable with your equipment, and a search of the rest. Only exercises measured as the step
 * is (reps or time) are offered, as the step keeps its reps or time. Focus starts on the
 * search box and is trapped inside while it's open; ‹ Back, Escape or a click outside close it.
 * Where it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-swap-exercise-dialog',
    imports: [DialogComponent, MatIconModule, SearchFieldComponent],
    template: `
        <app-dialog labelledBy="swap-title" [width]="440" (closed)="closed.emit()">
            <h2 id="swap-title" class="swap__title">Swap {{ exercise().name }}</h2>
            @if (hint()) {
                <p class="swap__hint">{{ hint() }}</p>
            }

            <app-search-field
                class="swap__search"
                inputId="swap-search"
                label="Search exercises"
                [focusFirst]="true"
                [(value)]="query"
            />

            <h3 class="swap__heading" id="swap-list-heading" aria-live="polite">
                {{ heading() }}
            </h3>
            @if (options().length) {
                <ul class="swap__options" aria-labelledby="swap-list-heading">
                    @for (option of options(); track option.id) {
                        <li>
                            <button
                                type="button"
                                class="menu__item swap__option"
                                (click)="picked.emit(option)"
                            >
                                <mat-icon aria-hidden="true">swap_horiz</mat-icon>
                                <span class="swap__text">
                                    <span class="swap__name">{{ option.name }}</span>
                                    @if (hintOf(option); as line) {
                                        <span class="swap__detail">{{ line }}</span>
                                    }
                                </span>
                            </button>
                        </li>
                    }
                </ul>
            } @else {
                <p class="swap__none">{{ emptyText() }}</p>
            }
        </app-dialog>
    `,
    styleUrl: './swap-exercise-dialog.component.scss',
})
export class SwapExerciseDialogComponent {
    /** The step's exercise, to swap for another. */
    readonly exercise = input.required<Exercise>();
    /** How the step is measured, which what it's swapped for must be too. */
    readonly measuredBy = input.required<MeasuredBy>();
    /** A line under the title on what swapping does, e.g. "For the rest of this workout." */
    readonly hint = input('');
    readonly closed = output<void>();
    readonly picked = output<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    private readonly myEquipment = inject(SettingsStore).myEquipment;
    protected readonly query = signal('');
    protected readonly hintOf = exerciseHint;

    /** Exercises it could be swapped for: the same measure, not hidden, not itself. */
    private readonly candidates = computed(() =>
        this.exercises
            .exercises()
            .filter(
                (exercise) =>
                    exercise.measuredBy === this.measuredBy() && exercise.id !== this.exercise().id
            )
    );
    private readonly closest = (myEquipment: readonly Equipment[]) =>
        swapSuggestions(
            this.exercise(),
            this.measuredBy(),
            this.candidates().filter((exercise) => !this.exercises.isHidden(exercise.id)),
            myEquipment
        );
    private readonly withMyEquipment = computed(() => this.closest(this.myEquipment()));
    /**
     * Whether none of the closest can be done with your equipment, so they're offered
     * whatever they need rather than nothing, e.g. only kettlebells for a chainsaw row.
     */
    private readonly beyondMyEquipment = computed(
        () => this.withMyEquipment().length === 0 && this.myEquipment().length > 0
    );
    private readonly suggestions = computed(() =>
        this.beyondMyEquipment() ? this.closest([]) : this.withMyEquipment()
    );
    /** Found by name as the picker finds them: hidden ones only when named in full. */
    private readonly found = computed(() => {
        const typed = this.query().trim();
        return searchExercises(typed, this.exercises.shownFor(typed, this.candidates())).map(
            (match) => match.exercise
        );
    });
    private readonly searching = computed(() => this.query().trim() !== '');

    protected readonly options = computed(() =>
        this.searching() ? this.found() : this.suggestions()
    );
    protected readonly heading = computed(() =>
        this.searching()
            ? counted(this.found().length, 'match', 'matches')
            : this.beyondMyEquipment()
              ? 'Same muscles, needing other equipment'
              : hasNoEquipment(this.myEquipment())
                ? 'Same muscles, needing no equipment'
                : this.myEquipment().length
                  ? 'Same muscles, with your equipment'
                  : 'Same muscles'
    );
    protected readonly emptyText = computed(() =>
        this.searching()
            ? `No exercise measured in ${this.measuredBy() === 'reps' ? 'reps' : 'time'} matches that.`
            : 'Nothing else works the same muscles. Search for one above.'
    );
}
