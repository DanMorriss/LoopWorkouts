import { HistoryEntry, LoggedSet } from './history';
import { sinceLastTime } from './since-last-time';

const squat = (reps: number, weight?: number): LoggedSet => ({
    round: 0,
    step: 0,
    name: 'Squats',
    reps,
    ...(weight === undefined ? {} : { weight }),
    exerciseId: 'squat',
});
const pushUp = (reps: number): LoggedSet => ({
    round: 0,
    step: 1,
    name: 'Push-ups',
    reps,
    exerciseId: 'push-up',
});
const plank = (seconds: number): LoggedSet => ({
    round: 0,
    step: 2,
    name: 'Plank',
    seconds,
    exerciseId: 'plank',
});

function entry(startedAt: number, sets: LoggedSet[]): HistoryEntry {
    return {
        id: `${startedAt}-w`,
        workoutId: 'w',
        title: 'Legs',
        startedAt,
        endedAt: startedAt + 1000,
        updatedAt: startedAt + 1000,
        activeSeconds: 60,
        roundsCompleted: 1,
        totalRounds: 1,
        outcome: 'finished',
        sets,
    };
}

describe('since last time, for the workout summary', () => {
    it('leaves out an exercise done for the first time', () => {
        const today = entry(2000, [squat(10, 60), pushUp(20)]);
        const before = entry(1000, [squat(10, 55)]);

        expect(sinceLastTime(today, [today, before]).map((line) => line.exerciseId)).toEqual([
            'squat',
        ]);
    });

    it('gives a new heaviest with the best it beat, not just last time', () => {
        const today = entry(3000, [squat(10, 60), squat(8, 60)]);
        const last = entry(2000, [squat(10, 50)]);
        const best = entry(1000, [squat(5, 57.5)]);

        expect(sinceLastTime(today, [today, last, best])).toEqual([
            {
                exerciseId: 'squat',
                best: true,
                now: { weight: 60, reps: 10 },
                before: { weight: 57.5, reps: 5 },
            },
        ]);
    });

    it('counts more reps at the same weight as a best', () => {
        const today = entry(2000, [squat(12, 60)]);
        const before = entry(1000, [squat(10, 60)]);

        expect(sinceLastTime(today, [today, before])[0]).toEqual({
            exerciseId: 'squat',
            best: true,
            now: { weight: 60, reps: 12 },
            before: { weight: 60, reps: 10 },
        });
    });

    it('compares reps and holds without a weight', () => {
        const today = entry(2000, [pushUp(24), plank(45)]);
        const before = entry(1000, [pushUp(20), plank(50)]);

        expect(sinceLastTime(today, [today, before])).toEqual([
            {
                exerciseId: 'push-up',
                best: true,
                now: { reps: 24 },
                before: { reps: 20 },
            },
            // Short of the best: beside last time's
            {
                exerciseId: 'plank',
                best: false,
                now: { seconds: 45 },
                before: { seconds: 50 },
            },
        ]);
    });

    it("isn't a best for equalling one, and compares with last time, not the best", () => {
        const today = entry(3000, [squat(10, 60)]);
        const last = entry(2000, [squat(8, 55)]);
        const best = entry(1000, [squat(10, 60)]);

        expect(sinceLastTime(today, [today, last, best])[0]).toEqual({
            exerciseId: 'squat',
            best: false,
            now: { weight: 60, reps: 10 },
            before: { weight: 55, reps: 8 },
        });
    });

    it("doesn't count a later run as before", () => {
        const today = entry(1000, [squat(10, 60)]);
        const later = entry(2000, [squat(10, 80)]);

        expect(sinceLastTime(today, [later, today])).toEqual([]);
    });
});
