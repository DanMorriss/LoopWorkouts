import { makeWorkout, reps, rest } from '../shared/testing/make-workout';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { MuscleGroup } from './exercise';
import { HistoryEntry, LoggedSet } from './history';
import {
    DEFAULT_WEEKLY_SETS,
    muscleBalance,
    muscleStatus,
    readWeeklySets,
    setsByMuscle,
    smallAim,
    suggestNextWorkout,
    weeklyAim,
} from './muscle-balance';
import { Step } from './workout';
import { ALL_MUSCLES } from './workout-muscles';

const byId = (id: string) => BUILT_IN_EXERCISES.find((exercise) => exercise.id === id);
const linked = (step: Step, exerciseId: string): Step => ({ ...step, exerciseId });

function entry(...exerciseIds: (string | undefined)[]): HistoryEntry {
    const sets: LoggedSet[] = exerciseIds.map((exerciseId, step) => ({
        round: 0,
        step,
        name: '',
        reps: 10,
        exerciseId,
    }));
    return {
        id: '1-w',
        workoutId: 'w',
        title: 'Workout',
        startedAt: 1,
        endedAt: 2,
        updatedAt: 2,
        activeSeconds: 1,
        roundsCompleted: 1,
        totalRounds: 1,
        outcome: 'finished',
        sets,
    };
}

describe('setsByMuscle', () => {
    it('counts 1 a set for main muscles and ½ for supporting ones', () => {
        // Back squat: quads and glutes, helped by the hamstrings, adductors and lower back
        const counts = setsByMuscle([entry('builtin:back-squat', 'builtin:back-squat')], byId);

        expect(Object.fromEntries(counts)).toEqual({
            quads: 2,
            glutes: 2,
            hamstrings: 1,
            adductors: 1,
            'lower-back': 1,
        });
    });

    it("leaves out sets with no exercise, or one that's gone", () => {
        expect(setsByMuscle([entry(undefined, 'own:deleted')], byId).size).toBe(0);
    });

    it('leaves out stretches, which ease a muscle rather than train it', () => {
        const counts = setsByMuscle(
            [entry('builtin:seated-hamstring-stretch', 'builtin:deadlift')],
            byId
        );
        // Only the deadlift's: the hamstrings are main for it
        expect(counts.get('hamstrings')).toBe(1);
    });

    it('counts a left and a right side as one set between them', () => {
        const sided = entry('builtin:back-squat', 'builtin:back-squat');
        sided.sets = sided.sets!.map((set, i) => ({
            ...set,
            step: 0,
            side: i === 0 ? 'left' : 'right',
        }));

        expect(setsByMuscle([sided], byId).get('quads')).toBe(1);
        expect(setsByMuscle([sided], byId).get('hamstrings')).toBe(0.5);
    });
});

describe('muscleStatus', () => {
    it('is under below the aim, and reached at it or past it however far', () => {
        expect([0, 9.5, 10, 20, 40].map((sets) => muscleStatus(sets, 10))).toEqual([
            'under',
            'under',
            'reached',
            'reached',
            'reached',
        ]);
    });
});

describe('weeklyAim', () => {
    it('starts at 10 sets for muscle and 6 for fitness', () => {
        expect(DEFAULT_WEEKLY_SETS).toEqual({ muscle: 10, fitness: 6 });
    });

    it('aims each muscle at the sets a week, and small muscles at about two fifths, never 0', () => {
        expect(weeklyAim('chest', 10)).toBe(10);
        expect(weeklyAim('forearms', 10)).toBe(4);
        expect(weeklyAim('obliques', 6)).toBe(2);
        expect(weeklyAim('quads', 14)).toBe(14);
        expect(weeklyAim('adductors', 14)).toBe(6);
        expect([2, 3, 30].map(smallAim)).toEqual([1, 1, 12]);
    });

    it("reads saved sets a week from 2 to 30, or the goal's otherwise", () => {
        expect(readWeeklySets(14, 'muscle')).toBe(14);
        expect(readWeeklySets(2, 'muscle')).toBe(2);
        expect(readWeeklySets(30, 'fitness')).toBe(30);
        expect(readWeeklySets(undefined, 'muscle')).toBe(10);
        expect(readWeeklySets(1, 'fitness')).toBe(6);
        expect(readWeeklySets(31, 'muscle')).toBe(10);
        expect(readWeeklySets(12.5, 'muscle')).toBe(10);
        expect(readWeeklySets('12', 'muscle')).toBe(10);
    });
});

