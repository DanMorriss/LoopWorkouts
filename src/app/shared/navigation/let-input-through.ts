/** ms: a click this long after the press that ended a transition no longer belongs to it. */
const PRESS_TO_CLICK = 1000;

/**
 * Keeps the page answering a finger, pen or mouse while `transition` (a view transition) runs.
 * While one runs, the browser shows pictures of the pages and sends every press to <html>,
 * so a tap would do nothing until it's over. Instead, a press ends the transition at once,
 * leaving the new page in place, and goes on to whatever it landed on: its pointerdown is
 * sent again there (so a swipe can take the page from under the finger), and a mouse's click,
 * which would land on <html>, is too. A finger's click already lands where it was tapped.
 *
 * `onCatch` runs as a press ends it, before the pictures go, e.g. to see where something was
 * on screen. While it runs, <html> has `touch-action: pan-y` (styles/_page-slide.scss), so a
 * finger moving sideways stays the page's rather than the browser's.
 */
export function letInputThrough(transition: ViewTransition, onCatch?: () => void) {
    const root = document.documentElement;
    const onPress = (event: PointerEvent) => {
        if (!event.isTrusted || event.target !== root) {
            return;
        }
        onCatch?.();
        transition.skipTransition();
        // A finger's moves would all go to <html>, where it went down
        if (root.hasPointerCapture(event.pointerId)) {
            root.releasePointerCapture(event.pointerId);
        }
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (!target || target === root) {
            return;
        }
        target.dispatchEvent(new PointerEvent('pointerdown', event));
        const pressedAt = event.timeStamp;
        addEventListener(
            'click',
            (click) => {
                if (click.target === root && click.timeStamp - pressedAt < PRESS_TO_CLICK) {
                    click.stopImmediatePropagation();
                    (target as HTMLElement).click?.();
                }
            },
            { capture: true, once: true }
        );
    };
    addEventListener('pointerdown', onPress, { capture: true });
    transition.finished.finally(() =>
        removeEventListener('pointerdown', onPress, { capture: true })
    );
}
