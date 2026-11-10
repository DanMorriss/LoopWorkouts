/** "a", "a and b", "a, b and c". */
export function joinAnd(items: readonly string[]): string {
    return items.length <= 1
        ? (items[0] ?? '')
        : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
