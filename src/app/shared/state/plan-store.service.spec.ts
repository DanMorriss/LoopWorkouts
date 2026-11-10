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
