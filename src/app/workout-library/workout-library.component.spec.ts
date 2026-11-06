import type { Mock } from 'vitest';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Workout } from '../models/workout';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { DeletionStore } from '../shared/state/deletion-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { makeWorkout as baseWorkout, SimpleWorkout } from '../shared/testing/make-workout';
import { PageSlide } from '../nav/page-slide';
import { WorkoutLibraryComponent } from './workout-library.component';
import { BUILT_IN_WORKOUTS, copyOfBuiltIn } from '../models/built-in-workouts';
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

    function el<T extends HTMLElement = HTMLElement>(selector: string): T | null {
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

        it('slides in setup from the "Create a workout" button', () => {
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            click(el('.library-create-button'));

            expect(slide).toHaveBeenCalledWith('/setup', 'in');
        });

        it('shows only "Create a workout", not New as well, so there is one way to add one', () => {
            expect(all('.btn-main')).toHaveLength(1);
            expect(el('.library-add-button')).toBeNull();
        });

        it('lists the ready-made workouts under it, to start from', () => {
            expect(text()).toContain('start with a ready-made one below');
            expect(all('.ready-card')).toHaveLength(BUILT_IN_WORKOUTS.length);
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

        it('lists the ready-made workouts under the cards', () => {
            expect(el('.library-list ~ app-library-ready-made')).not.toBeNull();
            expect(all('.ready-card')).toHaveLength(BUILT_IN_WORKOUTS.length);
        });

        it('labels a workout with a blank title as "Untitled workout"', () => {
            expect(card(1).textContent).toContain('Untitled workout');
        });

        it('slides in setup from the New button at the top', () => {
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            click(el('.library-add-button'));

            expect(slide).toHaveBeenCalledWith('/setup', 'in');
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
            it('come back with focus on its card', async () => {
                fixture.destroy();
                Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'queryParamMap', {
                    value: convertToParamMap({ details: first.id }),
                    configurable: true,
                });
                create();
                await settle();

                expect(document.activeElement).toBe(card(0).querySelector('.workout-card__open'));
            });
        });

        describe('searching and filtering', () => {
            function search(query: string) {
                const input = el<HTMLInputElement>('#library-search')!;
                input.value = query;
                input.dispatchEvent(new Event('input'));
                fixture.detectChanges();
            }
            const favouritesChip = () =>
                all('.library-filters__chip').find((chip) =>
                    chip.textContent?.includes('Favourites')
                )!;
            const titles = () => all('.workout-card__title').map((t) => t.textContent?.trim());

            it('shows every workout, with no count, until something is chosen', () => {
                expect(el('#library-search')).not.toBeNull();
                expect(all('.workout-card')).toHaveLength(2);
                expect(el('.library__count')).toBeNull();
            });

            it('finds workouts by name, saying how many of them show', () => {
                search('sprint');

                expect(titles()).toEqual(['Sprints']);
                expect(el('.library__count [role="status"]')?.textContent?.trim()).toBe(
                    `1 of ${2 + BUILT_IN_WORKOUTS.length} workouts`
                );
            });

            it('says when none match, and clears the search to show them all again', () => {
                search('rowing');
                expect(all('.workout-card')).toHaveLength(0);
                expect(el('.library__count')?.textContent).toContain('No workouts match');

                click(el('.library__clear'));

                expect(all('.workout-card')).toHaveLength(2);
                expect(el<HTMLInputElement>('#library-search')!.value).toBe('');
            });

            it('marks a favourite with its heart, and shows only favourites', () => {
                const heart = card(1).querySelector<HTMLElement>('.favourite-button')!;
                expect(heart.getAttribute('aria-label')).toBe('Favourite workout');
                click(heart);
                expect(store.workouts()[1].favourite).toBe(true);
                expect(
                    card(1).querySelector('.favourite-button')?.getAttribute('aria-pressed')
                ).toBe('true');

                click(favouritesChip());

                expect(favouritesChip().getAttribute('aria-pressed')).toBe('true');
                expect(all('.workout-card')).toHaveLength(1);
                expect(card(0).textContent).toContain('Untitled workout');
            });

            it("doesn't open its details or start it from its heart", () => {
                const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate');
                click(card(0).querySelector('.favourite-button'));

                expect(slide).not.toHaveBeenCalled();
                expect(navigate).not.toHaveBeenCalled();
            });

            it("can't be reordered while some are hidden", () => {
                search('sprint');
                click(card(0).querySelector('.workout-card__action--menu'));

                expect(card(0).querySelector('.workout-card__menu-item--down')).toBeNull();
                const list = fixture.debugElement.query(By.directive(CdkDropList));
                expect(list.injector.get(CdkDropList).disabled).toBe(true);
            });

            it('opens the muscles and Only what I have under More filters', () => {
                const more = all('.library-filters__chip').find((chip) =>
                    chip.textContent?.includes('More filters')
                )!;
                expect(more.getAttribute('aria-expanded')).toBe('false');
                expect(el('app-muscle-chips')).toBeNull();

                click(more);

                expect(more.getAttribute('aria-expanded')).toBe('true');
                expect(el('#library-more-filters app-muscle-chips')).not.toBeNull();
                expect(el('#library-more-filters app-equipment-filter')).not.toBeNull();
            });

            it('shows a workout just saved, whatever the list was cut down to', async () => {
                search('sprint');
                fixture.destroy();
                Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'queryParamMap', {
                    value: convertToParamMap({ saved: second.id }),
                    configurable: true,
                });
                create();
                await settle();

                expect(all('.workout-card')).toHaveLength(2);
                expect(card(1).classList).toContain('workout-card--highlighted');
            });

            it('keeps the search coming back to the page, e.g. from details', () => {
                search('sprint');
                fixture.destroy();
                create();

                expect(titles()).toEqual(['Sprints']);
                expect(el<HTMLInputElement>('#library-search')!.value).toBe('sprint');
            });
        });

        describe('arriving from Save in Create (BLD-15)', () => {
            async function arriveFrom(saved: string, param: 'saved' | 'added' = 'saved') {
                fixture.destroy();
                // The snapshot keeps the map it made for the first render, so replace it
                Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'queryParamMap', {
                    value: convertToParamMap({ [param]: saved }),
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

            it('does the same for a ready-made one just added, saying it was added', async () => {
                await arriveFrom(second.id, 'added');

                expect(card(1).classList).toContain('workout-card--highlighted');
                expect(document.activeElement).toBe(card(1).querySelector('.workout-card__start'));
                expect(el('[aria-live]')?.textContent).toContain('Added Untitled workout');
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

            it('starts in one press of its play button, and goes to the workout page', () => {
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

            it('edits the workout by sliding in setup with its id', () => {
                const slide = vi
                    .spyOn(TestBed.inject(PageSlide), 'navigate')
                    .mockImplementation(() => {});
                click(menuButton(1));
                click(card(1).querySelector('.workout-card__menu-item--edit'));

                expect(slide).toHaveBeenCalledWith(`/setup?editId=${second.id}`, 'in');
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

    describe('ready-made workouts (LIB-6)', () => {
        const groups = () => all('.library-ready__group').map((h) => h.textContent!.trim());
        const names = () => all('.ready-card__name').map((n) => n.textContent!.trim());
        const readyCard = (title: string) =>
            all('.ready-card').find((c) => c.textContent!.includes(title))!;
        function choose(source: string) {
            const input = all('.segmented__option')
                .find((o) => o.textContent!.includes(source))!
                .querySelector('input')!;
            input.click();
            fixture.detectChanges();
        }

        it('lists every one, in its group, with what it is and needs', () => {
            create();

            expect(groups()).toEqual([
                'No equipment',
                'Kettlebell',
                'Dumbbells',
                'Gym',
                'Other kit',
            ]);
            expect(names()).toEqual(BUILT_IN_WORKOUTS.map((w) => w.title));
            const parts = (title: string, selector: string) =>
                Array.from(readyCard(title).querySelectorAll(selector), (n) =>
                    n.textContent!.trim()
                );
            expect(parts('Dumbbell full body', '.showcase-tag')).toEqual(['Dumbbells', 'Bench']);
            expect(parts('Bodyweight basics', '.showcase-tag')).toEqual(['No equipment']);
            expect(parts('Bodyweight basics', '.showcase-muscle')).toEqual([
                'Chest',
                'Abs',
                'Glutes',
                'Quads',
            ]);
            expect(
                readyCard('Dumbbell full body').querySelector('.showcase-more')?.textContent?.trim()
            ).toBe('+4 more');
        });

        it('leaves out those already in your workouts, by title', () => {
            store.addWorkout(copyOfBuiltIn(BUILT_IN_WORKOUTS[0]));
            create();

            expect(names()).not.toContain(BUILT_IN_WORKOUTS[0].title);
            expect(names()).toHaveLength(BUILT_IN_WORKOUTS.length - 1);
        });

        it('slides each one in on its own page, with a link to it, and no play button', () => {
            create();
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});

            expect(readyCard('Gym legs').getAttribute('href')).toBe('/ready-made/gym-legs');
            expect(readyCard('Gym legs').querySelector('.workout-card__start')).toBeNull();
            readyCard('Gym legs').click();

            expect(slide).toHaveBeenCalledWith('/ready-made/gym-legs', 'in');
        });

        it('comes back from one with focus on its card', async () => {
            Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'queryParamMap', {
                value: convertToParamMap({ 'ready-made': 'gym-legs' }),
                configurable: true,
            });
            create();
            await settle();

            expect(document.activeElement).toBe(readyCard('Gym legs'));
        });

        it('hides those needing what you have not got, with Only what I have on', () => {
            TestBed.inject(SettingsStore).update({
                myEquipment: ['kettlebell'],
                onlyMyEquipment: true,
            });
            create();

            expect(groups()).toEqual(['No equipment', 'Kettlebell']);
            expect(el('.library__count')?.textContent).toContain(
                `of ${BUILT_IN_WORKOUTS.length} workouts`
            );
        });

        it('is searched with your own', () => {
            store.addWorkout(makeWorkout({ title: 'Legs at home' }));
            create();
            const input = el<HTMLInputElement>('#library-search')!;
            input.value = 'legs';
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            expect(all('.workout-card')).toHaveLength(1);
            expect(names()).toContain('Gym legs');
            expect(names()).not.toContain('Tabata');
        });

        it('shows only your own, or only the ready-made ones, when picked', () => {
            store.addWorkout(makeWorkout({ title: 'Sprints' }));
            create();

            choose('My own');
            expect(all('.workout-card')).toHaveLength(1);
            expect(all('.ready-card')).toHaveLength(0);
            expect(el('.library__count')?.textContent).toContain('1 of');

            choose('Ready-made');
            expect(all('.workout-card')).toHaveLength(0);
            expect(all('.ready-card')).toHaveLength(BUILT_IN_WORKOUTS.length);

            click(el('.library__clear'));
            expect(all('.workout-card')).toHaveLength(1);
            expect(all('.ready-card')).toHaveLength(BUILT_IN_WORKOUTS.length);
        });

        it('has none as favourites', () => {
            create();
            click(
                all('.library-filters__chip').find((c) => c.textContent!.includes('Favourites'))!
            );

            expect(all('.ready-card')).toHaveLength(0);
        });
    });
});
