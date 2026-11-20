import { Component, computed, inject, input, output } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PageSlide } from '../../shared/navigation/page-slide';
import { injectStartWorkout } from '../../shared/run/start-workout';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { WEEK_PANEL_ID } from './week-days.component';
import { colourVar, WeekDay, WeekWorkout } from './week-view';

/**
 * What's on the day picked in This week (PLN-4), under the days: its name and date, then each
 * workout in its colour, which opens its Details. Today's still to do each have Start, the
 * first training's the page's main button (PLN-2, which was a card of its own, Due today, until
 * 2026-11-19); active rest is offered, not pressed. Those not today say how they went, e.g.
 * Done or Missed, and one not done, nor planned today, has Do it today, this week only (PLN-3).
 * A day with nothing planned is a rest day.
 */
@Component({
    selector: 'app-day-panel',
    imports: [IconComponent],
    host: {
        role: 'tabpanel',
        '[id]': 'panelId',
        '[attr.aria-labelledby]': "panelId + '-title'",
    },
    template: `
        <h4 class="day-panel__title" [id]="panelId + '-title'">
            {{ day().name }} {{ day().date }}
            @if (day().today) {
                <span class="day-panel__today">Today</span>
            }
        </h4>
        @if (onlyRestDue()) {
            <p class="day-panel__hint">There if you fancy it: a gentle stretch, or just rest.</p>
        }
        @if (day().workouts.length) {
            <ul class="day-panel__workouts">
                @for (item of day().workouts; track item.workoutId) {
                    <li class="day-panel__workout" [style.--c]="colour(item.colour)">
                        <a
                            class="day-panel__open"
                            [href]="detailsUrl(item)"
                            (click)="slide.follow($event, detailsUrl(item), 'in')"
                        >
                            <span class="day-panel__icon" aria-hidden="true">
                                <app-icon [class.icon-outline]="item.activeRest">{{
                                    item.activeRest ? 'self_improvement' : 'fitness_center'
                                }}</app-icon>
                            </span>
                            <span class="day-panel__text">
                                <span class="day-panel__name">{{ item.name }}</span>
                                @if (note(item); as note) {
                                    <span class="day-panel__note">{{ note }}</span>
                                }
                            </span>
                            @if (item.label && !item.canDoToday) {
                                <span class="day-panel__status">
                                    @if (item.status === 'done') {
                                        <app-icon>check</app-icon>
                                    }
                                    {{ item.label }}
                                </span>
                            }
                            @if (item.status !== 'today' && !item.canDoToday) {
                                <app-icon class="day-panel__chevron">chevron_right</app-icon>
                            }
                        </a>
                        @if (item.canDoToday) {
                            <button
                                type="button"
                                class="btn-pill"
                                [id]="doTodayId(item.workoutId)"
                                [attr.aria-label]="'Do it today: ' + item.name"
                                (click)="doToday.emit(item)"
                            >
                                Do it today
                            </button>
                        }
                        @if (item.status === 'today') {
                            <button
                                type="button"
                                [id]="startId(item.workoutId)"
                                [class]="
                                    item.workoutId === mainId()
                                        ? 'btn-main btn-main--small'
                                        : 'btn-pill'
                                "
                                [attr.aria-label]="'Start ' + item.name"
                                (click)="start(item)"
                            >
                                Start
                            </button>
                        }
                    </li>
                }
            </ul>
        } @else {
            <p class="day-panel__rest">
                <app-icon class="icon-outline">bedtime</app-icon>
                Rest day. Nothing planned.
            </p>
        }
    `,
    styleUrl: './day-panel.component.scss',
})
export class DayPanelComponent {
    readonly day = input.required<WeekDay>();
    /** Do it today pressed, for one on another day: the week moves it, this week only. */
    readonly doToday = output<WeekWorkout>();

    protected readonly slide = inject(PageSlide);
    private readonly workouts = inject(WorkoutStore);
    private readonly startWorkout = injectStartWorkout();
    protected readonly panelId = WEEK_PANEL_ID;
    protected readonly colour = colourVar;
    protected readonly startId = dayStartId;
    protected readonly doTodayId = dayDoTodayId;

    private readonly due = computed(() =>
        this.day().workouts.filter((item) => item.status === 'today')
    );

    /** The first training still to do today, whose Start is the page's main button. */
    protected readonly mainId = computed(
        () => this.due().find((item) => !item.activeRest)?.workoutId
    );

    /** Whether all that's left today is active rest, so it's offered rather than due. */
    protected readonly onlyRestDue = computed(
        () => this.due().length > 0 && this.due().every((item) => item.activeRest)
    );

    /**
     * Under its name: where it was moved from, or that it's active rest, and optional. Beside
     * Do it today, how it went goes here too, to leave its name room.
     */
    protected note(item: WeekWorkout): string {
        if (item.canDoToday) {
            return [item.activeRest ? 'Active rest' : '', item.label]
                .filter((part) => part)
                .join(' · ');
        }
        if (item.movedFrom) {
            return item.movedFrom;
        }
        if (!item.activeRest) {
            return '';
        }
        return item.status === 'today' && !this.onlyRestDue()
            ? 'Active rest, if you fancy it'
            : 'Active rest';
    }

    /** Its Details, coming back here. */
    protected detailsUrl(item: WeekWorkout): string {
        return `/library/${item.workoutId}?from=home`;
    }

    protected start(item: WeekWorkout) {
        const workout = this.workouts.findAnyWorkout(item.workoutId);
        if (workout) {
            this.startWorkout(workout);
        }
    }
}

/** The id of a workout's Start, today, for focus to go to. */
export function dayStartId(workoutId: string): string {
    return `day-start-${workoutId}`;
}

/** The id of a workout's Do it today, on another day, for focus to go back to. */
export function dayDoTodayId(workoutId: string): string {
    return `day-today-${workoutId}`;
}
