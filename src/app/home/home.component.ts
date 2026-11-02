import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DueTodayComponent } from './due-today/due-today.component';
import { MusclesThisWeekComponent } from '../history/muscles-this-week/muscles-this-week.component';
import { SuggestedWorkoutComponent } from '../history/suggested-workout/suggested-workout.component';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';

/**
 * Where the app opens, greeting you by name (NAV-4) for the time of day: the weekly plan's workouts due today (PLN-2), the workout to do next
 * (PRG-9) once none are, and the muscles worked this week (PRG-6, PRG-8), the same cards as the
 * history page's. Before any workout, a way to the library instead.
 */
@Component({
    selector: 'app-home',
    imports: [DueTodayComponent, MusclesThisWeekComponent, RouterLink, SuggestedWorkoutComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class HomeComponent {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    /** When Home opened: the greeting's for then, not changing under you. */
    private readonly openedAt = new Date();

    protected readonly hasHistory = computed(() => this.history.entries().length > 0);
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
