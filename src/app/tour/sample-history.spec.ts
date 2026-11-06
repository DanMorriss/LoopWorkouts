import { sampleHistory } from './sample-history';
import { timePerWeek } from '../models/time-per-week';

describe("the tour's example workouts (NAV-8)", () => {
    const now = new Date(2026, 10, 6, 18).getTime();
    const examples = sampleHistory(now);

    it('fill the last 12 weeks, newest first, with some in the last week', () => {
        expect(examples.map((entry) => entry.startedAt)).toEqual(
            [...examples.map((entry) => entry.startedAt)].sort((a, b) => b - a)
        );
        expect(timePerWeek(examples, now, 12).filter((week) => week.workouts > 0).length).toBe(12);
        expect(examples.filter((entry) => entry.startedAt >= now - 7 * 86_400_000).length).toBe(3);
    });

    it('have ids that are their own, and sets of built-in exercises', () => {
        expect(new Set(examples.map((entry) => entry.id)).size).toBe(examples.length);
        expect(examples.every((entry) => entry.id.startsWith('sample-'))).toBe(true);
        expect(
            examples
                .flatMap((entry) => entry.sets ?? [])
                .every((set) => set.exerciseId?.startsWith('builtin:'))
        ).toBe(true);
    });
});
