import { Component, computed, inject, input } from '@angular/core';
import { Workout } from '../../models/workout';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { WorkoutStore } from '../../shared/state/workout-store.service';

/**
 * A heart that marks a workout as a favourite, or not, to filter Workouts by: a toggle, so
 * screen readers hear "Favourite Legs day" and whether it's pressed.
 */
@Component({
    selector: 'app-favourite-button',
    imports: [IconComponent],
    host: { class: 'block' },
    template: `
        <button
            type="button"
            class="btn-icon favourite-button"
            [attr.aria-pressed]="on()"
            [attr.aria-label]="'Favourite ' + name()"
            (click)="$event.stopPropagation(); toggle()"
        >
            <app-icon>{{ on() ? 'favorite' : 'favorite_border' }}</app-icon>
        </button>
    `,
    styles: `
        .favourite-button[aria-pressed='true'] {
            color: var(--accent);
        }
    `,
})
export class FavouriteButtonComponent {
    readonly workout = input.required<Workout>();

    private readonly workouts = inject(WorkoutStore);

    protected readonly on = computed(() => this.workout().favourite === true);
    protected readonly name = computed(() => this.workout().title.trim() || 'workout');

    protected toggle() {
        this.workouts.setFavourite(this.workout().id, !this.on());
    }
}
