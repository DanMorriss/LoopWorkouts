import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { thisWeek, weekdayOf } from '../../models/plan';
import { Workout } from '../../models/workout';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { PlanStore } from '../../shared/state/plan-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';

/**
 * Today's planned workouts on Home (PLN-2): those not run yet today, each with Start, the first
 * as the page's main button. Once they've all been run, it says so. Nothing shows on a day
 * with nothing planned.
 */
@Component({
    selector: 'app-due-today',
    imports: [MatIconModule],
    template: `
        @if (due().length) {
            <section class="due" aria-labelledby="due-today-title">
                <h3 class="due__label" id="due-today-title">Due today</h3>
                <ul class="due__workouts">
                    @for (workout of due(); track workout.id; let first = $first) {
                        <li class="due__workout">
                            <span class="due__title">{{ name(workout) }}</span>
                            <button
                                type="button"
                                [class]="first ? 'btn-main btn-main--small' : 'btn-pill'"
                                [attr.aria-label]="'Start ' + name(workout)"
                                (click)="start(workout)"
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
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly now = Date.now();

    private readonly today = computed(
        () =>
            thisWeek(
                this.plan.plan(),
                this.history.entries(),
                this.now,
                (id) => this.workouts.findAnyWorkout(id) !== null
            )[weekdayOf(this.now)]
    );

    /** Planned today and not run yet, in the plan's order. */
    readonly due = computed(() =>
        this.today()
            .filter((planned) => planned.status === 'today')
            .map((planned) => this.workouts.findAnyWorkout(planned.workoutId)!)
    );

    /** The names of those planned today and run already. */
    protected readonly done = computed(() =>
        this.today()
            .filter((planned) => planned.status === 'done')
            .map((planned) => this.name(this.workouts.findAnyWorkout(planned.workoutId)!))
    );

    protected name(workout: Workout): string {
        return workout.title.trim() || 'Untitled workout';
    }

    protected start(workout: Workout) {
        this.run.start(workout);
        void this.router.navigate(['/workout']);
    }
}
