import { Component, input, output } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { colourVar } from '../../shared/components/week-days/week-view';
import { PlanRow } from '../plan-page-view';

/** A day of the Plan page, as `PlanPageView` gives it. */
export interface PlanDay {
    day: number;
    name: string;
    workouts: PlanRow[];
}

/**
 * A day of the week on the Plan page that isn't the one picked (PLN-1): its name, and each of its
 * workouts on a line with a dot in its plan colour and where it is this week, or "Rest day"
 * with the moon, so the whole week reads at a glance. Pressing it, anywhere on it, picks it
 * (`picked`), opening it to change in its place. A workout dragged over it is let go on it,
 * which the page finds by `data-plan-day`.
 */
@Component({
    selector: 'app-plan-day-summary',
    imports: [IconComponent],
    host: { '[attr.data-plan-day]': 'day().day', '[class.summary--drop]': 'dropOn()' },
    template: `
        @let d = day();
        <h3 class="summary__name" [id]="'plan-day-' + d.day">
            <button type="button" class="summary__pick" (click)="picked.emit(d.day)">
                {{ d.name }}
                @if (today()) {
                    <span class="summary__today">· today</span>
                }
            </button>
        </h3>
        @if (d.workouts.length) {
            <ul class="summary__lines">
                @for (row of d.workouts; track row.workoutId) {
                    <li
                        class="summary__line"
                        [class.summary__line--later]="
                            row.status === 'missed' || row.status === 'next week'
                        "
                    >
                        <span class="summary__dot" [style.--c]="colour(row.colour)"></span>
                        <span class="summary__workout">{{ row.name }}</span>
                        @if (row.label) {
                            <span class="sr-only">, </span>
                            <span class="summary__status">{{ row.label }}</span>
                        }
                    </li>
                }
            </ul>
        } @else {
            <p class="summary__rest">
                <app-icon class="icon-outline">bedtime</app-icon>
                Rest day
            </p>
        }
    `,
    styleUrl: './plan-day-summary.component.scss',
})
export class PlanDaySummaryComponent {
    readonly day = input.required<PlanDay>();
    readonly today = input(false);
    /** Whether a workout dragged over it would go here, so it's outlined. */
    readonly dropOn = input(false);
    readonly picked = output<number>();

    protected readonly colour = colourVar;
}
