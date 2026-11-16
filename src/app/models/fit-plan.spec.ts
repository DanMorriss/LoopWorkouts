import { BUILT_IN_PLANS } from './built-in-plans';
import { fitToDays, inDayOrder, inOrder, trainingDays } from './fit-plan';

const plan = (title: string) => BUILT_IN_PLANS.find((p) => p.title === title)!;
const beginner = plan('3-day beginner gym');
/** What's on each day once fitted, by the first workout's id, or "-" for a rest day. */
const fitted = (order: number[] | null, days = beginner.days) =>
    order && inDayOrder(days, order).map((ids) => ids[0]?.replace('builtin:', '') ?? '-');

describe('fitting a ready-made plan to your days', () => {
    it('knows its training days, leaving out active rest', () => {
        expect(trainingDays(beginner)).toEqual([0, 2, 4]);
    });

    it('puts its training on your days, and its active rest on the nearest left', () => {
        expect(fitted(fitToDays(beginner, [1, 3, 5]))).toEqual([
            'mobility-flow',
            'gym-full-body',
            '-',
            'gym-full-body',
            'full-body-stretch',
            'gym-full-body',
            '-',
        ]);
    });

    it('spreads them round the week, as near as can be to where they were', () => {
        // Mon to Fri free: Mon, Wed and Fri, as it comes
        expect(fitToDays(beginner, [0, 1, 2, 3, 4])).toEqual(inOrder());
        // Every day free, for four days of training: as it comes too
        expect(fitToDays(plan('Push, pull, legs'), [0, 1, 2, 3, 4, 5, 6])).toEqual(inOrder());
        // Sat, Sun, Mon and Tue: not three days in a row if it can help it
        const order = fitToDays(beginner, [0, 1, 5, 6])!;
        expect(fitted(order)!.filter((id) => id === 'gym-full-body')).toHaveLength(3);
    });

    it("can't fit a plan to fewer days than it trains", () => {
        expect(fitToDays(beginner, [5, 6])).toBeNull();
        expect(fitToDays(beginner, [])).toBeNull();
    });

    it('keeps every day of the plan, each once', () => {
        for (const each of BUILT_IN_PLANS) {
            const order = fitToDays(each, [0, 2, 3, 5, 6]);
            if (order) {
                expect([...order].sort()).toEqual(inOrder());
            }
        }
    });
});
