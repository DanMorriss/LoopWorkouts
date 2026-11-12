import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlannedWorkout, thisWeek, weekdayOf } from '../../models/plan';
import { Workout } from '../../models/workout';
import { injectStartWorkout } from '../../shared/run/start-workout';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';

/**
 * Today's planned workouts on Home (PLN-2): those not run yet today, each with Start, the first
 * as the page's main button. Once they've all been run, it says so. Nothing shows on a day
 * with nothing planned.
 *
 * Active rest (a mobility day's stretches) is offered, not pressed: after any training, each
 * marked "Active rest" with a quieter Start, and on a day with only active rest, "Active rest
 * today", there if you fancy it.
 */
@Component({
    selector: 'app-due-today',
    imports: [MatIconModule],
    template: `
        @if (due().length) {
            <section class="due" aria-labelledby="due-today-title">
                <h3 class="due__label" id="due-today-title">
                    {{ onlyRest() ? 'Active rest today' : 'Due today' }}
                </h3>
                @if (onlyRest()) {
                    <p class="due__hint">There if you fancy it: a gentle stretch, or just rest.</p>
                }
                <ul class="due__workouts">
                    @for (item of due(); track item.workout.id; let first = $first) {
                        <li class="due__workout">
                            <span class="due__name">
                                <span class="due__title">{{ name(item.workout) }}</span>
                                @if (item.activeRest && !onlyRest()) {
                                    <span class="due__kind">Active rest, if you fancy it</span>
                                }
                            </span>
                            <button
                                type="button"
                                [class]="
                                    first && !item.activeRest
                                        ? 'btn-main btn-main--small'
                                        : 'btn-pill'
                                "
                                [attr.aria-label]="'Start ' + name(item.workout)"
                                (click)="start(item.workout)"
                            >
                                Start
                            </button>
                        </li>
                    }
                </ul>
                @if (done().length) {
                    <p class="due__done">Done today: {{ done().join(', ') }}</p>
                }
            </section>
        } @else if (done().length) {
            <section class="due due--done" aria-labelledby="due-today-title">
                <h3 class="due__label" id="due-today-title">Due today</h3>
                <p class="due__all-done">
                    <mat-icon aria-hidden="true">check</mat-icon>
                    All done: {{ done().join(', ') }}
                </p>
            </section>
        }
    `,
    styleUrl: './due-today.component.scss',
})
export class DueTodayComponent {
    private readonly plan = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    protected readonly start = injectStartWorkout();
    private readonly now = Date.now();

    private readonly today = computed(
        () =>
            thisWeek(
                this.plan.plan(),
                this.history.entries(),
                this.now,
                (id) => this.workouts.findAnyWorkout(id) !== null,
                (id) => this.workouts.isActiveRest(id)
            )[weekdayOf(this.now)]
    );

    /** Planned today and not run yet: training in the plan's order, then active rest. */
    readonly due = computed(() =>
        this.today()
            .filter((planned) => planned.status === 'today')
            .sort((a, b) => Number(!!a.activeRest) - Number(!!b.activeRest))
            .map((planned: PlannedWorkout) => ({
                workout: this.workouts.findAnyWorkout(planned.workoutId)!,
                activeRest: !!planned.activeRest,
            }))
    );

    /** Whether all that's left today is active rest, so it's offered rather than due. */
    protected readonly onlyRest = computed(() => this.due().every((item) => item.activeRest));

    /** The names of those planned today and run already. */
    protected readonly done = computed(() =>
        this.today()
            .filter((planned) => planned.status === 'done')
            .map((planned) => this.name(this.workouts.findAnyWorkout(planned.workoutId)!))
    );

    protected name(workout: Workout): string {
        return workout.title.trim() || 'Untitled workout';
    }
}
