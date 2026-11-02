import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { makeWorkout } from '../testing/make-workout';
import { savedHistory } from '../testing/history-database';
import { Router } from '@angular/router';
import { AUTH_STORAGE_KEY } from '../../account/account-client';
import { UndoService } from '../undo/undo.service';
import {
    DEVICE_CHANNEL,
    DeviceDataService,
    LEFT_ACCOUNT_TEXT,
    SIGNED_OUT_NOTE,
} from './device-data.service';
import { HistoryStore } from './history-store.service';
import { WorkoutStore } from './workout-store.service';

const ENTRY: HistoryEntry = {
    id: '1000000-workout-1',
    workoutId: 'workout-1',
    title: 'Sprints',
    startedAt: 1_000_000,
    endedAt: 1_060_000,
    updatedAt: 1_060_000,
    activeSeconds: 60,
    roundsCompleted: 3,
    totalRounds: 3,
    outcome: 'finished',
};

describe('DeviceDataService', () => {
    let reload: () => void;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('data-version', '4');
        reload = vi.fn<() => void>();
        vi.spyOn(
            DeviceDataService.prototype as unknown as { reload: () => void },
            'reload'
        ).mockImplementation(reload);
    });
    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('removes everything saved on this device, the history too, then starts the app again', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        const history = TestBed.inject(HistoryStore);
        await history.ready;
        workouts.addWorkout({ title: 'Legs', blocks: makeWorkout().blocks, repeats: 3 });
        history.record(ENTRY);
        localStorage.setItem('settings', JSON.stringify({ theme: 'light' }));
        expect(await savedHistory()).toHaveLength(1);

        await TestBed.inject(DeviceDataService).clear();

        expect(localStorage.length).toBe(0);
        expect(await savedHistory()).toEqual([]);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("keeps this device's settings but not the profile's name when signing out, and leaves a note", async () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.addWorkout({ title: 'Legs', blocks: makeWorkout().blocks, repeats: 3 });
        localStorage.setItem(
            'settings',
            JSON.stringify({ theme: 'light', name: 'Sam', profileUpdatedAt: 5 })
        );
        localStorage.setItem('clock-offset', '120');
        localStorage.setItem('week-plan', '{}');

        await TestBed.inject(DeviceDataService).clear({ leaving: 'signed-out' });

        expect(Object.keys({ ...localStorage }).sort()).toEqual(['clock-offset', 'settings']);
        expect(localStorage.getItem('clock-offset')).toBe('120');
        // Less the account's name, and undated, so it isn't sent to the next account
        expect(JSON.parse(localStorage.getItem('settings')!)).toMatchObject({
            theme: 'light',
            name: '',
            profileUpdatedAt: 0,
        });
        expect(sessionStorage.getItem(SIGNED_OUT_NOTE)).toBe('signed-out');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('says why it was cleared once the app has opened again, in the bar', async () => {
        for (const left of ['signed-out', 'deleted', 'ended'] as const) {
            TestBed.resetTestingModule();
            sessionStorage.setItem(SIGNED_OUT_NOTE, left);
            TestBed.inject(DeviceDataService);
            await TestBed.inject(Router).navigateByUrl('/');

            expect(TestBed.inject(UndoService).offer()?.message).toBe(LEFT_ACCOUNT_TEXT[left]);
            expect(sessionStorage.getItem(SIGNED_OUT_NOTE)).toBeNull();
        }
        expect(LEFT_ACCOUNT_TEXT.ended).toBe(
            'You were signed out, so your data was removed from this device. Signing in again brings back what your account has'
        );
    });

    it('starts again when next looked at, after another tab signs in', () => {
        TestBed.inject(DeviceDataService);
        const storage = (oldValue: string | null, newValue: string | null) =>
            window.dispatchEvent(
                new StorageEvent('storage', { key: AUTH_STORAGE_KEY, oldValue, newValue })
            );

        // A sign-in renewed isn't a new one
        storage('{"a":1}', '{"a":2}');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(reload).not.toHaveBeenCalled();

        storage(null, '{"a":1}');
        expect(reload).not.toHaveBeenCalled();
        document.dispatchEvent(new Event('visibilitychange'));
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("drops a workout going, so it isn't logged as the page unloads", async () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.setActiveWorkout(makeWorkout());

        await TestBed.inject(DeviceDataService).clear();

        expect(workouts.activeWorkout()).toBeNull();
        expect(sessionStorage.length).toBe(0);
    });

    it('tells the other open tabs, once storage is cleared', async () => {
        const otherTab = new BroadcastChannel(DEVICE_CHANNEL);
        const heard = new Promise<number>((resolve) =>
            otherTab.addEventListener('message', () => resolve(localStorage.length), {
                once: true,
            })
        );

        await TestBed.inject(DeviceDataService).clear();

        expect(await heard).toBe(0);
        otherTab.close();
    });

    it('drops its workout and starts again when another tab clears the device', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        TestBed.inject(DeviceDataService);
        workouts.setActiveWorkout(makeWorkout());
        const otherTab = new BroadcastChannel(DEVICE_CHANNEL);

        otherTab.postMessage('cleared');
        await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

        expect(workouts.activeWorkout()).toBeNull();
        otherTab.close();
    });
});
