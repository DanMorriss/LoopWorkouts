import { criticallyDampedSpring } from '../../shared/spring';

/** How the copy flies: Apple's spring for moving something across the screen, a touch slower. */
const FLIGHT = criticallyDampedSpring(0.55);

/** How big the copy starts, against the button: about the bubble's middle. */
const START_SCALE = 1.8;

/**
 * An exercise just skipped is put aside (RUN-16): a copy of `button` flies from the middle of
 * `from` (the ring, where the exercise was) into it, so it's clear where the exercise went and
 * why the button's there. `first` is the button showing for the first time, so it waits,
 * unseen, for the copy to land; otherwise its count pops as it does. Either way the button
 * gives a small bump on landing. With `reduced` motion, the button just fades in, or its count
 * changes.
 */
export function flyInto(button: HTMLElement, from: DOMRect, first: boolean, reduced: boolean) {
    const count = button.querySelector<HTMLElement>('.later__count');
    if (reduced) {
        if (first) {
            button.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
        }
        return;
    }
    const to = button.getBoundingClientRect();
    const x = from.left + from.width / 2 - (to.left + to.width / 2);
    const y = from.top + from.height / 2 - (to.top + to.height / 2);

    // The copy sits over the button, in its parent, so the page's own transforms can't move it
    const copy = button.cloneNode(true) as HTMLElement;
    copy.querySelector('.later__count')?.remove();
    copy.removeAttribute('id');
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('tabindex', '-1');
    copy.inert = true;
    copy.classList.add('later__copy');
    button.after(copy);
    const flight = copy.animate(
        [
            { transform: `translate(${x}px, ${y}px) scale(${START_SCALE})`, opacity: 0 },
            { opacity: 1, offset: 0.25 },
            { transform: 'none', opacity: 1 },
        ],
        { duration: FLIGHT.duration, easing: FLIGHT.easing }
    );
    const land = () => copy.remove();
    flight.onfinish = land;
    flight.oncancel = land;

    // Out of sight till the copy lands, then a bump, as if it was caught
    const arrive = { delay: FLIGHT.duration, duration: 300, easing: 'ease-out' };
    if (first) {
        button.animate([{ opacity: 0 }, { opacity: 0 }], { duration: FLIGHT.duration });
    }
    button.animate(
        [{ transform: 'none' }, { transform: 'scale(1.15)' }, { transform: 'none' }],
        arrive
    );
    count?.animate(
        [{ transform: 'scale(0)' }, { transform: 'scale(1.3)' }, { transform: 'none' }],
        { ...arrive, fill: 'backwards' }
    );
}
