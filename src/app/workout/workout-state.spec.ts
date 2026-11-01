import { isTimedSet, RepSet, TimedSet } from '../models/history';
import {
    Block,
    placedHeadings,
    RepStep,
    runPlan,
    Step,
    UNTIL_STOPPED,
    withEachRepSet,
    withRepSet,
    workoutSeconds,
} from '../models/workout';
import { makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import { nextRepStep, placeAt, setsDone, stepsIntoRound, workoutStateAt } from './workout-state';

describe('workoutStateAt', () => {
    const workout = makeWorkout(); // 30s work, 10s rest, 3 rounds = 30 + 10 + 30 + 10 + 30 = 110s

    it('starts at the full work time on the first round', () => {
        expect(workoutStateAt(workout, 0)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 30,
            phaseSeconds: 30,
            roundsLeft: 3,
            round: 0,
            phaseElapsedMs: 0,
        });
    });

    it('only counts whole seconds', () => {
        expect(workoutStateAt(workout, 999).remainingSeconds).toBe(30);
        expect(workoutStateAt(workout, 1000).remainingSeconds).toBe(29);
    });

    it('moves to rest the moment work runs out', () => {
        expect(workoutStateAt(workout, 29_999).phase).toBe('work');
        expect(workoutStateAt(workout, 30_000)).toEqual({
            phase: 'rest',
            step: rest(10),
            stepIndex: 1,
            remainingSeconds: 10,
            phaseSeconds: 10,
            roundsLeft: 3,
            round: 0,
            phaseElapsedMs: 0,
        });
    });

    it('starts the next round the moment rest runs out', () => {
        expect(workoutStateAt(workout, 40_000)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 30,
            phaseSeconds: 30,
            roundsLeft: 2,
            round: 1,
            phaseElapsedMs: 0,
        });
    });

    it('has no rest after the last round and completes at the total time', () => {
        expect(workoutStateAt(workout, 109_999)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 1,
            phaseSeconds: 30,
            roundsLeft: 1,
            round: 2,
            phaseElapsedMs: 29_999,
        });
        expect(workoutStateAt(workout, 110_000)).toEqual({
            phase: 'complete',
            step: null,
            stepIndex: 0,
            remainingSeconds: 0,
            phaseSeconds: 0,
            roundsLeft: 0,
            round: 3,
            phaseElapsedMs: 0,
        });
    });

    it('stays complete long after the end', () => {
        expect(workoutStateAt(workout, 24 * 60 * 60 * 1000).phase).toBe('complete');
    });

    it('skips rest when the rest time is zero', () => {
        const noRest = makeWorkout({ restSeconds: 0, repeats: 2 });

        expect(workoutStateAt(noRest, 30_000)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 30,
            phaseSeconds: 30,
            roundsLeft: 1,
            round: 1,
            phaseElapsedMs: 0,
        });
        expect(workoutStateAt(noRest, 60_000).phase).toBe('complete');
    });

    it('handles minutes as well as seconds', () => {
        const long = makeWorkout({
            workMinutes: 2,
            workSeconds: 5,
            restMinutes: 1,
            restSeconds: 0,
            repeats: 2,
        });

        expect(workoutStateAt(long, 125_000)).toEqual({
            phase: 'rest',
            step: rest(60),
            stepIndex: 1,
            remainingSeconds: 60,
            phaseSeconds: 60,
            roundsLeft: 2,
            round: 0,
            phaseElapsedMs: 0,
        });
    });

    it('reports exactly how far into the current phase it is, to the millisecond', () => {
        expect(workoutStateAt(workout, 12_345).phaseElapsedMs).toBe(12_345);
        expect(workoutStateAt(workout, 33_500).phaseElapsedMs).toBe(3_500);
        expect(workoutStateAt(workout, 52_250).phaseElapsedMs).toBe(12_250);
    });

    it('treats a start time in the future as not started yet', () => {
        expect(workoutStateAt(workout, -5000).remainingSeconds).toBe(30);
    });

    describe('until stopped', () => {
        const forever = makeWorkout({ repeats: UNTIL_STOPPED }); // 30s work, 10s rest, round after round

        it('never finishes', () => {
            const aDayIn = 24 * 60 * 60 * 1000;

            expect(workoutStateAt(forever, aDayIn).phase).not.toBe('complete');
        });

        it('keeps counting rounds, with no end in sight', () => {
            // 1000 rounds of 40s, then 5s into the next work phase
            const state = workoutStateAt(forever, 1000 * 40_000 + 5000);

            expect(state.phase).toBe('work');
            expect(state.round).toBe(1000);
            expect(state.roundsLeft).toBe(Infinity);
            expect(state.remainingSeconds).toBe(25);
        });

        it('rests after every round', () => {
            expect(workoutStateAt(forever, 999 * 40_000 + 30_000).phase).toBe('rest');
        });

        it('still works with no rest', () => {
            const state = workoutStateAt(
                makeWorkout({ repeats: UNTIL_STOPPED, restSeconds: 0 }),
                95_000
            );

            expect(state.round).toBe(3);
            expect(state.remainingSeconds).toBe(25);
        });
    });

    describe('several steps', () => {
        // Squats 30s, Plank 45s, rest 20s, Lunges 15s, rest 60s; 2 rounds
        const circuit = makeWorkout({
            steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20), work(15, 'Lunges'), rest(60)],
            repeats: 2,
        });

        it('runs the steps in order, each for its own time', () => {
            const at = (s: number) => workoutStateAt(circuit, s * 1000);

            expect(at(0).step).toEqual(work(30, 'Squats'));
            expect(at(29).step?.name).toBe('Squats');
            expect(at(30)).toMatchObject({
                step: work(45, 'Plank'),
                stepIndex: 1,
                remainingSeconds: 45,
            });
            expect(at(75)).toMatchObject({ phase: 'rest', stepIndex: 2, remainingSeconds: 20 });
            expect(at(95)).toMatchObject({ step: work(15, 'Lunges'), stepIndex: 3 });
            expect(at(110)).toMatchObject({ phase: 'rest', stepIndex: 4, remainingSeconds: 60 });
        });

        it('starts the next round from the first step', () => {
            expect(workoutStateAt(circuit, 170_000)).toMatchObject({
                step: work(30, 'Squats'),
                stepIndex: 0,
                round: 1,
                roundsLeft: 1,
            });
        });

        it('reports how far into the current step it is', () => {
            expect(workoutStateAt(circuit, 31_500).phaseElapsedMs).toBe(1_500);
            expect(workoutStateAt(circuit, 170_000 + 80_250).phaseElapsedMs).toBe(5_250);
        });

        it('skips the rest at the end of the last round', () => {
            // Round 2 starts at 170s; its Lunges end at 170 + 110 = 280s
            expect(workoutStateAt(circuit, 279_999).step?.name).toBe('Lunges');
            expect(workoutStateAt(circuit, 280_000).phase).toBe('complete');
        });

        it('skips every rest step at the end of the last round, not just one', () => {
            const twoRests = makeWorkout({ steps: [work(10), rest(5), rest(5)], repeats: 2 });

            expect(workoutStateAt(twoRests, 29_999).phase).toBe('work');
            expect(workoutStateAt(twoRests, 30_000).phase).toBe('complete');
        });

        it('keeps rest at the start of a round', () => {
            const warmUp = makeWorkout({ steps: [rest(5, 'Get ready'), work(10)], repeats: 2 });

            expect(workoutStateAt(warmUp, 15_000).step).toEqual(rest(5, 'Get ready'));
            expect(workoutStateAt(warmUp, 30_000).phase).toBe('complete');
        });

        it('runs back-to-back work steps as separate steps', () => {
            const twoWork = makeWorkout({ steps: [work(10, 'A'), work(10, 'B')], repeats: 1 });

            expect(workoutStateAt(twoWork, 10_000)).toMatchObject({
                phase: 'work',
                stepIndex: 1,
                phaseElapsedMs: 0,
            });
        });
    });

    describe('rep steps', () => {
        // 10s work, 20 push-ups, 5s rest; 2 rounds
        const circuit = makeWorkout({
            steps: [work(10), reps(20, 'Push-ups'), rest(5)],
            repeats: 2,
        });

        it('waits on a rep step once the clock reaches it, however long it runs', () => {
            for (const at of [10_000, 11_500, 600_000]) {
                expect(workoutStateAt(circuit, at, 0)).toEqual({
                    phase: 'reps',
                    step: reps(20, 'Push-ups'),
                    stepIndex: 1,
                    remainingSeconds: 0,
                    phaseSeconds: 0,
                    roundsLeft: 2,
                    round: 0,
                    phaseElapsedMs: at - 10_000,
                });
            }
        });

        it('carries on from where the rep step began once it is done', () => {
            expect(workoutStateAt(circuit, 10_000, 1)).toMatchObject({
                phase: 'rest',
                stepIndex: 2,
                remainingSeconds: 5,
                phaseElapsedMs: 0,
            });
            expect(workoutStateAt(circuit, 15_000, 1)).toMatchObject({
                phase: 'work',
                round: 1,
                stepIndex: 0,
            });
        });

        it("waits on the next round's rep step in turn", () => {
            expect(workoutStateAt(circuit, 25_000, 1)).toMatchObject({
                phase: 'reps',
                round: 1,
                stepIndex: 1,
                roundsLeft: 1,
            });
            // Last round: its rest is skipped, so Done finishes the workout
            expect(workoutStateAt(circuit, 25_000, 2).phase).toBe('complete');
        });

        it('finishes only after a rep step at the very end is done', () => {
            const finisher = makeWorkout({ steps: [work(10), reps(10)], repeats: 1 });

            expect(workoutStateAt(finisher, 60_000, 0).phase).toBe('reps');
            expect(workoutStateAt(finisher, 10_000, 1).phase).toBe('complete');
        });

        it('runs a round of only rep steps, with no countdown at all', () => {
            const allReps = makeWorkout({ steps: [reps(10, 'A'), reps(5, 'B')], repeats: 2 });

            expect(workoutStateAt(allReps, 0, 0)).toMatchObject({ phase: 'reps', stepIndex: 0 });
            expect(workoutStateAt(allReps, 0, 1)).toMatchObject({ phase: 'reps', stepIndex: 1 });
            expect(workoutStateAt(allReps, 0, 3)).toMatchObject({ round: 1, stepIndex: 1 });
            expect(workoutStateAt(allReps, 0, 4).phase).toBe('complete');
        });

        it('keeps going until stopped', () => {
            const forever = makeWorkout({ steps: [reps(10), work(5)], repeats: UNTIL_STOPPED });

            expect(workoutStateAt(forever, 50_000, 10)).toMatchObject({
                phase: 'reps',
                round: 10,
                roundsLeft: Infinity,
            });
        });

        it('finds the next rep step to do, and where it falls on the clock', () => {
            expect(nextRepStep(circuit, 0)).toEqual({ round: 0, stepIndex: 1, atMs: 10_000 });
            expect(nextRepStep(circuit, 1)).toEqual({ round: 1, stepIndex: 1, atMs: 25_000 });
            expect(nextRepStep(circuit, 2)).toBeNull();
            expect(nextRepStep(makeWorkout(), 0)).toBeNull();
        });
    });
});

