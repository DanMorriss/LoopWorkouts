import { HistoryEntry } from '../../models/history';
import { WeekPlan } from '../../models/plan';
import { Deletion, LibraryOrder } from '../../models/sync';
import { Settings } from '../state/settings-store.service';
import { makeWorkout, rest, savedBeforeGroups, work } from '../testing/make-workout';
import { BACKUP_VERSION, backupFileName, makeBackup, readBackup } from './backup-file';

const SETTINGS: Omit<Settings, 'profileUpdatedAt' | 'bodyWeightUpdatedAt'> = {
    theme: 'dark',
    sound: true,
    vibration: true,
    countdownBeeps: true,
    keepScreenOn: true,
    weightUnit: 'kg',
    bodyFigure: 'male',
    trainingGoal: 'muscle',
    myEquipment: ['barbell', 'rack'],
    onlyMyEquipment: true,
    eachSideFirst: 'right',
    switchSidesSeconds: 10,
    name: 'Sam',
    bodyWeight: 72.5,
};

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
    sets: [{ round: 0, step: 0, name: 'Squats', reps: 10, weight: 60 }],
};

const ORDER: LibraryOrder = { ids: ['workout-1'], updatedAt: 3_000_000 };
const PLAN: WeekPlan = { days: [['workout-1'], [], [], [], [], [], []], updatedAt: 3_500_000 };

const DELETION: Deletion = { kind: 'history', id: 'gone', deletedAt: 2_000_000 };

const fileWith = (contents: Record<string, unknown>) =>
    JSON.stringify({
        app: 'Loop Workouts',
        version: BACKUP_VERSION,
        exportedAt: 1,
        workouts: [],
        history: [],
        deleted: [],
        ...contents,
    });

/** A history entry as saved before version 4, with no `workoutId` (it was `timerId`). */
function withoutWorkoutId(entry: Omit<HistoryEntry, 'updatedAt'> & { updatedAt?: number }) {
    const { workoutId: _id, ...rest } = entry;
    return rest;
}

