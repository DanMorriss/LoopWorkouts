import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BackLinkComponent } from '../nav/back-link/back-link.component';
import { SwipeBackDirective } from '../nav/swipe-back.directive';
import { MAX_WORKOUTS_A_DAY, PlannedStatus, thisWeek, weekdayOf, WEEKDAYS } from '../models/plan';
import {
    WorkoutChoice,
    WorkoutChoiceDialogComponent,
} from '../shared/components/workout-choice-dialog/workout-choice-dialog.component';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/** How a planned workout's place this week reads, e.g. "Done". "To come" says nothing. */
const STATUS_TEXT: Record<PlannedStatus, string> = {
    done: 'Done',
    missed: 'Missed',
    today: 'Due',
    'to come': '',
};

/**
 * The weekly plan (PLN-1): Monday to Sunday, the workouts planned on each, the same every week,
 * with where each is this week (PLN-3): done, missed, due today or to come. Each day adds a
 * workout from your workouts, or takes one off. It slides in over Today, from its week (PLN-4),
 * and back off with ‹ Today or a swipe right.
 */
@Component({
    selector: 'app-plan',
    imports: [BackLinkComponent, MatIconModule, SwipeBackDirective, WorkoutChoiceDialogComponent],
    templateUrl: './plan.component.html',
    styleUrl: './plan.component.scss',
})
export class PlanComponent {
    private readonly planStore = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly injector = inject(Injector);
    private readonly now = Date.now();

    protected readonly today = weekdayOf(this.now);
    protected readonly statusText = STATUS_TEXT;
    protected readonly hasWorkouts = computed(() => this.workouts.workouts().length > 0);

    private readonly names = computed(
        () =>
            new Map(
                this.workouts
                    .workouts()
                    .map((workout) => [workout.id, workout.title.trim() || 'Untitled workout'])
            )
    );

    /** Each day, Monday first, with its workouts and where each is this week. */
    protected readonly days = computed(() =>
        thisWeek(this.planStore.plan(), this.history.entries(), this.now, (id) =>
            this.names().has(id)
        ).map((planned, day) => ({
            day,
            name: WEEKDAYS[day],
            workouts: planned.map((item) => ({ ...item, name: this.names().get(item.workoutId)! })),
        }))
    );

    /** "2 of 5 done this week", counting only days gone by and today. */
    protected readonly weekSoFar = computed(() => {
        const sofar = this.days()
            .filter(({ day }) => day <= this.today)
            .flatMap(({ workouts }) => workouts);
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
        return this.workouts.workouts().map((workout) => {
            const already = planned.includes(workout.id);
            return {
                id: workout.id,
                name: this.names().get(workout.id)!,
                detail: already ? 'Planned' : '',
                disabled: already,
            };
        });
    });

    protected canAdd(day: number): boolean {
        return this.days()[day].workouts.length < MAX_WORKOUTS_A_DAY;
    }

    protected add(day: number, workoutId: string | null) {
        this.addingTo.set(null);
        if (workoutId !== null) {
            this.planStore.add(day, workoutId);
            this.announcement.set(`${this.names().get(workoutId)} planned on ${WEEKDAYS[day]}`);
        }
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

    private focusAfterRender(id: string) {
        afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
    }
}