describe('setsDone', () => {
    const plank: Step = { kind: 'work', seconds: 45, name: 'Plank', exerciseId: 'builtin:plank' };
    const pushUp: RepSet = { round: 0, step: 1, name: 'Push-ups', reps: 20 };
    // 45s plank, push-ups, 15s rest, an unnamed 10s work step; 2 rounds
    const workout = makeWorkout({
        steps: [plank, reps(20, 'Push-ups'), rest(15), work(10)],
        repeats: 2,
    });
    const timed = (round: number): TimedSet => ({
        round,
        step: 0,
        name: 'Plank',
        seconds: 45,
        exerciseId: 'builtin:plank',
    });

    it('logs a timed step of an exercise once it has run to its end', () => {
        expect(setsDone(workout, workoutStateAt(workout, 44_999), [])).toEqual([]);
        expect(setsDone(workout, workoutStateAt(workout, 45_000), [])).toEqual([timed(0)]);
    });

    it('puts the timed sets among the rep sets, in the order they were done', () => {
        const pushUps = [pushUp, { ...pushUp, round: 1 }];
        const complete = workoutStateAt(workout, 1_000_000, 2);

        expect(complete.phase).toBe('complete');
        expect(setsDone(workout, complete, pushUps)).toEqual([
            timed(0),
            pushUps[0],
            timed(1),
            pushUps[1],
        ]);
    });

    it('leaves out rest and unnamed steps, which are no exercise', () => {
        const unnamed = makeWorkout({ steps: [work(30)], repeats: 2 });

        expect(setsDone(unnamed, workoutStateAt(unnamed, 100_000), [])).toEqual([]);
    });
});

