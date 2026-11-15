import { TestBed } from '@angular/core/testing';
import { makeWorkout } from '../testing/make-workout';
import { DeletionStore } from './deletion-store.service';
import { FAVOURITES_KEY, Favourites } from './favourites.service';
import { WorkoutStore } from './workout-store.service';

describe('Favourites', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    const deletedAt = (id: string) =>
        TestBed.inject(DeletionStore).deletedAt('ready-made-favourite', id);

    it('makes a workout of yours a favourite as a record of its own, leaving the workout', () => {
        const store = TestBed.inject(WorkoutStore);
        const favourites = TestBed.inject(Favourites);
        const legs = store.addWorkout(makeWorkout({ title: 'Legs' }));

        favourites.set(legs.id, true);

        expect(favourites.ids().has(legs.id)).toBe(true);
        expect(store.findWorkoutById(legs.id)).toBe(legs);
        expect(JSON.parse(localStorage.getItem(FAVOURITES_KEY)!)).toEqual([
            { id: legs.id, updatedAt: expect.any(Number) },
        ]);

        favourites.set(legs.id, false);

        expect(favourites.ids().has(legs.id)).toBe(false);
        expect(deletedAt(legs.id)).toBeGreaterThan(0);
        expect(store.findWorkoutById(legs.id)).toBe(legs);
    });

    it('makes a ready-made workout a favourite the same way', () => {
        const favourites = TestBed.inject(Favourites);

        favourites.set('builtin:gym-legs', true);
        expect(favourites.list()).toEqual([
            { id: 'builtin:gym-legs', updatedAt: expect.any(Number) },
        ]);

        favourites.set('builtin:gym-legs', false);
        expect(favourites.list()).toEqual([]);
        expect(deletedAt('builtin:gym-legs')).toBeGreaterThan(0);
    });

    it("changes nothing when it's already so", () => {
        const favourites = TestBed.inject(Favourites);

        favourites.set('legs', false);

        expect(localStorage.getItem(FAVOURITES_KEY)).toBeNull();
        expect(deletedAt('legs')).toBeUndefined();
    });

    it('dates a favourite made again after its deletion, so it wins a merge', () => {
        const favourites = TestBed.inject(Favourites);
        favourites.set('legs', true);
        favourites.set('legs', false);
        const takenOffAt = deletedAt('legs')!;

        favourites.set('legs', true);

        expect(favourites.list()[0].updatedAt).toBeGreaterThan(takenOffAt);
        expect(deletedAt('legs')).toBeUndefined();
    });

    it('stays a favourite when the workout is edited in Create', () => {
        const store = TestBed.inject(WorkoutStore);
        const favourites = TestBed.inject(Favourites);
        const legs = store.addWorkout(makeWorkout());
        favourites.set(legs.id, true);

        store.updateWorkout(legs.id, makeWorkout({ title: 'Renamed' }));

        expect(favourites.ids().has(legs.id)).toBe(true);
    });

    describe('another device', () => {
        it('keeps a heart pressed here when an edit made there comes in, and the edit', () => {
            const store = TestBed.inject(WorkoutStore);
            const favourites = TestBed.inject(Favourites);
            const legs = store.addWorkout(makeWorkout({ title: 'Legs' }));
            favourites.set(legs.id, true);
            const editedThere = { ...legs, title: 'Legs day', updatedAt: Date.now() + 60_000 };

            store.mergeWorkouts([editedThere], []);
            favourites.merge([], []);

            expect(store.findWorkoutById(legs.id)?.title).toBe('Legs day');
            expect(favourites.ids().has(legs.id)).toBe(true);
        });

        it('takes a heart pressed there and keeps an edit made here since', () => {
            const store = TestBed.inject(WorkoutStore);
            const favourites = TestBed.inject(Favourites);
            const legs = store.addWorkout(makeWorkout({ title: 'Legs' }));
            const edited = store.updateWorkout(legs.id, makeWorkout({ title: 'Legs day' }))!;

            favourites.merge([{ id: legs.id, updatedAt: legs.updatedAt + 1 }], []);
            store.mergeWorkouts([legs], []);

            expect(store.findWorkoutById(legs.id)).toBe(edited);
            expect(favourites.ids().has(legs.id)).toBe(true);
        });

        it('takes a heart off when it was taken off there since it was pressed', () => {
            const favourites = TestBed.inject(Favourites);
            favourites.set('legs', true);
            const pressedAt = favourites.list()[0].updatedAt;

            favourites.merge(
                [],
                [{ kind: 'ready-made-favourite', id: 'legs', deletedAt: pressedAt + 1 }]
            );

            expect(favourites.list()).toEqual([]);
            expect(deletedAt('legs')).toBe(pressedAt + 1);
        });
    });
});
