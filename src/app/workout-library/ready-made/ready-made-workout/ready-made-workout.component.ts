import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { BUILT_IN_WORKOUTS } from '../../../models/built-in-workouts';
import { exerciseSlug } from '../../../models/exercise';
import { musclesWorked } from '../../../models/workout-muscles';
import { BackLinkComponent } from '../../../nav/back-link/back-link.component';
import { SwipeBackDirective } from '../../../nav/swipe-back.directive';
import { BodyMapComponent } from '../../../shared/components/body-map/body-map.component';
import { WorkoutOutlineComponent } from '../../../shared/components/workout-outline/workout-outline.component';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { readyMadeCard } from '../ready-made-card';

/**
 * One of a ready-made plan's workouts (PLN-6), from the plan's card, at
 * /ready-made-plans/<its name>, e.g. /ready-made-plans/gym-legs: what it is and needs, every
 * exercise with its sets, and the muscles it works, only to look at, as it comes with the
 * plan. It slides in over the card, and back to where it was with ‹ or a swipe right. Its
 * exercises link to their pages, which come back to it. On Workouts, a ready-made workout's
 * page is its Details, as yours is.
 */
@Component({
    selector: 'app-ready-made-workout',
    imports: [BackLinkComponent, BodyMapComponent, SwipeBackDirective, WorkoutOutlineComponent],
    templateUrl: './ready-made-workout.component.html',
    styleUrl: './ready-made-workout.component.scss',
})
export class ReadyMadeWorkoutComponent {
    private readonly exercises = inject(ExerciseStore);
    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly slug = toSignal(
        this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
        { initialValue: '' }
    );

    protected readonly back = backToPlanCard(this.route.snapshot.queryParamMap.get('from'));

    /**
     * From a plan's card, an exercise's page, under this workout so it comes back here, and on
     * to where the card was; none for one that's gone.
     */
    protected readonly exerciseUrl = (exerciseId: string) => {
        const exercise = this.exercises.byId(exerciseId);
        const from = this.route.snapshot.queryParamMap.get('from');
        return exercise
            ? this.router.serializeUrl(
                  this.router.createUrlTree(
                      ['/ready-made-plans', this.slug(), exerciseSlug(exercise)],
                      { queryParams: from ? { from } : {} }
                  )
              )
            : null;
    };

    /** It as its card shows it, or null for a link to one there isn't. */
    protected readonly card = computed(() => {
        const workout = BUILT_IN_WORKOUTS.find((w) => w.id === `builtin:${this.slug()}`);
        if (!workout) {
            return null;
        }
        return readyMadeCard(workout);
    });

    protected readonly muscles = computed(() => {
        const card = this.card();
        return musclesWorked(card ? [card.workout] : [], (id) => this.exercises.byId(id));
    });
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
