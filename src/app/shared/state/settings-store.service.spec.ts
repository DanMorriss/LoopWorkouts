import { TestBed } from '@angular/core/testing';
import { Profile } from '../../models/profile';
import { SettingsStore } from './settings-store.service';

describe('SettingsStore', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    const createStore = () => TestBed.inject(SettingsStore);

    it('has sound, vibration and countdown beeps on by default', () => {
        const store = createStore();

        expect(store.sound()).toBe(true);
        expect(store.vibration()).toBe(true);
        expect(store.countdownBeeps()).toBe(true);
    });

    it('saves changes, and loads them next time', () => {
        createStore().update({ sound: false });
        expect(JSON.parse(localStorage.getItem('settings')!)).toEqual({
            theme: 'dark',
            sound: false,
            vibration: true,
            countdownBeeps: true,
            keepScreenOn: true,
            weightUnit: 'kg',
            bodyFigure: 'male',
            trainingGoal: 'muscle',
            myEquipment: [],
            onlyMyEquipment: false,
            eachSideFirst: 'left',
            switchSidesSeconds: 5,
            name: '',
            bodyWeight: null,
            profileUpdatedAt: 0,
        });

        TestBed.resetTestingModule();
        const store = createStore();

        expect(store.sound()).toBe(false);
        expect(store.vibration()).toBe(true);
    });

    it('defaults to the dark theme, and keeps only a theme it knows', () => {
        localStorage.setItem('settings', '{"theme": "neon"}');
        expect(createStore().theme()).toBe('dark');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"theme": "system"}');
        expect(createStore().theme()).toBe('system');
    });

    it('shows weights in kg by default, and keeps only a unit it knows', () => {
        expect(createStore().weightUnit()).toBe('kg');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"weightUnit": "stone"}');
        expect(createStore().weightUnit()).toBe('kg');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"weightUnit": "lb"}');
        expect(createStore().weightUnit()).toBe('lb');
    });

    it('draws the male figure by default, and keeps only a figure it knows', () => {
        expect(createStore().bodyFigure()).toBe('male');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"bodyFigure": "robot"}');
        expect(createStore().bodyFigure()).toBe('male');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"bodyFigure": "female"}');
        expect(createStore().bodyFigure()).toBe('female');
    });

    it('aims for muscle by default, and keeps only a goal it knows', () => {
        expect(createStore().trainingGoal()).toBe('muscle');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"trainingGoal": "speed"}');
        expect(createStore().trainingGoal()).toBe('muscle');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"trainingGoal": "fitness"}');
        expect(createStore().trainingGoal()).toBe('fitness');
    });

    it('has no equipment to begin with, and keeps only equipment it knows, in order', () => {
        expect(createStore().myEquipment()).toEqual([]);
        expect(createStore().onlyMyEquipment()).toBe(false);

        TestBed.resetTestingModule();
        localStorage.setItem(
            'settings',
            '{"myEquipment": ["rack", "jetpack", "barbell", "none"], "onlyMyEquipment": true}'
        );
        const store = createStore();

        expect(store.myEquipment()).toEqual(['barbell', 'rack']);
        expect(store.onlyMyEquipment()).toBe(true);
    });

    it('keeps No equipment, said outright, apart from none picked', () => {
        localStorage.setItem('settings', '{"myEquipment": ["none"]}');

        expect(createStore().myEquipment()).toEqual(['none']);
    });

    for (const [label, saved] of [
        ['corrupted', '{not json'],
        ['not an object', '"loud"'],
        ['the wrong types', '{"sound": "off", "vibration": 0}'],
    ]) {
        it(`falls back to the defaults when saved settings are ${label}`, () => {
            localStorage.setItem('settings', saved);

            const store = createStore();

            expect(store.sound()).toBe(true);
            expect(store.vibration()).toBe(true);
        });
    }

    it('starts each side on the left with 5 seconds to switch, keeping only what it can use', () => {
        const store = createStore();
        expect(store.eachSideFirst()).toBe('left');
        expect(store.switchSidesSeconds()).toBe(5);

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"eachSideFirst": "middle", "switchSidesSeconds": 31}');
        expect(createStore().eachSideFirst()).toBe('left');
        expect(createStore().switchSidesSeconds()).toBe(5);

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"eachSideFirst": "right", "switchSidesSeconds": 0}');
        expect(createStore().eachSideFirst()).toBe('right');
        expect(createStore().switchSidesSeconds()).toBe(0);
    });

    it('has no body weight to begin with, keeping only one in range (CAL-2)', () => {
        expect(createStore().bodyWeight()).toBeNull();

        for (const saved of ['"72"', '19.9', '300.5']) {
            TestBed.resetTestingModule();
            localStorage.setItem('settings', `{"bodyWeight": ${saved}}`);
            expect(createStore().bodyWeight()).toBeNull();
        }

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"bodyWeight": 72.575}');
        expect(createStore().bodyWeight()).toBe(72.575);
    });

    // Health data: it stays on this device, so a change to it doesn't date the profile
    it("keeps the body weight out of the profile, so it doesn't sync", () => {
        const store = createStore();
        store.update({ bodyWeight: 80 });
        expect(store.bodyWeight()).toBe(80);
        expect(store.hasProfile()).toBe(false);
        expect(store.profile()).not.toHaveProperty('bodyWeight');
    });

    describe('the profile (NAV-4)', () => {
        const theirs: Omit<Profile, 'updatedAt'> = {
            name: 'Sam',
            bodyFigure: 'female',
            trainingGoal: 'fitness',
            weightUnit: 'lb',
            myEquipment: ['kettlebell'],
        };

        it('has no name and is undated to begin with, keeping only a usable one', () => {
            const store = createStore();
            expect(store.name()).toBe('');
            expect(store.hasProfile()).toBe(false);

            TestBed.resetTestingModule();
            localStorage.setItem('settings', '{"name": 7, "profileUpdatedAt": -1}');
            expect(createStore().name()).toBe('');
            expect(createStore().hasProfile()).toBe(false);
        });

        it('dates a change to the profile, so it syncs, but not to other settings', () => {
            const store = createStore();

            store.update({ theme: 'light', sound: false });
            expect(store.profile().updatedAt).toBe(0);

            store.update({ myEquipment: ['dumbbells'] });
            const first = store.profile().updatedAt;
            expect(first).toBeGreaterThan(0);

            store.update({ myEquipment: ['dumbbells'], name: 'Sam' });
            expect(store.profile().updatedAt).toBeGreaterThan(first);
            expect(store.profile().name).toBe('Sam');
        });

        it('keeps a name trimmed and no longer than 40 characters', () => {
            const store = createStore();

            store.update({ name: '  Sam  ' });
            expect(store.name()).toBe('Sam');

            store.update({ name: 'x'.repeat(50) });
            expect(store.name()).toHaveLength(40);
        });

        it('dates the profile as it is once set up, without changing it', () => {
            const store = createStore();

            store.keepProfile();

            expect(store.hasProfile()).toBe(true);
            expect(store.bodyFigure()).toBe('male');
        });

        it("takes another device's profile only if it changed more recently", () => {
            const store = createStore();
            store.update({ name: 'Here' });
            const here = store.profile().updatedAt;

            expect(store.mergeProfile({ ...theirs, updatedAt: here - 1 })).toBe(false);
            expect(store.name()).toBe('Here');

            expect(store.mergeProfile({ ...theirs, updatedAt: here + 1 })).toBe(true);
            expect(store.profile()).toEqual({ ...theirs, updatedAt: here + 1 });
            expect(store.weightUnit()).toBe('lb');
        });

        it('forgets the name and the date on leaving the account, keeping the rest', () => {
            const store = createStore();
            store.update(theirs);

            store.forgetProfile();

            expect(store.name()).toBe('');
            expect(store.hasProfile()).toBe(false);
            expect(store.bodyFigure()).toBe('female');
        });
    });
});
