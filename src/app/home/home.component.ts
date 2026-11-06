import { Component, computed, inject } from '@angular/core';
import { DueTodayComponent } from './due-today/due-today.component';
import { GetStartedComponent } from './get-started/get-started.component';
import { WeekStripComponent } from './week-strip/week-strip.component';
import { SuggestedWorkoutComponent } from '../history/suggested-workout/suggested-workout.component';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { weekdayOf } from '../models/plan';

/**
 * Today, where the app opens, greeting you by name (NAV-4) for the time of day: the week's plan
 * (PLN-4), the way in to changing it; the weekly plan's workouts due today (PLN-2); and the
 * workout to do next (PRG-9) with nothing planned: with a week planned, the plan says what's
 * next. How the week's going for each muscle is on Progress.
 * With no workouts yet, a way to add some first (NAV-6), as there's nothing to plan without them;
 * with some but nothing planned, the week asks to be planned.
 */
@Component({
    selector: 'app-home',
    imports: [
        DueTodayComponent,
        GetStartedComponent,
        SuggestedWorkoutComponent,
        WeekStripComponent,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class HomeComponent {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    /** When Home opened: the greeting's for then, not changing under you. */
    private readonly openedAt = new Date();

    private readonly workouts = inject(WorkoutStore);
    private readonly planStore = inject(PlanStore);

    protected readonly hasHistory = computed(() => this.history.entries().length > 0);
    /** Whether you've workouts of your own; until then, or a plan, Today offers one to start. */
    protected readonly hasWorkouts = computed(() => this.workouts.workouts().length > 0);
    /** Whether anything's planned, of the workouts still there: then the plan says what's next. */
    protected readonly hasPlan = computed(() =>
        this.planStore
            .plan()
            .days.some((day) => day.some((id) => this.workouts.findAnyWorkout(id) !== null))
    );
    /** A day of a planned week with nothing planned on it: a rest day, or a chance to train. */
    protected readonly restDay = computed(
        () =>
            this.hasPlan() &&
            !this.planStore
                .plan()
                .days[
                    weekdayOf(this.openedAt.getTime())
                ].some((id) => this.workouts.findAnyWorkout(id) !== null)
    );
    protected readonly greeting = computed(() => {
        const name = this.settings.name();
        const hello = greetingFor(this.openedAt.getHours());
        return name ? `${hello}, ${name}` : hello;
    });
}

/** "Good morning" from 5am, "Good afternoon" from noon, "Good evening" from 6pm. */
export function greetingFor(hour: number): string {
    if (hour >= 5 && hour < 12) {
        return 'Good morning';
    }
    return hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening';
}
