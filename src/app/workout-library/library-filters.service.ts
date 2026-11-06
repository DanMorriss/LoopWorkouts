import { computed, inject, Service, signal } from '@angular/core';
import { MuscleGroup } from '../models/exercise';
import { aToZ } from '../models/workout';
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
 * What the Workouts page is searched and filtered by, and the workouts it leaves: yours and
 * the ready-made ones (LIB-6), together, A to Z. Kept for as long as the app's open, so coming
 * back from a workout's details finds the list as it was; Only what I have is the setting
 * shared with the Exercises list.
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

    /** Which workouts are listed, before the search and filters. */
    private readonly listed = computed(() => {
        switch (this.source()) {
            case 'mine':
                return this.workouts.workouts();
            case 'ready-made':
                return this.workouts.readyMade();
            default:
                return this.workouts.allWorkouts();
        }
    });

    /** The workouts shown, yours and ready-made, A to Z (LIB-3). */
    readonly shown = computed(() =>
        aToZ(filterWorkouts(this.listed(), this.filters(), (id) => this.exercises.byId(id)))
    );

    /**
     * How many show while any is hidden: "3 of 20 workouts" or "No workouts match". Null when
     * nothing's hidden.
     */
    readonly shownCount = computed(() => {
        const shown = this.shown().length;
        const all = this.workouts.allWorkouts().length;
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
