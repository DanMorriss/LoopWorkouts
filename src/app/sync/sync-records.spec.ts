import { Profile } from '../models/profile';
import { BACKUP_VERSION } from '../shared/backup/backup-file';
import { makeWorkout } from '../shared/testing/make-workout';
import {
    changedSince,
    CopyHere,
    keyOf,
    markOf,
    readPulled,
    recordsHere,
    ServerRecord,
} from './sync-records';

function copyHere(overrides: Partial<CopyHere> = {}): CopyHere {
    return {
        workouts: [],
        history: [],
        exercises: [],
        exerciseNotes: [],
        hiddenExercises: [],
        readyMadeFavourites: [],
        readyMadeChanges: [],
        libraryOrder: { ids: [], updatedAt: 0 },
        plan: { days: [[], [], [], [], [], [], []], updatedAt: 0 },
        profile: profile(0),
        bodyWeight: null,
        deleted: [],
        ...overrides,
    };
}

function profile(updatedAt: number): Profile {
    return {
        name: 'Sam',
        bodyFigure: 'female',
        trainingGoal: 'fitness',
        weightUnit: 'lb',
        myEquipment: ['dumbbells'],
        updatedAt,
    };
}

describe('recordsHere', () => {
    it('gives the profile as one record, once it has been set (NAV-4)', () => {
        expect(recordsHere(copyHere()).filter((record) => record.kind === 'profile')).toEqual([]);
        expect(
            recordsHere(copyHere({ profile: profile(9) })).filter(
                (record) => record.kind === 'profile'
            )
        ).toEqual([
            {
                kind: 'profile',
                id: 'me',
                updated_at: 9,
                deleted_at: null,
                data: { id: 'me', ...profile(9) },
                version: BACKUP_VERSION,
            },
        ]);
    });

    // Null without consent to keeping it with the account, or if never set here
    it('gives the body weight as one record, only when there is one to keep (CAL-6)', () => {
        expect(recordsHere(copyHere()).filter((r) => r.kind === 'body-weight')).toEqual([]);
        expect(
            recordsHere(copyHere({ bodyWeight: { kg: 72.5, updatedAt: 9 } })).filter(
                (record) => record.kind === 'body-weight'
            )
        ).toEqual([
            {
                kind: 'body-weight',
                id: 'me',
                updated_at: 9,
                deleted_at: null,
                data: { id: 'me', kg: 72.5, updatedAt: 9 },
                version: BACKUP_VERSION,
            },
        ]);
    });

    it('gives the weekly plan as one record, once something has been planned', () => {
        const days = [[], ['w1'], [], [], [], [], []];

        expect(recordsHere(copyHere()).filter((record) => record.kind === 'plan')).toEqual([]);
        expect(
            recordsHere(copyHere({ plan: { days, updatedAt: 9 } })).filter(
                (record) => record.kind === 'plan'
            )
        ).toEqual([
            {
                kind: 'plan',
                id: 'week',
                updated_at: 9,
                deleted_at: null,
                data: { id: 'week', days, updatedAt: 9 },
                version: BACKUP_VERSION,
            },
        ]);
    });

    it('gives each record and deletion here as the server keeps it', () => {
        const workout = makeWorkout({ id: 'w1', updatedAt: 5 });
        const records = recordsHere(
            copyHere({
                workouts: [workout],
                exerciseNotes: [{ id: 'builtin:plank', text: 'Squeeze', updatedAt: 6 }],
                libraryOrder: { ids: ['w1'], updatedAt: 7 },
                deleted: [{ kind: 'history', id: 'run-1', deletedAt: 8 }],
            })
        );

        expect(records).toEqual([
            {
                kind: 'workout',
                id: 'w1',
                updated_at: 5,
                deleted_at: null,
                data: workout,
                version: BACKUP_VERSION,
            },
            {
                kind: 'exercise-note',
                id: 'builtin:plank',
                updated_at: 6,
                deleted_at: null,
                data: { id: 'builtin:plank', text: 'Squeeze', updatedAt: 6 },
                version: BACKUP_VERSION,
            },
            {
                kind: 'library-order',
                id: 'library',
                updated_at: 7,
                deleted_at: null,
                data: { id: 'library', ids: ['w1'], updatedAt: 7 },
                version: BACKUP_VERSION,
            },
            {
                kind: 'history',
                id: 'run-1',
                updated_at: 8,
                deleted_at: 8,
                data: null,
                version: BACKUP_VERSION,
            },
        ]);
    });

    it("leaves out the library's order if nothing's been moved", () => {
        expect(recordsHere(copyHere())).toEqual([]);
    });
});

describe('changedSince', () => {
    const record = (updatedAt: number, deletedAt: number | null = null): ServerRecord => ({
        kind: 'workout',
        id: 'w1',
        updated_at: updatedAt,
        deleted_at: deletedAt,
        data: null,
        version: BACKUP_VERSION,
    });

    it("gives the records whose change hasn't been sent or fetched", () => {
        const seen = { [keyOf(record(5))]: markOf(record(5)) };

        expect(changedSince([record(5)], seen)).toEqual([]);
        expect(changedSince([record(6)], seen)).toEqual([record(6)]);
        // A deletion at the same time is another change
        expect(changedSince([record(5, 5)], seen)).toEqual([record(5, 5)]);
        expect(changedSince([record(5)], {})).toEqual([record(5)]);
    });
});

