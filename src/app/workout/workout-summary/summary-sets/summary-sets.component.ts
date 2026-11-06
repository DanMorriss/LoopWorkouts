import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { describeSets, sectionsOf } from '../../../history/history-format';
import { isBuiltIn } from '../../../models/exercise';
import { RepSet } from '../../../models/history';
import { weightIn, weightOptions, weightToKg } from '../../../models/weight';
import { isReadyMade, MAX_REPS, placedHeadings, placedSupersets } from '../../../models/workout';
import { WheelPickerComponent } from '../../../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { SetLinesComponent } from '../../../history/set-lines/set-lines.component';

/** One rep step's sets, for correcting them one by one. */
interface SetGroup {
    name: string;
    /** Which step of the workout it is, to go under its heading and superset. */
    step: number;
    /** Each set, with where it is in the run's list of sets. */
    sets: { index: number; set: RepSet }[];
}

/** 1 to MAX_REPS, for the reps wheels. */
export const REP_OPTIONS = Array.from({ length: MAX_REPS }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
}));

/**
 * What a set's exercise is called now, if it's your own (it may have been renamed since).
 * Built-in names never change, so a set keeps the name it ran with, e.g. "Squats".
 */
export function ownExerciseName(exercises: ExerciseStore) {
    return (id: string): string | undefined => {
        const exercise = exercises.byId(id);
        return exercise && !isBuiltIn(exercise) ? exercise.name : undefined;
    };
}

/**
 * The run's sets on the workout summary, one line per step, e.g. "Squats: 10, 10, 8 @ 60 kg".
 * The rep sets can be corrected (the last one was 8 reps, not 10; timed ones ran as set), and
 * once one is, it asks whether to start from them next time.
 */
@Component({
    selector: 'app-summary-sets',
    imports: [MatIconModule, NgTemplateOutlet, SetLinesComponent, WheelPickerComponent],
    templateUrl: './summary-sets.component.html',
    styleUrl: './summary-sets.component.scss',
})
export class SummarySetsComponent {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly exerciseName = ownExerciseName(inject(ExerciseStore));

    protected readonly weightUnit = this.settings.weightUnit;
    /** One line per step, e.g. "Squats: 10, 10, 8 @ 60 kg" or "Plank: 3 × 0:45". */
    protected readonly setLines = computed(() =>
        describeSets(this.run.sets(), this.weightUnit(), this.exerciseName)
    );

    /**
     * The lines under the workout's headings, and with its supersets, as the history will have
     * them (BLD-12, BLD-13).
     */
    protected readonly sections = computed(() => {
        const workout = this.run.workout();
        return workout
            ? sectionsOf(this.setLines(), placedHeadings(workout), placedSupersets(workout))
            : sectionsOf(this.setLines());
    });

    protected readonly changingSets = signal(false);
    protected readonly setGroups = computed((): SetGroup[] => {
        const groups = new Map<number, SetGroup>();
        this.store.activeSets().forEach((set, index) => {
            const group = groups.get(set.step) ?? { name: '', step: set.step, sets: [] };
            group.sets.push({ index, set });
            groups.set(set.step, group);
        });
        // Named as its line is
        return Array.from(groups.values(), (group) => ({
            ...group,
            name: describeSets(
                group.sets.map((item) => item.set),
                this.weightUnit(),
                this.exerciseName
            )[0].name,
        }));
    });
    /** The sets to change, under the workout's headings and with its supersets, as above. */
    protected readonly groupSections = computed(() => {
        const workout = this.run.workout();
        return workout
            ? sectionsOf(this.setGroups(), placedHeadings(workout), placedSupersets(workout))
            : sectionsOf(this.setGroups());
    });
    /** Some steps were given a step-up, which "Yes, use next time" leaves as they are. */
    protected readonly steppedUp = computed(() => this.run.steppedUp().size > 0);
    protected readonly repOptions = REP_OPTIONS;
    protected readonly weightOptions = computed(() => weightOptions(this.weightUnit()));
    protected weightValue(set: RepSet): number {
        return set.weight ? weightIn(set.weight, this.weightUnit()) : 0;
    }

    /** null until a set is changed; then asks whether to start from them next time. */
    protected readonly nextTime = signal<'asking' | 'yes' | 'no' | null>(null);
    /** Not of a ready-made workout, which stays as it is: Make a copy is offered instead. */
    private readonly canKeep = computed(() => {
        const workout = this.run.workout();
        return workout !== null && !isReadyMade(workout);
    });

    /** A set was changed: whether to start from them next time, if that's for the asking. */
    private changed() {
        if (this.canKeep()) {
            this.nextTime.set('asking');
        }
    }

    protected setReps(index: number, reps: number) {
        if (this.store.activeSets()[index]?.reps === reps) {
            return;
        }
        this.run.changeSet(index, { reps });
        this.changed();
    }

    protected setWeight(index: number, value: number) {
        const weight = value > 0 ? weightToKg(value, this.weightUnit()) : undefined;
        if (this.store.activeSets()[index]?.weight === weight) {
            return;
        }
        this.run.changeSet(index, { weight });
        this.changed();
    }

    protected answerNextTime(use: boolean) {
        if (use) {
            this.run.useSetsNextTime();
        }
        this.nextTime.set(use ? 'yes' : 'no');
    }
}
