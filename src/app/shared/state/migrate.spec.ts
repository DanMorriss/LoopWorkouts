import { TestBed } from '@angular/core/testing';
import { makeWorkout, reps, rest, savedBeforeGroups, work } from '../testing/make-workout';
import { HistoryStore } from './history-store.service';
import { DATA_VERSION, migrateSavedData, needsBuiltInExercises } from './migrate';
import { WorkoutStore } from './workout-store.service';

// Data as version 1 of the app saved it: number ids, no dates, and called timers
function v1Workout(id: number, title: string) {
    const { id: _id, updatedAt: _at, ...workout } = makeWorkout({ title });
    return { ...workout, id };
}

const v1Entry = (startedAt: number, timerId: number) => ({
    id: `${startedAt}-${timerId}`,
    timerId,
    title: 'Sprints',
    startedAt,
    endedAt: startedAt + 60_000,
    activeSeconds: 60,
    roundsCompleted: 3,
    totalRounds: 3,
    outcome: 'finished',
});

const saved = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('migrating saved data', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    function saveVersion1() {
        localStorage.setItem(
            'timers',
            JSON.stringify([v1Workout(1, 'Legs'), v1Workout(2, 'Arms')])
        );
        localStorage.setItem(
            'history',
            JSON.stringify([v1Entry(1_000_000, 1), v1Entry(2_000_000, 2), v1Entry(3_000_000, 9)])
        );
        localStorage.setItem('history-deleted', JSON.stringify(['500-1']));
    }

    describe('the built-in exercises, which version 3 links to', () => {
        it('are needed only for workouts or history saved before version 3', () => {
            expect(needsBuiltInExercises()).toBe(false);
            saveVersion1();
            expect(needsBuiltInExercises()).toBe(true);
            localStorage.setItem('data-version', '3');
            expect(needsBuiltInExercises()).toBe(false);
        });

        it('leave the data alone without them, rather than make a copy of each', () => {
            saveVersion1();
            const before = localStorage.getItem('timers');

            expect(() => migrateSavedData(7000, [])).toThrowError(/needs the built-in exercises/);

            expect(localStorage.getItem('timers')).toBe(before);
            expect(localStorage.getItem('data-version')).toBeNull();
        });

        it('are only needed for what there is to link: a new device is set up without them', () => {
            migrateSavedData(7000, []);

            expect(localStorage.getItem('data-version')).toBe(String(DATA_VERSION));
        });
    });

    it('gives workouts random ids and a date, and points the history to them', () => {
        saveVersion1();

        migrateSavedData(7000);

        const [legs, arms] = saved('workouts');
        expect(legs.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(arms.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(legs.id).not.toBe(arms.id);
        expect([legs.updatedAt, arms.updatedAt]).toEqual([7000, 7000]);
        expect(
            saved('history').map((e: { workoutId: string; updatedAt: number }) => [
                e.workoutId,
                e.updatedAt,
            ])
        ).toEqual([
            [legs.id, 1_060_000],
            [arms.id, 2_060_000],
            // Its workout was deleted: the old number, as text
            ['9', 3_060_000],
        ]);
    });

    it("keeps each workout's own id, so the same run still matches", () => {
        saveVersion1();

        migrateSavedData(7000);

        expect(saved('history').map((e: { id: string }) => e.id)).toEqual([
            '1000000-1',
            '2000000-2',
            '3000000-9',
        ]);
    });

    it('turns deleted history ids into dated deletions', () => {
        saveVersion1();

        migrateSavedData(7000);

        expect(saved('deleted')).toEqual([{ kind: 'history', id: '500-1', deletedAt: 7000 }]);
        expect(localStorage.getItem('history-deleted')).toBeNull();
    });

    it('runs once: later loads leave the data alone', () => {
        saveVersion1();
        migrateSavedData(7000);
        expect(localStorage.getItem('data-version')).toBe(String(DATA_VERSION));

        localStorage.setItem('workouts', JSON.stringify([v1Workout(5, 'New old')]));
        migrateSavedData(8000);

        expect(saved('workouts')[0].id).toBe(5);
    });

    it("leaves data it can't read for the stores to drop", () => {
        localStorage.setItem('timers', '{broken');
        localStorage.setItem('history', '"not a list"');

        migrateSavedData(7000);

        expect(localStorage.getItem('workouts')).toBe('{broken');
        expect(localStorage.getItem('history')).toBe('"not a list"');
        expect(localStorage.getItem('data-version')).toBe(String(DATA_VERSION));
    });

    it('happens before the stores load, so they see the new ids', async () => {
        saveVersion1();

        const workouts = TestBed.inject(WorkoutStore).workouts();
        const store = TestBed.inject(HistoryStore);
        await store.ready;
        const history = store.entries();

        expect(workouts.map((t) => t.title)).toEqual(['Legs', 'Arms']);
        expect(history.find((e) => e.id === '1000000-1')?.workoutId).toBe(workouts[0].id);
    });

    it('still finds a workout in progress by its old number', () => {
        saveVersion1();
        sessionStorage.setItem('activeTimerId', '2');
        sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 1000));

        expect(TestBed.inject(WorkoutStore).activeWorkout()?.title).toBe('Arms');
    });
});