describe('backup file', () => {
    it('holds everything, marked as a Loop Workouts backup with its version', () => {
        const workout = makeWorkout({
            steps: [{ kind: 'reps', reps: 10, name: 'Squats', weight: 60 }],
        });

        const backup = makeBackup(
            {
                workouts: [workout],
                history: [ENTRY],
                exercises: [],
                exerciseNotes: [],
                hiddenExercises: [],
                readyMadeFavourites: [],
                readyMadeChanges: [],
                libraryOrder: ORDER,
                plan: PLAN,
                deleted: [DELETION],
                settings: SETTINGS,
            },
            5
        );

        expect(backup).toEqual({
            app: 'Loop Workouts',
            version: BACKUP_VERSION,
            exportedAt: 5,
            workouts: [workout],
            history: [ENTRY],
            exercises: [],
            exerciseNotes: [],
            hiddenExercises: [],
            readyMadeFavourites: [],
            readyMadeChanges: [],
            libraryOrder: ORDER,
            plan: PLAN,
            deleted: [DELETION],
            settings: SETTINGS,
        });
    });

    it('reads back what was saved', () => {
        const workout = makeWorkout({ title: 'Legs' });
        const text = JSON.stringify(
            makeBackup(
                {
                    workouts: [workout],
                    history: [ENTRY],
                    exercises: [],
                    exerciseNotes: [],
                    hiddenExercises: [],
                    readyMadeFavourites: [],
                    readyMadeChanges: [],
                    libraryOrder: ORDER,
                    plan: PLAN,
                    deleted: [DELETION],
                    settings: SETTINGS,
                },
                5
            )
        );

        expect(readBackup(text)).toEqual({
            ok: true,
            workouts: [workout],
            history: [ENTRY],
            exercises: [],
            exerciseNotes: [],
            hiddenExercises: [],
            readyMadeFavourites: [],
            readyMadeChanges: [],
            libraryOrder: ORDER,
            plan: PLAN,
            deleted: [DELETION],
            fromVersion1: false,
            newWorkouts: [],
            skipped: 0,
        });
    });

    it('has no plan when the file has none, or a broken one', () => {
        for (const plan of [
            undefined,
            { days: [[], [], []], updatedAt: 1 },
            { days: [[1], [], [], [], [], [], []], updatedAt: 1 },
            { days: [[], [], [], [], [], [], []] },
        ]) {
            const backup = readBackup(fileWith({ plan }));
            expect(backup.ok && backup.plan).toBeNull();
        }
    });

    it('has no library order when the file has none, or a broken one', () => {
        for (const libraryOrder of [undefined, { ids: [1], updatedAt: 1 }, { ids: [] }]) {
            const backup = readBackup(fileWith({ libraryOrder }));
            expect(backup.ok && backup.libraryOrder).toBeNull();
        }
    });

    it('is named by the date it was made', () => {
        expect(backupFileName(new Date(2026, 9, 21, 23, 30).getTime())).toBe(
            'loop-workouts-2026-10-21.json'
        );
        expect(backupFileName(new Date(2026, 0, 5).getTime())).toBe(
            'loop-workouts-2026-01-05.json'
        );
    });

    it("says a file that isn't JSON can't be read", () => {
        expect(readBackup('not json')).toEqual({ ok: false, problem: 'unreadable' });
    });

    it("says a file that isn't a Loop Workouts backup isn't one", () => {
        for (const text of [
            '[]',
            '"backup"',
            fileWith({ app: 'Other' }),
            fileWith({ version: 0 }),
            fileWith({ version: '1' }),
            fileWith({ workouts: undefined }),
            fileWith({ history: {} }),
        ]) {
            expect(readBackup(text)).toEqual({ ok: false, problem: 'not-a-backup' });
        }
    });

    it('says a file from a newer version is too new', () => {
        expect(readBackup(fileWith({ version: BACKUP_VERSION + 1 }))).toEqual({
            ok: false,
            problem: 'too-new',
        });
    });

    it('leaves out broken workouts, history entries and deletions, and counts the first two', () => {
        const workout = makeWorkout();
        const result = readBackup(
            fileWith({
                workouts: [workout, { id: 'x', title: 'No steps', repeats: 3, steps: [] }],
                history: [ENTRY, { id: 'broken' }, 'nonsense'],
                deleted: [DELETION, { kind: 'other', id: 'x', deletedAt: 1 }],
            })
        );

        expect(result).toEqual({
            ok: true,
            workouts: [workout],
            history: [ENTRY],
            exercises: [],
            exerciseNotes: [],
            hiddenExercises: [],
            readyMadeFavourites: [],
            readyMadeChanges: [],
            libraryOrder: null,
            plan: null,
            deleted: [DELETION],
            fromVersion1: false,
            newWorkouts: [],
            skipped: 3,
        });
    });

    it('reads a file from before version 4, when workouts were called timers', () => {
        const workout = makeWorkout();
        const result = readBackup(
            fileWith({
                version: 3,
                workouts: undefined,
                timers: [savedBeforeGroups(workout)],
                history: [{ ...withoutWorkoutId(ENTRY), timerId: ENTRY.workoutId }],
                deleted: [{ kind: 'timer', id: 'gone', deletedAt: 1 }],
            })
        );

        expect(result).toEqual(
            expect.objectContaining({
                ok: true,
                workouts: [workout],
                history: [ENTRY],
                deleted: [{ kind: 'workout', id: 'gone', deletedAt: 1 }],
                skipped: 0,
            })
        );
    });

    it("reads a file from before version 8, a workout's steps becoming one group", () => {
        const workout = makeWorkout({ steps: [work(30, 'Squats'), rest(10)] });

        const result = readBackup(fileWith({ version: 7, workouts: [savedBeforeGroups(workout)] }));

        expect(result).toEqual(expect.objectContaining({ ok: true, workouts: [workout] }));
        expect(workout.blocks).toEqual([
            { kind: 'group', rounds: 1, restSeconds: 0, steps: [work(30, 'Squats'), rest(10)] },
        ]);
    });

    describe('written by hand', () => {
        const handMade = (contents: Record<string, unknown>) =>
            JSON.stringify({ app: 'Loop Workouts', version: BACKUP_VERSION, ...contents });

        it('needs no history, and gives workouts and exercises with no id new ones, dated now', () => {
            const { id: _id, updatedAt: _at, ...legs } = makeWorkout({ title: 'Legs' });
            const sled = { name: 'Sled push', measuredBy: 'reps', mainMuscles: ['quads'] };

            const result = readBackup(
                handMade({
                    workouts: [legs, { ...legs, id: '', title: 'Arms' }],
                    exercises: [sled],
                }),
                4000
            );

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }
            expect(result.workouts).toEqual([]);
            expect(result.newWorkouts).toEqual([
                { ...legs, id: expect.any(String), updatedAt: 4000 },
                { ...legs, title: 'Arms', id: expect.any(String), updatedAt: 4000 },
            ]);
            expect(new Set(result.newWorkouts.map((w) => w.id)).size).toBe(2);
            expect(result.exercises).toEqual([
                expect.objectContaining({
                    ...sled,
                    id: expect.any(String),
                    updatedAt: 4000,
                    supportingMuscles: [],
                }),
            ]);
            expect(result.history).toEqual([]);
            expect(result.skipped).toBe(0);
        });

        it('still leaves out, and counts, a workout with no id that is broken', () => {
            const result = readBackup(
                handMade({ workouts: [{ title: 'No steps', repeats: 3, steps: [] }] })
            );

            expect(result.ok && [result.newWorkouts, result.skipped]).toEqual([[], 1]);
        });
    });

    describe('from version 1', () => {
        // Workouts were called timers then
        const v1 = (contents: Record<string, unknown>) =>
            fileWith({ version: 1, workouts: undefined, deleted: undefined, ...contents });

        it('gives its workouts new random ids, and points its workouts to them', () => {
            const { id: _id, updatedAt: _at, ...workout } = makeWorkout({ title: 'Legs' });
            const { updatedAt: _u, ...entry } = ENTRY;

            const result = readBackup(
                v1({
                    timers: [{ ...workout, id: 7 }],
                    history: [
                        { ...withoutWorkoutId(entry), timerId: 7 },
                        { ...withoutWorkoutId(entry), id: 'other', timerId: 3 },
                    ],
                }),
                4000
            );

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }
            expect(result.fromVersion1).toBe(true);
            const [legs] = result.workouts;
            expect(legs).toEqual({ ...workout, id: expect.any(String), updatedAt: 4000 });
            expect(legs.id).not.toBe('7');
            // Dated by when they ended; a workout not in the file keeps its old number, as text
            expect(result.history.map((e) => [e.workoutId, e.updatedAt])).toEqual([
                [legs.id, ENTRY.endedAt],
                ['3', ENTRY.endedAt],
            ]);
            expect(result.deleted).toEqual([]);
        });

        it('converts workouts saved before steps, as the app does', () => {
            const old = {
                id: 1,
                title: 'Old',
                repeats: 2,
                timerMinutes: 0,
                timerSeconds: 30,
                restMinutes: 0,
                restSeconds: 10,
            };

            const result = readBackup(v1({ timers: [old] }), 4000);

            expect(result.ok && result.workouts).toEqual([
                {
                    ...makeWorkout({ title: 'Old', repeats: 2, workSeconds: 30, restSeconds: 10 }),
                    id: expect.any(String),
                    updatedAt: 4000,
                },
            ]);
        });
    });
});
