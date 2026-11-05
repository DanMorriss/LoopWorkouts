import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { Exercise, exerciseHint, isBuiltIn } from '../../models/exercise';
import { findByName, searchExercises } from '../../models/exercise-links';
import { ExerciseStore } from '../../shared/state/exercise-store.service';

/** One row of the list: an exercise to pick, or making a new one from what's typed. */
type PickerOption =
    | { kind: 'exercise'; exercise: Exercise; otherName?: string; hint: string }
    | { kind: 'make'; name: string };

let nextId = 0;

/**
 * A step's name box that finds exercises as you type (EXR-2): a combobox whose list holds
 * the built-in exercises and your own that match (not hidden ones, unless their whole name
 * is typed), and "Make '…'" when no exercise has the
 * name typed. Picking an exercise fills in its name and links the step to it; typing drops
 * the link, so the step goes by its name again. Making one keeps the name, and the
 * exercise is made when the workout is saved (see `linkSteps()`), so nothing is left behind
 * if the workout isn't.
 *
 * Works with Signal Forms: bind the name with `[formField]` and the link with
 * `[(exerciseId)]`. `exerciseChange` says when the step becomes another exercise: on
 * picking one, or on leaving the box (or pressing Enter) with another's name typed in it.
 */
@Component({
    selector: 'app-exercise-picker',
    imports: [MatIconModule],
    templateUrl: './exercise-picker.component.html',
    styleUrl: './exercise-picker.component.scss',
})
export class ExercisePickerComponent implements FormValueControl<string> {
    /** The step's name. */
    readonly value = model('');
    /** The id of the exercise picked for the step, or '' if it goes by its name. */
    readonly exerciseId = model('');
    readonly inputId = input.required<string>();
    readonly placeholder = input('');
    readonly describedBy = input<string>();
    /**
     * The step is now this exercise, which it wasn't when the box was last left: picked, or
     * its name typed. Not as each letter is typed, so a half-typed name doesn't count.
     */
    readonly exerciseChange = output<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    protected readonly listId = `exercise-picker-${nextId++}`;

    protected readonly open = signal(false);
    /** The option the arrow keys are on, or -1 for none. */
    protected readonly active = signal(-1);

    protected readonly options = computed((): PickerOption[] => {
        const typed = this.value().trim();
        const named = findByName(typed, this.exercises.exercises());
        const found: PickerOption[] = searchExercises(typed, this.exercises.shownFor(typed)).map(
            (match) => ({
                kind: 'exercise',
                ...match,
                hint: exerciseHint(match.exercise),
            })
        );
        return typed && !named
            ? [...found, { kind: 'make', name: typed.replace(/\s+/g, ' ') }]
            : found;
    });
    protected readonly expanded = computed(() => this.open() && this.options().length > 0);
    protected readonly activeOptionId = computed(() =>
        this.expanded() && this.active() >= 0 ? this.optionId(this.active()) : null
    );

    protected readonly isBuiltIn = isBuiltIn;

    /** The id of the exercise the step was when last said, so it's only said once. */
    private saidExerciseId: string | null = null;

    /** The exercise the step is: the one picked, or else the one its name means. */
    private current(): Exercise | undefined {
        const all = this.exercises.exercises();
        const picked = this.exerciseId();
        return (
            (picked ? all.find((exercise) => exercise.id === picked) : undefined) ??
            findByName(this.value(), all)
        );
    }

    protected onFocus() {
        this.saidExerciseId = this.current()?.id ?? '';
    }

    /** Says if the step is now another exercise than it was. */
    protected settle() {
        const exercise = this.current();
        const id = exercise?.id ?? '';
        if (this.saidExerciseId !== null && id === this.saidExerciseId) {
            return;
        }
        this.saidExerciseId = id;
        if (exercise) {
            this.exerciseChange.emit(exercise);
        }
    }

    protected optionId(index: number): string {
        return `${this.listId}-${index}`;
    }

    protected onInput(event: Event) {
        this.value.set((event.target as HTMLInputElement).value);
        // Typed over, so the step goes by its name until something is picked
        this.exerciseId.set('');
        this.active.set(-1);
        this.open.set(true);
    }

    protected onKeydown(event: KeyboardEvent) {
        const count = this.options().length;
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                event.preventDefault();
                if (!this.expanded()) {
                    this.open.set(true);
                    this.active.set(event.key === 'ArrowDown' ? 0 : this.options().length - 1);
                    return;
                }
                const by = event.key === 'ArrowDown' ? 1 : -1;
                this.active.update((i) => (i + by + count) % count);
                return;
            }
            case 'Enter':
                // Picks the option the arrow keys are on, rather than submitting the form
                if (this.activeOptionId()) {
                    event.preventDefault();
                    this.choose(this.options()[this.active()]);
                }
                return;
            case 'Escape':
                if (this.expanded()) {
                    // Closes the list, not anything around it
                    event.preventDefault();
                    event.stopPropagation();
                    this.close();
                }
                return;
        }
    }

    protected choose(option: PickerOption) {
        if (option.kind === 'exercise') {
            this.value.set(option.exercise.name);
            this.exerciseId.set(option.exercise.id);
        } else {
            this.value.set(option.name);
            this.exerciseId.set('');
        }
        this.close();
        this.settle();
    }

    protected close() {
        this.open.set(false);
        this.active.set(-1);
    }
}
