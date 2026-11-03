import { computed, inject, Service, signal } from '@angular/core';
import { copyPlan, EMPTY_PLAN, isWeekPlan, MAX_WORKOUTS_A_DAY, WeekPlan } from '../../models/plan';
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
        this.change(day, [...ids, workoutId]);
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
     * Sets every day at once, Monday first, e.g. from a ready-made plan (PLN-6) or putting one
     * back with Undo. Dated now, as any change is, so it syncs as the latest.
     */
    replace(days: readonly (readonly string[])[]) {
        const plan = this._plan();
        this.save({
            days: plan.days.map((_, i) => [...(days[i] ?? [])].slice(0, MAX_WORKOUTS_A_DAY)),
            updatedAt: this.clock.now(plan.updatedAt),
        });
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

    private change(day: number, ids: string[]) {
        const plan = this._plan();
        this.save({
            days: plan.days.map((other, i) => (i === day ? ids : other)),
            updatedAt: this.clock.now(plan.updatedAt),
        });
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
