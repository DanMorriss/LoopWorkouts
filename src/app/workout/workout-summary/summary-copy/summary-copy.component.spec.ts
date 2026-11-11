import { ComponentFixture, TestBed } from '@angular/core/testing';
import { allSteps, Workout } from '../../../models/workout';
import { WorkoutStore } from '../../../shared/state/workout-store.service';
import { makeWorkout } from '../../../shared/testing/make-workout';
import { UndoService } from '../../../shared/undo/undo.service';
import { SummaryCopyComponent } from './summary-copy.component';

describe('SummaryCopyComponent (LIB-6)', () => {
    let fixture: ComponentFixture<SummaryCopyComponent>;
    let store: WorkoutStore;

    beforeEach(async () => {
        localStorage.clear();
        sessionStorage.clear();
        store = TestBed.inject(WorkoutStore);
        await store.loadReadyMade();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    function create(running: Workout) {
        store.setActiveWorkout(running);
        fixture = TestBed.createComponent(SummaryCopyComponent);
        fixture.detectChanges();
    }

    const el = (selector: string) => fixture.nativeElement.querySelector(selector);

    it('offers Make a copy after a ready-made workout, giving the copy to open', () => {
        create(store.findAnyWorkout('builtin:gym-legs')!);
        const copied: Workout[] = [];
        fixture.componentInstance.copied.subscribe((copy) => copied.push(copy));

        expect(el('.summary-copy p').textContent).toBe(
            'Gym legs is ready-made: its reps and weights can change, but to change its exercises, make a copy.'
        );
        el('.summary-copy__make').click();

        expect(copied.map((copy) => copy.title)).toEqual(['Gym legs (copy)']);
        expect(store.workouts()).toEqual(copied);
        expect(TestBed.inject(UndoService).offer()?.message).toBe('Made a copy of "Gym legs"');
    });

    it('says to make a copy to keep a swap, as its exercises stay as they are', () => {
        create(store.findAnyWorkout('builtin:gym-legs')!);
        const original = allSteps(store.activeWorkout()!)[1];
        store.swapActiveStep({
            step: 1,
            from: 1,
            original,
            swapped: { ...original, name: 'Good morning', exerciseId: 'builtin:good-morning' },
        });
        fixture.detectChanges();

        expect(el('.summary-copy p').textContent).toBe(
            'Gym legs is ready-made, so its exercises stay as they are. To use your swap next time, make a copy.'
        );
    });

    it('offers nothing after one of your own', () => {
        const { id: _id, updatedAt: _at, ...fields } = makeWorkout({ title: 'Mine' });
        create(store.addWorkout(fields));

        expect(el('.summary-copy')).toBeNull();
    });
});