describe('a time limit', () => {
    // 30s work, 10s rest, as many rounds as fit in 100s: two full rounds, then 20s of work
    const amrap = makeWorkout({ timeLimitSeconds: 100 });

    it('runs rounds on, counting up, with no rounds left to count', () => {
        const state = workoutStateAt(amrap, 85_000);
        expect(state.phase).toBe('work');
        expect(state.round).toBe(2);
        expect(state.roundsLeft).toBe(Infinity);
        expect(state.remainingSeconds).toBe(25);
    });

    it("is complete when time's up, part-way through a step, which isn't done", () => {
        const state = workoutStateAt(amrap, 100_000);
        expect(state.phase).toBe('complete');
        expect(state.step).toBeNull();
        expect(state.round).toBe(2);
        expect(state.stepIndex).toBe(0);
        expect(stepsIntoRound(amrap, state)).toBe(0);
        expect(workoutStateAt(amrap, 99_999).phase).toBe('work');
    });

    it('counts a round time ran out at the end of as done', () => {
        const state = workoutStateAt(makeWorkout({ timeLimitSeconds: 80 }), 80_000);
        expect(state.phase).toBe('complete');
        expect(state.round).toBe(2);
        expect(state.stepIndex).toBe(0);
    });

    describe('with rep steps, whose time counts too', () => {
        // 10s work, 20 reps, 5s rest, as many rounds as fit in 60s
        const circuit = makeWorkout({ steps: [work(10), reps(20), rest(5)], timeLimitSeconds: 60 });

        it('counts the time on rep steps done towards it', () => {
            // One round's rep step took 30s: 15s of clock + 30s of reps, so 15s are left
            expect(workoutStateAt(circuit, 15_000, 1, 30_000).phase).toBe('work');
            expect(workoutStateAt(circuit, 29_999, 1, 30_000).phase).toBe('reps');
            const state = workoutStateAt(circuit, 30_000, 1, 30_000);
            expect(state.phase).toBe('complete');
            // Waiting on round 2's rep step when time ran out: the work before it was done
            expect(state.round).toBe(1);
            expect(state.stepIndex).toBe(1);
            expect(stepsIntoRound(circuit, state)).toBe(1);
        });

        it('runs out while a rep step is waited on', () => {
            // The first rep step started at 10s and is still going at 60s
            expect(workoutStateAt(circuit, 59_999).phase).toBe('reps');
            const state = workoutStateAt(circuit, 60_000);
            expect(state.phase).toBe('complete');
            expect(state.round).toBe(0);
            expect(state.stepIndex).toBe(1);
        });
    });

    it('logs the timed sets before the step time ran out in, and not that one', () => {
        const plank = {
            kind: 'work' as const,
            seconds: 30,
            name: 'Plank',
            exerciseId: 'builtin:plank',
        };
        const workout = makeWorkout({ steps: [plank, rest(10)], timeLimitSeconds: 100 });
        const sets = setsDone(workout, workoutStateAt(workout, 100_000), []);
        expect(sets.map((set) => set.round)).toEqual([0, 1]);
    });
});

