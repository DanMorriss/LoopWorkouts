import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BackLinkComponent } from '../nav/back-link/back-link.component';
import { PageSlide } from '../shared/navigation/page-slide';
import { SwipeBackDirective } from '../nav/swipe-back.directive';
import {
    MAX_WORKOUTS_A_DAY,
    PlannedStatus,
    PlannedWorkout,
    thisWeek,
    weekdayOf,
    WEEKDAYS,
} from '../models/plan';
import {
    WorkoutChoice,
    WorkoutChoiceDialogComponent,
} from '../shared/components/workout-choice-dialog/workout-choice-dialog.component';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { injectFocusAfterRender } from '../shared/focus-after-render';
import { aToZ, isReadyMade } from '../models/workout';
import { TourService } from '../tour/tour.service';
import { PlanMusclesComponent } from './plan-muscles/plan-muscles.component';

/**
 * How a planned workout's place this week reads, e.g. "Done". "To come" says nothing, unless
 * it's active rest (see `statusLabel`).
 */
const STATUS_TEXT: Record<PlannedStatus, string> = {
    done: 'Done',
    missed: 'Missed',
    rested: 'Rested',
    today: 'Due',
    'to come': '',
    'next week': 'From next week',
};

/**
 * The weekly plan (PLN-1): Monday to Sunday, the workouts planned on each, the same every week,
 * with where each is this week (PLN-3): done, missed, due today or to come. Each day adds a
 * workout, yours or ready-made, or takes one off; the dialog's **Make a new workout** opens
 * Create, whose Save plans it on that day and comes back here (PLN-5). It slides in over Today, from its week (PLN-4),
 * and back off with ‹ Today or a swipe right.
 */
@Component({
    selector: 'app-plan',
    imports: [
        BackLinkComponent,
        MatIconModule,
        PlanMusclesComponent,
        SwipeBackDirective,
        WorkoutChoiceDialogComponent,
    ],
    templateUrl: './plan.component.html',
    styleUrl: './plan.component.scss',
})
export class PlanComponent {
    private readonly planStore = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly focusAfterRender = injectFocusAfterRender();
    protected readonly slide = inject(PageSlide);
    private readonly now = Date.now();

    constructor() {
        // The first time it opens on this device, a tour of it (PLN-8)
        inject(TourService).startOnce('plan');
        // Back from Save in Create, made for a day here: point it out, and say so
        const saved = inject(ActivatedRoute).snapshot.queryParamMap.get('saved');
        const day = saved ? this.planStore.plan().days.findIndex((ids) => ids.includes(saved)) : -1;
        if (saved && day >= 0) {
            this.saved.set({ id: saved, day });
            this.focusAfterRender(this.canAdd(day) ? `plan-add-${day}` : 'plan-title');
            // Once the live region's on the page, as one filled before it isn't heard
            const said = `Saved ${this.names().get(saved)}, planned on ${WEEKDAYS[day]}`;
            afterNextRender(() => this.announcement.set(said));
        }
    }

    /** The workout just made in Create for a day here, which is pointed out on that day. */
    protected readonly saved = signal<{ id: string; day: number } | null>(null);

    protected isSaved(day: number, workoutId: string): boolean {
        const saved = this.saved();
        return saved?.day === day && saved.id === workoutId;
    }

    protected readonly today = weekdayOf(this.now);
    private readonly names = computed(
        () =>
            new Map(
                this.workouts
                    .allWorkouts()
                    .map((workout) => [workout.id, workout.title.trim() || 'Untitled workout'])
            )
    );

    /** Each day, Monday first, with its workouts and where each is this week. */
    protected readonly days = computed(() =>
        thisWeek(
            this.planStore.plan(),
            this.history.entries(),
            this.now,
            (id) => this.names().has(id),
            (id) => this.workouts.isActiveRest(id)
        ).map((planned, day) => ({
            day,
            name: WEEKDAYS[day],
            workouts: planned.map((item) => ({
                ...item,
                name: this.names().get(item.workoutId)!,
                label: statusLabel(item),
            })),
        }))
    );

    /**
     * "2 of 5 done this week", counting only days gone by and today, and not those planned once
     * their day had gone by (from next week).
     */
    protected readonly weekSoFar = computed(() => {
        const sofar = this.days()
            .filter(({ day }) => day <= this.today)
            .flatMap(({ workouts }) => workouts)
            .filter((item) => item.status !== 'next week' && !item.activeRest);
        const done = sofar.filter((item) => item.status === 'done').length;
        return sofar.length ? `${done} of ${sofar.length} done so far this week` : '';
    });

    /** The day a workout is being added to, while its dialog is open. */
    protected readonly addingTo = signal<number | null>(null);
    /** Said to screen readers after a change, e.g. "Leg day planned on Monday". */
    protected readonly announcement = signal('');

    protected readonly choices = computed((): WorkoutChoice[] => {
        const day = this.addingTo();
        const planned = day === null ? [] : this.planStore.plan().days[day];
        // Yours A to Z, then the ready-made ones A to Z
        return [...aToZ(this.workouts.workouts()), ...aToZ(this.workouts.readyMade())].map(
            (workout) => {
                const already = planned.includes(workout.id);
                return {
                    id: workout.id,
                    name: this.names().get(workout.id)!,
                    detail: already ? 'Planned' : '',
                    disabled: already,
                    readyMade: isReadyMade(workout),
                };
            }
        );
    });

    protected canAdd(day: number): boolean {
        return this.days()[day].workouts.length < MAX_WORKOUTS_A_DAY;
    }

    /**
     * A workout picked for the day; or, picking Make a new workout (null), Create, whose Save
     * plans it on the day and comes back here (PLN-5).
     */
    protected add(day: number, workoutId: string | null) {
        this.addingTo.set(null);
        if (workoutId === null) {
            this.slide.navigate(`/setup?planOn=${day}&from=/plan`, 'in');
            return;
        }
        this.planStore.add(day, workoutId);
        this.announcement.set(`${this.names().get(workoutId)} planned on ${WEEKDAYS[day]}`);
        this.focusAfterRender(`plan-add-${day}`);
    }

    protected closeAdding() {
        const day = this.addingTo();
        this.addingTo.set(null);
        if (day !== null) {
            this.focusAfterRender(`plan-add-${day}`);
        }
    }

    protected remove(day: number, workoutId: string) {
        const name = this.names().get(workoutId);
        this.planStore.remove(day, workoutId);
        this.announcement.set(`${name} taken off ${WEEKDAYS[day]}`);
        this.focusAfterRender(`plan-add-${day}`);
    }
}

/** What a planned workout's place this week says: active rest still to do says so, as it's optional. */
function statusLabel(item: PlannedWorkout): string {
    return item.activeRest && (item.status === 'today' || item.status === 'to come')
        ? 'Active rest'
        : STATUS_TEXT[item.status];
}