describe('migrating saved data to version 3: exercises', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '2');
    });
    afterEach(() => localStorage.clear());

    const saveVersion2 = () => {
        localStorage.setItem(
            'timers',
            JSON.stringify([
                savedBeforeGroups(
                    makeWorkout({
                        id: 'legs',
                        steps: [
                            { kind: 'reps', reps: 10, name: 'Squats', weight: 60 },
                            { kind: 'rest', seconds: 60, name: 'Breathe' },
                            { kind: 'work', seconds: 30, name: 'Wall sit hold' },
                            { kind: 'reps', reps: 5, name: '' },
                        ],
                    })
                ),
            ])
        );
        localStorage.setItem(
            'history',
            JSON.stringify([
                {
                    ...v1Entry(1_000_000, 1),
                    timerId: 'legs',
                    updatedAt: 1_060_000,
                    sets: [
                        { round: 0, step: 0, name: 'Squats', reps: 10, weight: 60 },
                        { round: 0, step: 1, name: 'Sled push', reps: 3 },
                        { round: 0, step: 2, name: '', reps: 5 },
                    ],
                },
            ])
        );
    };

    it('links named steps to exercises, built-in where the name matches, your own otherwise', () => {
        saveVersion2();

        migrateSavedData(7000);

        const own = saved('exercises');
        const wallSit = own.find((e: { name: string }) => e.name === 'Wall sit hold');
        expect(wallSit).toEqual(expect.objectContaining({ measuredBy: 'timed', updatedAt: 7000 }));
        expect(
            saved('workouts')[0].blocks[0].steps.map((s: { exerciseId?: string }) => s.exerciseId)
        ).toEqual(['builtin:back-squat', undefined, wallSit.id, undefined]);
        expect(localStorage.getItem('data-version')).toBe(String(DATA_VERSION));
    });

    it('links named sets in the history the same way, one exercise per name', () => {
        saveVersion2();

        migrateSavedData(7000);

        const own = saved('exercises');
        expect(own.map((e: { name: string }) => e.name)).toEqual(['Wall sit hold', 'Sled push']);
        expect(saved('history')[0].sets.map((s: { exerciseId?: string }) => s.exerciseId)).toEqual([
            'builtin:back-squat',
            own[1].id,
            undefined,
        ]);
    });

    it('brings version 1 data all the way, linking it too', () => {
        localStorage.removeItem('data-version');
        const {
            id: _id,
            updatedAt: _at,
            ...workout
        } = savedBeforeGroups(
            makeWorkout({
                steps: [{ kind: 'reps', reps: 20, name: 'Push-ups' }],
            })
        );
        localStorage.setItem('timers', JSON.stringify([{ ...workout, id: 1 }]));

        migrateSavedData(7000);

        const [saved1] = saved('workouts');
        expect(saved1.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(saved1.blocks[0].steps[0].exerciseId).toBe('builtin:push-up');
    });

    it('leaves a workout with a broken step for the store to drop', () => {
        localStorage.setItem('timers', JSON.stringify([{ id: 'x', steps: [{ kind: 'reps' }] }]));

        migrateSavedData(7000);

        expect(saved('workouts')).toEqual([
            {
                id: 'x',
                blocks: [{ kind: 'group', rounds: 1, restSeconds: 0, steps: [{ kind: 'reps' }] }],
            },
        ]);
    });
});

