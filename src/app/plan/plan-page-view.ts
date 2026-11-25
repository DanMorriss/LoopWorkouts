import { computed, inject, Injectable } from '@angular/core';
import {
    canDoToday,
    MAX_WORKOUTS_A_DAY,
    planColours,
    PLANNED_STATUS_TEXT,
    PlannedWorkout,
    thisWeek,
    weekdayOf,
    WEEKDAYS,
} from '../models/plan';
import { weekDays, weekTally } from '../shared/components/week-days/week-view';
import { workoutEquipment } from '../models/built-in-workouts';
import { canDoWith, MUSCLE_LABELS } from '../models/exercise';
import { listMuscles } from '../models/fill-gaps';
import { aToZ, Workout } from '../models/workout';
import { musclesWorked } from '../models/workout-muscles';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutChoice } from '../shared/components/workout-choice-dialog/workout-choice-dialog.component';
import { HistoryStore } from '../shared/state/history-store.service';
import { PlanStore } from '../shared/state/plan-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/** A planned workout as a row of the Plan page shows it. */
export interface PlanRow extends PlannedWorkout {
    /** The day it's shown on, from 0 for Monday. */
    day: number;
    name: string;
    /** Where it is this week: "Done", "Missed", or '' for one still to come. */
    label: string;
    /** Whether it can be done today instead, this week only (`canDoToday`). */
    canDoToday: boolean;
    /** Its plan colour, 1 to 4, as Today's week shows it (`planColours`); 0 for active rest. */
    colour: number;
    /** Whether Move up and Move down are offered: not for one moved here this week only. */
    canMoveUp: boolean;
    canMoveDown: boolean;
}

/** What the Plan page shows, worked out from the plan and the history. One for each page. */
@Injectable()
export class PlanPageView {
    private readonly planStore = inject(PlanStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly now = Date.now();
    readonly today = weekdayOf(this.now);

    readonly names = computed(
        () =>
            new Map(
                this.workouts
                    .allWorkouts()
                    .map((workout) => [workout.id, workout.title.trim() || 'Untitled workout'])
            )
    );

    /** This week's plan, each day's workouts with where each is this week. */
    private readonly week = computed(() =>
        thisWeek(
            this.planStore.plan(),
            this.history.entries(),
            this.now,
            (id) => this.names().has(id),
            (id) => this.workouts.isActiveRest(id)
        )
    );

    /** Each day, Monday first, with its workouts and where each is this week. */
    readonly days = computed(() => {
        const week = this.week();
        const colours = planColours(week);
        return week.map((planned, day) => {
            // Those moved here this week only stay at the end, so the order is of the rest
            const own = planned.filter((item) => item.movedFrom === undefined).length;
            return {
                day,
                name: WEEKDAYS[day],
                workouts: planned.map(
                    (item, i): PlanRow => ({
                        ...item,
                        day,
                        name: this.names().get(item.workoutId)!,
                        label: statusLabel(item),
                        canDoToday: canDoToday(week, day, item, this.today),
                        colour: item.activeRest ? 0 : (colours.get(item.workoutId) ?? 0),
                        canMoveUp: item.movedFrom === undefined && i > 0,
                        canMoveDown: item.movedFrom === undefined && i < own - 1,
                    })
                ),
            };
        });
    });

    /** The days as Today's week shows them, for the Plan page's tabs (`WeekDaysComponent`). */
    readonly weekDays = computed(() =>
        weekDays(this.week(), this.now, (id) => this.names().get(id) ?? 'Untitled workout')
    );

    /** How the week's going, as Today says it: "2 of 5 done this week · Next: Pull on Thursday". */
    readonly tally = computed(() =>
        weekTally(this.week(), this.today, (id) => this.names().get(id) ?? 'Untitled workout')
    );

    canAdd(day: number): boolean {
        return this.days()[day].workouts.length < MAX_WORKOUTS_A_DAY;
    }

    /**
     * What a day's Add offers, under headings: yours A to Z, then the ready-made ones A to Z,
     * those your equipment can do first (with any picked in You). Each says the muscles it
     * mainly works, to choose by; one already planned that day says so, and can't be picked.
     */
    choicesFor(day: number | null): WorkoutChoice[] {
        const planned = day === null ? [] : this.planStore.plan().days[day];
        const kit = this.settings.myEquipment();
        const canDo = (workout: Workout) =>
            canDoWith(
                { equipment: workoutEquipment(workout, (id) => this.exercises.byId(id)) },
                kit
            );
        const readyMade = aToZ(this.workouts.readyMade());
        const groups: [string, readonly Workout[]][] = [
            ['Your workouts', aToZ(this.workouts.workouts())],
            ...(kit.length
                ? ([
                      ['Ready-made, for your equipment', readyMade.filter(canDo)],
                      ['Ready-made, other equipment', readyMade.filter((w) => !canDo(w))],
                  ] as [string, readonly Workout[]][])
                : ([['Ready-made', readyMade]] as [string, readonly Workout[]][])),
        ];
        return groups.flatMap(([group, workouts]) =>
            workouts.map((workout) => {
                const already = planned.includes(workout.id);
                const { main } = musclesWorked([workout], (id) => this.exercises.byId(id));
                return {
                    id: workout.id,
                    name: this.names().get(workout.id)!,
                    detail: already ? 'Planned' : '',
                    disabled: already,
                    note: listMuscles(
                        main.map((muscle) => MUSCLE_LABELS[muscle]),
                        3
                    ),
                    group,
                };
            })
        );
    }
}

/** What a planned workout's place this week says: active rest still to do says so, as it's optional. */
function statusLabel(item: PlannedWorkout): string {
    return item.activeRest && (item.status === 'today' || item.status === 'to come')
        ? 'Active rest'
        : PLANNED_STATUS_TEXT[item.status];
}
