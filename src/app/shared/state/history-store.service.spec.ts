import { TestBed } from '@angular/core/testing';
import { HistoryEntry, LoggedSet, MAX_NOTE_LENGTH } from '../../models/history';
import { savedHistory } from '../testing/history-database';
import { HistoryStore } from './history-store.service';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    const startedAt = overrides.startedAt ?? 1_000_000;
    return {
        id: `${startedAt}-1`,
        workoutId: 'workout-1',
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + 60_000,
        updatedAt: NOW,
        activeSeconds: 60,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
        ...overrides,
    };
}

const pending = (): unknown[] | null =>
    JSON.parse(localStorage.getItem('history-pending') ?? 'null');

// When the tests run: Date.now() for anything the store dates, e.g. a record
const NOW = 5_000_000;

describe('HistoryStore', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
    });
    afterEach(() => localStorage.clear());

    async function createStore() {
        const store = TestBed.inject(HistoryStore);
        await store.ready;
        return store;
    }

    /** As if the app were opened again. */
    function reopen() {
        TestBed.resetTestingModule();
        return createStore();
    }

    it('starts empty', async () => {
        expect((await createStore()).entries()).toEqual([]);
    });

    it('records a workout and saves it', async () => {
        const store = await createStore();
        const entry = makeEntry();

        store.record(entry);

        expect(store.entries()).toEqual([entry]);
        expect(await savedHistory()).toEqual([entry]);
        expect((await reopen()).entries()).toEqual([entry]);
    });

    it('keeps the newest first, whatever order they are recorded in', async () => {
        const store = await createStore();
        const older = makeEntry({ startedAt: 1_000 });
        const newer = makeEntry({ startedAt: 2_000 });

        store.record(newer);
        store.record(older);

        expect(store.entries()).toEqual([newer, older]);
    });

    it('keeps one entry per run, updated by the latest record of it', async () => {
        const store = await createStore();

        store.record(makeEntry({ outcome: 'stopped', activeSeconds: 30 }));
        store.record(makeEntry({ outcome: 'finished', activeSeconds: 99 }));

        expect(store.entries()).toEqual([
            expect.objectContaining({ outcome: 'finished', activeSeconds: 99 }),
        ]);
        expect(await savedHistory()).toEqual([
            expect.objectContaining({ outcome: 'finished', activeSeconds: 99 }),
        ]);
    });

    it('keeps a note when the same run is recorded again, e.g. leaving its finished screen', async () => {
        const store = await createStore();
        store.record(makeEntry());
        store.setNote(makeEntry().id, 'Felt strong');

        store.record(makeEntry({ activeSeconds: 99 }));

        expect(store.entries()[0]).toEqual(
            expect.objectContaining({ activeSeconds: 99, note: 'Felt strong' })
        );
    });

    describe('notes', () => {
        it('saves a note, trimmed, with the entry', async () => {
            const store = await createStore();
            store.record(makeEntry());

            store.setNote(makeEntry().id, '  Knee sore  ');

            expect(store.entries()[0].note).toBe('Knee sore');
            expect(await savedHistory()).toEqual([expect.objectContaining({ note: 'Knee sore' })]);
        });

        it('cuts a note to the longest allowed', async () => {
            const store = await createStore();
            store.record(makeEntry());

            store.setNote(makeEntry().id, 'x'.repeat(MAX_NOTE_LENGTH + 10));

            expect(store.entries()[0].note).toHaveLength(MAX_NOTE_LENGTH);
        });

        it('removes the note when set to nothing', async () => {
            const store = await createStore();
            store.record(makeEntry({ note: 'Felt strong' }));

            store.setNote(makeEntry().id, '   ');

            expect('note' in store.entries()[0]).toBe(false);
        });

        it('loads a time limit and its score, dropping them when broken', async () => {
            localStorage.setItem(
                'history',
                JSON.stringify([
                    makeEntry({ timeLimitSeconds: 1200, stepsIntoRound: 3 }),
                    makeEntry({ startedAt: 5_000, timeLimitSeconds: 1200, stepsIntoRound: -1 }),
                    makeEntry({ startedAt: 6_000, timeLimitSeconds: 0, stepsIntoRound: 2 }),
                ])
            );

            const entries = (await createStore()).entries();
            expect(entries.map((e) => [e.timeLimitSeconds, e.stepsIntoRound])).toEqual([
                [1200, 3],
                // Newest first: a limit of 0 is dropped with its score, a broken score alone
                [undefined, undefined],
                [1200, undefined],
            ]);
        });

        it('loads saved notes, and entries saved before notes existed', async () => {
            localStorage.setItem(
                'history',
                JSON.stringify([
                    makeEntry({ note: 'Felt strong' }),
                    makeEntry({ startedAt: 5_000 }),
                    makeEntry({ startedAt: 6_000, note: 42 as unknown as string }),
                ])
            );

            // Newest first; the one with a broken note is dropped
            expect((await createStore()).entries().map((entry) => entry.note)).toEqual([
                'Felt strong',
                undefined,
            ]);
        });
    });

    it('keeps every workout, however many', async () => {
        const store = await createStore();
        const entries = Array.from({ length: 600 }, (_, i) =>
            makeEntry({ startedAt: (i + 1) * 1000 })
        );

        store.mergeEntries(entries, []);

        expect(store.entries()).toHaveLength(600);
        expect(await savedHistory()).toHaveLength(600);
    });

    it('deletes an entry, and can restore it (for undo)', async () => {
        const store = await createStore();
        const entry = makeEntry();
        store.record(entry);

        store.delete(entry.id);
        expect(store.entries()).toEqual([]);
        expect(await savedHistory()).toEqual([]);

        store.restore(entry);
        // Dated after its deletion
        const restored = { ...entry, updatedAt: NOW + 2 };
        expect(store.entries()).toEqual([restored]);
        expect(await savedHistory()).toEqual([restored]);
    });

    // The run may still be going, and logs itself again when it finishes or the tab closes
    it("doesn't let a deleted entry be recorded again, even after a reload", async () => {
        const entry = makeEntry({ outcome: 'stopped' });
        (await createStore()).record(entry);
        (await createStore()).delete(entry.id);

        const store = await reopen();
        store.record({ ...entry, outcome: 'finished' });

        expect(store.entries()).toEqual([]);
        expect(await savedHistory()).toEqual([]);
    });

    it('records a restored entry again as its run goes on', async () => {
        const store = await createStore();
        const entry = makeEntry({ outcome: 'stopped' });
        store.record(entry);
        store.delete(entry.id);
        store.restore(entry);

        store.record({ ...entry, outcome: 'finished' });

        expect(store.entries().map((e) => e.outcome)).toEqual(['finished']);
    });

    it('ignores unusable saved deletions', async () => {
        localStorage.setItem('deleted', '{broken');
        const store = await createStore();

        store.record(makeEntry());

        expect(store.entries()).toHaveLength(1);
    });

    describe('saving', () => {
        it('moves the history saved in localStorage into IndexedDB', async () => {
            const older = makeEntry({ startedAt: 1_000 });
            const newer = makeEntry({ startedAt: 2_000 });
            localStorage.setItem('history', JSON.stringify([older, newer]));

            expect((await createStore()).entries()).toEqual([newer, older]);
            expect(await savedHistory()).toEqual([newer, older]);
            expect(localStorage.getItem('history')).toBeNull();
            expect((await reopen()).entries()).toEqual([newer, older]);
        });

        it('keeps each change in localStorage until IndexedDB has it', async () => {
            const store = await createStore();

            store.record(makeEntry());
            expect(pending()).toEqual([makeEntry()]);

            await savedHistory();
            expect(pending()).toBeNull();
        });

        // A write started as the page closes (logging the run) may never finish
        it('saves a change that never reached IndexedDB on the next load', async () => {
            (await createStore()).record(makeEntry({ outcome: 'stopped' }));
            await savedHistory();
            const closedOn = makeEntry({ outcome: 'finished', updatedAt: NOW + 1 });
            localStorage.setItem('history-pending', JSON.stringify([closedOn]));

            const store = await reopen();

            expect(store.entries()).toEqual([closedOn]);
            expect(await savedHistory()).toEqual([closedOn]);
            expect(pending()).toBeNull();
        });

        it("leaves out an entry whose deletion didn't reach IndexedDB", async () => {
            (await createStore()).record(makeEntry());
            await savedHistory();
            localStorage.setItem(
                'deleted',
                JSON.stringify([{ kind: 'history', id: makeEntry().id, deletedAt: NOW }])
            );

            expect((await reopen()).entries()).toEqual([]);
            expect(await savedHistory()).toEqual([]);
        });

        it('keeps workouts recorded while it loads', async () => {
            localStorage.setItem('history', JSON.stringify([makeEntry({ startedAt: 1_000 })]));
            const store = TestBed.inject(HistoryStore);

            store.record(makeEntry({ startedAt: 2_000 }));
            await store.ready;

            expect(store.entries().map((entry) => entry.startedAt)).toEqual([2_000, 1_000]);
            expect(await savedHistory()).toHaveLength(2);
        });
    });

    describe('dates for sync', () => {
        it('dates each record and note, as the time it changed', async () => {
            const store = await createStore();
            store.record({ ...makeEntry(), updatedAt: 1 } as never);
            expect(store.entries()[0].updatedAt).toBe(NOW);

            vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
            store.setNote(makeEntry().id, 'Felt strong');

            expect(store.entries()[0].updatedAt).toBe(NOW + 500);
            expect(await savedHistory()).toEqual([
                expect.objectContaining({ updatedAt: NOW + 500 }),
            ]);
        });

        it('leaves a dated deletion behind, which restoring clears', async () => {
            const store = await createStore();
            store.record(makeEntry());

            store.delete(makeEntry().id);
            // Just after it was recorded, as the clock hasn't moved
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([
                { kind: 'history', id: makeEntry().id, deletedAt: NOW + 1 },
            ]);

            store.restore(makeEntry());
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([]);
            // Dated after its deletion
            expect(store.entries()[0].updatedAt).toBe(NOW + 2);
        });

        it('dates a saved entry with no date by when it ended', async () => {
            const { updatedAt: _u, ...undated } = makeEntry();
            localStorage.setItem('history', JSON.stringify([undated]));

            expect((await createStore()).entries()[0].updatedAt).toBe(makeEntry().endedAt);
        });
    });

    it('loads saved sets, dropping broken ones but keeping the workout', async () => {
        const good = { round: 0, step: 1, name: 'Squats', reps: 10, weight: 60 };
        localStorage.setItem(
            'history',
            JSON.stringify([
                makeEntry({ startedAt: 2_000, sets: [good, { ...good, reps: 0 }] }),
                { ...makeEntry({ startedAt: 1_000 }), sets: 'lots' },
            ])
        );

        const [withSets, withBroken] = (await createStore()).entries();

        expect(withSets.sets).toEqual([good]);
        expect(withBroken).toEqual(makeEntry({ startedAt: 1_000 }));
    });

    it("loads the workout's headings, dropping broken ones but keeping the workout", async () => {
        const warmup = { text: 'Warmup', step: 0 };
        localStorage.setItem(
            'history',
            JSON.stringify([
                makeEntry({
                    startedAt: 3_000,
                    headings: [
                        warmup,
                        { text: '  Legs ', step: 2 },
                        { text: '', step: 3 },
                        { text: 'Arms', step: -1 },
                    ],
                }),
                { ...makeEntry({ startedAt: 2_000 }), headings: [{ text: 7, step: 1 }] },
                makeEntry({ startedAt: 1_000 }),
            ])
        );

        const [withHeadings, allBroken, before] = (await createStore()).entries();

        expect(withHeadings.headings).toEqual([warmup, { text: 'Legs', step: 2 }]);
        expect(allBroken).toEqual(makeEntry({ startedAt: 2_000 }));
        // Entries from before headings have none
        expect('headings' in before).toBe(false);
    });

    it("loads the workout's supersets, dropping broken ones but keeping the workout", async () => {
        const superset = { kind: 'superset' as const, step: 0, steps: 2 };
        localStorage.setItem(
            'history',
            JSON.stringify([
                makeEntry({
                    startedAt: 3_000,
                    supersets: [
                        superset,
                        { kind: 'giant set', step: 2, steps: 3 },
                        { kind: 'circuit', step: 5, steps: 2 },
                        { kind: 'superset', step: 7, steps: 0 },
                    ] as never,
                }),
                { ...makeEntry({ startedAt: 2_000 }), supersets: [{ kind: 'superset' }] },
                makeEntry({ startedAt: 1_000 }),
            ])
        );

        const [withSupersets, allBroken, before] = (await createStore()).entries();

        expect(withSupersets.supersets).toEqual([
            superset,
            { kind: 'giant set', step: 2, steps: 3 },
        ]);
        expect(allBroken).toEqual(makeEntry({ startedAt: 2_000 }));
        expect('supersets' in before).toBe(false);
    });

    it('loads the time a run spent on rep steps, dropping it when broken', async () => {
        localStorage.setItem(
            'history',
            JSON.stringify([
                makeEntry({ startedAt: 3_000, repSeconds: 300 }),
                { ...makeEntry({ startedAt: 2_000 }), repSeconds: -1 },
                // What runs logged for the estimate before repSeconds, which nothing reads
                {
                    ...makeEntry({ startedAt: 1_000 }),
                    expected: { timedSeconds: 1, repSeconds: 2 },
                },
            ])
        );

        const [withRepSeconds, broken, before] = (await createStore()).entries();

        expect(withRepSeconds.repSeconds).toBe(300);
        expect(broken).toEqual(makeEntry({ startedAt: 2_000 }));
        expect(before).toEqual(makeEntry({ startedAt: 1_000 }));
    });

    it('loads timed sets, dropping ones that are also reps or weighed', async () => {
        const held = { round: 0, step: 0, name: 'Plank', seconds: 45, exerciseId: 'plank' };
        localStorage.setItem(
            'history',
            JSON.stringify([
                makeEntry({
                    sets: [
                        held,
                        { ...held, seconds: 0 },
                        { ...held, reps: 10 },
                        { ...held, weight: 20 },
                    ] as LoggedSet[],
                }),
            ])
        );

        expect((await createStore()).entries()[0].sets).toEqual([held]);
    });

    it('keeps valid saved entries and drops broken ones', async () => {
        const valid = makeEntry();
        const broken = [
            null,
            'text',
            { ...makeEntry(), id: 7 },
            { ...makeEntry(), workoutId: '' },
            { ...makeEntry(), title: null },
            { ...makeEntry(), endedAt: 0 },
            { ...makeEntry(), activeSeconds: -1 },
            { ...makeEntry(), roundsCompleted: 1.5 },
            { ...makeEntry(), outcome: 'abandoned' },
        ];
        localStorage.setItem('history', JSON.stringify([valid, ...broken]));

        expect((await createStore()).entries()).toEqual([valid]);
    });

    for (const [label, data] of [
        ['corrupted', '{oops'],
        ['not a list', '{"id": "a"}'],
    ]) {
        it(`starts empty when the saved history is ${label}`, async () => {
            localStorage.setItem('history', data);

            expect((await createStore()).entries()).toEqual([]);
        });
    }
});
