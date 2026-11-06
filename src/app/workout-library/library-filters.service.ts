import { computed, inject, Service, signal } from '@angular/core';
import { BUILT_IN_WORKOUTS } from '../models/built-in-workouts';
import { MuscleGroup } from '../models/exercise';
import { filterWorkouts, WorkoutFilters } from '../models/workout-filter';
import { counted } from '../shared/format-count';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/** Which workouts the page lists: yours and the ready-made ones, or only one of them. */
export type LibrarySource = 'all' | 'mine' | 'ready-made';

export const LIBRARY_SOURCES: readonly { value: LibrarySource; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'My own' },
    { value: 'ready-made', label: 'Ready-made' },
];

/**
 * What the Workouts page is searched and filtered by, and the workouts it leaves: your own,
 * and the ready-made ones (LIB-6) not in your workouts already. Kept for as long as the app's
 * open, so coming back from a workout's details finds the list as it was; Only what I have is
 * the setting shared with the Exercises list.
 */
@Service()
export class LibraryFilters {
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);

    readonly source = signal<LibrarySource>('all');
    readonly query = signal('');
    readonly favourites = signal(false);
    readonly muscles = signal<MuscleGroup[]>([]);
    /** Whether the muscles and equipment are showing, under Favourites. */
    readonly moreOpen = signal(false);

    private readonly filters = computed<WorkoutFilters>(() => ({
        query: this.query(),
        favourites: this.favourites(),
        muscles: this.muscles(),
        onlyMine: this.settings.onlyMyEquipment(),
        myEquipment: this.settings.myEquipment(),
    }));

    /**
     * The ready-made workouts to offer: those whose title isn't one of your workouts', as
     * those are most likely copies of them already.
     */
    private readonly readyMadeToAdd = computed(() => {
        const titles = new Set(
            this.workouts.workouts().map((workout) => workout.title.trim().toLowerCase())
        );
        return BUILT_IN_WORKOUTS.filter((workout) => !titles.has(workout.title.toLowerCase()));
    });

    /** Your workouts shown, in the library's order. */
    readonly shown = computed(() =>
        this.source() === 'ready-made'
            ? []
            : filterWorkouts(this.workouts.workouts(), this.filters(), (id) =>
                  this.exercises.byId(id)
              )
    );

    /** The ready-made workouts shown, in their order. */
    readonly readyMade = computed(() =>
        this.source() === 'mine'
            ? []
            : filterWorkouts(this.readyMadeToAdd(), this.filters(), (id) => this.exercises.byId(id))
    );

    /**
     * Whether some of your workouts are hidden, by a search, a filter or Only what I have. They
     * can't be reordered then, as where a card lands among the hidden ones would be a guess.
     */
    readonly cutDown = computed(() => this.shown().length < this.workouts.workouts().length);

    /**
     * How many show, of yours and the ready-made ones, while any is hidden: "3 of 20 workouts"
     * or "No workouts match". Null when nothing's hidden.
     */
    readonly shownCount = computed(() => {
        const shown = this.shown().length + this.readyMade().length;
        const all = this.workouts.workouts().length + this.readyMadeToAdd().length;
        if (shown === all) {
            return null;
        }
        return shown ? `${shown} of ${counted(all, 'workout')}` : 'No workouts match';
    });

    /** Whether any search or filter is on, for Clear to take off. */
    readonly active = computed(
        () =>
            this.source() !== 'all' ||
            this.query().trim() !== '' ||
            this.favourites() ||
            this.muscles().length > 0 ||
            this.settings.onlyMyEquipment()
    );

    /** How many of the muscles and Only what I have are on, for the More filters chip. */
    readonly moreCount = computed(
        () => this.muscles().length + (this.settings.onlyMyEquipment() ? 1 : 0)
    );

    /** Shows everything again: All, and no search, Favourites, muscles or Only what I have. */
    clear() {
        this.source.set('all');
        this.query.set('');
        this.favourites.set(false);
        this.muscles.set([]);
        if (this.settings.onlyMyEquipment()) {
            this.settings.update({ onlyMyEquipment: false });
        }
    }
}