describe('muscleBalance', () => {
    const muscle = 10;
    const small = 4;

    it('lists every muscle group, most worked first and A to Z on a tie', () => {
        const balance = muscleBalance(
            new Map([
                ['quads', 12],
                ['chest', 22],
                ['glutes', 12],
            ]),
            10
        );

        expect(balance).toHaveLength(ALL_MUSCLES.length);
        expect(balance.slice(0, 4)).toEqual([
            { muscle: 'chest', sets: 22, aim: muscle, status: 'reached' },
            { muscle: 'glutes', sets: 12, aim: muscle, status: 'reached' },
            { muscle: 'quads', sets: 12, aim: muscle, status: 'reached' },
            { muscle: 'abductors', sets: 0, aim: small, status: 'under' },
        ]);
    });

    it('judges each muscle against its own aim, lower for small muscles and fewer sets', () => {
        const counts = new Map<MuscleGroup, number>([
            ['forearms', 5],
            ['chest', 8],
        ]);
        const status = (weeklySets: number, name: MuscleGroup) =>
            muscleBalance(counts, weeklySets).find((m) => m.muscle === name)!.status;

        expect(status(10, 'forearms')).toBe('reached');
        expect(status(10, 'chest')).toBe('under');
        expect(status(6, 'forearms')).toBe('reached');
        expect(status(6, 'chest')).toBe('reached');
        // Raised, the small muscles' aim goes up too
        expect(status(14, 'forearms')).toBe('under');
    });
});

describe('suggestNextWorkout', () => {
    const legs = makeWorkout({
        id: 'legs',
        title: 'Legs',
        steps: [linked(reps(5), 'builtin:back-squat'), rest(60)],
    });
    const push = makeWorkout({
        id: 'push',
        title: 'Push',
        steps: [linked(reps(5), 'builtin:bench-press')],
    });
    const calves = makeWorkout({
        id: 'calves',
        title: 'Calves',
        steps: [linked(reps(15), 'builtin:calf-raise')],
    });

    describe('on a rest day, avoiding the next planned workout', () => {
        const goblet = makeWorkout({
            id: 'goblet',
            title: 'Goblet squats',
            steps: [linked(reps(10), 'builtin:goblet-squat')],
        });

        it("doesn't suggest the next planned workout, nor one mostly working its muscles", () => {
            // Nothing done: legs or goblet squats would be picked first, being first
            const avoid = {
                workoutIds: new Set(['legs']),
                muscles: new Set(['quads', 'glutes'] as const),
            };

            const suggested = suggestNextWorkout(
                [legs, goblet, push],
                new Map(),
                byId,
                new Map(),
                10,
                avoid
            );

            expect(suggested?.workout).toBe(push);
        });

        it('suggests one working those muscles anyway when there is nothing else', () => {
            const avoid = {
                workoutIds: new Set(['legs']),
                muscles: new Set(['quads', 'glutes'] as const),
            };

            expect(
                suggestNextWorkout([legs, goblet], new Map(), byId, new Map(), 10, avoid)?.workout
            ).toBe(goblet);
            expect(suggestNextWorkout([legs], new Map(), byId, new Map(), 10, avoid)).toBeNull();
        });
    });

    it('picks the workout for the least worked muscles, with them least first', () => {
        const counts = new Map([
            ['quads', 12],
            ['glutes', 10],
            ['chest', 3],
            ['triceps', 6],
        ] as const);

        expect(suggestNextWorkout([legs, push], counts, byId, new Map(), 10)).toEqual({
            workout: push,
            muscles: ['chest'],
        });
    });

    it('goes by how far each muscle is from its aim, which is lower for small muscles', () => {
        const grip = makeWorkout({
            id: 'grip',
            title: 'Grip',
            steps: [linked(reps(1), 'builtin:dead-hang')],
        });
        // Fewer forearm sets than chest, but the forearms have reached their aim (4) and the
        // chest is short of its (10)
        const counts = new Map<MuscleGroup, number>([
            ['forearms', 5],
            ['chest', 8],
            ['shoulders', 8],
            ['triceps', 8],
        ]);

        expect(suggestNextWorkout([grip, push], counts, byId, new Map(), 10)?.workout).toBe(push);
    });

    it('on a tie, picks the one done longest ago, and one never done before that', () => {
        const lastDone = new Map([
            ['legs', 200],
            ['push', 100],
        ]);

        expect(suggestNextWorkout([legs, push], new Map(), byId, lastDone, 10)?.workout).toBe(push);
        expect(
            suggestNextWorkout([legs, push, calves], new Map(), byId, lastDone, 10)?.workout
        ).toBe(calves);
    });

    it('is null when no workout has a step linked to an exercise', () => {
        expect(suggestNextWorkout([makeWorkout()], new Map(), byId, new Map(), 10)).toBeNull();
    });

    it('never suggests a workout of only stretches, as it trains nothing', () => {
        const stretches = makeWorkout({
            id: 'stretches',
            title: 'Stretches',
            steps: [linked(reps(5), 'builtin:worlds-greatest-stretch')],
        });
        // However far past their aims the legs workout's muscles are
        const counts = new Map<MuscleGroup, number>(ALL_MUSCLES.map((muscle) => [muscle, 30]));

        expect(suggestNextWorkout([stretches], new Map(), byId, new Map(), 10)).toBeNull();
        expect(suggestNextWorkout([legs, stretches], counts, byId, new Map(), 10)?.workout).toBe(
            legs
        );
    });
});
