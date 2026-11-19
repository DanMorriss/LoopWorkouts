import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { isStretch, STRETCH_ROUTINE_ID } from './built-in-stretches';
import { HistoryEntry, LoggedSet } from './history';
import {
    MAX_ROUTINE_STRETCHES,
    ROUTINE_HOLD_SECONDS,
    ROUTINE_STRETCHES,
    routineStretches,
    setsToStretchToday,
    stretchOffer,
    stretchRoutine,
} from './stretch-routine';
import { DEFAULT_RUN_SIDES } from './workout';
import { ALL_MUSCLES } from './workout-muscles';

const byId = (id: string) => BUILT_IN_EXERCISES.find((exercise) => exercise.id === id);

/** `count` sets of the exercise, as a run logs them. */
function sets(exercise: string, count: number): LoggedSet[] {
    return Array.from({ length: count }, (_, set) => ({
        round: 0,
        step: 0,
        set,
        name: exercise,
        reps: 10,
        exerciseId: `builtin:${exercise}`,
    }));
}

const names = (logged: LoggedSet[]) => routineStretches(logged, byId).map((s) => s.name);

describe('ROUTINE_STRETCHES', () => {
    it('has a stretch for every muscle group', () => {
        const stretches = Object.keys(ROUTINE_STRETCHES).map(byId);
        for (const muscle of ALL_MUSCLES) {
            expect(
                stretches.some((stretch) => stretch?.mainMuscles.includes(muscle)),
                muscle
            ).toBe(true);
        }
    });

    it('are built-in stretches held for a time', () => {
        for (const id of Object.keys(ROUTINE_STRETCHES)) {
            expect(isStretch(id), id).toBe(true);
            expect(byId(id)?.measuredBy, id).toBe('timed');
        }
    });
});

describe('routineStretches', () => {
    it('stretches each main muscle once, with the stretch that eases most of the rest', () => {
        // Back squat: quads and glutes. Pigeon is the only stretch for glutes, and the
        // kneeling hip flexor stretch beats the standing quad stretch as it eases the glutes
        // too. The hamstrings only helped, so they aren't stretched.
        expect(names(sets('back-squat', 3))).toEqual([
            'Pigeon stretch',
            'Kneeling hip flexor stretch',
        ]);
    });

    it('stretches the muscles worked most, standing then on the floor, up to its most', () => {
        const fullBody = [
            ...sets('bench-press', 4),
            ...sets('back-squat', 3),
            ...sets('pull-up', 3),
            ...sets('overhead-press', 2),
            ...sets('dumbbell-curl', 2),
            ...sets('triceps-pushdown', 2),
            ...sets('crunch', 1),
        ];
        const stretches = routineStretches(fullBody, byId);

        expect(stretches.length).toBe(MAX_ROUTINE_STRETCHES);
        const places = stretches.map((stretch) => ROUTINE_STRETCHES[stretch.id].place);
        expect(places).toEqual([...places].sort((a, b) => b.localeCompare(a)));
        // The chest, worked most, has its stretch; the abs, worked least, don't
        expect(stretches.map((s) => s.id)).toContain('builtin:doorway-chest-stretch');
        expect(stretches.map((s) => s.id)).not.toContain('builtin:cobra-stretch');
    });

    it('counts nothing for stretches, unnamed sets or exercises that have gone', () => {
        const logged: LoggedSet[] = [
            ...sets('pigeon-stretch', 2),
            { round: 0, step: 1, name: '', reps: 10 },
            { round: 0, step: 2, name: 'Gone', reps: 10, exerciseId: 'own:gone' },
        ];

        expect(routineStretches(logged, byId)).toEqual([]);
    });
});

describe('stretchRoutine', () => {
    it('holds each stretch, each side where it is done each side, under where it is done', () => {
        const stretches = ['standing-quad-stretch', 'downward-dog'].map(
            (id) => byId(`builtin:${id}`)!
        );

        expect(stretchRoutine(stretches)).toEqual({
            id: STRETCH_ROUTINE_ID,
            updatedAt: 0,
            title: 'Cool-down stretch',
            repeats: 1,
            carryOn: true,
            blocks: [
                { kind: 'heading', text: 'Standing' },
                {
                    kind: 'group',
                    rounds: 1,
                    restSeconds: 0,
                    steps: [
                        {
                            kind: 'work',
                            seconds: ROUTINE_HOLD_SECONDS,
                            name: 'Standing quad stretch',
                            exerciseId: 'builtin:standing-quad-stretch',
                            eachSide: true,
                        },
                    ],
                },
                { kind: 'heading', text: 'On the floor' },
                {
                    kind: 'group',
                    rounds: 1,
                    restSeconds: 0,
                    steps: [
                        {
                            kind: 'work',
                            seconds: ROUTINE_HOLD_SECONDS,
                            name: 'Downward dog',
                            exerciseId: 'builtin:downward-dog',
                        },
                    ],
                },
            ],
        });
    });

    it('has no headings when every stretch is done in one place, and is null with none', () => {
        const floor = stretchRoutine([byId('builtin:childs-pose')!]);

        expect(floor?.blocks.map((block) => block.kind)).toEqual(['group']);
        expect(stretchRoutine([])).toBeNull();
    });
});

describe('stretchOffer', () => {
    it('gives the routine, the muscles it stretches of those mainly worked, and its time', () => {
        const offer = stretchOffer(sets('push-up', 3), byId, DEFAULT_RUN_SIDES)!;

        expect(offer.workout.id).toBe(STRETCH_ROUTINE_ID);
        expect(offer.muscles).toContain('Chest');
        expect(offer.time.text).toMatch(/^About \d+ min$/);
        expect(offer.time.spoken).toMatch(/^about \d+ minutes?$/);
    });

    it('is null with nothing to stretch', () => {
        expect(stretchOffer([], byId, DEFAULT_RUN_SIDES)).toBeNull();
        expect(stretchOffer(sets('childs-pose', 2), byId, DEFAULT_RUN_SIDES)).toBeNull();
    });
});

describe('setsToStretchToday', () => {
    const NOW = new Date(2026, 10, 18, 18, 0).getTime();
    const HOUR = 60 * 60 * 1000;
    function done(at: number, logged: LoggedSet[]): HistoryEntry {
        return {
            id: `run-${at}`,
            workoutId: 'w',
            title: 'W',
            startedAt: at,
            endedAt: at + 600_000,
            updatedAt: at + 600_000,
            activeSeconds: 600,
            roundsCompleted: 1,
            totalRounds: 1,
            outcome: 'finished',
            sets: logged,
        };
    }
    const squats = sets('back-squat', 2);
    const pushUps = sets('push-up', 2);
    const stretched = sets('standing-quad-stretch', 1);

    it("is today's sets since the last stretching, newest first as the history is", () => {
        const history = [
            done(NOW - 1 * HOUR, pushUps),
            done(NOW - 2 * HOUR, squats),
            done(NOW - 3 * HOUR, stretched),
            done(NOW - 4 * HOUR, sets('bench-press', 1)),
        ];

        expect(setsToStretchToday(history, NOW)).toEqual([...pushUps, ...squats]);
    });

    it("leaves out yesterday's, and is empty once stretched", () => {
        expect(setsToStretchToday([done(NOW - 20 * HOUR, squats)], NOW)).toEqual([]);
        expect(
            setsToStretchToday([done(NOW - HOUR, stretched), done(NOW - 2 * HOUR, squats)], NOW)
        ).toEqual([]);
    });
});
