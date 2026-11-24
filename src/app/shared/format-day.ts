/**
 * The day something was done, said as you would: "today", "yesterday", the day's name within
 * the last week ("Tuesday"), or else its date ("3 Nov"), on the device's calendar.
 */
export function dayDone(at: number, now: number): string {
    const day = (time: number) => {
        const date = new Date(time);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    };
    const daysAgo = Math.round((day(now) - day(at)) / 86_400_000);
    if (daysAgo <= 0) {
        return 'today';
    }
    if (daysAgo === 1) {
        return 'yesterday';
    }
    const date = new Date(at);
    return daysAgo < 7
        ? date.toLocaleDateString('en-GB', { weekday: 'long' })
        : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