describe('groups', () => {
    const plank = { kind: 'work' as const, seconds: 30, name: 'Plank', exerciseId: 'p' };
    const legPress = { kind: 'reps' as const, reps: 10, name: 'Leg press', exerciseId: 'l' };
    // 5:00 bike, then leg press 3 × 10 with 1:00 between sets, then plank 2 × 0:30 with 0:20
    const blocks: Block[] = [
        { kind: 'heading', text: 'Warmup' },
        { kind: 'group', rounds: 1, restSeconds: 0, steps: [work(300, 'Bike')] },
        { kind: 'heading', text: 'Legs' },
        { kind: 'group', rounds: 3, restSeconds: 60, steps: [legPress] },
        { kind: 'group', rounds: 2, restSeconds: 20, steps: [plank] },
    ];
    const workout = { ...makeWorkout({ repeats: 1 }), blocks };

    it("runs each group's rounds with its rest after each, the last included", () => {
        expect(runPlan(workout).steps).toEqual([
            work(300, 'Bike'),
            legPress,
            rest(60),
            legPress,
            rest(60),
            legPress,
            rest(60),
            plank,
            rest(20),
            plank,
            rest(20),
        ]);
    });

    it('rests after the last set before the next exercise, unless a rest comes next', () => {
        const restNext = {
            blocks: [
                { kind: 'group', rounds: 2, restSeconds: 60, steps: [legPress] },
                { kind: 'heading', text: 'Core' },
                { kind: 'group', rounds: 1, restSeconds: 0, steps: [rest(90)] },
                { kind: 'group', rounds: 1, restSeconds: 30, steps: [plank] },
            ] satisfies Block[],
        };

        expect(runPlan(restNext).steps).toEqual([legPress, rest(60), legPress, rest(90), plank]);
    });

    it('knows where each step comes from: its step of the workout, and which set', () => {
        expect(runPlan(workout).places).toEqual([
            { step: 0, set: 0 },
            { step: 1, set: 0 },
            null,
            { step: 1, set: 1 },
            null,
            { step: 1, set: 2 },
            null,
            { step: 2, set: 0 },
            null,
            { step: 2, set: 1 },
            null,
        ]);
        expect(placeAt(workout, 3)).toEqual({ step: 1, set: 1 });
        expect(placeAt(workout, 11)).toBeNull();
    });

    it('waits on each set of reps, and counts the rests between them down', () => {
        // The bike's 5:00 is done, so it waits on the first set
        expect(workoutStateAt(workout, 300_000)).toEqual(
            expect.objectContaining({ phase: 'reps', step: legPress, stepIndex: 1 })
        );
        // One set done: its rest
        expect(workoutStateAt(workout, 300_000, 1)).toEqual(
            expect.objectContaining({ phase: 'rest', stepIndex: 2, remainingSeconds: 60 })
        );
        expect(workoutStateAt(workout, 360_000, 1)).toEqual(
            expect.objectContaining({ phase: 'reps', stepIndex: 3 })
        );
    });

    it("finishes on the workout's last set, with no rest after it", () => {
        // 5:00 + 3 × 1:00 + 0:30 + 0:20 + 0:30
        expect(workoutSeconds(workout)).toBe(300 + 180 + 80);
        expect(workoutStateAt(workout, 559_999, 3).phase).toBe('work');
        expect(workoutStateAt(workout, 560_000, 3).phase).toBe('complete');
    });

    it('counts the rest after a set as part of that set', () => {
        const { sets } = runPlan(workout);

        expect(sets.map(({ set, of }) => `${set + 1}/${of}`)).toEqual([
            '1/1',
            '1/3',
            '1/3',
            '2/3',
            '2/3',
            '3/3',
            '3/3',
            '1/2',
            '1/2',
            '2/2',
            '2/2',
        ]);
    });

    it('logs which set each was, and by its step of the workout', () => {
        const legSets: RepSet[] = [0, 1, 2].map((set) => ({
            round: 0,
            step: 1,
            ...(set === 0 ? {} : { set }),
            name: 'Leg press',
            reps: 10,
            exerciseId: 'l',
        }));
        const timed = (set: number): TimedSet => ({
            round: 0,
            step: 2,
            ...(set === 0 ? {} : { set }),
            name: 'Plank',
            seconds: 30,
            exerciseId: 'p',
        });
        const done = workoutStateAt(workout, 560_000, 3);
        // Out of order, as the summary may leave them, they come back in the order they ran
        expect(setsDone(workout, done, [legSets[2], legSets[0], legSets[1]])).toEqual([
            ...legSets,
            timed(0),
            timed(1),
        ]);
    });

    it('knows the heading and exercise each step is part of (RUN-10)', () => {
        const sections = runPlan(workout).sections;

        expect(runPlan(workout).exercises).toBe(3);
        expect(sections.map(({ heading, exercise }) => `${heading} ${exercise}`)).toEqual([
            'Warmup 1',
            'Legs 2',
            'Legs 2',
            'Legs 2',
            'Legs 2',
            'Legs 2',
            'Legs 2',
            'Legs 3',
            'Legs 3',
            'Legs 3',
            'Legs 3',
        ]);
        // Each exercise starts once, on its first set, not on the sets or rests after it
        expect(sections.map((section) => section.starts)).toEqual([
            true,
            true,
            false,
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            false,
        ]);
    });

    it("doesn't count rest steps as exercises, and has no heading before the first", () => {
        const plan = runPlan({
            blocks: [
                { kind: 'group', rounds: 1, restSeconds: 0, steps: [rest(30)] },
                { kind: 'group', rounds: 1, restSeconds: 0, steps: [reps(10, 'Squats')] },
                { kind: 'group', rounds: 1, restSeconds: 0, steps: [rest(30)] },
                { kind: 'heading', text: 'Core' },
                { kind: 'group', rounds: 1, restSeconds: 0, steps: [work(30, 'Plank')] },
            ],
        });

        expect(plan.exercises).toBe(2);
        // A rest is part of the exercise before it, or the first before any
        expect(plan.sections).toEqual([
            { heading: null, exercise: 1, starts: false },
            { heading: null, exercise: 1, starts: true },
            { heading: null, exercise: 1, starts: false },
            { heading: 'Core', exercise: 2, starts: true },
        ]);
    });

    it('places each heading before the number of the step after it', () => {
        expect(placedHeadings(workout)).toEqual([
            { text: 'Warmup', step: 0 },
            { text: 'Legs', step: 1 },
        ]);
    });

    it('repeats the whole workout, groups and all, each round', () => {
        const twice = { ...workout, repeats: 2 };
        // Round 1 ends with the plank's last rest, which the last round skips
        expect(workoutStateAt(twice, 560_000, 3)).toEqual(
            expect.objectContaining({ phase: 'rest', remainingSeconds: 20, round: 0 })
        );
        // Round 2 starts on the bike once it's over
        expect(workoutStateAt(twice, 580_000, 3)).toEqual(
            expect.objectContaining({ phase: 'work', step: work(300, 'Bike'), round: 1 })
        );
    });
});

