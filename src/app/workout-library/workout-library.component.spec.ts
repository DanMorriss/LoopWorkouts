import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Workout } from '../models/workout';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { DeletionStore } from '../shared/state/deletion-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { makeWorkout as baseWorkout, SimpleWorkout } from '../shared/testing/make-workout';
import { PageSlide } from '../shared/navigation/page-slide';
import { WorkoutLibraryComponent } from './workout-library.component';
import { ActiveRunService } from '../shared/run/active-run.service';
import { BUILT_IN_WORKOUTS } from '../models/built-in-workouts';
import { copyOf } from '../models/workout';
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
        // Listed with yours once they've loaded, so every test has them
        await store.loadReadyMade();
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    });

    afterEach(() => localStorage.clear());

    function create() {
        fixture = TestBed.createComponent(WorkoutLibraryComponent);
        fixture.detectChanges();
    }

    /** Your own workouts' cards, not the ready-made ones' (`builtin:` ids). */
    function own(): HTMLElement[] {
        return all('.workout-card:not([data-workout^="builtin:"])');
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

    describe('with none of your own', () => {
        beforeEach(() => create());

        it('lists the ready-made ones A to Z, each with its badge, under a line on them', () => {
            expect(text()).toContain('Start any of these, or make your own with New.');
            const titles = all('.workout-card__title').map((t) => t.textContent!.trim());
            expect(titles).toHaveLength(BUILT_IN_WORKOUTS.length);
            expect(titles).toEqual(
                [...titles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            );
            expect(all('.workout-card app-ready-made-badge')).toHaveLength(titles.length);
            expect(own()).toHaveLength(0);
        });

        it('slides in setup from New', () => {
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            click(el('.library-add-button'));

            expect(slide).toHaveBeenCalledWith('/setup', 'in');
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

        const card = (index: number) => own()[index];

        it('shows a card per workout with its title and padded times, and no badge', () => {
            expect(own()).toHaveLength(2);
            expect(text()).not.toContain('Start any of these');
            expect(card(0).textContent).toContain('Sprints');
            expect(card(0).textContent).toContain('01:05 - 00:20 x 4');
            expect(card(0).querySelector('app-ready-made-badge')).toBeNull();
        });

        it('lists them A to Z with the ready-made ones', () => {
            const titles = all('.workout-card__title').map((t) => t.textContent!.trim());
            expect(titles).toHaveLength(2 + BUILT_IN_WORKOUTS.length);
            const sprints = titles.indexOf('Sprints');
            expect(titles[sprints - 1].localeCompare('Sprints')).toBeLessThan(0);
            expect(titles[sprints + 1].localeCompare('Sprints')).toBeGreaterThan(0);
            expect(el('.cdk-drop-list')).toBeNull();
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
                expect(all('.workout-card')).toHaveLength(2 + BUILT_IN_WORKOUTS.length);
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

                expect(all('.workout-card')).toHaveLength(2 + BUILT_IN_WORKOUTS.length);
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

                expect(own()).toHaveLength(2);
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
            async function arriveFrom(saved: string, param = 'saved') {
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

        it('makes a copy of one from its options, keeping both, and opens it in Create', () => {
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            click(card(0).querySelector('.workout-card__action--menu'));
            click(card(0).querySelector('.workout-card__menu-item--copy'));

            expect(store.workouts().map((w) => w.title)).toEqual([
                'Sprints',
                '   ',
                'Sprints (copy)',
            ]);
            expect(slide).toHaveBeenCalledWith(`/setup?editId=${store.workouts()[2].id}`, 'in');
            expect(TestBed.inject(UndoService).offer()?.message).toBe('Made a copy of "Sprints"');
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
                expect(own()).toHaveLength(1);
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

            it('says to start a ready-made one once the last of yours is deleted', () => {
                deleteFromMenu(0);
                deleteFromMenu(0);

                expect(text()).toContain('Start any of these, or make your own with New.');
                expect(undo().offer()?.message).toBe('Deleted a workout');
            });

            describe('closing the offer without undoing', () => {
                it('moves focus to New', async () => {
                    deleteFromMenu(0);

                    undo().dismiss();
                    await settle();

                    expect(document.activeElement).toBe(el('.library-add-button'));
                });
            });
        });
    });

    describe('ready-made workouts (LIB-6)', () => {
        const readyCard = (id: string) => el(`[data-workout="${id}"]`)!;
        const titles = () => all('.workout-card__title').map((t) => t.textContent!.trim());
        function choose(source: string) {
            const input = all('.segmented__option')
                .find((o) => o.textContent!.includes(source))!
                .querySelector('input')!;
            input.click();
            fixture.detectChanges();
        }
        function search(query: string) {
            const input = el<HTMLInputElement>('#library-search')!;
            input.value = query;
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
        }

        it('starts one as it is from its play button, with no copy made', () => {
            create();
            const run = vi.spyOn(TestBed.inject(ActiveRunService), 'start');
            click(readyCard('builtin:gym-legs').querySelector('.workout-card__start'));

            expect(run).toHaveBeenCalledWith(store.findAnyWorkout('builtin:gym-legs'));
            expect(navigate).toHaveBeenCalledWith(['/workout']);
            expect(store.workouts()).toEqual([]);
        });

        it('opens its details from the card', () => {
            create();
            expect(
                readyCard('builtin:gym-legs')
                    .querySelector('.workout-card__open')!
                    .getAttribute('href')
            ).toBe('/library/builtin:gym-legs');
        });

        it('makes a copy from its options, opens it in Create, and offers Undo', () => {
            create();
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            click(readyCard('builtin:gym-legs').querySelector('.workout-card__action--menu'));
            click(readyCard('builtin:gym-legs').querySelector('.workout-card__menu-item--copy'));

            const copy = store.workouts()[0];
            expect(copy.title).toBe('Gym legs (copy)');
            expect(slide).toHaveBeenCalledWith(`/setup?editId=${copy.id}`, 'in');
            expect(TestBed.inject(UndoService).offer()?.message).toBe('Made a copy of "Gym legs"');

            TestBed.inject(UndoService).undo();
            expect(store.workouts()).toEqual([]);
        });

        it('lists a copy added before beside the ready-made one, without the badge', () => {
            store.addWorkout(copyOf(BUILT_IN_WORKOUTS.find((w) => w.title === 'Gym legs')!));
            create();

            expect(titles().filter((title) => title === 'Gym legs')).toHaveLength(2);
            expect(own()[0].querySelector('app-ready-made-badge')).toBeNull();
        });

        it('makes one a favourite with its heart, shown with Favourites', () => {
            create();
            click(readyCard('builtin:gym-legs').querySelector('.favourite-button'));
            click(
                all('.library-filters__chip').find((c) => c.textContent!.includes('Favourites'))!
            );

            expect(titles()).toEqual(['Gym legs']);
            expect(store.workouts()).toEqual([]);
        });

        it('hides those needing what you have not got, with Only what I have on', () => {
            TestBed.inject(SettingsStore).update({
                myEquipment: ['kettlebell'],
                onlyMyEquipment: true,
            });
            create();

            expect(titles()).not.toContain('Gym legs');
            expect(titles()).toContain('Kettlebell full body');
            expect(el('.library__count')?.textContent).toContain(
                `of ${BUILT_IN_WORKOUTS.length} workouts`
            );
        });

        it('is searched with your own', () => {
            store.addWorkout(makeWorkout({ title: 'Legs at home' }));
            create();
            search('legs');

            expect(titles()).toContain('Legs at home');
            expect(titles()).toContain('Gym legs');
            expect(titles()).not.toContain('Tabata');
        });

        it('shows only your own, or only the ready-made ones, when picked', () => {
            store.addWorkout(makeWorkout({ title: 'Sprints' }));
            create();

            choose('My own');
            expect(titles()).toEqual(['Sprints']);
            expect(el('.library__count')?.textContent).toContain('1 of');

            choose('Ready-made');
            expect(titles()).toHaveLength(BUILT_IN_WORKOUTS.length);
            expect(own()).toHaveLength(0);

            click(el('.library__clear'));
            expect(titles()).toHaveLength(1 + BUILT_IN_WORKOUTS.length);
        });
    });
});