describe('readPulled', () => {
    const row = (fields: Partial<ServerRecord> & { seq: number }) => ({
        kind: 'workout',
        id: 'w1',
        updated_at: 5,
        deleted_at: null,
        data: makeWorkout({ id: 'w1', updatedAt: 5 }),
        version: BACKUP_VERSION,
        ...fields,
    });

    it('reads the weekly plan, dated as the server has it, and not a broken one', () => {
        const days = [['w1'], [], [], [], [], [], []];
        const page = readPulled([
            row({
                seq: 1,
                kind: 'plan',
                id: 'week',
                updated_at: 6,
                data: { id: 'week', days, updatedAt: 99 },
            }),
            row({
                seq: 2,
                kind: 'plan',
                id: 'other',
                updated_at: 7,
                data: { id: 'other', days, updatedAt: 7 },
            }),
            row({
                seq: 3,
                kind: 'plan',
                id: 'week',
                updated_at: 8,
                data: { id: 'week', days: [], updatedAt: 8 },
            }),
        ]);

        expect(page.copy.plan).toEqual({ days, updatedAt: 6 });
        expect(page.read.map(keyOf)).toEqual(['plan:week']);
    });

    it('reads the profile, dated as the server has it, and not a broken one (NAV-4)', () => {
        const page = readPulled([
            row({
                seq: 1,
                kind: 'profile',
                id: 'me',
                updated_at: 6,
                data: { id: 'me', ...profile(99), myEquipment: ['dumbbells', 'jetpack'] },
            }),
            row({
                seq: 2,
                kind: 'profile',
                id: 'other',
                updated_at: 7,
                data: { id: 'other', ...profile(7) },
            }),
            row({
                seq: 3,
                kind: 'profile',
                id: 'me',
                updated_at: 8,
                data: { id: 'me', ...profile(8), weightUnit: 'stone' },
            }),
        ]);

        expect(page.copy.profile).toEqual(profile(6));
        expect(page.read.map(keyOf)).toEqual(['profile:me']);
    });

    it('reads the body weight, dated as the server has it, and none, but not a broken one', () => {
        const weight = (seq: number, id: string, kg: unknown) =>
            row({ seq, kind: 'body-weight', id, updated_at: seq, data: { id, kg } });

        expect(readPulled([weight(1, 'me', 72.5)]).copy.bodyWeight).toEqual({
            kg: 72.5,
            updatedAt: 1,
        });
        expect(readPulled([weight(2, 'me', null)]).copy.bodyWeight).toEqual({
            kg: null,
            updatedAt: 2,
        });
        const broken = readPulled([
            weight(3, 'other', 70),
            weight(4, 'me', 5),
            weight(5, 'me', '70'),
        ]);
        expect(broken.copy.bodyWeight).toBeNull();
        expect(broken.read).toEqual([]);
    });

    it('reads records and deletions to merge, dated as the server has them', () => {
        const page = readPulled([
            row({ seq: 1, updated_at: 9 }),
            row({ seq: 2, kind: 'history', id: 'run-1', deleted_at: 3, updated_at: 3, data: null }),
            row({
                seq: 3,
                kind: 'library-order',
                id: 'library',
                updated_at: 4,
                data: { id: 'library', ids: ['w1'], updatedAt: 99 },
            }),
        ]);

        expect(page.copy.workouts.map((w) => [w.id, w.updatedAt])).toEqual([['w1', 9]]);
        expect(page.copy.deleted).toEqual([{ kind: 'history', id: 'run-1', deletedAt: 3 }]);
        expect(page.copy.libraryOrder).toEqual({ ids: ['w1'], updatedAt: 4 });
        expect(page.read.map(keyOf)).toEqual([
            'workout:w1',
            'history:run-1',
            'library-order:library',
        ]);
        expect(page.lastSeq).toBe(3);
        expect(page.tooNewAt).toBeNull();
    });

    it("leaves out what isn't usable, but moves past it", () => {
        const page = readPulled([
            row({ seq: 1, data: { title: 'No steps' } }),
            row({ seq: 2, data: makeWorkout({ id: 'another-id' }) }),
            row({ seq: 3, kind: 'settings' as ServerRecord['kind'] }),
            row({ seq: 4, kind: 'library-order', deleted_at: 4, data: null }),
            'not a record',
        ]);

        expect(page.read).toEqual([]);
        expect(page.copy.workouts).toEqual([]);
        expect(page.lastSeq).toBe(4);
    });

    it('leaves what a newer version of the app wrote, saying where it is', () => {
        const page = readPulled([
            row({ seq: 1 }),
            row({ seq: 2, id: 'w2', version: BACKUP_VERSION + 1 }),
        ]);

        expect(page.read.map(keyOf)).toEqual(['workout:w1']);
        expect(page.tooNewAt).toBe(2);
        expect(page.lastSeq).toBe(2);
    });
});