describe('migrating saved data to version 4: workouts, not timers', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('data-version', '3');
    });
    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('moves the timers to workouts, and points the history and deletions at them', () => {
        const legs = makeWorkout({ id: 'legs', title: 'Legs' });
        localStorage.setItem('timers', JSON.stringify([savedBeforeGroups(legs)]));
        localStorage.setItem('legacy-timer-ids', JSON.stringify({ 1: 'legs' }));
        localStorage.setItem(
            'history',
            JSON.stringify([{ ...v1Entry(1_000_000, 1), timerId: 'legs', updatedAt: 1 }])
        );
        localStorage.setItem(
            'deleted',
            JSON.stringify([
                { kind: 'timer', id: 'arms', deletedAt: 5 },
                { kind: 'history', id: 'run', deletedAt: 6 },
            ])
        );

        migrateSavedData(7000);

        expect(saved('workouts')).toEqual([legs]);
        expect(localStorage.getItem('timers')).toBeNull();
        expect(saved('legacy-workout-ids')).toEqual({ 1: 'legs' });
        expect(localStorage.getItem('legacy-timer-ids')).toBeNull();
        const [entry] = saved('history');
        expect(entry.workoutId).toBe('legs');
        expect('timerId' in entry).toBe(false);
        expect(saved('deleted')).toEqual([
            { kind: 'workout', id: 'arms', deletedAt: 5 },
            { kind: 'history', id: 'run', deletedAt: 6 },
        ]);
        expect(localStorage.getItem('data-version')).toBe(String(DATA_VERSION));
    });

    it("carries on a tab's workout in progress, saved under the timer's names", () => {
        localStorage.setItem(
            'timers',
            JSON.stringify([makeWorkout({ id: 'legs', title: 'Legs' })])
        );
        sessionStorage.setItem('activeTimerId', 'legs');
        sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 1000));

        const store = TestBed.inject(WorkoutStore);

        expect(store.activeWorkout()?.title).toBe('Legs');
        expect(sessionStorage.getItem('activeWorkoutId')).toBe('legs');
        expect(sessionStorage.getItem('activeTimerId')).toBeNull();
    });
});

describe('migrating saved data to version 5: groups', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
    });
    afterEach(() => localStorage.clear());

    it("makes each workout's steps one group, run once a round, and leaves the history", () => {
        const circuit = makeWorkout({
            id: 'circuit',
            repeats: 5,
            steps: [work(45, 'Squats'), rest(15), reps(20, 'Push-ups')],
        });
        const sets = [{ round: 2, step: 2, name: 'Push-ups', reps: 20 }];
        localStorage.setItem('workouts', JSON.stringify([savedBeforeGroups(circuit)]));
        localStorage.setItem('history', JSON.stringify([{ ...v1Entry(1_000_000, 1), sets }]));

        migrateSavedData(7000);

        expect(saved('workouts')).toEqual([
            {
                id: 'circuit',
                title: 'Intervals',
                updatedAt: 1,
                repeats: 5,
                blocks: [
                    {
                        kind: 'group',
                        rounds: 1,
                        restSeconds: 0,
                        steps: [work(45, 'Squats'), rest(15), reps(20, 'Push-ups')],
                    },
                ],
            },
        ]);
        expect(saved('history')[0].sets).toEqual(sets);
        expect(localStorage.getItem('data-version')).toBe('5');
    });

    it('leaves a workout already in groups as it is', () => {
        const circuit = makeWorkout({ id: 'circuit' });
        localStorage.setItem('workouts', JSON.stringify([circuit]));

        migrateSavedData(7000);

        expect(saved('workouts')).toEqual([circuit]);
    });
});
