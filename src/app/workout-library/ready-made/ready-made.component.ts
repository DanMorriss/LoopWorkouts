import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
    BUILT_IN_WORKOUT_GROUPS,
    BUILT_IN_WORKOUTS,
    BuiltInWorkout,
    builtInWorkoutEquipment,
    copyOfBuiltIn,
} from '../../models/built-in-workouts';
import { canDoWith, capitalise, equipmentPhrases } from '../../models/exercise';
import { allSteps } from '../../models/workout';
import { BackLinkComponent } from '../../nav/back-link/back-link.component';
import { SwipeBackDirective } from '../../nav/swipe-back.directive';
import { EquipmentFilterComponent } from '../../shared/components/equipment-filter/equipment-filter.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { ReadyMadeDialogComponent } from './ready-made-dialog.component';

/** A ready-made workout as its card shows it. */
export interface ReadyMadeCard {
    workout: BuiltInWorkout;
    /** "5 exercises · Dumbbells, bench". */
    meta: string;
    /** What it needs, as on an exercise's page: "Dumbbells", "Bench". */
    equipment: string[];
    /** A workout of the same title is in the library already, most likely this one. */
    inLibrary: boolean;
}

/**
 * The ready-made workouts (LIB-6), in groups by what they need: each opens a preview, from
 * which it's added to the library as a copy of your own, to start, change or plan. With Only
 * what I have on, those needing anything you haven't got are hidden. It slides in over the
 * Library, and back off with ‹ Library or a swipe right.
 */
@Component({
    selector: 'app-ready-made',
    imports: [
        BackLinkComponent,
        EquipmentFilterComponent,
        ReadyMadeDialogComponent,
        SwipeBackDirective,
    ],
    templateUrl: './ready-made.component.html',
    styleUrl: './ready-made.component.scss',
})
export class ReadyMadeComponent {
    private readonly settings = inject(SettingsStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly undo = inject(UndoService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);

    private readonly titles = computed(
        () => new Set(this.workouts.workouts().map((w) => w.title.trim().toLowerCase()))
    );

    private readonly cards = computed(() =>
        BUILT_IN_WORKOUTS.map(
            (workout): ReadyMadeCard & { needs: ReturnType<typeof builtInWorkoutEquipment> } => {
                const needs = builtInWorkoutEquipment(workout);
                const equipment = equipmentPhrases(needs).map(capitalise);
                const exercises = new Set(
                    allSteps(workout)
                        .map((step) => step.exerciseId)
                        .filter(Boolean)
                ).size;
                return {
                    workout,
                    needs,
                    equipment,
                    meta: `${exercises} exercises · ${equipment.join(', ')}`,
                    inLibrary: this.titles().has(workout.title.toLowerCase()),
                };
            }
        )
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

    /** The card whose preview is open, if any. */
    protected readonly previewing = signal<ReadyMadeCard | null>(null);

    protected open(card: ReadyMadeCard) {
        this.previewing.set(card);
    }

    /** Back to the card it was opened from. */
    protected close() {
        const card = this.previewing();
        this.previewing.set(null);
        if (card) {
            this.focusAfterRender(`[data-ready-made="${card.workout.id}"]`);
        }
    }

    /** Copies it into the library, staying here with Undo, so more can be added. */
    protected add(card: ReadyMadeCard) {
        const added = this.workouts.addWorkout(copyOfBuiltIn(card.workout));
        this.close();
        this.undo.offerUndo({
            message: `Added "${added.title}" to your workouts`,
            undo: () => this.workouts.deleteWorkout(added.id),
        });
    }

    /** Copies it into the library and starts it straight away. */
    protected addAndStart(card: ReadyMadeCard) {
        const added = this.workouts.addWorkout(copyOfBuiltIn(card.workout));
        this.previewing.set(null);
        this.run.start(added);
        void this.router.navigate(['/workout']);
    }

    private focusAfterRender(selector: string) {
        afterNextRender(
            () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(),
            { injector: this.injector }
        );
    }
}