describe('supersets (BLD-12)', () => {
    const bench = reps(10, 'Bench');
    const row = reps(10, 'Row');
    const superset = (...steps: Step[]) => ({
        ...makeWorkout({ repeats: 1 }),
        blocks: [{ kind: 'group', rounds: 3, restSeconds: 60, steps }] as Block[],
    });

    it('runs its steps in turn each round, then the rest, the last round included', () => {
        expect(runPlan(superset(bench, row)).steps).toEqual([
            bench,
            row,
            rest(60),
            bench,
            row,
            rest(60),
            bench,
            row,
            rest(60),
        ]);
    });

    it('is named by how many exercises it has, rest steps aside', () => {
        const groupOf = (...steps: Step[]) => runPlan(superset(...steps)).sets[0].group;

        expect(groupOf(bench)).toBe('exercise');
        expect(groupOf(bench, rest(15))).toBe('exercise');
        expect(groupOf(bench, rest(15), row)).toBe('superset');
        expect(groupOf(bench, row, reps(8, 'Press'))).toBe('giant set');
    });
});

describe('each side (BLD-10)', () => {
    const stepUp = { ...reps(10, 'Step-up'), eachSide: true as const };
    const sidePlank = {
        ...work(30, 'Side plank'),
        exerciseId: 'builtin:side-plank',
        eachSide: true as const,
    };
    const blocks: Block[] = [
        { kind: 'group', rounds: 2, restSeconds: 45, steps: [stepUp] },
        { kind: 'group', rounds: 1, restSeconds: 0, steps: [sidePlank] },
    ];
    const workout = (sides?: { first: 'left' | 'right'; switchSeconds: number }) => ({
        ...makeWorkout({ repeats: 1 }),
        blocks,
        ...(sides ? { sides } : {}),
    });

    it('runs both sides each set, left first, with Switch sides only for a timed step', () => {
        const plan = runPlan(workout());

        expect(plan.steps).toEqual([
            stepUp,
            stepUp,
            rest(45),
            stepUp,
            stepUp,
            rest(45),
            sidePlank,
            rest(5, 'Switch sides'),
            sidePlank,
        ]);
        expect(
            plan.places.map((place) => place && `${place.step}${place.set}${place.side}`)
        ).toEqual([
            '00left',
            '00right',
            null,
            '01left',
            '01right',
            null,
            '10left',
            null,
            '10right',
        ]);
    });

    it('starts with the side, and switches for as long, as the run says', () => {
        const plan = runPlan(workout({ first: 'right', switchSeconds: 0 }));

        expect(plan.places.slice(6).map((place) => place?.side ?? null)).toEqual(['right', 'left']);
        // Switch sides off: straight from one side to the other
        expect(plan.steps.slice(6)).toEqual([sidePlank, sidePlank]);
    });

    it('waits on each side of a rep step, and logs each with its side', () => {
        const running = workout();
        const leftDone: RepSet = { round: 0, step: 0, side: 'left', name: 'Step-up', reps: 10 };
        // The left side done: on to the right, with no rest between
        expect(workoutStateAt(running, 0, 1)).toEqual(
            expect.objectContaining({ phase: 'reps', stepIndex: 1 })
        );
        expect(placeAt(running, 1)).toEqual({ step: 0, set: 0, side: 'right' });

        // All four sides done, then the plank: 2 × 0:45 + 0:30 + 0:05 + 0:30
        const done = workoutStateAt(running, 155_000, 4);
        expect(done.phase).toBe('complete');
        const sets = setsDone(running, done, [leftDone]);
        expect(sets.filter((set) => set.step === 1).map((set) => set.side)).toEqual([
            'left',
            'right',
        ]);
    });
});

