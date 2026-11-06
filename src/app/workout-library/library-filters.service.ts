import { computed, inject, Service, signal } from '@angular/core';
import { MuscleGroup } from '../models/exercise';
import { filterWorkouts, WorkoutFilters } from '../models/workout-filter';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/**
 * What the Workouts page is searched and filtered by, and the workouts it leaves. Kept for as
 * long as the app's open, so coming back from a workout's details finds the list as it was;
 * Only what I have is the setting shared with the Exercises list and ready-made workouts.
 */
@Service()
export class LibraryFilters {
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);

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

    /** The workouts shown, in the library's order. */
    readonly shown = computed(() =>
        filterWorkouts(this.workouts.workouts(), this.filters(), (id) => this.exercises.byId(id))
    );

    /**
     * Whether some workouts are hidden, by a search, a filter or Only what I have. The list
     * can't be reordered then, as where a card lands among the hidden ones would be a guess.
     */
    readonly cutDown = computed(() => this.shown().length < this.workouts.workouts().length);

    /** Whether any search or filter is on, for Clear to take off. */
    readonly active = computed(
        () =>
            this.query().trim() !== '' ||
            this.favourites() ||
            this.muscles().length > 0 ||
            this.settings.onlyMyEquipment()
    );

    /** How many of the muscles and Only what I have are on, for the More filters chip. */
    readonly moreCount = computed(
        () => this.muscles().length + (this.settings.onlyMyEquipment() ? 1 : 0)
    );

    /** Takes off the search, Favourites and the muscles, and Only what I have. */
    clear() {
        this.query.set('');
        this.favourites.set(false);
        this.muscles.set([]);
        if (this.settings.onlyMyEquipment()) {
            this.settings.update({ onlyMyEquipment: false });
        }
    }
}
