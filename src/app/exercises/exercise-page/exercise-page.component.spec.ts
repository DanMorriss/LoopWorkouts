import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BUILT_IN_EXERCISE_TEXT } from '../../models/built-in-exercise-text';
import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { DeletionStore } from '../../shared/state/deletion-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { makeWorkout } from '../../shared/testing/make-workout';
import { ExercisePageComponent } from './exercise-page.component';
import { PageSlide } from '../../nav/page-slide';

describe('ExercisePageComponent', () => {
    let harness: RouterTestingHarness;
    let fixture: ComponentFixture<unknown>;
    let exercises: ExerciseStore;

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'exercises', children: [] },
                    { path: 'exercises/:id', component: ExercisePageComponent },
                    { path: 'library/:workoutId', children: [] },
                    { path: 'library/:workoutId/:id', component: ExercisePageComponent },
                    { path: 'ready-made-plans/:id', children: [] },
                    {
                        path: 'ready-made-plans/:workoutId/:id',
                        component: ExercisePageComponent,
                        data: { inPlan: true },
                    },
                ]),
            ],
        });
        exercises = TestBed.inject(ExerciseStore);
    });
    afterEach(() => localStorage.clear());

    async function open(url: string) {
        harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(url);
        fixture = harness.fixture;
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const undo = () => TestBed.inject(UndoService);
    const text = (selector: string) => el().querySelector(selector)?.textContent!.trim();
    const all = (selector: string) =>
        Array.from(el().querySelectorAll(selector)).map((e) => e.textContent!.trim());
    const click = async (selector: string) => {
        el().querySelector<HTMLElement>(selector)!.click();
        await render();
    };

    describe("from a ready-made plan's workout", () => {
        it('goes back to it, keeping where that goes back to', async () => {
            await open('/ready-made-plans/gym-legs/back-squat?from=today');
            const back = el().querySelector('.back-link')!;

            expect(text('.exercise__name')).toBe('Back squat');
            expect(back.getAttribute('href')).toBe('/ready-made-plans/gym-legs?from=today');
            expect(back.textContent).toContain('Gym legs');
        });

        it('adds to a workout, and Create comes back here', async () => {
            await open('/ready-made-plans/gym-legs/back-squat?from=today');
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            await click('#exercise-page-add');
            await click('.choice__choice');

            const params = new URL(slide.mock.lastCall![0], location.origin).searchParams;
            expect(params.get('from')).toBe('/ready-made-plans/gym-legs/back-squat?from=today');
        });
    });

    describe("from a workout's details", () => {
        it('goes back to them, with the workout named', async () => {
            const legs = TestBed.inject(WorkoutStore).addWorkout({
                title: 'Legs',
                repeats: 1,
                blocks: [],
            });
            await open(`/library/${legs.id}/back-squat`);

            expect(text('.exercise__name')).toBe('Back squat');
            const back = el().querySelector('.back-link')!;
            expect(back.getAttribute('href')).toBe(`/library/${legs.id}`);
            expect(back.textContent).toContain('Legs');
        });

        it('still goes back, for a workout that has gone', async () => {
            await open('/library/gone/back-squat');
            const back = el().querySelector('.back-link')!;

            expect(back.getAttribute('href')).toBe('/library/gone');
            expect(back.textContent).toContain('Workout');
        });
    });

    describe('a built-in exercise', () => {
        const backSquat = BUILT_IN_EXERCISES.find((e) => e.id === 'builtin:back-squat')!;

        it('shows its name, other names, equipment, description, steps and tips', async () => {
            await open('/exercises/back-squat');
            // Its words aren't in the first download
            await exercises.loadText();
            await render();
            const words = BUILT_IN_EXERCISE_TEXT['builtin:back-squat'];

            expect(text('.exercise__name')).toBe('Back squat');
            expect(text('.exercise__also')).toBe(`Also called: ${backSquat.otherNames.join(', ')}`);
            expect(all('.exercise__chip')).toEqual(['Barbell', 'Rack', 'Reps']);
            expect(text('.exercise__description')).toBe(words.description);
            expect(all('.exercise__steps li')).toEqual(words.steps);
            expect(all('.exercise__tips li')).toEqual(words.tips);
            expect(all('.body-map__label--main')).toEqual(['Quads', 'Glutes']);
            expect(el().querySelector('#exercise-page-delete')).toBeNull();
        });

        it('reads a choice across two needs as one', async () => {
            await open('/exercises/inverted-row');

            expect(all('.exercise__chip')[0]).toBe('Barbell and rack, Smith machine, or rings');
        });

        it('shows your note on it, and takes one', async () => {
            await open('/exercises/back-squat');
            expect(text('#exercise-page-edit')).toContain('Add note');

            await click('#exercise-page-edit');
            const note = el().querySelector('#exercise-editor-note') as HTMLTextAreaElement;
            note.value = 'Pause at the bottom';
            note.dispatchEvent(new Event('input'));
            el()
                .querySelector('app-exercise-editor form')!
                .dispatchEvent(new Event('submit', { cancelable: true }));
            await render();

            expect(el().querySelector('app-exercise-editor')).toBeNull();
            expect(text('.exercise__note-label')).toBe('Your note');
            expect(text('.exercise__note-text')).toBe('Pause at the bottom');
            expect(text('#exercise-page-edit')).toContain('Edit note');
            expect(document.activeElement).toBe(el().querySelector('#exercise-page-edit'));
        });

        it('hides it from the picker, and shows it again', async () => {
            await open('/exercises/back-squat');

            await click('#exercise-page-hide');
            expect(exercises.isHidden('builtin:back-squat')).toBe(true);
            expect(text('.exercise__hidden')).toBe('Hidden from the picker in Create.');
            expect(text('#exercise-page-hide')).toContain('Show in the picker');

            await click('#exercise-page-hide');
            expect(exercises.isHidden('builtin:back-squat')).toBe(false);
        });

        it('keeps the picked muscle on the back link', async () => {
            await open('/exercises/back-squat?muscles=quads');

            const back = el().querySelector('.back-link') as HTMLAnchorElement;
            expect(back.getAttribute('href')).toBe('/exercises?muscles=quads');
        });

        it('keeps picked muscles on the back link', async () => {
            await open('/exercises/back-squat?muscles=quads,glutes');

            const back = el().querySelector('.back-link') as HTMLAnchorElement;
            expect(back.getAttribute('href')).toBe('/exercises?muscles=quads,glutes');
        });
    });

    describe('your own exercise', () => {
        it('is found by its id, and says how to add steps and tips', async () => {
            const mine = exercises.addOwn('Sled push', 'timed');
            await open(`/exercises/${mine.id}`);

            expect(text('.exercise__name')).toBe('Sled push');
            expect(all('.exercise__chip')).toEqual(['Timed', 'Your own']);
            expect(text('.exercise__empty')).toBe(
                'No how-to steps or tips yet. Add them with Edit.'
            );
            expect(text('.body-map__none')).toBe('No muscles listed.');
        });

        it('deletes it straight away, goes back to the list, and offers Undo', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            await open(`/exercises/${mine.id}`);

            await click('#exercise-page-delete');
            await vi.waitFor(() => expect(undo().offer()).not.toBeNull());

            expect(el().querySelector('[role="dialog"]')).toBeNull();
            expect(exercises.byId(mine.id)).toBeUndefined();
            expect(TestBed.inject(Router).url).toBe('/exercises');
            expect(undo().offer()?.message).toBe('Deleted Sled push');
            // Offered on the list, so it's still there once it's opened
            expect(undo().offer()?.url).toBe('/exercises');
        });

        it('puts it back on Undo, note and all, and goes back to its page', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            exercises.setNote(mine.id, 'Low hips');
            exercises.setHidden(mine.id, true);
            await open(`/exercises/${mine.id}`);
            await click('#exercise-page-delete');
            await vi.waitFor(() => expect(undo().offer()).not.toBeNull());

            undo().undo();
            await vi.waitFor(() =>
                expect(TestBed.inject(Router).url).toBe(`/exercises/${mine.id}`)
            );

            expect(exercises.byId(mine.id)?.name).toBe('Sled push');
            expect(exercises.noteFor(mine.id)).toBe('Low hips');
            expect(exercises.isHidden(mine.id)).toBe(true);
            expect(TestBed.inject(DeletionStore).deletedAt('exercise', mine.id)).toBeUndefined();
        });

        it('keeps the picked muscle when deleting and returning to the list', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            await open(`/exercises/${mine.id}?muscles=glutes`);

            await click('#exercise-page-delete');
            await vi.waitFor(() => expect(undo().offer()).not.toBeNull());

            expect(exercises.byId(mine.id)).toBeUndefined();
            expect(TestBed.inject(Router).url).toBe('/exercises?muscles=glutes');
        });

        it('keeps picked muscles when deleting and returning to the list', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            await open(`/exercises/${mine.id}?muscles=quads,glutes`);

            await click('#exercise-page-delete');
            await vi.waitFor(() => expect(undo().offer()).not.toBeNull());

            expect(exercises.byId(mine.id)).toBeUndefined();
            expect(TestBed.inject(Router).url).toBe('/exercises?muscles=quads,glutes');
        });

        it("won't delete one a workout uses, and says which", async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            TestBed.inject(WorkoutStore).addWorkout(
                makeWorkout({
                    title: 'Legs',
                    steps: [{ kind: 'reps', reps: 5, name: 'Sled push', exerciseId: mine.id }],
                })
            );
            await open(`/exercises/${mine.id}`);

            await click('#exercise-page-delete');

            expect(el().querySelector('[role="dialog"]')).toBeNull();
            expect(undo().offer()).toBeNull();
            expect(text('[role="status"]')).toBe(
                "Sled push is in Legs, so it can't be deleted. Take it out of that workout first, or hide it from the picker."
            );
            expect(exercises.byId(mine.id)).toBeDefined();
        });

        it('hides one with history instead of deleting it', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            TestBed.inject(HistoryStore).record({
                id: 'run',
                workoutId: 'gone',
                title: 'Legs',
                startedAt: 1,
                endedAt: 2,
                activeSeconds: 1,
                roundsCompleted: 1,
                totalRounds: 1,
                outcome: 'finished',
                sets: [{ round: 0, step: 0, name: 'Sled push', reps: 5, exerciseId: mine.id }],
            });
            await open(`/exercises/${mine.id}`);

            await click('#exercise-page-delete');

            expect(el().querySelector('[role="dialog"]')).toBeNull();
            expect(exercises.byId(mine.id)).toBeDefined();
            expect(exercises.isHidden(mine.id)).toBe(true);
            expect(undo().offer()?.message).toBe(
                "Sled push is in your history, so it's hidden from the picker instead"
            );

            undo().undo();
            expect(exercises.isHidden(mine.id)).toBe(false);
        });
    });

    describe('adding it to a workout (EXR-12)', () => {
        const choices = () =>
            Array.from(el().querySelectorAll<HTMLButtonElement>('.choice__choice')).map((button) =>
                [
                    button.querySelector('.choice__name')!.textContent!.trim(),
                    button.querySelector('.choice__detail')?.textContent!.trim(),
                    button.disabled ? '(off)' : '',
                ]
                    .filter(Boolean)
                    .join(' ')
            );

        beforeEach(() => {
            const store = TestBed.inject(WorkoutStore);
            store.addWorkout(
                makeWorkout({ title: 'Legs', steps: [{ kind: 'reps', reps: 5, name: 'Lunge' }] })
            );
            store.addWorkout(
                makeWorkout({
                    title: '',
                    steps: Array.from({ length: 20 }, () => ({
                        kind: 'reps' as const,
                        reps: 5,
                        name: 'Lunge',
                    })),
                })
            );
        });

        it('offers a new workout, or one from the library with room for it', async () => {
            await open('/exercises/back-squat');

            await click('#exercise-page-add');

            expect(text('.choice__title')).toBe('Add Back squat to');
            expect(choices()).toEqual([
                'New workout',
                'Legs 1 step',
                'Untitled workout Full, 20 steps (off)',
            ]);
            expect(document.activeElement).toBe(el().querySelector('.choice__choice'));
        });

        it('opens Create with it added to the workout picked, or a new one', async () => {
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            const legs = TestBed.inject(WorkoutStore)
                .workouts()
                .find((w) => w.title === 'Legs')!;
            await open('/exercises/back-squat');
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            const opened = () => new URL(slide.mock.lastCall![0], location.origin).searchParams;

            await click('#exercise-page-add');
            el().querySelectorAll<HTMLButtonElement>('.choice__choice')[1].click();
            await render();
            expect(Object.fromEntries(opened())).toEqual({
                editId: legs.id,
                add: 'builtin:back-squat',
                from: '/exercises/back-squat',
            });

            await click('#exercise-page-add');
            await click('.choice__choice');
            expect(Object.fromEntries(opened())).toEqual({
                add: 'builtin:back-squat',
                from: '/exercises/back-squat',
            });
        });

        it('closes with ✕, focus going back to Add to workout', async () => {
            await open('/exercises/back-squat');

            await click('#exercise-page-add');
            await click('.dialog-back');

            expect(el().querySelector('app-workout-choice-dialog')).toBeNull();
            expect(document.activeElement).toBe(el().querySelector('#exercise-page-add'));
        });
    });

    it("says when there's no such exercise", async () => {
        await open('/exercises/not-one');

        expect(text('.exercise__name')).toBe('Exercise not found');
    });

    it("doesn't take a built-in exercise's whole id in the link", async () => {
        await open('/exercises/builtin:back-squat');

        expect(text('.exercise__name')).toBe('Exercise not found');
    });
});