describe('vary each set (BLD-11)', () => {
    const plank: Step = {
        kind: 'work',
        seconds: 30,
        name: 'Plank',
        exerciseId: 'builtin:plank',
        sets: [{ seconds: 30 }, { seconds: 45 }, { seconds: 60 }],
    };
    const legPress: Step = {
        kind: 'reps',
        reps: 12,
        weight: 40,
        name: 'Leg press',
        eachSide: true,
        sets: [{ reps: 12, weight: 40 }, { reps: 10, weight: 45 }, { reps: 8 }],
    };
    const running = {
        ...makeWorkout({ repeats: 1 }),
        blocks: [
            { kind: 'group', rounds: 3, restSeconds: 30, steps: [plank] },
            { kind: 'group', rounds: 3, restSeconds: 60, steps: [legPress] },
        ] satisfies Block[],
    };

    it('runs each set with its own time, or reps and weight, and both sides alike', () => {
        const { steps } = runPlan(running);
        const { sets: _plankSets, ...plankSet } = plank;
        const { sets: _legSets, weight: _weight, ...legSet } = legPress as RepStep;

        expect(steps.slice(0, 6)).toEqual([
            { ...plankSet, seconds: 30 },
            rest(30),
            { ...plankSet, seconds: 45 },
            rest(30),
            { ...plankSet, seconds: 60 },
            rest(30),
        ]);
        expect(steps.slice(6)).toEqual([
            { ...legSet, reps: 12, weight: 40 },
            { ...legSet, reps: 12, weight: 40 },
            rest(60),
            { ...legSet, reps: 10, weight: 45 },
            { ...legSet, reps: 10, weight: 45 },
            rest(60),
            // No weight on set 3: none, rather than set 1's
            { ...legSet, reps: 8 },
            { ...legSet, reps: 8 },
            rest(60),
        ]);
    });

    it('counts down each set for its own time, and logs it so', () => {
        // 0:30 + 0:30 rest + 0:45 + 0:30 rest = 2:15 in, the third set has just begun
        expect(workoutStateAt(running, 135_000)).toEqual(
            expect.objectContaining({ phase: 'work', stepIndex: 4, remainingSeconds: 60 })
        );

        // Then 1:00, its rest, and 0:30 after it
        const atLegPress = workoutStateAt(running, 225_000);
        expect(atLegPress.phase).toBe('reps');
        expect(
            setsDone(running, atLegPress, [])
                .filter((set) => isTimedSet(set))
                .map((set) => (set as TimedSet).seconds)
        ).toEqual([30, 45, 60]);
    });
});

