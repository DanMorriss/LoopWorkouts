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
import { Exercise, MeasuredBy } from '../../models/exercise';
import { findByName, searchExercises } from '../../models/exercise-links';
import { swapSuggestions } from './swap-suggestions';
import { growFromClick } from '../../shared/dialog-origin';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { hint } from '../../workout-setup/exercise-picker/exercise-picker.component';

/**
 * Something to do instead of the step's exercise, mid-workout (RUN-11), e.g. when the machine
 * is taken: the closest few by the muscles they work, doable with your equipment, and a
 * search of the rest. Only exercises measured as the step is (reps or time) are offered, as
 * the step keeps its reps or time. Focus starts on the search box and is trapped inside
 * while it's open; ✕, Escape or a click outside close it. Where it's used, it has
 * animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-swap-exercise-dialog',
    imports: [CdkTrapFocus, MatIconModule],
    template: `
        <div
            class="swap-overlay dialog-overlay"
            role="presentation"
            (click)="closed.emit()"
            (keydown.escape)="closed.emit()"
        >
            <div
                #card
                class="swap dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby="swap-title"
                (click)="$event.stopPropagation()"
            >
                <div class="swap__header">
                    <h2 id="swap-title" class="swap__title">Swap {{ exercise().name }}</h2>
                    <button
                        type="button"
                        class="btn-icon swap__close"
                        aria-label="Close"
                        (click)="closed.emit()"
                    >
                        <mat-icon aria-hidden="true">close</mat-icon>
                    </button>
                </div>
                <p class="swap__hint">For the rest of this workout. Sets done so far stay.</p>

                <label class="picker-field swap__search" for="swap-search">
                    <span class="picker-field__label">Search exercises</span>
                    <span class="swap__search-box">
                        <mat-icon class="swap__search-icon" aria-hidden="true">search</mat-icon>
                        <input
                            id="swap-search"
                            class="picker-field__input swap__search-input"
                            type="search"
                            autocomplete="off"
                            placeholder="Name, e.g. squat"
                            cdkFocusInitial
                            [value]="query()"
                            (input)="onSearch($event)"
                        />
                    </span>
                </label>

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
            </div>
        </div>
    `,
    styleUrl: './swap-exercise-dialog.component.scss',
})
export class SwapExerciseDialogComponent {
    /** The step's exercise, to swap for another. */
    readonly exercise = input.required<Exercise>();
    /** How the step is measured, which what it's swapped for must be too. */
    readonly measuredBy = input.required<MeasuredBy>();
    readonly closed = output<void>();
    readonly picked = output<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    private readonly myEquipment = inject(SettingsStore).myEquipment;
    protected readonly query = signal('');
    protected readonly hintOf = hint;

    /** Exercises it could be swapped for: the same measure, not hidden, not itself. */
    private readonly candidates = computed(() =>
        this.exercises
            .exercises()
            .filter(
                (exercise) =>
                    exercise.measuredBy === this.measuredBy() && exercise.id !== this.exercise().id
            )
    );
    private readonly suggestions = computed(() =>
        swapSuggestions(
            this.exercise(),
            this.measuredBy(),
            this.candidates().filter((exercise) => !this.exercises.isHidden(exercise.id)),
            this.myEquipment()
        )
    );
    /** Found by name as the picker finds them: hidden ones only when named in full. */
    private readonly found = computed(() => {
        const typed = this.query().trim();
        const named = findByName(typed, this.candidates());
        const shown = this.candidates().filter(
            (exercise) => !this.exercises.isHidden(exercise.id) || exercise === named
        );
        return searchExercises(typed, shown).map((match) => match.exercise);
    });
    private readonly searching = computed(() => this.query().trim() !== '');

    protected readonly options = computed(() =>
        this.searching() ? this.found() : this.suggestions()
    );
    protected readonly heading = computed(() =>
        this.searching()
            ? this.found().length === 1
                ? '1 match'
                : `${this.found().length} matches`
            : this.myEquipment().length
              ? 'Same muscles, with your equipment'
              : 'Same muscles'
    );
    protected readonly emptyText = computed(() =>
        this.searching()
            ? `No exercise measured in ${this.measuredBy() === 'reps' ? 'reps' : 'time'} matches that.`
            : 'Nothing else works the same muscles. Search for one above.'
    );

    protected onSearch(event: Event) {
        this.query.set((event.target as HTMLInputElement).value);
    }

    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

    constructor() {
        // Grows out of the Swap button that opened it, and shrinks back into it
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }
}
