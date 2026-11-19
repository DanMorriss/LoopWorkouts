import { TestBed } from '@angular/core/testing';
import { Synced } from '../../models/sync';
import { DeletionStore, MAX_DELETIONS } from './deletion-store.service';

describe('DeletionStore', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    const store = () => TestBed.inject(DeletionStore);

    it('keeps the latest deletion of each record, and forgets one on Undo', () => {
        store().add({ kind: 'workout', id: 'a', deletedAt: 1 });
        store().add({ kind: 'workout', id: 'a', deletedAt: 5 });
        store().add({ kind: 'history', id: 'a', deletedAt: 2 });

        expect(store().deletedAt('workout', 'a')).toBe(5);
        expect(store().all()).toHaveLength(2);
        expect(JSON.parse(localStorage.getItem('deleted')!)).toHaveLength(2);

        store().remove('workout', 'a');
        expect(store().deletedAt('workout', 'a')).toBeUndefined();
        expect(store().deletedAt('history', 'a')).toBe(2);
    });

    it(`keeps only the latest ${MAX_DELETIONS}`, () => {
        for (let i = 0; i <= MAX_DELETIONS; i++) {
            store().add({ kind: 'workout', id: `w${i}`, deletedAt: i });
        }
        expect(store().all()).toHaveLength(MAX_DELETIONS);
        expect(store().deletedAt('workout', 'w0')).toBeUndefined();
    });

    describe('merge', () => {
        const here: Synced[] = [
            { id: 'kept', updatedAt: 10 },
            { id: 'gone there', updatedAt: 10 },
        ];

        it('merges the records, keeps the deletions that applied, and gives the counts', () => {
            const keep = vi.fn();

            const counts = store().merge(
                'workout',
                here,
                [
                    { id: 'kept', updatedAt: 20 },
                    { id: 'new', updatedAt: 5 },
                ],
                [
                    { kind: 'workout', id: 'gone there', deletedAt: 30 },
                    // Another kind's, for that kind's own merge
                    { kind: 'history', id: 'kept', deletedAt: 30 },
                ],
                keep
            );

            expect(counts).toEqual({ added: 1, updated: 1, removed: 1 });
            expect(keep).toHaveBeenCalledOnce();
            expect(keep).toHaveBeenCalledWith([
                { id: 'kept', updatedAt: 20 },
                { id: 'new', updatedAt: 5 },
            ]);
            expect(store().deletedAt('workout', 'gone there')).toBe(30);
            expect(store().deletedAt('history', 'kept')).toBeUndefined();
        });

        it("doesn't bring back what was deleted here after it last changed", () => {
            store().add({ kind: 'workout', id: 'deleted here', deletedAt: 30 });
            const keep = vi.fn();

            const counts = store().merge(
                'workout',
                here,
                [{ id: 'deleted here', updatedAt: 20 }],
                [],
                keep
            );

            expect(counts).toEqual({ added: 0, updated: 0, removed: 0 });
            expect(keep).not.toHaveBeenCalled();
        });

        it('leaves the records alone when nothing changed', () => {
            const keep = vi.fn();

            const counts = store().merge('workout', here, here, [], keep);

            expect(counts).toEqual({ added: 0, updated: 0, removed: 0 });
            expect(keep).not.toHaveBeenCalled();
        });
    });
});
