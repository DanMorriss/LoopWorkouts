import { computed, inject, Service, signal } from '@angular/core';
import {
    copyPlan,
    EMPTY_PLAN,
    isWeekPlan,
    MAX_WORKOUTS_A_DAY,
    plannedKey,
    WeekPlan,
} from '../../models/plan';
import { SyncClock } from './sync-clock.service';

const STORAGE_KEY = 'week-plan';

/**
 * The weekly plan (PLN-1), saved on the device and synced as one record. Each change is dated
 * by the sync clock, and another copy's plan is taken if it changed more recently.
 */
@Service()
export class PlanStore {
    private readonly clock = inject(SyncClock);
    private readonly _plan = signal<WeekPlan>(readPlan());

    readonly plan = this._plan.asReadonly();
    /** Whether any workout is planned on any day. */
    readonly hasPlan = computed(() => this._plan().days.some((day) => day.length > 0));

    /** Plans `workoutId` on `day` (from 0 for Monday), at the end, unless it's there already. */
    add(day: number, workoutId: string) {
        const ids = this._plan().days[day];
        if (!ids || ids.includes(workoutId) || ids.length >= MAX_WORKOUTS_A_DAY) {
            return;
        }
        this.change(day, [...ids, workoutId], { [plannedKey(day, workoutId)]: Date.now() });
    }

    /** Takes `workoutId` off `day`. */
    remove(day: number, workoutId: string) {
        const ids = this._plan().days[day];
        if (ids?.includes(workoutId)) {
            this.change(
                day,
                ids.filter((id) => id !== workoutId)
            );
        }
    }

    /**
     * Sets every day at once, Monday first, e.g. from a ready-made plan (PLN-6). A workout
     * already on its day keeps when it was planned; the rest are planned now. Dated now, as any
     * change is, so it syncs as the latest.
     */
    replace(days: readonly (readonly string[])[]) {
        const plan = this._plan();
        const now = Date.now();
        const plannedAt: Record<string, number> = {};
        const newDays = plan.days.map((_, day) =>
            [...(days[day] ?? [])].slice(0, MAX_WORKOUTS_A_DAY)
        );
        newDays.forEach((ids, day) =>
            ids.forEach((id) => {
                const key = plannedKey(day, id);
                plannedAt[key] = plan.days[day].includes(id) ? (plan.plannedAt?.[key] ?? now) : now;
            })
        );
        this.save(
            copyPlan({ days: newDays, updatedAt: this.clock.now(plan.updatedAt), plannedAt })
        );
    }

    /**
     * Puts back a plan as it was, days and when each was planned, e.g. with Undo. Dated now, so
     * it syncs as the latest.
     */
    restore(earlier: WeekPlan) {
        this.save(copyPlan({ ...earlier, updatedAt: this.clock.now(this._plan().updatedAt) }));
    }

    /**
     * Takes another copy's plan (from a backup or another device) if it changed more recently
     * than this one. Returns whether it did.
     */
    merge(plan: WeekPlan): boolean {
        if (plan.updatedAt <= this._plan().updatedAt) {
            return false;
        }
        this.save(copyPlan(plan));
        return true;
    }

    /** Sets `day`'s workouts, with when any new ones were planned; copyPlan() drops the rest. */
    private change(day: number, ids: string[], planned: Record<string, number> = {}) {
        const plan = this._plan();
        this.save(
            copyPlan({
                days: plan.days.map((other, i) => (i === day ? ids : other)),
                updatedAt: this.clock.now(plan.updatedAt),
                plannedAt: { ...plan.plannedAt, ...planned },
            })
        );
    }

    private save(plan: WeekPlan) {
        this._plan.set(plan);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    }
}

/** The plan saved on this device, or an empty one if there's none (or it's broken). */
function readPlan(): WeekPlan {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        return isWeekPlan(saved) ? copyPlan(saved) : copyPlan(EMPTY_PLAN);
    } catch {
        return copyPlan(EMPTY_PLAN);
    }
}
