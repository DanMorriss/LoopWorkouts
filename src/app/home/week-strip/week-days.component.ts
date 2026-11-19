import { Component, input, output } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { colourVar, WeekDay } from './week-view';

/** The id of a day's tab, from 0 for Monday; its panel is labelled by its heading. */
function weekDayId(day: number): string {
    return `week-day-${day}`;
}

/** The id of the panel under the days, showing the picked day. */
export const WEEK_PANEL_ID = 'week-panel';

const ICONS = { training: 'fitness_center', 'active-rest': 'self_improvement', rest: 'bedtime' };

/**
 * This week's days on Today (PLN-4), Monday first, as tabs: each its short name, its date, and
 * an icon for what's on it (a dumbbell for training, a stretching figure for only active rest, a
 * moon for a rest day) in a ring split into a segment for each workout in its colour, with a
 * tick once all's done or an empty ring if one was missed. Today's date is in the accent colour,
 * and the picked day is tinted in its first workout's colour. A tap, or the arrow keys, Home and
 * End, picks a day (`picked`), whose workouts show in the panel under them.
 */
@Component({
    selector: 'app-week-days',
    imports: [IconComponent],
    template: `
        <div class="week-days" role="tablist" aria-label="Days of this week">
            @for (day of days(); track day.day) {
                <button
                    type="button"
                    role="tab"
                    [id]="tabId(day.day)"
                    [class]="'week-day week-day--' + day.kind"
                    [class.week-day--today]="day.today"
                    [style.--c]="day.kind === 'rest' ? null : colour(day.colour)"
                    [style.--ring]="day.ring || null"
                    [attr.aria-selected]="day.day === picked()"
                    [attr.aria-controls]="panelId"
                    [attr.aria-current]="day.today ? 'date' : null"
                    [tabIndex]="day.day === picked() ? 0 : -1"
                    (click)="pick.emit(day.day)"
                    (keydown)="moveBy($event, day.day)"
                >
                    <span class="week-day__name" aria-hidden="true">{{ day.short }}</span>
                    <span class="week-day__date" aria-hidden="true">{{ day.date }}</span>
                    <span class="week-day__ring" aria-hidden="true">
                        <span class="week-day__icon">
                            <app-icon [class.icon-outline]="day.kind !== 'training'">{{
                                icons[day.kind]
                            }}</app-icon>
                        </span>
                        @if (day.mark === 'done') {
                            <span class="week-day__badge week-day__badge--done">
                                <app-icon>check</app-icon>
                            </span>
                        } @else if (day.mark === 'missed') {
                            <span class="week-day__badge week-day__badge--missed"></span>
                        }
                    </span>
                    <span class="sr-only">{{ day.spoken }}</span>
                </button>
            }
        </div>
    `,
    styleUrl: './week-days.component.scss',
})
export class WeekDaysComponent {
    readonly days = input.required<readonly WeekDay[]>();
    /** The day shown under them, from 0 for Monday. */
    readonly picked = input.required<number>();
    readonly pick = output<number>();

    protected readonly icons = ICONS;
    protected readonly panelId = WEEK_PANEL_ID;
    protected readonly tabId = weekDayId;
    protected readonly colour = colourVar;
    private readonly focusAfterRender = injectFocusAfterRender();

    /** The arrow keys go round the week; Home and End go to Monday and Sunday. */
    protected moveBy(event: KeyboardEvent, day: number) {
        const to = { ArrowRight: day + 1, ArrowLeft: day - 1, Home: 0, End: 6 }[event.key];
        if (to === undefined) {
            return;
        }
        event.preventDefault();
        const next = (to + 7) % 7;
        this.pick.emit(next);
        this.focusAfterRender(weekDayId(next));
    }
}
