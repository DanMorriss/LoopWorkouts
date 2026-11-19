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
            waitToStart: true,
            weightUnit: 'kg',
            bodyFigure: 'male',
            trainingGoal: 'muscle',
            weeklySets: 10,
            myEquipment: [],
            onlyMyEquipment: false,
            workoutKind: 'all',
            kettlebellWeight: null,
            eachSideFirst: 'left',
            switchSidesSeconds: 5,
            includeActiveRest: true,
            canTrainOn: [],
            name: '',
            bodyWeight: null,
            bodyWeightUpdatedAt: 0,
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

    it("aims each muscle at its goal's sets a week, unless they've been changed (PRG-8)", () => {
        expect(createStore().weeklySets()).toBe(10);

        // From before they could be changed, or not usable: the goal's
        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"trainingGoal": "fitness"}');
        expect(createStore().weeklySets()).toBe(6);
        for (const saved of ['1', '31', '12.5', '"12"']) {
            TestBed.resetTestingModule();
            localStorage.setItem('settings', `{"weeklySets": ${saved}}`);
            expect(createStore().weeklySets()).toBe(10);
        }

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"trainingGoal": "fitness", "weeklySets": 14}');
        expect(createStore().weeklySets()).toBe(14);
    });

    it("puts the sets a week back to the new goal's when the goal changes", () => {
        const store = createStore();
        store.update({ weeklySets: 14 });

        store.update({ trainingGoal: 'muscle' });
        expect(store.weeklySets()).toBe(14);

        store.update({ trainingGoal: 'fitness' });
        expect(store.weeklySets()).toBe(6);

        store.update({ trainingGoal: 'muscle', weeklySets: 8 });
        expect(store.weeklySets()).toBe(8);
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

    it('remembers the days you can train, each once and in order, and leaves out the rest', () => {
        localStorage.setItem(
            'settings',
            '{"canTrainOn": [4, 0, 9, 4, "2", 2], "includeActiveRest": false}'
        );
        const store = createStore();
        expect(store.canTrainOn()).toEqual([0, 2, 4]);
        expect(store.includeActiveRest()).toBe(false);

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"canTrainOn": "Mon"}');
        expect(createStore().canTrainOn()).toEqual([]);
        expect(createStore().includeActiveRest()).toBe(true);
    });

    it('remembers which kind of workout the Workouts page lists (LIB-10)', () => {
        expect(createStore().workoutKind()).toBe('all');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"workoutKind": "stretches"}');
        expect(createStore().workoutKind()).toBe('stretches');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"workoutKind": "yoga"}');
        expect(createStore().workoutKind()).toBe('all');
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

    // Health data: it syncs on its own, with consent, so a change to it doesn't date the profile
    it('keeps the body weight out of the profile, dated on its own (CAL-6)', () => {
        const store = createStore();
        expect(store.bodyWeightRecord()).toBeNull();

        store.update({ bodyWeight: 80 });
        expect(store.bodyWeight()).toBe(80);
        expect(store.hasProfile()).toBe(false);
        expect(store.profile()).not.toHaveProperty('bodyWeight');
        const first = store.bodyWeightRecord()!;
        expect(first.kg).toBe(80);
        expect(first.updatedAt).toBeGreaterThan(0);

        store.update({ theme: 'light', bodyWeight: 80 });
        expect(store.bodyWeightRecord()!.updatedAt).toBe(first.updatedAt);
        store.update({ bodyWeight: null });
        expect(store.bodyWeightRecord()!.kg).toBeNull();
        expect(store.bodyWeightRecord()!.updatedAt).toBeGreaterThan(first.updatedAt);
    });

    it("takes another device's body weight only if it's newer, and forgets it on leaving", () => {
        const store = createStore();
        store.update({ bodyWeight: 80 });
        const here = store.bodyWeightRecord()!.updatedAt;

        expect(store.mergeBodyWeight({ kg: 90, updatedAt: here - 1 })).toBe(false);
        expect(store.bodyWeight()).toBe(80);
        expect(store.mergeBodyWeight({ kg: 90, updatedAt: here + 1 })).toBe(true);
        expect(store.bodyWeight()).toBe(90);

        TestBed.resetTestingModule();
        expect(createStore().bodyWeightRecord()).toEqual({ kg: 90, updatedAt: here + 1 });

        createStore().forgetBodyWeight();
        expect(createStore().bodyWeight()).toBeNull();
        expect(createStore().bodyWeightRecord()).toBeNull();
    });

    describe('the profile (NAV-4)', () => {
        const theirs: Omit<Profile, 'updatedAt'> = {
            name: 'Sam',
            bodyFigure: 'female',
            trainingGoal: 'fitness',
            weeklySets: 8,
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
            expect(store.weeklySets()).toBe(8);
        });

        it('syncs the sets a week with the profile', () => {
            const store = createStore();
            store.update({ weeklySets: 12 });

            expect(store.profile().updatedAt).toBeGreaterThan(0);
            expect(store.profile().weeklySets).toBe(12);
        });

        it("syncs your kettlebell's weight with the profile (PRG-14)", () => {
            const store = createStore();
            expect(store.kettlebellWeight()).toBeNull();
            expect(store.profile()).not.toHaveProperty('kettlebellWeight');

            store.update({ kettlebellWeight: 16 });
            const here = store.profile().updatedAt;
            expect(here).toBeGreaterThan(0);
            expect(store.profile().kettlebellWeight).toBe(16);
            TestBed.resetTestingModule();
            expect(createStore().kettlebellWeight()).toBe(16);

            // Another device's, newer, with a heavier one; then one from before it had any
            const again = createStore();
            again.mergeProfile({ ...theirs, kettlebellWeight: 20, updatedAt: here + 1 });
            expect(again.kettlebellWeight()).toBe(20);
            again.mergeProfile({ ...theirs, updatedAt: here + 2 });
            expect(again.kettlebellWeight()).toBeNull();
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
