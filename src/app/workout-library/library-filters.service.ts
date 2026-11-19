import { computed, inject, Service, signal } from '@angular/core';
import { isActiveRest } from '../models/active-rest';
import { MuscleGroup } from '../models/exercise';
import { aToZ, Workout } from '../models/workout';
import { filterWorkouts, WorkoutFilters } from '../models/workout-filter';
import { WorkoutKind } from '../models/workout-kind';
import { counted } from '../shared/format-count';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { Favourites } from '../shared/state/favourites.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/** One list of cards on the Workouts page, with the heading over it, if any. */
export interface LibrarySection {
    id: 'training' | 'stretches';
    heading: string | null;
    workouts: Workout[];
}

export const WORKOUT_KIND_CHOICES: readonly { value: WorkoutKind; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'training', label: 'Training' },
    { value: 'stretches', label: 'Stretches' },
];

/**
 * What the Workouts page is searched and filtered by, and the workouts it leaves: yours and
 * the ready-made ones (LIB-6), together, A to Z, with the workouts of only stretches after the
 * rest (LIB-10). Kept for as long as the app's open, so coming back from a workout's details
 * finds the list as it was; the kind of workout and Only what I have are settings, so they're
 * kept for good, and Only what I have is shared with the Exercises list.
 */
@Service()
export class LibraryFilters {
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly favouriteIds = inject(Favourites).ids;

    /** All, Training or Stretches (LIB-10), remembered with the settings. */
    readonly kind = this.settings.workoutKind;
    /** Only your own workouts, not the ready-made ones. */
    readonly mine = signal(false);
    readonly query = signal('');
    readonly favourites = signal(false);
    readonly muscles = signal<MuscleGroup[]>([]);
    /** Whether the muscles and equipment are showing, under Favourites. */
    readonly moreOpen = signal(false);

    private readonly filters = computed<WorkoutFilters>(() => ({
        kind: this.kind(),
        query: this.query(),
        favourites: this.favourites(),
        muscles: this.muscles(),
        onlyMine: this.settings.onlyMyEquipment(),
        myEquipment: this.settings.myEquipment(),
    }));

    /** The workouts that pass the search and filters, A to Z. */
    private readonly found = computed(() => {
        const favourites = this.favouriteIds();
        return aToZ(
            filterWorkouts(
                this.mine() ? this.workouts.workouts() : this.workouts.allWorkouts(),
                this.filters(),
                (id) => this.exercises.byId(id),
                (id) => favourites.has(id)
            )
        );
    });

    /**
     * The lists shown, each A to Z: training first, then the workouts of only stretches, under
     * their own heading when All's picked (LIB-10). A list with nothing in it isn't there.
     */
    readonly sections = computed((): LibrarySection[] => {
        const found = this.found();
        const sections: LibrarySection[] = [
            {
                id: 'training',
                heading: null,
                workouts: found.filter((workout) => !isActiveRest(workout)),
            },
            {
                id: 'stretches',
                heading: this.kind() === 'all' ? 'Stretches' : null,
                workouts: found.filter((workout) => isActiveRest(workout)),
            },
        ];
        return sections.filter((section) => section.workouts.length > 0);
    });
    /** Every workout shown, in the order shown. */
    readonly shown = computed(() => this.sections().flatMap((section) => section.workouts));

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
            this.kind() !== 'all' ||
            this.mine() ||
            this.query().trim() !== '' ||
            this.favourites() ||
            this.muscles().length > 0 ||
            this.settings.onlyMyEquipment()
    );

    /** How many of the muscles and Only what I have are on, for the Filters chip. */
    readonly moreCount = computed(
        () => this.muscles().length + (this.settings.onlyMyEquipment() ? 1 : 0)
    );

    setKind(kind: WorkoutKind) {
        this.settings.update({ workoutKind: kind });
    }

    /**
     * Shows everything again: All, and no search, My own, Favourites, muscles or Only what I
     * have.
     */
    clear() {
        this.mine.set(false);
        this.query.set('');
        this.favourites.set(false);
        this.muscles.set([]);
        if (this.kind() !== 'all' || this.settings.onlyMyEquipment()) {
            this.settings.update({ workoutKind: 'all', onlyMyEquipment: false });
        }
    }
}
