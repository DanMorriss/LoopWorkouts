import { Component, computed, inject } from '@angular/core';
import { BUILT_IN_WORKOUT_GROUPS, BUILT_IN_WORKOUTS } from '../../models/built-in-workouts';
import { canDoWith, MUSCLE_LABELS } from '../../models/exercise';
import { MUSCLES_ON_A_CARD, musclesWorked } from '../../models/workout-muscles';
import { BackLinkComponent } from '../../nav/back-link/back-link.component';
import { PageSlide } from '../../nav/page-slide';
import { SwipeBackDirective } from '../../nav/swipe-back.directive';
import { EquipmentFilterComponent } from '../../shared/components/equipment-filter/equipment-filter.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { readyMadeCard, readyMadeSlug } from './ready-made-card';

/**
 * The ready-made workouts (LIB-6), in groups by what they need: each slides in its own page
 * (ReadyMadeWorkoutComponent), from which it's added to the library as a copy of your own, to
 * start, change or plan. With Only what I have on, those needing anything you haven't got are
 * hidden. It slides in over Workouts, and back off with ‹ Workouts or a swipe right.
 */
@Component({
    selector: 'app-ready-made',
    imports: [BackLinkComponent, EquipmentFilterComponent, IconComponent, SwipeBackDirective],
    templateUrl: './ready-made.component.html',
    styleUrl: './ready-made.component.scss',
})
export class ReadyMadeComponent {
    private readonly settings = inject(SettingsStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    protected readonly slide = inject(PageSlide);

    private readonly titles = computed(
        () => new Set(this.workouts.workouts().map((w) => w.title.trim().toLowerCase()))
    );

    private readonly cards = computed(() =>
        BUILT_IN_WORKOUTS.map((workout) => {
            const main = musclesWorked([workout], (id) => this.exercises.byId(id)).main;
            return {
                ...readyMadeCard(workout, this.titles()),
                url: `/ready-made/${readyMadeSlug(workout)}`,
                // Its main muscles, the first few, then how many more
                muscles: main.slice(0, MUSCLES_ON_A_CARD).map((muscle) => MUSCLE_LABELS[muscle]),
                moreMuscles: Math.max(0, main.length - MUSCLES_ON_A_CARD),
            };
        })
    );

    /** The cards that can be done with your equipment, or all of them with Only what I have off. */
    private readonly shown = computed(() => {
        const kit = this.settings.myEquipment();
        return this.settings.onlyMyEquipment()
            ? this.cards().filter((card) => canDoWith({ equipment: card.needs }, kit))
            : this.cards();
    });

    /** The groups with any card shown, each with its cards. */
    protected readonly sections = computed(() =>
        BUILT_IN_WORKOUT_GROUPS.map(({ group, label }) => ({
            group,
            label,
            cards: this.shown().filter((card) => card.workout.group === group),
        })).filter((section) => section.cards.length > 0)
    );

    /** How many are hidden by Only what I have, to say so. */
    protected readonly hiddenText = computed(() => {
        const hidden = this.cards().length - this.shown().length;
        if (hidden === 0) {
            return '';
        }
        const them = hidden === 1 ? '1 more needs' : `${hidden} more need`;
        return `${them} equipment you haven't picked.`;
    });
}
