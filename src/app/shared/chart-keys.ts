/**
 * Where a key moves a chart's chosen point to, of `count`: the arrow keys step left and right
 * (from nothing chosen, to the last or the first), Home and End go to the ends. Null for any
 * other key, or with nothing on the chart, to leave the key to the page.
 */
export function chartKeyMove(key: string, active: number | null, count: number): number | null {
    if (count === 0) {
        return null;
    }
    const moves: Record<string, number> = {
        ArrowLeft: Math.max(0, (active ?? count) - 1),
        ArrowRight: Math.min(count - 1, (active ?? -1) + 1),
        Home: 0,
        End: count - 1,
    };
    return key in moves ? moves[key] : null;
}
