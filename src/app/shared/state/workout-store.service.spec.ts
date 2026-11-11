import { TestBed } from '@angular/core/testing';
import { allSteps, asOneGroup, Block, RepStep, Workout, WorkoutFields } from '../../models/workout';
import { LoggedSet } from '../../models/history';
import {
    makeWorkout as baseWorkout,
    reps,
    rest,
    savedBeforeGroups,
    SimpleWorkout,
    work,
} from '../testing/make-workout';
import { DeletionStore } from './deletion-store.service';
import { ExerciseStore } from './exercise-store.service';
import { WorkoutStore } from './workout-store.service';

// What Done logs in the rep step tests: round 1's push-ups
const SET: LoggedSet = { round: 0, step: 1, name: '', reps: 20 };

// A new workout to add: the shared test workout without its id and date
function makeWorkout(overrides: Partial<SimpleWorkout> = {}): WorkoutFields {
    const { id: _id, updatedAt: _updatedAt, ...workout } = baseWorkout(overrides);
    return workout;
}

function savedWorkouts(): Workout[] {
    return JSON.parse(localStorage.getItem('workouts') ?? '[]');
}

describe('WorkoutStore', () => {
    beforeEach(() => {
        localStorage.clear();
        // Saved as this version of the app saves it, so loading isn't converting (see migrate.spec)
        localStorage.setItem('data-version', '4');
    });
    afterEach(() => localStorage.clear());

    const createStore = () => TestBed.inject(WorkoutStore);

    describe('loading', () => {
        it('starts empty when nothing is saved', () => {
            expect(createStore().workouts()).toEqual([]);
        });

        it('loads workouts saved in localStorage', () => {
            const saved: Workout[] = [
                { ...makeWorkout({ title: 'Saved' }), id: 'workout-4', updatedAt: 1 },
            ];
            localStorage.setItem('workouts', JSON.stringify(saved));

            expect(createStore().workouts()).toEqual(saved);
        });

        it('starts empty instead of crashing when saved data is corrupted', () => {
            localStorage.setItem('workouts', '{not valid json');

            expect(createStore().workouts()).toEqual([]);
        });

        it('starts empty when saved data is not a list', () => {
            localStorage.setItem('workouts', JSON.stringify({ title: 'oops' }));

            expect(createStore().workouts()).toEqual([]);
        });

        it('keeps valid saved workouts and drops broken ones', () => {
            const valid: Workout = { ...makeWorkout(), id: 'workout-1', updatedAt: 1 };
            const broken = [
                null,
                'text',
                { id: 'workout-2', updatedAt: 1 },
                { ...makeWorkout(), id: '', updatedAt: 1 },
                { ...makeWorkout(), id: 'workout-3', updatedAt: 1, title: 42 },
                { ...makeWorkout(), id: 'workout-4', updatedAt: 1, repeats: -1 },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-5',
                    updatedAt: 1,
                    steps: 'work',
                },
                { ...savedBeforeGroups(makeWorkout()), id: 'workout-6', updatedAt: 1, steps: [] },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-7',
                    updatedAt: 1,
                    steps: [rest(10)],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-8',
                    updatedAt: 1,
                    steps: [work(0)],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-9',
                    updatedAt: 1,
                    steps: [work(30.5)],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-10',
                    updatedAt: 1,
                    steps: [work(100 * 60)],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-11',
                    updatedAt: 1,
                    steps: [{ kind: 'jump', seconds: 30, name: '' }],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-12',
                    updatedAt: 1,
                    steps: [{ kind: 'work', seconds: 30 }],
                },
            ];
            localStorage.setItem('workouts', JSON.stringify([valid, ...broken]));

            expect(createStore().workouts()).toEqual([valid]);
        });

        it('loads groups and headings, and drops workouts with a broken group', () => {
            const blocks: Block[] = [
                { kind: 'heading', text: 'Knee rehabilitation' },
                { kind: 'group', rounds: 3, restSeconds: 60, steps: [reps(10, 'Leg press')] },
                { kind: 'group', rounds: 2, restSeconds: 0, steps: [work(30), reps(8)] },
            ];
            const valid: Workout = { ...makeWorkout(), id: 'workout-1', updatedAt: 1, blocks };
            const group = (fields: Record<string, unknown>) => ({
                ...makeWorkout(),
                updatedAt: 1,
                blocks: [{ kind: 'group', rounds: 1, restSeconds: 0, steps: [reps(5)], ...fields }],
            });
            const broken = [
                { ...group({ rounds: 0 }), id: 'workout-2' },
                { ...group({ rounds: 31 }), id: 'workout-3' },
                { ...group({ rounds: 1.5 }), id: 'workout-4' },
                { ...group({ restSeconds: -1 }), id: 'workout-5' },
                { ...group({ restSeconds: 100 * 60 }), id: 'workout-6' },
                { ...group({ steps: [] }), id: 'workout-7' },
                { ...group({ steps: [reps(0)] }), id: 'workout-8' },
                { ...group({ kind: 'loop' }), id: 'workout-9' },
                { ...makeWorkout(), id: 'workout-10', updatedAt: 1, blocks: 'group' },
                { ...makeWorkout(), id: 'workout-11', updatedAt: 1, blocks: [null] },
                // Only a heading, so no work
                { ...makeWorkout(), id: 'workout-12', updatedAt: 1, blocks: [blocks[0]] },
            ];
            localStorage.setItem('workouts', JSON.stringify([valid, ...broken]));

            expect(createStore().workouts()).toEqual([valid]);
        });

        it('keeps each side on a timed or rep step, and nowhere else (BLD-10)', () => {
            const steps = [
                { ...reps(10, 'Step-up'), eachSide: true },
                { ...work(30, 'Side plank'), eachSide: true },
                { ...rest(10), eachSide: true },
                { ...reps(5), eachSide: 'yes' },
            ];
            localStorage.setItem(
                'workouts',
                JSON.stringify([
                    { ...savedBeforeGroups(makeWorkout({ steps: [] })), id: 'workout-1', steps },
                ])
            );

            expect(allSteps(createStore().workouts()[0])).toEqual([
                { ...reps(10, 'Step-up'), eachSide: true },
                { ...work(30, 'Side plank'), eachSide: true },
                rest(10),
                reps(5),
            ]);
        });

        it("keeps the sets of a step whose sets vary, and drops any that don't fit (BLD-11)", () => {
            const pyramid = [{ reps: 12, weight: 40 }, { reps: 10, weight: 45 }, { reps: 8 }];
            const group = (rounds: number, step: object) => ({
                kind: 'group',
                rounds,
                restSeconds: 60,
                steps: [step],
            });
            const blocks = [
                group(3, { ...reps(12, 'Leg press'), weight: 40, sets: pyramid }),
                group(2, { ...work(30, 'Plank'), sets: [{ seconds: 30 }, { seconds: 45 }] }),
                // Too few for its rounds, a broken set, none on a rest, and one round
                group(4, { ...reps(12, 'Leg press'), sets: pyramid }),
                group(3, { ...reps(12, 'Leg press'), sets: [...pyramid.slice(0, 2), { reps: 0 }] }),
                group(2, { ...rest(30), sets: [{ seconds: 30 }, { seconds: 45 }] }),
                group(1, { ...reps(12, 'Leg press'), sets: [{ reps: 12 }] }),
            ];
            localStorage.setItem(
                'workouts',
                JSON.stringify([{ ...makeWorkout(), id: 'workout-1', updatedAt: 1, blocks }])
            );

            expect(allSteps(createStore().workouts()[0])).toEqual([
                { ...reps(12, 'Leg press'), weight: 40, sets: pyramid },
                { ...work(30, 'Plank'), sets: [{ seconds: 30 }, { seconds: 45 }] },
                reps(12, 'Leg press'),
                reps(12, 'Leg press'),
                rest(30),
                reps(12, 'Leg press'),
            ]);
        });

        it('drops a broken heading, keeping the workout', () => {
            const group = { kind: 'group', rounds: 1, restSeconds: 0, steps: [reps(5)] };
            const headings = ['', '  ', 42, 'x'.repeat(41), '  Warmup  '].map((text) => ({
                kind: 'heading',
                text,
            }));
            localStorage.setItem(
                'workouts',
                JSON.stringify([
                    {
                        ...makeWorkout(),
                        id: 'workout-1',
                        updatedAt: 1,
                        blocks: [...headings, group],
                    },
                ])
            );

            expect(createStore().workouts()[0].blocks).toEqual([
                { kind: 'heading', text: 'Warmup' },
                group,
            ]);
        });

        it('loads rep steps, and drops workouts with broken ones', () => {
            const valid: Workout = {
                ...makeWorkout({ steps: [work(30), reps(20, 'Push-ups'), rest(10)] }),
                id: 'workout-1',
                updatedAt: 1,
            };
            const allReps: Workout = {
                ...makeWorkout({ steps: [reps(5)] }),
                id: 'workout-2',
                updatedAt: 1,
            };
            const broken = [
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-3',
                    updatedAt: 1,
                    steps: [reps(0)],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-4',
                    updatedAt: 1,
                    steps: [reps(101)],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-5',
                    updatedAt: 1,
                    steps: [{ kind: 'reps', seconds: 30, name: '' }],
                },
                {
                    ...savedBeforeGroups(makeWorkout()),
                    id: 'workout-6',
                    updatedAt: 1,
                    steps: [{ kind: 'reps', reps: 2.5, name: '' }],
                },
            ];
            localStorage.setItem('workouts', JSON.stringify([valid, allReps, ...broken]));

            expect(createStore().workouts()).toEqual([valid, allReps]);
        });

        it("loads a rep step's weight, if it has one, and drops workouts with a broken one", () => {
            const weighted: Workout = {
                ...makeWorkout({
                    steps: [{ kind: 'reps', reps: 10, name: 'Squats', weight: 20.412 }, reps(5)],
                }),
                id: 'workout-1',
                updatedAt: 1,
            };
            const broken = [0, -5, 300.5, '60'].map((weight, i) => ({
                ...savedBeforeGroups(makeWorkout()),
                id: i + 2,
                steps: [{ kind: 'reps', reps: 10, name: '', weight }],
            }));
            localStorage.setItem('workouts', JSON.stringify([weighted, ...broken]));

            expect(createStore().workouts()).toEqual([weighted]);
        });

        it("keeps each step's kind, length and name, in order", () => {
            const circuit: Workout = {
                ...makeWorkout({ steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20)] }),
                id: 'workout-1',
                updatedAt: 1,
            };
            localStorage.setItem('workouts', JSON.stringify([circuit]));

            expect(createStore().workouts()).toEqual([circuit]);
        });

        describe('workouts saved before steps', () => {
            const old = (overrides: Record<string, unknown> = {}) => ({
                id: 'workout-1',
                updatedAt: 1,
                title: 'Old',
                timerMinutes: 1,
                timerSeconds: 5,
                restMinutes: 0,
                restSeconds: 20,
                repeats: 4,
                isTimerActive: false,
                isRestActive: false,
                isComplete: false,
                ...overrides,
            });
            const load = (saved: unknown[]) => {
                localStorage.setItem('workouts', JSON.stringify(saved));
                return createStore().workouts();
            };

            it('become a work step and a rest step', () => {
                expect(load([old()])).toEqual([
                    {
                        id: 'workout-1',
                        updatedAt: 1,
                        title: 'Old',
                        blocks: asOneGroup([work(65), rest(20)]),
                        repeats: 4,
                    },
                ]);
            });

            it('have no rest step when there was no rest', () => {
                expect(allSteps(load([old({ restSeconds: 0 })])[0])).toEqual([work(65)]);
            });

            it('are saved in the new format the next time anything changes', () => {
                const store = (load([old()]), TestBed.inject(WorkoutStore));

                store.addWorkout(makeWorkout());

                expect(savedWorkouts()[0]).toEqual({
                    id: 'workout-1',
                    updatedAt: 1,
                    title: 'Old',
                    blocks: asOneGroup([work(65), rest(20)]),
                    repeats: 4,
                });
            });

            it('are dropped when broken', () => {
                const broken = [
                    old({ timerSeconds: 60 }),
                    old({ restSeconds: -1 }),
                    old({ timerMinutes: 1.5 }),
                    old({ timerMinutes: 0, timerSeconds: 0 }),
                    old({ restMinutes: undefined }),
                ];

                expect(load(broken)).toEqual([]);
            });
        });

        it('keeps a workout that runs until stopped (repeats 0)', () => {
            const untilStopped: Workout = {
                ...makeWorkout(),
                id: 'workout-1',
                updatedAt: 1,
                repeats: 0,
            };
            localStorage.setItem('workouts', JSON.stringify([untilStopped]));

            expect(createStore().workouts()).toEqual([untilStopped]);
        });

        it('keeps a time limit with rounds until stopped, and drops one that is broken', () => {
            const saved = (id: string, repeats: number, timeLimitSeconds: unknown) => ({
                ...makeWorkout(),
                id,
                updatedAt: 1,
                repeats,
                timeLimitSeconds,
            });
            localStorage.setItem(
                'workouts',
                JSON.stringify([
                    saved('amrap', 0, 1200),
                    saved('zero', 0, 0),
                    saved('too-long', 0, 100 * 60),
                    saved('with-rounds', 3, 1200),
                ])
            );

            const workouts = createStore().workouts();
            expect(workouts.map((w) => [w.id, w.timeLimitSeconds])).toEqual([
                ['amrap', 1200],
                ['zero', undefined],
                ['too-long', undefined],
                ['with-rounds', undefined],
            ]);
            expect('timeLimitSeconds' in workouts[1]).toBe(false);
        });

        it('keeps a favourite, and drops anything else saved there', () => {
            const saved = (id: string, favourite: unknown) => ({
                ...makeWorkout(),
                id,
                updatedAt: 1,
                favourite,
            });
            localStorage.setItem(
                'workouts',
                JSON.stringify([saved('yes', true), saved('odd', 'yes'), saved('no', false)])
            );

            const workouts = createStore().workouts();
            expect(workouts.map((w) => w.favourite)).toEqual([true, undefined, undefined]);
            expect('favourite' in workouts[1]).toBe(false);
        });
    });

    describe('ready-made workouts (LIB-6)', () => {
        it('loads them on demand, to start and plan by id alongside yours', async () => {
            const store = createStore();
            const mine = store.addWorkout(makeWorkout({ title: 'Mine' }));
            await store.loadReadyMade();

            expect(store.readyMade().length).toBeGreaterThan(10);
            expect(store.allWorkouts()[0]).toBe(mine);
            expect(store.findAnyWorkout('builtin:gym-legs')?.title).toBe('Gym legs');
            // Not yours, so it can't be changed or deleted
            expect(store.findWorkoutById('builtin:gym-legs')).toBeNull();
            expect(store.workouts()).toEqual([mine]);
        });

        it('makes one a favourite as a record of its own, not a workout of yours', async () => {
            const store = createStore();
            await store.loadReadyMade();

            store.setFavourite('builtin:gym-legs', true);

            expect(store.findAnyWorkout('builtin:gym-legs')?.favourite).toBe(true);
            expect(store.workouts()).toEqual([]);
            expect(JSON.parse(localStorage.getItem('ready-made-favourites')!)).toEqual([
                { id: 'builtin:gym-legs', updatedAt: expect.any(Number) },
            ]);

            store.setFavourite('builtin:gym-legs', false);

            expect(store.findAnyWorkout('builtin:gym-legs')?.favourite).toBeUndefined();
            expect(
                TestBed.inject(DeletionStore).deletedAt('ready-made-favourite', 'builtin:gym-legs')
            ).toBeGreaterThan(0);
        });

        it('makes a copy of one, "(copy)", as a workout of your own', async () => {
            const store = createStore();
            await store.loadReadyMade();

            const copy = store.copyWorkout('builtin:gym-legs')!;

            expect(copy.title).toBe('Gym legs (copy)');
            expect(copy.id).not.toBe('builtin:gym-legs');
            expect(store.workouts()).toEqual([copy]);
            expect(allSteps(copy)).toEqual(allSteps(store.findAnyWorkout('builtin:gym-legs')!));
            expect(store.copyWorkout('builtin:nothing')).toBeNull();
        });

        it('makes a copy of one of yours too, keeping both, the copy no favourite', () => {
            const store = createStore();
            const legs = store.addWorkout(makeWorkout({ title: 'Legs', steps: [reps(10)] }));
            store.setFavourite(legs.id, true);

            const copy = store.copyWorkout(legs.id)!;

            expect(store.workouts().map((w) => w.title)).toEqual(['Legs', 'Legs (copy)']);
            expect(copy.id).not.toBe(legs.id);
            expect(allSteps(copy)).toEqual(allSteps(store.findWorkoutById(legs.id)!));
            expect(copy.blocks).not.toBe(store.findWorkoutById(legs.id)!.blocks);
            expect(copy.favourite).toBeUndefined();
        });

        it("doesn't load them until asked, as they bring the built-in exercises", async () => {
            const store = createStore();
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(store.readyMade()).toEqual([]);
            await store.loadReadyMade();
            expect(store.readyMade().length).toBeGreaterThan(10);
        });

        it('carries on a run of one after a reload, loading them itself', async () => {
            const store = createStore();
            await store.loadReadyMade();
            store.setActiveWorkout(store.findAnyWorkout('builtin:gym-legs')!);

            TestBed.resetTestingModule();
            const reloaded = createStore();
            expect(reloaded.activeWorkout()).toBeNull();

            // Wherever the reload was, as the run bar shows on every page
            await vi.waitFor(() => expect(reloaded.activeWorkout()?.id).toBe('builtin:gym-legs'));
        });

        it("keeps a rep step's reps and weight for next time, as a record of its own", async () => {
            const store = createStore();
            await store.loadReadyMade();
            store.setActiveWorkout(store.findAnyWorkout('builtin:gym-legs')!);
            const deadlift = allSteps(store.activeWorkout()!)[1] as RepStep;

            store.updateActiveStep(1, { ...deadlift, reps: 8, weight: 60 });

            expect(allSteps(store.findAnyWorkout('builtin:gym-legs')!)[1]).toEqual({
                ...deadlift,
                reps: 8,
                weight: 60,
            });
            expect(store.workouts()).toEqual([]);
            expect(JSON.parse(localStorage.getItem('ready-made-changes')!)).toEqual([
                {
                    id: 'builtin:gym-legs',
                    updatedAt: expect.any(Number),
                    steps: [{ step: 1, exerciseId: deadlift.exerciseId, reps: 8, weight: 60 }],
                },
            ]);

            // Back as it came, there's nothing to keep
            store.updateActiveStep(1, deadlift);

            expect(allSteps(store.findAnyWorkout('builtin:gym-legs')!)[1]).toEqual(deadlift);
            expect(JSON.parse(localStorage.getItem('ready-made-changes')!)).toEqual([]);
            expect(
                TestBed.inject(DeletionStore).deletedAt('ready-made-change', 'builtin:gym-legs')
            ).toBeGreaterThan(0);
        });

        it("doesn't keep another exercise in a step, which takes a copy", async () => {
            const store = createStore();
            await store.loadReadyMade();
            store.setActiveWorkout(store.findAnyWorkout('builtin:gym-legs')!);
            const deadlift = allSteps(store.activeWorkout()!)[1] as RepStep;

            store.updateActiveStep(1, {
                ...deadlift,
                name: 'Good morning',
                exerciseId: 'builtin:good-morning',
            });

            expect(allSteps(store.activeWorkout()!)[1].name).toBe('Good morning');
            expect(allSteps(store.findAnyWorkout('builtin:gym-legs')!)[1]).toEqual(deadlift);
            expect(localStorage.getItem('ready-made-changes')).toBeNull();
        });

        it("doesn't save a change of name made mid-run", async () => {
            const store = createStore();
            await store.loadReadyMade();
            store.setActiveWorkout(store.findAnyWorkout('builtin:gym-legs')!);
            const first = allSteps(store.activeWorkout()!)[0];

            store.updateActiveStep(0, { ...first, name: 'Changed' } as typeof first);

            expect(allSteps(store.activeWorkout()!)[0].name).toBe('Changed');
            expect(allSteps(store.findAnyWorkout('builtin:gym-legs')!)[0].name).not.toBe('Changed');
            expect(store.workouts()).toEqual([]);
        });
    });

    describe('setFavourite', () => {
        it('marks a workout as a favourite, and not, dated as a change that syncs', () => {
            const store = createStore();
            const added = store.addWorkout(makeWorkout());

            store.setFavourite(added.id, true);
            const favourite = store.findWorkoutById(added.id)!;
            expect(favourite.favourite).toBe(true);
            expect(favourite.updatedAt).toBeGreaterThan(added.updatedAt);
            expect(savedWorkouts()[0].favourite).toBe(true);

            store.setFavourite(added.id, false);
            const not = store.findWorkoutById(added.id)!;
            expect('favourite' in not).toBe(false);
            expect(not.updatedAt).toBeGreaterThan(favourite.updatedAt);
        });

        it("changes nothing when it's already so", () => {
            const store = createStore();
            const added = store.addWorkout(makeWorkout());

            store.setFavourite(added.id, false);

            expect(store.findWorkoutById(added.id)).toBe(added);
        });

        it('stays a favourite when edited in Create', () => {
            const store = createStore();
            const added = store.addWorkout(makeWorkout());
            store.setFavourite(added.id, true);

            const edited = store.updateWorkout(added.id, makeWorkout({ title: 'Renamed' }))!;

            expect(edited.title).toBe('Renamed');
            expect(edited.favourite).toBe(true);
        });
    });

    describe('active workout across page loads', () => {
        beforeEach(() => sessionStorage.clear());
        afterEach(() => sessionStorage.clear());

        it('remembers the active workout for this tab', () => {
            const store = createStore();
            const workout = store.addWorkout(makeWorkout());

            store.setActiveWorkout(workout);

            expect(sessionStorage.getItem('activeWorkoutId')).toBe(String(workout.id));
        });

        it('restores the active workout when the app loads', () => {
            const saved: Workout = {
                ...makeWorkout({ title: 'Saved' }),
                id: 'workout-3',
                updatedAt: 1,
            };
            localStorage.setItem('workouts', JSON.stringify([saved]));
            sessionStorage.setItem('activeWorkoutId', 'workout-3');

            expect(createStore().activeWorkout()).toEqual(saved);
        });

        describe('swaps (RUN-11)', () => {
            const original = { kind: 'work' as const, seconds: 30, name: 'Plank' };
            const swap = {
                step: 0,
                from: 2,
                original,
                swapped: { ...original, name: 'Wall sit', exerciseId: 'builtin:wall-sit' },
            };

            it("keeps the run's swaps across a reload, and forgets them when it stops", () => {
                const store = createStore();
                store.setActiveWorkout(store.addWorkout(makeWorkout()));
                store.swapActiveStep(swap);

                TestBed.resetTestingModule();
                const reloaded = createStore();
                expect(reloaded.activeSwaps()).toEqual([swap]);

                reloaded.stop();
                expect(reloaded.activeSwaps()).toEqual([]);
                expect(sessionStorage.getItem('activeSwaps')).toBeNull();
            });

            it('starts a new run with none', () => {
                const store = createStore();
                const workout = store.addWorkout(makeWorkout());
                store.setActiveWorkout(workout);
                store.swapActiveStep(swap);

                store.setActiveWorkout(workout);

                expect(store.activeSwaps()).toEqual([]);
            });

            it('leaves out saved swaps that are broken', () => {
                const store = createStore();
                store.setActiveWorkout(store.addWorkout(makeWorkout()));
                sessionStorage.setItem(
                    'activeSwaps',
                    JSON.stringify([swap, { ...swap, step: -1 }, { ...swap, swapped: {} }])
                );

                TestBed.resetTestingModule();

                expect(createStore().activeSwaps()).toEqual([swap]);
            });
        });

        it('has no active workout when the remembered one no longer exists', () => {
            sessionStorage.setItem('activeWorkoutId', 'workout-3');

            expect(createStore().activeWorkout()).toBeNull();
            expect(createStore().activeWorkoutStartedAt()).toBeNull();
        });

        it('records and remembers when the active workout was started', () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);
            const store = createStore();
            const workout = store.addWorkout(makeWorkout());

            store.setActiveWorkout(workout);

            expect(store.activeWorkoutStartedAt()).toBe(now);
            expect(sessionStorage.getItem('activeWorkoutStartedAt')).toBe(String(now));
        });

        it('restarts the clock when a workout is started again', () => {
            const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1000);
            const store = createStore();
            const workout = store.addWorkout(makeWorkout());
            store.setActiveWorkout(workout);

            dateNow.mockReturnValue(5000);
            store.setActiveWorkout(workout);

            expect(store.activeWorkoutStartedAt()).toBe(5000);
        });

        it('restores the start time when the app loads', () => {
            localStorage.setItem(
                'workouts',
                JSON.stringify([{ ...makeWorkout(), id: 'workout-3', updatedAt: 1 }])
            );
            sessionStorage.setItem('activeWorkoutId', 'workout-3');
            sessionStorage.setItem('activeWorkoutStartedAt', String(Date.now() - 42000));

            const startedAt = createStore().activeWorkoutStartedAt()!;

            expect(Date.now() - startedAt).toBeGreaterThanOrEqual(42000);
            expect(Date.now() - startedAt).toBeLessThan(43000);
        });

        for (const [label, saved] of [
            ['missing', null],
            ['not a number', 'soon'],
            ['in the future', String(2000000060000)],
        ] as const) {
            it(`starts the restored workout now when the saved start time is ${label}`, () => {
                vi.spyOn(Date, 'now').mockReturnValue(2000000000000);
                localStorage.setItem(
                    'workouts',
                    JSON.stringify([{ ...makeWorkout(), id: 'workout-3', updatedAt: 1 }])
                );
                sessionStorage.setItem('activeWorkoutId', 'workout-3');
                if (saved !== null) {
                    sessionStorage.setItem('activeWorkoutStartedAt', saved);
                }

                expect(createStore().activeWorkoutStartedAt()).toBe(2000000000000);
            });
        }
    });

    describe('addWorkout', () => {
        it('gives a new workout a random id, dates it, and saves it', () => {
            vi.spyOn(Date, 'now').mockReturnValue(5000);
            const store = createStore();

            const workout = store.addWorkout(makeWorkout());

            expect(workout.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(workout.updatedAt).toBe(5000);
            expect(store.workouts()).toEqual([workout]);
            expect(savedWorkouts()).toEqual([workout]);
        });

        it('never gives two workouts the same id', () => {
            const store = createStore();
            const ids = Array.from({ length: 20 }, () => store.addWorkout(makeWorkout()).id);

            expect(new Set(ids).size).toBe(20);
        });
    });

    describe('linking steps to exercises', () => {
        it('links named work steps by name when a workout is saved, making your own as needed', () => {
            const store = createStore();

            const workout = store.addWorkout(
                makeWorkout({
                    steps: [
                        reps(10, 'Squats'),
                        rest(60, 'Breathe'),
                        work(30, 'Wall sit hold'),
                        reps(5),
                    ],
                })
            );

            const mine = TestBed.inject(ExerciseStore).own();
            expect(mine.map((e) => [e.name, e.measuredBy])).toEqual([['Wall sit hold', 'timed']]);
            expect(allSteps(workout).map((s) => s.exerciseId)).toEqual([
                'builtin:back-squat',
                undefined,
                mine[0].id,
                undefined,
            ]);
            expect(allSteps(savedWorkouts()[0])[0].exerciseId).toBe('builtin:back-squat');
        });

        it('links again when a workout is edited, so a renamed step follows its name', () => {
            const store = createStore();
            const workout = store.addWorkout(makeWorkout({ steps: [reps(10, 'Squats')] }));

            const updated = store.updateWorkout(
                workout.id,
                makeWorkout({ steps: [reps(10, 'Push-ups')] })
            );

            expect(allSteps(updated!)[0].exerciseId).toBe('builtin:push-up');
        });

        it('keeps the exercise picked for a step, whatever its name', () => {
            const workout = createStore().addWorkout(
                makeWorkout({
                    steps: [{ ...reps(10, 'Squats'), exerciseId: 'builtin:front-squat' }],
                })
            );

            expect(allSteps(workout)[0].exerciseId).toBe('builtin:front-squat');
        });

        it('gives the steps of a renamed exercise its new name, in every workout and the one running', () => {
            const store = createStore();
            const mine = TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
            const first = store.addWorkout(
                makeWorkout({ steps: [reps(10, 'sled push'), rest(30), reps(5, 'Squats')] })
            );
            const other = store.addWorkout(makeWorkout({ steps: [reps(8, 'Push-ups')] }));
            store.setActiveWorkout(first);
            vi.spyOn(Date, 'now').mockReturnValue(first.updatedAt + 5);

            store.renameExerciseSteps(mine.id, 'Sled drag');

            const [renamed, untouched] = store.workouts();
            expect(allSteps(renamed).map((s) => s.name)).toEqual(['Sled drag', '', 'Squats']);
            expect(renamed.updatedAt).toBe(first.updatedAt + 5);
            expect(untouched).toEqual(other);
            expect(allSteps(store.activeWorkout()!)[0].name).toBe('Sled drag');
            expect(allSteps(savedWorkouts()[0])[0].name).toBe('Sled drag');
        });

        it("keeps a saved step's link when loading", () => {
            const saved = {
                ...baseWorkout({
                    steps: [{ ...reps(10, 'Squats'), exerciseId: 'builtin:back-squat' }],
                }),
            };
            localStorage.setItem('workouts', JSON.stringify([saved]));

            expect(allSteps(createStore().workouts()[0])[0].exerciseId).toBe('builtin:back-squat');
        });
    });

    describe('updateWorkout', () => {
        it('replaces the workout, keeps its id, dates the change, and saves', () => {
            const store = createStore();
            const original = store.addWorkout(makeWorkout({ title: 'Before' }));
            vi.spyOn(Date, 'now').mockReturnValue(original.updatedAt + 1000);

            const updated = store.updateWorkout(
                original.id,
                makeWorkout({ title: 'After', repeats: 8 })
            );

            expect(updated).toEqual({
                ...makeWorkout({ title: 'After', repeats: 8 }),
                id: original.id,
                updatedAt: original.updatedAt + 1000,
            });
            expect(store.workouts()).toEqual([updated!]);
            expect(savedWorkouts()).toEqual([updated!]);
        });

        it('returns null and changes nothing when the workout does not exist', () => {
            const store = createStore();
            const existing = store.addWorkout(makeWorkout());

            expect(store.updateWorkout('workout-99', makeWorkout({ title: 'Ghost' }))).toBeNull();
            expect(store.workouts()).toEqual([existing]);
        });
    });

    describe('deleteWorkout', () => {
        it('removes only the matching workout and saves', () => {
            const store = createStore();
            const keep = store.addWorkout(makeWorkout({ title: 'Keep' }));
            const remove = store.addWorkout(makeWorkout({ title: 'Remove' }));

            store.deleteWorkout(remove.id);

            expect(store.workouts()).toEqual([keep]);
            expect(savedWorkouts()).toEqual([keep]);
        });

        it('leaves a deletion behind, dated, so it can reach other copies', () => {
            const store = createStore();
            const workout = store.addWorkout(makeWorkout());
            vi.spyOn(Date, 'now').mockReturnValue(workout.updatedAt + 9000);

            store.deleteWorkout(workout.id);

            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([
                { kind: 'workout', id: workout.id, deletedAt: workout.updatedAt + 9000 },
            ]);
        });

        it('dates the deletion after the workout, even if its clock was ahead then', () => {
            const store = createStore();
            vi.spyOn(Date, 'now').mockReturnValue(5_000_000);
            const workout = store.addWorkout(makeWorkout());
            // The clock's been put right since
            vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

            store.deleteWorkout(workout.id);

            expect(store.workouts()).toEqual([]);
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([
                { kind: 'workout', id: workout.id, deletedAt: 5_000_001 },
            ]);
        });

        it('puts one back where it was on restore, e.g. on Undo, forgetting its deletion', () => {
            const store = createStore();
            const first = store.addWorkout(makeWorkout({ title: 'First' }));
            const middle = store.addWorkout(makeWorkout({ title: 'Middle' }));
            const last = store.addWorkout(makeWorkout({ title: 'Last' }));
            store.deleteWorkout(middle.id);

            const deletedAt = JSON.parse(localStorage.getItem('deleted')!)[0].deletedAt;

            store.restoreWorkout(middle, 1);

            // Dated after its deletion, which may have reached other devices already
            const restored = store.workouts()[1];
            expect(restored.updatedAt).toBeGreaterThan(deletedAt);
            expect(store.workouts()).toEqual([
                first,
                { ...middle, updatedAt: restored.updatedAt },
                last,
            ]);
            expect(savedWorkouts()).toEqual(store.workouts());
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([]);
        });

        it('restores a workout only once', () => {
            const store = createStore();
            const workout = store.addWorkout(makeWorkout());
            store.deleteWorkout(workout.id);

            store.restoreWorkout(workout, 0);
            store.restoreWorkout(workout, 0);

            expect(store.workouts().map((restored) => restored.id)).toEqual([workout.id]);
        });
    });

    describe('mergeLibraryOrder', () => {
        const saveLibrary = (ids: string[], movedAt?: number) => {
            localStorage.setItem(
                'workouts',
                JSON.stringify(ids.map((id) => baseWorkout({ id, title: id })))
            );
            if (movedAt !== undefined) {
                localStorage.setItem('library-moved-at', String(movedAt));
            }
        };
        const ids = (store: WorkoutStore) => store.workouts().map((workout) => workout.id);

        it("takes an order moved more recently, with workouts it doesn't list after it", () => {
            saveLibrary(['a', 'b', 'c', 'new-here'], 100);
            const store = createStore();

            expect(store.mergeLibraryOrder({ ids: ['c', 'gone', 'a', 'b'], updatedAt: 200 })).toBe(
                true
            );

            expect(ids(store)).toEqual(['c', 'a', 'b', 'new-here']);
            expect(savedWorkouts().map((workout) => workout.id)).toEqual(ids(store));
            expect(store.libraryOrder().updatedAt).toBe(200);
            expect(localStorage.getItem('library-moved-at')).toBe('200');
        });

        it('keeps the order here when it was moved more recently, or at the same time', () => {
            saveLibrary(['a', 'b'], 200);
            const store = createStore();

            expect(store.mergeLibraryOrder({ ids: ['b', 'a'], updatedAt: 200 })).toBe(false);
            expect(store.mergeLibraryOrder({ ids: ['b', 'a'], updatedAt: 100 })).toBe(false);

            expect(ids(store)).toEqual(['a', 'b']);
        });

        it('takes any moved order over one never moved', () => {
            saveLibrary(['a', 'b']);
            const store = createStore();

            store.mergeLibraryOrder({ ids: ['b', 'a'], updatedAt: 1 });

            expect(ids(store)).toEqual(['b', 'a']);
        });
    });

    describe('mergeWorkouts', () => {
        const saved = (overrides: Partial<SimpleWorkout>) => baseWorkout(overrides);

        it('adds new workouts, keeps their ids, and takes the newer of the same workout', () => {
            localStorage.setItem(
                'workouts',
                JSON.stringify([
                    saved({ id: 'a', title: 'Old here', updatedAt: 100 }),
                    saved({ id: 'b', title: 'New here', updatedAt: 300 }),
                ])
            );
            const store = createStore();

            const result = store.mergeWorkouts(
                [
                    saved({ id: 'a', title: 'New there', updatedAt: 200 }),
                    saved({ id: 'b', title: 'Old there', updatedAt: 200 }),
                    saved({ id: 'c', title: 'Only there', updatedAt: 200 }),
                ],
                []
            );

            expect(result).toEqual({ added: 1, updated: 1, removed: 0 });
            expect(store.workouts().map((t) => [t.id, t.title])).toEqual([
                ['a', 'New there'],
                ['b', 'New here'],
                ['c', 'Only there'],
            ]);
            expect(savedWorkouts().map((t) => t.id)).toEqual(['a', 'b', 'c']);
        });

        it('removes a workout deleted there since it changed here, and remembers that', () => {
            localStorage.setItem(
                'workouts',
                JSON.stringify([
                    saved({ id: 'a', updatedAt: 100 }),
                    saved({ id: 'b', updatedAt: 500 }),
                ])
            );
            const store = createStore();

            const result = store.mergeWorkouts(
                [],
                [
                    { kind: 'workout', id: 'a', deletedAt: 200 },
                    { kind: 'workout', id: 'b', deletedAt: 200 },
                ]
            );

            expect(result.removed).toBe(1);
            // b changed here after it was deleted there, so it stays
            expect(store.workouts().map((t) => t.id)).toEqual(['b']);
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([
                { kind: 'workout', id: 'a', deletedAt: 200 },
            ]);
        });

        it("doesn't bring back a workout deleted here, unless it changed there after", () => {
            const store = createStore();
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            const workout = store.addWorkout(makeWorkout({ title: 'Gone' }));
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            store.deleteWorkout(workout.id);

            store.mergeWorkouts([{ ...workout, updatedAt: 1000 }], []);
            expect(store.workouts()).toEqual([]);

            store.mergeWorkouts([{ ...workout, title: 'Changed', updatedAt: 3000 }], []);
            expect(store.workouts().map((t) => t.title)).toEqual(['Changed']);
        });
    });

    describe('findWorkoutById', () => {
        it('returns the matching workout, or null when there is none', () => {
            const store = createStore();
            const workout = store.addWorkout(makeWorkout());

            expect(store.findWorkoutById(workout.id)).toEqual(workout);
            expect(store.findWorkoutById('workout-42')).toBeNull();
        });
    });

    describe('setActiveWorkout', () => {
        it('sets the active workout, which starts out empty', () => {
            const store = createStore();
            const workout = store.addWorkout(makeWorkout());
            expect(store.activeWorkout()).toBeNull();

            store.setActiveWorkout(workout);

            expect(store.activeWorkout()).toEqual(workout);
        });
    });

    describe('pause, resume and stop', () => {
        beforeEach(() => {
            sessionStorage.clear();
            vi.useFakeTimers({ now: 1_000_000 });
        });
        afterEach(() => {
            vi.useRealTimers();
            sessionStorage.clear();
        });

        function startWorkout() {
            const store = createStore();
            store.setActiveWorkout(store.addWorkout(makeWorkout()));
            return store;
        }

        it('records and remembers when the workout was paused', () => {
            const store = startWorkout();
            vi.advanceTimersByTime(5000);

            store.pause();

            expect(store.isPaused()).toBe(true);
            expect(store.activeWorkoutPausedAt()).toBe(1_005_000);
            expect(sessionStorage.getItem('activeWorkoutPausedAt')).toBe('1005000');
        });

        it('keeps the first pause time if paused twice', () => {
            const store = startWorkout();
            store.pause();
            vi.advanceTimersByTime(3000);

            store.pause();

            expect(store.activeWorkoutPausedAt()).toBe(1_000_000);
        });

        it('does nothing when paused with no active workout', () => {
            const store = createStore();

            store.pause();

            expect(store.isPaused()).toBe(false);
            expect(sessionStorage.getItem('activeWorkoutPausedAt')).toBeNull();
        });

        it('moves the start time forward by the time spent paused when resumed', () => {
            const store = startWorkout();
            vi.advanceTimersByTime(5000);
            store.pause();
            vi.advanceTimersByTime(60000);

            store.resume();

            expect(store.isPaused()).toBe(false);
            // 5s had run before the pause, and still has
            expect(Date.now() - store.activeWorkoutStartedAt()!).toBe(5000);
            expect(sessionStorage.getItem('activeWorkoutStartedAt')).toBe(
                String(store.activeWorkoutStartedAt())
            );
            expect(sessionStorage.getItem('activeWorkoutPausedAt')).toBeNull();
        });

        it('does nothing when resumed while running', () => {
            const store = startWorkout();
            vi.advanceTimersByTime(5000);

            store.resume();

            expect(store.activeWorkoutStartedAt()).toBe(1_000_000);
        });

        it('starts unpaused when a workout is made active', () => {
            const store = startWorkout();
            store.pause();

            store.setActiveWorkout(store.addWorkout(makeWorkout({ title: 'Next' })));

            expect(store.isPaused()).toBe(false);
            expect(sessionStorage.getItem('activeWorkoutPausedAt')).toBeNull();
        });

        it('stays paused after the app reloads', () => {
            startWorkout().pause();
            vi.advanceTimersByTime(30000);
            TestBed.resetTestingModule();

            const store = createStore();

            expect(store.isPaused()).toBe(true);
            expect(store.activeWorkoutPausedAt()).toBe(1_000_000);
        });

        for (const [label, saved] of [
            ['before the start time', '999999'],
            ['in the future', '9999999999999'],
            ['not a number', 'soon'],
        ]) {
            it(`runs rather than staying paused when the saved pause time is ${label}`, () => {
                startWorkout();
                sessionStorage.setItem('activeWorkoutPausedAt', saved);
                TestBed.resetTestingModule();

                expect(createStore().isPaused()).toBe(false);
            });
        }

        it('clears the active workout, its times and what was saved for the tab when stopped', () => {
            const store = startWorkout();
            store.pause();

            store.stop();

            expect(store.activeWorkout()).toBeNull();
            expect(store.activeWorkoutStartedAt()).toBeNull();
            expect(store.isPaused()).toBe(false);
            expect(sessionStorage.getItem('activeWorkoutId')).toBeNull();
            expect(sessionStorage.getItem('activeWorkoutStartedAt')).toBeNull();
            expect(store.activeRunStartedAt()).toBeNull();
            expect(sessionStorage.getItem('activeRunStartedAt')).toBeNull();
            expect(sessionStorage.getItem('activeWorkoutPausedAt')).toBeNull();
        });

        it('remembers when the run really began, which resuming does not move', () => {
            const store = startWorkout();
            vi.advanceTimersByTime(5000);
            store.pause();
            vi.advanceTimersByTime(60000);
            store.resume();

            expect(store.activeRunStartedAt()).toBe(1_000_000);
            expect(store.activeWorkoutStartedAt()).toBe(1_060_000);
            expect(sessionStorage.getItem('activeRunStartedAt')).toBe('1000000');
        });

        it('restores when the run began after the app reloads', () => {
            startWorkout().pause();
            vi.advanceTimersByTime(30000);
            TestBed.resetTestingModule();

            expect(createStore().activeRunStartedAt()).toBe(1_000_000);
        });

        it('falls back to the start time for a run saved before this was remembered', () => {
            startWorkout();
            sessionStorage.removeItem('activeRunStartedAt');
            TestBed.resetTestingModule();

            expect(createStore().activeRunStartedAt()).toBe(1_000_000);
        });

        it('keeps the saved workouts when stopped', () => {
            const store = startWorkout();

            store.stop();

            expect(store.workouts()).toHaveLength(1);
            expect(savedWorkouts()).toHaveLength(1);
        });
    });

    describe('rep steps', () => {
        beforeEach(() => {
            sessionStorage.clear();
            vi.useFakeTimers({ now: 1_000_000 });
        });
        afterEach(() => {
            vi.useRealTimers();
            sessionStorage.clear();
        });

        function startWorkout() {
            const store = createStore();
            store.setActiveWorkout(store.addWorkout(makeWorkout({ steps: [work(10), reps(20)] })));
            return store;
        }

        it('moves the start on by the time the rep step took, and counts it done', () => {
            const store = startWorkout();
            vi.advanceTimersByTime(40_000); // 10s of work, then 30s of push-ups

            store.finishRepStep(30_000, SET);

            expect(store.activeWorkoutStartedAt()).toBe(1_030_000);
            expect(store.activeRepStepsDone()).toBe(1);
            expect(store.activeRepMs()).toBe(30_000);
            expect(store.activeRunStartedAt()).toBe(1_000_000);
        });

        it('remembers them across a refresh', () => {
            const store = startWorkout();
            vi.advanceTimersByTime(40_000);
            store.finishRepStep(30_000, SET);

            TestBed.resetTestingModule();
            const reloaded = createStore();

            expect(reloaded.activeWorkoutStartedAt()).toBe(1_030_000);
            expect(reloaded.activeRepStepsDone()).toBe(1);
            expect(reloaded.activeRepMs()).toBe(30_000);
            expect(reloaded.activeSets()).toEqual([SET]);
        });

        it('logs each set done, in order', () => {
            const store = startWorkout();
            const heavier = { ...SET, round: 1, weight: 62.5 };

            store.finishRepStep(1000, SET);
            store.finishRepStep(1000, heavier);

            expect(store.activeSets()).toEqual([SET, heavier]);
        });

        it('drops broken saved sets after a refresh, keeping the rest', () => {
            startWorkout();
            sessionStorage.setItem(
                'activeSets',
                JSON.stringify([SET, { ...SET, reps: 0 }, { ...SET, weight: 'heavy' }])
            );

            TestBed.resetTestingModule();

            expect(createStore().activeSets()).toEqual([SET]);
        });

        it('treats a missing or broken saved count as none done', () => {
            startWorkout();
            sessionStorage.setItem('activeRepStepsDone', 'lots');
            sessionStorage.setItem('activeRepMs', '-5');

            TestBed.resetTestingModule();
            const reloaded = createStore();

            expect(reloaded.activeRepStepsDone()).toBe(0);
            expect(reloaded.activeRepMs()).toBe(0);
        });

        it('carries on running when Done is pressed while paused', () => {
            const store = startWorkout();
            vi.advanceTimersByTime(15_000);
            store.pause();
            vi.advanceTimersByTime(60_000);

            store.finishRepStep(5_000, SET);

            expect(store.isPaused()).toBe(false);
            // 60s paused, then 5s on the rep step
            expect(store.activeWorkoutStartedAt()).toBe(1_065_000);
        });

        it('starts again from none done for a new run, or after stopping', () => {
            const store = startWorkout();
            store.finishRepStep(1000, SET);

            store.setActiveWorkout(store.workouts()[0]);
            expect(store.activeRepStepsDone()).toBe(0);
            expect(store.activeRepMs()).toBe(0);

            store.finishRepStep(1000, SET);
            store.stop();
            expect(store.activeRepStepsDone()).toBe(0);
            expect(sessionStorage.getItem('activeRepStepsDone')).toBeNull();
            expect(sessionStorage.getItem('activeRepMs')).toBeNull();
            expect(store.activeSets()).toEqual([]);
            expect(sessionStorage.getItem('activeSets')).toBeNull();
        });

        it('does nothing with no active workout', () => {
            const store = createStore();

            store.finishRepStep(1000, SET);

            expect(store.activeRepStepsDone()).toBe(0);
        });

        describe('skipping a step (RUN-12)', () => {
            const SKIP = { round: 0, stepIndex: 0, skippedMs: 6000 };

            it('moves the start back by the time left, which comes off the time off the clock', () => {
                const store = startWorkout();
                vi.advanceTimersByTime(4000);

                store.skipStep(SKIP);

                expect(store.activeWorkoutStartedAt()).toBe(994_000);
                expect(store.activeSkips()).toEqual([SKIP]);
                store.finishRepStep(30_000, SET);
                expect(store.activeOffClockMs()).toBe(24_000);
                expect(store.activeRunStartedAt()).toBe(1_000_000);
            });

            it('remembers them across a refresh, dropping broken ones', () => {
                const store = startWorkout();
                store.skipStep(SKIP);
                const saved = JSON.parse(sessionStorage.getItem('activeSkips')!);
                sessionStorage.setItem(
                    'activeSkips',
                    JSON.stringify([...saved, { ...SKIP, skippedMs: -5 }, 'skip'])
                );

                TestBed.resetTestingModule();
                const reloaded = createStore();

                expect(reloaded.activeWorkoutStartedAt()).toBe(994_000);
                expect(reloaded.activeSkips()).toEqual([SKIP]);
                expect(reloaded.activeOffClockMs()).toBe(-6000);
            });

            it('carries on running when skipped while paused', () => {
                const store = startWorkout();
                vi.advanceTimersByTime(4000);
                store.pause();
                vi.advanceTimersByTime(60_000);

                store.skipStep(SKIP);

                expect(store.isPaused()).toBe(false);
                // 60s paused, then 6s skipped
                expect(store.activeWorkoutStartedAt()).toBe(1_054_000);
            });

            it('starts again from none skipped for a new run, or after stopping', () => {
                const store = startWorkout();
                store.skipStep(SKIP);

                store.setActiveWorkout(store.workouts()[0]);
                expect(store.activeSkips()).toEqual([]);

                store.skipStep(SKIP);
                store.stop();
                expect(store.activeSkips()).toEqual([]);
                expect(sessionStorage.getItem('activeSkips')).toBeNull();
            });
        });

        it('changes a step of the running workout, and of the saved one', () => {
            const store = startWorkout();
            const heavier = { kind: 'reps' as const, reps: 12, name: '', weight: 60 };

            store.updateActiveStep(1, heavier);

            expect(allSteps(store.activeWorkout()!)).toEqual([work(10), heavier]);
            expect(allSteps(store.workouts()[0])).toEqual([work(10), heavier]);
            expect(allSteps(JSON.parse(localStorage.getItem('workouts')!)[0])[1]).toEqual(heavier);
        });

        it('changes only the running workout once the saved one has gone', () => {
            const store = startWorkout();
            store.deleteWorkout(store.activeWorkout()!.id);

            store.updateActiveStep(1, reps(12));

            expect(allSteps(store.activeWorkout()!)[1]).toEqual(reps(12));
            expect(store.workouts()).toEqual([]);
        });
    });
});
