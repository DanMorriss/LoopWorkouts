import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BUILT_IN_WORKOUTS } from '../../models/built-in-workouts';
import { allSteps } from '../../models/workout';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { ReadyMadeComponent } from './ready-made.component';

describe('ReadyMadeComponent', () => {
    let fixture: ComponentFixture<unknown>;
    let store: WorkoutStore;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'library', children: [] },
                    { path: 'workout', children: [] },
                    { path: 'ready-made', component: ReadyMadeComponent },
                ]),
            ],
        });
        store = TestBed.inject(WorkoutStore);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    async function open() {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/ready-made');
        fixture = harness.fixture;
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const text = (node: Element = el()) => node.textContent!.replace(/\s+/g, ' ').trim();
    const groups = () => Array.from(el().querySelectorAll('.ready__group')).map((h) => text(h));
    const names = () => Array.from(el().querySelectorAll('.ready__name')).map((n) => text(n));
    const card = (title: string) =>
        Array.from(el().querySelectorAll<HTMLButtonElement>('.ready__card')).find((c) =>
            text(c).startsWith(title)
        )!;
    const dialog = () => el().querySelector('[role="dialog"]');

    async function preview(title: string) {
        card(title).click();
        await render();
    }

    async function press(selector: string) {
        el().querySelector<HTMLButtonElement>(selector)!.click();
        await render();
    }

    it('lists every ready-made workout, in its group', async () => {
        await open();

        expect(groups()).toEqual(['No equipment', 'Kettlebell', 'Dumbbells', 'Gym', 'Other kit']);
        expect(names()).toEqual(BUILT_IN_WORKOUTS.map((w) => w.title));
        expect(text(card('Dumbbell full body'))).toContain('7 exercises · Dumbbells, Bench');
        expect(text(card('Bodyweight basics'))).toContain('No equipment');
    });

    it('hides those needing what you have not got, with Only what I have on', async () => {
        TestBed.inject(SettingsStore).update({
            myEquipment: ['kettlebell'],
            onlyMyEquipment: true,
        });
        await open();

        expect(groups()).toEqual(['No equipment', 'Kettlebell']);
        expect(names()).not.toContain('Gym push');
        const hidden = BUILT_IN_WORKOUTS.filter(
            (w) => w.group === 'dumbbells' || w.group === 'gym' || w.group === 'other'
        ).length;
        expect(text()).toContain(`${hidden} more need equipment you haven't picked.`);
    });

    it('previews a workout: what it needs, its exercises and sets, and its muscles', async () => {
        await open();
        await preview('Gym legs');

        expect(dialog()).not.toBeNull();
        expect(text(dialog()!)).toContain('Once through');
        expect(text(dialog()!)).toContain('Back squat 3 sets: 12, 10, 8, rest 2:30');
        expect(text(dialog()!)).toContain('Superset 3 rounds, rest 1:00');
        expect(dialog()!.querySelector('app-body-map')).not.toBeNull();

        await press('.dialog-back');
        expect(dialog()).toBeNull();
        expect(document.activeElement).toBe(card('Gym legs'));
    });

    it('adds a copy to the library, with Undo, and stays to add more', async () => {
        await open();
        await preview('Core in 15');
        await press('.preview__add');

        expect(store.workouts().map((w) => w.title)).toEqual(['Core in 15']);
        const added = store.workouts()[0];
        const builtIn = BUILT_IN_WORKOUTS.find((w) => w.title === 'Core in 15')!;
        expect(added.id).not.toBe(builtIn.id);
        expect(allSteps(added).map((s) => s.exerciseId)).toEqual(
            allSteps(builtIn).map((s) => s.exerciseId)
        );
        expect(dialog()).toBeNull();
        expect(text(card('Core in 15'))).toContain('In your workouts');
        expect(TestBed.inject(UndoService).offer()?.message).toBe(
            'Added "Core in 15" to your workouts'
        );

        TestBed.inject(UndoService).undo();
        expect(store.workouts()).toEqual([]);
    });

    it('adds and starts one straight away', async () => {
        await open();
        await preview('Cardio intervals');
        await press('.preview__start');

        expect(store.workouts().map((w) => w.title)).toEqual(['Cardio intervals']);
        expect(store.activeWorkout()?.id).toBe(store.workouts()[0].id);
        expect(TestBed.inject(Router).url).toBe('/workout');
    });
});
