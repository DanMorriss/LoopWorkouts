/** Formats a number of seconds as zero-padded `mm:ss`, e.g. 75 → "01:15". */
export function formatSeconds(seconds: number): string {
    return formatTime(Math.floor(seconds / 60), seconds % 60);
}

/** Formats minutes and seconds as zero-padded `mm:ss`. */
export function formatTime(minutes: number, seconds: number): string {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
