/** A number and the word for what it counts, e.g. "1 rep", "3 reps", "2 matches". */
export function counted(count: number, one: string, many = `${one}s`): string {
    return `${count} ${count === 1 ? one : many}`;
}
