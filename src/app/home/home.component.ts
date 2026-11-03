import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DueTodayComponent } from './due-today/due-today.component';
import { WeekStripComponent } from './week-strip/week-strip.component';
import { SuggestedWorkoutComponent } from '../history/suggested-workout/suggested-workout.component';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/**
 * Today, where the app opens, greeting you by name (NAV-4) for the time of day: the week's plan
 * (PLN-4), the way in to changing it; the weekly plan's workouts due today (PLN-2); and the
 * workout to do next (PRG-9) once none are. How the week's going for each muscle is on Progress.
 * Before any workout, a way to your workouts instead.
 */
@Component({
    selector: 'app-home',
    imports: [DueTodayComponent, RouterLink, SuggestedWorkoutComponent, WeekStripComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class HomeComponent {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    /** When Home opened: the greeting's for then, not changing under you. */
    private readonly openedAt = new Date();

    private readonly workouts = inject(WorkoutStore);

    protected readonly hasHistory = computed(() => this.history.entries().length > 0);
    protected readonly hasWorkouts = computed(() => this.workouts.workouts().length > 0);
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
