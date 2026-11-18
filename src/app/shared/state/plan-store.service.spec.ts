import { TestBed } from '@angular/core/testing';
import { MAX_WORKOUTS_A_DAY } from '../../models/plan';
import { PlanStore } from './plan-store.service';

describe('PlanStore', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    const createStore = () => TestBed.inject(PlanStore);

    it('starts with nothing planned, never changed', () => {
        const store = createStore();

        expect(store.plan()).toEqual({ days: [[], [], [], [], [], [], []], updatedAt: 0 });
        expect(store.hasPlan()).toBe(false);
    });

    it('plans a workout on a day once, dated now, and saves it for next time', () => {
        vi.spyOn(Date, 'now').mockReturnValue(5_000);
        const store = createStore();

        store.add(0, 'legs');
        store.add(0, 'legs');
        store.add(2, 'push');

        expect(store.plan()).toEqual({
            days: [['legs'], [], ['push'], [], [], [], []],
            // Each change after the last, as the sync clock dates them
            updatedAt: 5_001,
            // And when each was planned, so a day already gone by isn't counted as missed
            plannedAt: { '0:legs': 5_000, '2:push': 5_000 },
        });
        expect(store.hasPlan()).toBe(true);
        TestBed.resetTestingModule();
        expect(createStore().plan().days[2]).toEqual(['push']);
    });

    it('replaces the whole week, keeping when those already there were planned', () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const store = createStore();
        store.add(0, 'legs');
        store.add(2, 'push');

        now.mockReturnValue(9_000);
        store.replace([['legs'], ['pull'], [], [], [], [], []]);

        expect(store.plan().days).toEqual([['legs'], ['pull'], [], [], [], [], []]);
        expect(store.plan().plannedAt).toEqual({ '0:legs': 1_000, '1:pull': 9_000 });
    });

    it('puts an earlier plan back as it was, dated now', () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const store = createStore();
        store.add(3, 'legs');
        const before = store.plan();

        now.mockReturnValue(9_000);
        store.replace([['push'], [], [], [], [], [], []]);
        store.restore(before);

        expect(store.plan().days).toEqual(before.days);
        expect(store.plan().plannedAt).toEqual({ '3:legs': 1_000 });
        expect(store.plan().updatedAt).toBeGreaterThan(before.updatedAt);
    });

    it('plans a workout on just the days given, in one change: on the new ones, off the rest', () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const store = createStore();
        store.add(0, 'legs');
        store.add(2, 'push');
        store.add(4, 'legs');
        const updatedAt = store.plan().updatedAt;

        now.mockReturnValue(9_000);
        store.setDays('legs', [0, 2]);

        expect(store.plan().days).toEqual([['legs'], [], ['push', 'legs'], [], [], [], []]);
        expect(store.plan().plannedAt).toEqual({
            '0:legs': 1_000,
            '2:push': 1_000,
            '2:legs': 9_000,
        });
        expect(store.plan().updatedAt).toBeGreaterThan(updatedAt);
    });

    it("leaves a full day it isn't on alone", () => {
        const store = createStore();
        for (let i = 0; i < MAX_WORKOUTS_A_DAY; i++) {
            store.add(1, `w${i}`);
        }

        store.setDays('legs', [1, 3]);

        expect(store.plan().days[1]).not.toContain('legs');
        expect(store.plan().days[3]).toEqual(['legs']);
    });

    it('moves a workout to another day, planned there now, or to another place on its own', () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const store = createStore();
        store.add(0, 'legs');
        store.add(0, 'push');
        store.add(3, 'pull');

        now.mockReturnValue(9_000);
        store.move('push', 0, 0, 'legs');
        expect(store.plan().days[0]).toEqual(['push', 'legs']);
        expect(store.plan().plannedAt).toEqual({
            '0:legs': 1_000,
            '0:push': 1_000,
            '3:pull': 1_000,
        });

        store.move('legs', 0, 3, 'pull');
        store.move('push', 0, 3, null);
        expect(store.plan().days).toEqual([[], [], [], ['legs', 'pull', 'push'], [], [], []]);
        expect(store.plan().plannedAt).toEqual({
            '3:legs': 9_000,
            '3:pull': 1_000,
            '3:push': 9_000,
        });
    });

    it("doesn't move a workout to a day it's on already, or that's full", () => {
        const store = createStore();
        store.add(0, 'legs');
        store.add(1, 'legs');
        for (let i = 0; i < MAX_WORKOUTS_A_DAY; i++) {
            store.add(2, `w${i}`);
        }
        const before = store.plan();

        store.move('legs', 0, 1, null);
        store.move('legs', 0, 2, null);

        expect(store.plan()).toBe(before);
    });

    it('has a workout done on another day this week only, keeping that through other changes', () => {
        // Wednesday 28 October 2026
        vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 28, 10).getTime());
        const store = createStore();
        store.add(1, 'push');

        store.moveThisWeek('push', 1, 2);
        const monday = new Date(2026, 9, 26).getTime();
        expect(store.plan().moves).toEqual([{ week: monday, workoutId: 'push', from: 1, to: 2 }]);
        store.add(4, 'legs');
        expect(store.plan().moves).toHaveLength(1);

        store.moveThisWeek('push', 1, null);
        expect(store.plan()).not.toHaveProperty('moves');
    });

    it('swaps two days, each workout planned on its new day now, one on both left as it was', () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        const store = createStore();
        store.add(0, 'legs');
        store.add(0, 'core');
        store.add(2, 'push');
        store.add(2, 'core');
        store.add(4, 'pull');

        now.mockReturnValue(9_000);
        store.swapDays(0, 2);

        expect(store.plan().days).toEqual([
            ['push', 'core'],
            [],
            ['legs', 'core'],
            [],
            ['pull'],
            [],
            [],
        ]);
        expect(store.plan().plannedAt).toEqual({
            '0:push': 9_000,
            '0:core': 1_000,
            '2:legs': 9_000,
            '2:core': 1_000,
            '4:pull': 1_000,
        });

        // With an empty day, it's a move
        store.swapDays(4, 6);
        expect(store.plan().days[4]).toEqual([]);
        expect(store.plan().days[6]).toEqual(['pull']);
    });

    it("takes the week's one-off moves along with a swap", () => {
        // Wednesday 28 October 2026
        vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 28, 10).getTime());
        const monday = new Date(2026, 9, 26).getTime();
        const store = createStore();
        store.add(0, 'legs');
        store.add(1, 'push');
        store.add(4, 'pull');
        // Legs done today, Wednesday; Push done on Friday
        store.moveThisWeek('legs', 0, 2);
        store.moveThisWeek('push', 1, 4);

        // Monday's swapped with Thursday: Legs is planned on Thursday, still done today
        store.swapDays(0, 3);
        // Wednesday's swapped with Friday: Push, moved onto Wednesday, goes with it
        store.swapDays(2, 4);

        expect(store.plan().days).toEqual([[], ['push'], ['pull'], ['legs'], [], [], []]);
        expect(store.plan().moves).toEqual([
            { week: monday, workoutId: 'legs', from: 3, to: 4 },
            { week: monday, workoutId: 'push', from: 1, to: 2 },
        ]);
    });

    it("keeps what a day shows this week with a swap, and doesn't swap a day with itself", () => {
        vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 28, 10).getTime());
        const monday = new Date(2026, 9, 26).getTime();
        const store = createStore();
        store.add(0, 'legs');
        // Legs, planned on Monday, shows today, Wednesday
        store.moveThisWeek('legs', 0, 2);
        const before = store.plan();

        store.swapDays(2, 2);
        expect(store.plan()).toBe(before);

        // Planned on Wednesday now, and shows on Monday this week
        store.swapDays(0, 2);
        expect(store.plan().days[2]).toEqual(['legs']);
        expect(store.plan().moves).toEqual([{ week: monday, workoutId: 'legs', from: 2, to: 0 }]);
    });

    it('takes a workout off a day, leaving the others', () => {
        const store = createStore();
        store.add(4, 'push');
        store.add(4, 'pull');

        store.remove(4, 'push');

        expect(store.plan().days[4]).toEqual(['pull']);
    });

    it(`plans at most ${MAX_WORKOUTS_A_DAY} workouts on a day`, () => {
        const store = createStore();
        for (let i = 0; i <= MAX_WORKOUTS_A_DAY; i++) {
            store.add(1, `w${i}`);
        }

        expect(store.plan().days[1]).toHaveLength(MAX_WORKOUTS_A_DAY);
    });

    it("takes another copy's plan only if it changed more recently", () => {
        vi.spyOn(Date, 'now').mockReturnValue(5_000);
        const store = createStore();
        store.add(0, 'legs');
        const days = [[], ['push'], [], [], [], [], []];

        expect(store.merge({ days, updatedAt: 4_000 })).toBe(false);
        expect(store.plan().days[0]).toEqual(['legs']);
        expect(store.merge({ days, updatedAt: 6_000 })).toBe(true);
        expect(store.plan()).toEqual({ days, updatedAt: 6_000 });
    });

    it('starts empty from a broken saved plan', () => {
        localStorage.setItem('week-plan', '{"days": "nope"}');

        expect(createStore().plan().updatedAt).toBe(0);
    });
});
