import type { Mock } from 'vitest';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HistoryEntry } from '../models/history';
import { Workout } from '../models/workout';
import { HistoryStore } from '../shared/state/history-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { DeletionStore } from '../shared/state/deletion-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { makeWorkout as baseWorkout, reps, SimpleWorkout } from '../shared/testing/make-workout';
import { WorkoutLibraryComponent } from './workout-library.component';
import { BUILT_IN_WORKOUTS, builtInWorkoutEquipment } from '../models/built-in-workouts';
import { SettingsStore } from '../shared/state/settings-store.service';

// A new workout to add: the shared test workout without its id
function makeWorkout(overrides: Partial<SimpleWorkout> = {}): Omit<Workout, 'id'> {
    const { id: _id, ...workout } = baseWorkout(overrides);
    return workout;
}

describe('WorkoutLibraryComponent', () => {
    let fixture: ComponentFixture<WorkoutLibraryComponent>;
    let store: WorkoutStore;
    let navigate: Mock;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [WorkoutLibraryComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        store = TestBed.inject(WorkoutStore);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    });

    afterEach(() => localStorage.clear());

    function create() {
        fixture = TestBed.createComponent(WorkoutLibraryComponent);
        fixture.detectChanges();
    }

    function all(selector: string): HTMLElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll(selector));
    }

    function el(selector: string): HTMLElement | null {
        return fixture.nativeElement.querySelector(selector);
    }

    function click(element: HTMLElement | null) {
        expect(element, 'element to click').not.toBeNull();
        element!.click();
        fixture.detectChanges();
    }

    /** Re-render and let after-render hooks (like focus moves) run. */
    async function settle() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function text(): string {
        return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    }

    describe('with no workouts', () => {
        beforeEach(() => create());

        it('shows the empty message and no cards', () => {
            expect(text()).toContain('No workouts yet. Make one');
            expect(all('.workout-card')).toHaveLength(0);
        });

        it('goes to setup from the "Create a workout" button', () => {
            click(el('.library-create-button'));

            expect(navigate).toHaveBeenCalledWith(['/setup']);
        });

        it('shows only "Create a workout", not New as well, so there is one way to add one', () => {
            expect(all('.btn-main')).toHaveLength(1);
            expect(el('.library-add-button')).toBeNull();
        });

        it('offers the ready-made workouts too', () => {
            expect(el('.library-ready-made-button')?.getAttribute('href')).toBe('/ready-made');
            expect(el('.library__ready-made')).toBeNull();
        });
    });

    describe('with workouts', () => {
        let first: Workout;
        let second: Workout;

        beforeEach(() => {
            first = store.addWorkout(
                makeWorkout({
                    title: 'Sprints',
                    workMinutes: 1,
                    workSeconds: 5,
                    restSeconds: 20,
                    repeats: 4,
                })
            );
            second = store.addWorkout(makeWorkout({ title: '   ' }));
            create();
        });

        const card = (index: number) => all('.workout-card')[index];

        it('shows a card per workout with its title and padded times', () => {
            expect(all('.workout-card')).toHaveLength(2);
            expect(text()).not.toContain('No workouts yet. Make one');
            expect(card(0).textContent).toContain('Sprints');
            expect(card(0).textContent).toContain('01:05 - 00:20 x 4');
        });

        it('offers the ready-made workouts under the cards', () => {
            expect(el('.library__ready-made')?.getAttribute('href')).toBe('/ready-made');
            expect(el('.library-ready-made-button')).toBeNull();
        });

        it('labels a workout with a blank title as "Untitled workout"', () => {
            expect(card(1).textContent).toContain('Untitled workout');
        });

        it('goes to setup from the New button at the top', () => {
            click(el('.library-add-button'));

            expect(navigate).toHaveBeenCalledWith(['/setup']);
        });

        it('has a title, as the other pages do', () => {
            expect(el('h2.library__title')?.textContent?.trim()).toBe('Workouts');
            expect(el('.library__top .library-add-button')?.getAttribute('aria-label')).toBe(
                'New workout'
            );
        });

        describe('moving', () => {
            const titles = () => store.workouts().map((w) => w.title);
            const menuItem = (index: number, item: string) =>
                card(index).querySelector<HTMLElement>(`.workout-card__menu-item--${item}`);

            it('moves down from its options, saved, and says so', async () => {
                click(card(0).querySelector('.workout-card__action--menu'));
                click(menuItem(0, 'down'));
                await settle();

                expect(titles()).toEqual(['   ', 'Sprints']);
                expect(JSON.parse(localStorage.getItem('workouts')!)[1].title).toBe('Sprints');
                expect(el('[aria-live]')?.textContent).toContain('Moved Sprints to 2 of 2');
                // Its options stay open, with focus on the way back, now it's at the bottom
                expect(document.activeElement).toBe(menuItem(1, 'up'));
            });

            it('moves to where a held card is dropped', () => {
                const list = fixture.debugElement.query(By.directive(CdkDropList));
                list.injector.get(CdkDropList).dropped.emit({
                    previousIndex: 1,
                    currentIndex: 0,
                } as CdkDragDrop<unknown>);
                fixture.detectChanges();

                expect(titles()).toEqual(['   ', 'Sprints']);
                expect(card(0).textContent).toContain('Untitled workout');
            });
        });

        describe('details', () => {
            const openDetails = (index: number) => {
                click(card(index).querySelector('.workout-card__action--menu'));
                click(card(index).querySelector('.workout-card__menu-item--details'));
            };
            const dialog = () => el('[role="dialog"]');

            it("opens from its options, saying when it hasn't been done yet", () => {
                openDetails(0);

                expect(dialog()?.textContent).toContain('Sprints');
                expect(dialog()?.textContent).toContain('Not done yet.');
                expect(dialog()?.textContent).toContain('None of its steps is an exercise yet');
            });

            it('lists its runs, newest first, linking to them in the history', () => {
                const run = (startedAt: number): HistoryEntry => ({
                    id: `${startedAt}-${first.id}`,
                    workoutId: first.id,
                    title: 'Sprints',
                    startedAt,
                    endedAt: startedAt + 300_000,
                    activeSeconds: 300,
                    roundsCompleted: 4,
                    totalRounds: 4,
                    outcome: 'finished',
                    updatedAt: startedAt,
                });
                const history = TestBed.inject(HistoryStore);
                history.record(run(Date.UTC(2026, 9, 20, 12)));
                history.record(run(Date.UTC(2026, 9, 24, 12)));
                openDetails(0);

                expect(dialog()?.textContent).toContain('Done 2 times');
                const runs = Array.from(dialog()!.querySelectorAll('.details__run'));
                expect(runs.map((a) => a.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
                    'Sat 24 Oct 4 rounds · 5:00',
                    'Tue 20 Oct 4 rounds · 5:00',
                ]);
                expect(runs[0].getAttribute('href')).toBe(
                    `/history?run=${Date.UTC(2026, 9, 24, 12)}-${first.id}`
                );
            });

            it('closes with Done, putting focus back on the options button', async () => {
                openDetails(0);
                click(dialog()!.querySelector('.details__done'));
                await settle();

                expect(document.activeElement).toBe(
                    card(0).querySelector('.workout-card__action--menu')
                );
            });

            it('edits the workout from its Edit button', () => {
                openDetails(1);
                click(dialog()!.querySelector('.details__edit'));

                expect(navigate).toHaveBeenCalledWith(['/setup'], {
                    queryParams: { editId: second.id },
                });
            });
        });

        it('says nothing of muscles while no step is an exercise', () => {
            expect(el('.library__muscles')).toBeNull();
        });

        describe('arriving from Save in Create (BLD-15)', () => {
            async function arriveFrom(saved: string) {
                fixture.destroy();
                // The snapshot keeps the map it made for the first render, so replace it
                Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'queryParamMap', {
                    value: convertToParamMap({ saved }),
                });
                create();
                await settle();
            }

            it('highlights the saved workout, with focus on it, and says it was saved', async () => {
                await arriveFrom(second.id);

                expect(card(1).classList).toContain('workout-card--highlighted');
                expect(card(0).classList).not.toContain('workout-card--highlighted');
                expect(document.activeElement).toBe(card(1).querySelector('.workout-card__start'));
                expect(el('[aria-live]')?.textContent).toContain('Saved Untitled workout');
            });

            it('highlights nothing for a workout no longer in the library', async () => {
                await arriveFrom('gone');

                expect(all('.workout-card--highlighted')).toHaveLength(0);
                expect(el('[aria-live]')?.textContent?.trim()).toBe('');
            });

            it('highlights nothing arriving any other way', () => {
                expect(all('.workout-card--highlighted')).toHaveLength(0);
            });
        });

        describe('starting a workout', () => {
            const startButton = (index: number) =>
                card(index).querySelector<HTMLElement>('.workout-card__start')!;

            it('starts in one press of its card, and goes to the workout page', () => {
                click(startButton(0));

                expect(store.activeWorkout()).toEqual(first);
                expect(navigate).toHaveBeenCalledWith(['/workout']);
            });

            it('lets keyboard users start one, each card being a button named for it', () => {
                startButton(1).focus();

                expect(document.activeElement).toBe(startButton(1));
                expect(startButton(0).getAttribute('aria-label')).toBe('Start Sprints');
                expect(startButton(1).getAttribute('aria-label')).toBe('Start workout');
            });
        });

        describe('options menu', () => {
            const menuButton = (index: number) =>
                card(index).querySelector<HTMLElement>('.workout-card__action--menu');

            it('opens and closes, and reports its state to screen readers', () => {
                expect(menuButton(0)?.getAttribute('aria-expanded')).toBe('false');

                click(menuButton(0));
                expect(card(0).querySelector('.workout-card__menu')).not.toBeNull();
                expect(menuButton(0)?.getAttribute('aria-expanded')).toBe('true');

                click(menuButton(0));
                expect(card(0).querySelector('.workout-card__menu')).toBeNull();
            });

            it('only has one menu open at a time', () => {
                click(menuButton(0));
                click(menuButton(1));

                expect(all('.workout-card__menu')).toHaveLength(1);
                expect(card(1).querySelector('.workout-card__menu')).not.toBeNull();
            });

            it('closes on a click elsewhere on the page', () => {
                click(menuButton(0));

                click(el('.library-screen'));

                expect(all('.workout-card__menu')).toHaveLength(0);
            });

            it('edits the workout by going to setup with its id', () => {
                click(menuButton(1));
                click(card(1).querySelector('.workout-card__menu-item--edit'));

                expect(navigate).toHaveBeenCalledWith(['/setup'], {
                    queryParams: { editId: second.id },
                });
            });

            it('closes on Escape and puts focus back on its button', async () => {
                click(menuButton(0));
                const editButton = card(0).querySelector<HTMLElement>(
                    '.workout-card__menu-item--edit'
                )!;
                editButton.focus();

                editButton.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
                );
                await settle();

                expect(card(0).querySelector('.workout-card__menu')).toBeNull();
                expect(document.activeElement).toBe(menuButton(0));
            });
        });

        describe('deleting', () => {
            const undo = () => TestBed.inject(UndoService);

            function deleteFromMenu(index: number) {
                click(card(index).querySelector('.workout-card__action--menu'));
                click(card(index).querySelector('.workout-card__menu-item--danger'));
            }

            it('deletes straight away, without asking, and offers Undo naming it', () => {
                deleteFromMenu(0);

                expect(el('[role="dialog"]')).toBeNull();
                expect(store.workouts()).toEqual([second]);
                expect(all('.workout-card')).toHaveLength(1);
                expect(JSON.parse(localStorage.getItem('workouts')!)).toEqual([second]);
                expect(undo().offer()?.message).toBe('Deleted "Sprints"');
            });

            it('describes an untitled workout without empty quotes', () => {
                deleteFromMenu(1);

                expect(undo().offer()?.message).toBe('Deleted a workout');
            });

            it('puts it back where it was on Undo, with focus on its menu', async () => {
                deleteFromMenu(0);

                undo().undo();
                await settle();

                // Dated after its deletion, which may have reached other devices already
                const restored = { ...first, updatedAt: store.workouts()[0].updatedAt };
                expect(restored.updatedAt).toBeGreaterThan(first.updatedAt);
                expect(store.workouts()).toEqual([restored, second]);
                expect(JSON.parse(localStorage.getItem('workouts')!)).toEqual([restored, second]);
                expect(
                    TestBed.inject(DeletionStore).deletedAt('workout', first.id)
                ).toBeUndefined();
                expect(document.activeElement).toBe(
                    card(0).querySelector('.workout-card__action--menu')
                );
            });

            it('shows the empty message once the last workout is deleted', () => {
                deleteFromMenu(0);
                deleteFromMenu(0);

                expect(text()).toContain('No workouts yet. Make one');
                expect(undo().offer()?.message).toBe('Deleted a workout');
            });

            describe('closing the offer without undoing', () => {
                it('moves focus to New', async () => {
                    deleteFromMenu(0);

                    undo().dismiss();
                    await settle();

                    expect(document.activeElement).toBe(el('.library-add-button'));
                });

                it('moves focus to "Create a workout" once the library is empty', async () => {
                    deleteFromMenu(0);
                    deleteFromMenu(0);

                    undo().dismiss();
                    await settle();

                    expect(document.activeElement).toBe(el('.library-create-button'));
                });
            });
        });
    });

    describe('muscle groups', () => {
        beforeEach(() => {
            // Back squat works the quads and glutes, helped by the hamstrings, adductors and
            // lower back; Bench press the chest, helped by the shoulders and triceps
            store.addWorkout(makeWorkout({ title: 'Legs', steps: [reps(10, 'Back squat')] }));
            store.addWorkout(makeWorkout({ title: 'Push', steps: [reps(10, 'Bench press')] }));
            create();
        });

        const muscles = (list: number) =>
            Array.from(all('.library__muscle-list')[list].querySelectorAll('a'), (a) =>
                a.textContent!.trim()
            ).join(' ');

        it('lists the muscle groups no workout works, linking to exercises for each', () => {
            expect(el('.library__muscles-title')?.textContent).toContain('Missing muscle groups');
            expect(muscles(0)).toBe(
                'Biceps Forearms Abs Obliques Traps Upper back Abductors Calves Shins Neck'
            );
            expect(el('.library__muscle')?.getAttribute('href')).toBe('/exercises?muscles=biceps');
        });

        it('lists the ones only worked as a supporting muscle apart', () => {
            expect(muscles(1)).toBe('Shoulders Triceps Lower back Adductors Hamstrings');
        });

        describe('a ready-made workout for them (LIB-7)', () => {
            const suggested = () => el('.library__gap-filler-name')?.textContent!.trim();

            it('suggests the one that does most for them, saying what it adds', () => {
                expect(el('.library__gap-filler-label')?.textContent?.trim()).toBe(
                    'Or add a ready-made workout for them:'
                );
                expect(suggested()).toBe('Kettlebell full body');
                expect(el('.library__gap-filler-fills')?.textContent?.trim()).toBe(
                    'Adds Shoulders, Biceps, Forearms and 5 more.'
                );
            });

            it('adds it to the end with Undo, then suggests another for what is left', () => {
                click(el('.library__gap-filler-add'));

                expect(store.workouts().map((w) => w.title)).toEqual([
                    'Legs',
                    'Push',
                    'Kettlebell full body',
                ]);
                expect(TestBed.inject(UndoService).offer()?.message).toBe(
                    'Added "Kettlebell full body" to your workouts'
                );
                expect(suggested()).not.toBe('Kettlebell full body');

                TestBed.inject(UndoService).undo();
                fixture.detectChanges();
                expect(store.workouts().map((w) => w.title)).toEqual(['Legs', 'Push']);
                expect(suggested()).toBe('Kettlebell full body');
            });

            it('with Only what I have on, suggests only what your equipment allows', () => {
                TestBed.inject(SettingsStore).update({ onlyMyEquipment: true, myEquipment: [] });
                fixture.detectChanges();

                const workout = BUILT_IN_WORKOUTS.find((w) => w.title === suggested())!;
                expect(builtInWorkoutEquipment(workout)).toEqual(['none']);
            });

            it("doesn't suggest one already in your workouts", () => {
                store.addWorkout(makeWorkout({ title: 'Kettlebell full body', steps: [reps(5)] }));
                fixture.detectChanges();

                expect(suggested()).toBeTruthy();
                expect(suggested()).not.toBe('Kettlebell full body');
            });
        });
    });
});
