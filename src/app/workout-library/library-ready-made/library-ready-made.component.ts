import { Component, computed, inject } from '@angular/core';
import { BUILT_IN_WORKOUT_GROUPS } from '../../models/built-in-workouts';
import { LibraryFilters } from '../library-filters.service';
import { ReadyMadeCardComponent } from '../ready-made/ready-made-card/ready-made-card.component';

/**
 * Under your workouts, the ready-made ones (LIB-6) still to add, as the search and filters
 * leave them, in groups by what they need. Each card slides in its page, to add it from.
 */
@Component({
    selector: 'app-library-ready-made',
    imports: [ReadyMadeCardComponent],
    template: `
        @if (sections().length) {
            <h3 class="library-ready__title">Ready-made</h3>
            <p class="library-ready__hint">
                Pick one to see what's in it. Added to your workouts, it's yours to start, change or
                plan.
            </p>
            @for (section of sections(); track section.group) {
                <section
                    class="library-ready__section"
                    [attr.aria-labelledby]="'library-ready-made-' + section.group"
                >
                    <h4 class="library-ready__group" [id]="'library-ready-made-' + section.group">
                        {{ section.label }}
                    </h4>
                    <ul class="library-ready__list">
                        @for (workout of section.workouts; track workout.id) {
                            <li><app-ready-made-card [workout]="workout" /></li>
                        }
                    </ul>
                </section>
            }
        }
    `,
    styles: `
        @use 'type' as *;

        :host {
            display: block;
        }

        .library-ready__title {
            margin: 0;
            @include display;
            font-size: 1.2rem;
            color: var(--text-strong);
        }

        .library-ready__hint {
            @include page-hint;
        }

        .library-ready__section {
            padding-top: 0.75rem;
        }

        .library-ready__group {
            margin: 0 0 0.5rem;
            color: var(--text-strong);
            font-size: 1rem;
            font-weight: 600;
        }

        .library-ready__list {
            display: grid;
            gap: 0.5rem;
            margin: 0;
            padding: 0;
            list-style: none;
        }
    `,
})
export class LibraryReadyMadeComponent {
    private readonly filters = inject(LibraryFilters);

    /** The groups with any workout shown, each with its workouts. */
    protected readonly sections = computed(() =>
        BUILT_IN_WORKOUT_GROUPS.map(({ group, label }) => ({
            group,
            label,
            workouts: this.filters.readyMade().filter((workout) => workout.group === group),
        })).filter((section) => section.workouts.length > 0)
    );
}