describe('a step with one set changed (BLD-11)', () => {
    const equal: RepStep = { kind: 'reps', reps: 10, weight: 40, name: 'Squat', eachSide: true };
    const varied: RepStep = {
        ...equal,
        reps: 12,
        sets: [
            { reps: 12, weight: 40 },
            { reps: 10, weight: 45 },
            { reps: 8, weight: 50 },
        ],
    };

    it('changes every set of a step whose sets are alike, keeping the rest of it', () => {
        expect(withRepSet(equal, 1, { reps: 10, weight: 45 })).toEqual({ ...equal, weight: 45 });
        expect(withRepSet(equal, 1, { reps: 8 })).toEqual({
            kind: 'reps',
            reps: 8,
            name: 'Squat',
            eachSide: true,
        });
    });

    it('changes just the one set of a step whose sets vary, and the step itself for set 1', () => {
        expect(withRepSet(varied, 1, { reps: 10, weight: 47.5 }).sets).toEqual([
            { reps: 12, weight: 40 },
            { reps: 10, weight: 47.5 },
            { reps: 8, weight: 50 },
        ]);
        expect(withRepSet(varied, 1, { reps: 10, weight: 47.5 })).toEqual(
            expect.objectContaining({ reps: 12, weight: 40 })
        );
        expect(withRepSet(varied, 0, { reps: 15 })).toEqual(
            expect.objectContaining({
                reps: 15,
                sets: [{ reps: 15 }, varied.sets![1], varied.sets![2]],
            })
        );
        expect(withRepSet(varied, 0, { reps: 15 }).weight).toBeUndefined();
    });

    it('changes each set alike, keeping their shape', () => {
        const up = (amount: { reps: number; weight?: number }) => ({
            ...amount,
            weight: (amount.weight ?? 0) + 2.5,
        });

        expect(withEachRepSet(varied, up).sets!.map((set) => set.weight)).toEqual([
            42.5, 47.5, 52.5,
        ]);
        expect(withEachRepSet(varied, up).weight).toBe(42.5);
        expect(withEachRepSet(equal, up)).toEqual({ ...equal, weight: 42.5 });
    });
});

describe('setsDone with a swap (RUN-11)', () => {
    const plank: Step = { kind: 'work', seconds: 45, name: 'Plank', exerciseId: 'builtin:plank' };
    const sidePlank: Step = {
        kind: 'work',
        seconds: 45,
        name: 'Side plank',
        exerciseId: 'builtin:side-plank',
    };
    // 45s plank, 15s rest; 3 rounds. Swapped for a side plank as round 2's plank began
    const workout = makeWorkout({ steps: [plank, rest(15)], repeats: 3 });
    const swaps = [{ step: 0, from: 2, original: plank, swapped: sidePlank }];
    const running = makeWorkout({ steps: [sidePlank, rest(15)], repeats: 3 });

    it('names each timed set as the step was when it ran', () => {
        const complete = workoutStateAt(running, 1_000_000);

        expect(setsDone(running, complete, [], swaps).map((set) => set.name)).toEqual([
            'Plank',
            'Side plank',
            'Side plank',
        ]);
        expect(setsDone(workout, workoutStateAt(workout, 1_000_000), []).length).toBe(3);
    });
});
