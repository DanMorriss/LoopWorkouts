import { Component, computed, input } from '@angular/core';
import { Workout } from '../../../models/workout';
import { outline, repeatsText } from '../../../models/workout-outline';

/**
 * A workout written out to read: how many times it goes round, then its headings, each
 * exercise with its sets, and each superset with its rounds and steps. In a ready-made
 * workout's preview (LIB-6) and a workout's details (LIB-4).
 */
@Component({
    selector: 'app-workout-outline',
    template: `
        <p class="outline__repeats">{{ repeats() }}</p>
        <ul class="outline__lines">
            @for (line of lines(); track $index) {
                @switch (line.kind) {
                    @case ('heading') {
                        <li class="outline__part">{{ line.text }}</li>
                    }
                    @case ('step') {
                        <li class="outline__line">
                            <span class="outline__name">{{ line.name }}</span>
                            {{ ' ' }}
                            <span class="outline__amount">{{ line.amount }}</span>
                        </li>
                    }
                    @case ('superset') {
                        <li class="outline__line outline__line--superset">
                            <span class="outline__name">{{ line.name }}</span>
                            {{ ' ' }}
                            <span class="outline__amount">{{ line.amount }}</span>
                            <ul class="outline__lines outline__lines--inner">
                                @for (step of line.steps; track $index) {
                                    <li class="outline__line">
                                        <span class="outline__name">{{ step.name }}</span>
                                        {{ ' ' }}
                                        <span class="outline__amount">{{ step.amount }}</span>
                                    </li>
                                }
                            </ul>
                        </li>
                    }
                }
            }
        </ul>
    `,
    styleUrl: './workout-outline.component.scss',
})
export class WorkoutOutlineComponent {
    readonly workout = input.required<Pick<Workout, 'blocks' | 'repeats' | 'timeLimitSeconds'>>();

    protected readonly lines = computed(() => outline(this.workout()));
    protected readonly repeats = computed(() => repeatsText(this.workout()));
}
