import { HistoryEntry, LoggedSet } from '../models/history';

const DAY_MS = 24 * 60 * 60 * 1000;

/** One example workout: how many days ago, its title, length and sets. */
interface Example {
    daysAgo: number;
    title: string;
    minutes: number;
    sets: [name: string, exerciseId: string, reps: number, weight?: number][];
}

// Three a week or so, over twelve weeks, the last two in the last few days, so the time per
// week, the muscles this week and the log all have something in them
const PUSH: Example['sets'] = [
    ['Bench press', 'builtin:bench-press', 8, 60],
    ['Overhead press', 'builtin:overhead-press', 8, 35],
    ['Push-ups', 'builtin:push-up', 15],
];
const PULL: Example['sets'] = [
    ['Deadlift', 'builtin:deadlift', 5, 100],
    ['Barbell row', 'builtin:barbell-row', 8, 50],
    ['Pull-ups', 'builtin:pull-up', 6],
];
const LEGS: Example['sets'] = [
    ['Back squat', 'builtin:back-squat', 8, 70],
    ['Goblet squat', 'builtin:goblet-squat', 12, 20],
];

const EXAMPLES: Example[] = [
    { daysAgo: 1, title: 'Push day', minutes: 42, sets: PUSH },
    { daysAgo: 3, title: 'Legs', minutes: 38, sets: LEGS },
    { daysAgo: 6, title: 'Pull day', minutes: 45, sets: PULL },
    ...[9, 11, 13, 16, 19, 23, 26, 30, 33, 37, 40, 44, 47, 51, 54, 58, 61, 65, 68, 72, 75, 79].map(
        (daysAgo, i): Example => ({
            daysAgo,
            title: ['Push day', 'Legs', 'Pull day'][i % 3],
            minutes: 30 + ((i * 7) % 20),
            sets: [PUSH, LEGS, PULL][i % 3],
        })
    ),
];

/**
 * Example workouts for the tour's look at Progress (NAV-8), relative to `now`: shown in place
 * of an empty history, never saved. Each set is done three times.
 */
export function sampleHistory(now: number): HistoryEntry[] {
    return EXAMPLES.map(({ daysAgo, title, minutes, sets }) => {
        const startedAt = now - daysAgo * DAY_MS;
        const logged: LoggedSet[] = sets.flatMap(([name, exerciseId, reps, weight], step) =>
            [0, 1, 2].map(
                (set): LoggedSet => ({
                    round: 0,
                    step,
                    set,
                    name,
                    reps,
                    exerciseId,
                    ...(weight ? { weight } : {}),
                })
            )
        );
        return {
            id: `sample-${daysAgo}`,
            workoutId: `sample-${title}`,
            title,
            startedAt,
            endedAt: startedAt + minutes * 60_000,
            updatedAt: startedAt,
            activeSeconds: minutes * 60,
            roundsCompleted: 1,
            totalRounds: 1,
            outcome: 'finished',
            sets: logged,
        };
    });
}
