/**
 * `event` as if it happened at `timeStamp` (ms, as `performance.now()`). How fast a swipe or
 * flick went is worked out from its events' times (`VelocityTracker`), so a test says when each
 * happened rather than waiting: real waits can stretch on a busy machine, and a quick flick
 * then reads as a slow one.
 */
export function withTimeStamp<E extends Event>(event: E, timeStamp: number): E {
    Object.defineProperty(event, 'timeStamp', { value: timeStamp });
    return event;
}

/**
 * The time a test's pointer events say they happened at, moved on only by `pass()`: events
 * with no time passed between them are at the same moment, so letting go after a `pass(150)`
 * reads as still, and moves a `pass(16)` apart as a flick.
 */
export class GestureClock {
    private now = performance.now();

    pass(ms: number) {
        this.now += ms;
    }

    stamp<E extends Event>(event: E): E {
        return withTimeStamp(event, this.now);
    }
}
