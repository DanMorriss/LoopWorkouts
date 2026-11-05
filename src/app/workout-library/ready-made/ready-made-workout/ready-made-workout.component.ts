import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { BUILT_IN_WORKOUTS, copyOfBuiltIn } from '../../../models/built-in-workouts';
import { musclesWorked } from '../../../models/workout-muscles';
import { BackLinkComponent } from '../../../nav/back-link/back-link.component';
import { PageSlide } from '../../../nav/page-slide';
import { SwipeBackDirective } from '../../../nav/swipe-back.directive';
import { BodyMapComponent } from '../../../shared/components/body-map/body-map.component';
import { WorkoutOutlineComponent } from '../../../shared/components/workout-outline/workout-outline.component';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { UndoService } from '../../../shared/undo/undo.service';
import { readyMadeCard } from '../ready-made-card';

/**
 * A ready-made workout (LIB-6), at /ready-made/<its name>, e.g. /ready-made/gym-legs: what it
 * is and needs, every exercise with its sets, and the muscles it works, with Add and start and
 * Add to my workouts. It slides in over the ready-made workouts, as an exercise does over the
 * Exercises list, and back off with ‹ Ready-made or a swipe right. Adding it slides back out
 * to Workouts, with it picked out there.
 *
 * From a ready-made plan's card (PLN-6), at /ready-made-plans/<its name>, it's the same page
 * without the buttons, as the workout comes with the plan, and goes back to where the card is.
 */
@Component({
    selector: 'app-ready-made-workout',
    imports: [
        BackLinkComponent,
        BodyMapComponent,
        MatIconModule,
        SwipeBackDirective,
        WorkoutOutlineComponent,
    ],
    templateUrl: './ready-made-workout.component.html',
    styleUrl: './ready-made-workout.component.scss',
})
export class ReadyMadeWorkoutComponent {
    private readonly workouts = inject(WorkoutStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly undo = inject(UndoService);
    protected readonly slide = inject(PageSlide);

    private readonly route = inject(ActivatedRoute);

    private readonly slug = toSignal(
        this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
        { initialValue: '' }
    );

    /** Opened from a ready-made plan's card, rather than the list of ready-made workouts. */
    protected readonly inPlan = this.route.snapshot.data['inPlan'] === true;

    protected readonly back = this.inPlan
        ? backToPlanCard(this.route.snapshot.queryParamMap.get('from'))
        : { url: '/ready-made', label: 'Ready-made' };

    /** It as its card shows it, or null for a link to one there isn't. */
    protected readonly card = computed(() => {
        const workout = BUILT_IN_WORKOUTS.find((w) => w.id === `builtin:${this.slug()}`);
        if (!workout) {
            return null;
        }
        const titles = new Set(this.workouts.workouts().map((w) => w.title.trim().toLowerCase()));
        return readyMadeCard(workout, titles);
    });

    protected readonly muscles = computed(() => {
        const card = this.card();
        return musclesWorked(card ? [card.workout] : [], (id) => this.exercises.byId(id));
    });

    /**
     * Copies it into the library, with Undo, and slides back out to Workouts, as ‹ Workouts
     * does from the list, with the new one picked out there.
     */
    protected add() {
        const card = this.card();
        if (!card) {
            return;
        }
        const added = this.workouts.addWorkout(copyOfBuiltIn(card.workout));
        this.undo.offerUndo({
            message: `Added "${added.title}" to your workouts`,
            undo: () => this.workouts.deleteWorkout(added.id),
        });
        this.slide.navigate(`/library?added=${added.id}`, 'out');
    }

    /** Copies it into the library and starts it straight away. */
    protected addAndStart() {
        const card = this.card();
        if (!card) {
            return;
        }
        const added = this.workouts.addWorkout(copyOfBuiltIn(card.workout));
        this.run.start(added);
        void this.router.navigate(['/workout']);
    }
}

/** Back to where a plan's card was (PlanWorkoutFrom): Today, or the Ready-made plans page. */
function backToPlanCard(from: string | null) {
    switch (from) {
        case 'today':
            return { url: '/home', label: 'Today' };
        case 'plan':
            return { url: '/ready-made-plans?from=plan', label: 'Plans' };
        default:
            return { url: '/ready-made-plans', label: 'Plans' };
    }
}
