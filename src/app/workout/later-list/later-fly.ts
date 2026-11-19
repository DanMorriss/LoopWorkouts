import { criticallyDampedSpring } from '../../shared/spring';

/** How the copy flies: Apple's spring for moving something across the screen, a touch slower. */
const FLIGHT = criticallyDampedSpring(0.55);

/** How big the copy starts, against the button, flying up from the ring: about its middle. */
const FROM_RING_SCALE = 1.8;

/** A small bump, as if what landed was caught, once the flight's over. */
const BUMP = [{ transform: 'none' }, { transform: 'scale(1.15)' }, { transform: 'none' }];
const CARD_BUMP = [{ transform: 'none' }, { transform: 'scale(1.04)' }, { transform: 'none' }];
const ARRIVE = { delay: FLIGHT.duration, duration: 300, easing: 'ease-out' };

/**
 * A copy of `button`, the later list's, flies on the app's spring in `layer` (the list's host,
 * which stays while the button may go), from the middle of `from` to the middle of `to`,
 * growing or shrinking from `fromScale` to `toScale`, fading in as it leaves or out as it lands.
 * It's hidden from screen readers and can't be pressed, and goes once it's landed.
 */
function flyCopy(
    button: HTMLElement,
    layer: HTMLElement,
    from: DOMRect,
    to: DOMRect,
    {
        fromScale = 1,
        toScale = 1,
        fade,
    }: { fromScale?: number; toScale?: number; fade: 'in' | 'out' }
) {
    const copy = button.cloneNode(true) as HTMLElement;
    copy.querySelector('.later__count')?.remove();
    copy.removeAttribute('id');
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('tabindex', '-1');
    copy.inert = true;
    copy.classList.add('later__copy');
    layer.append(copy);
    // Where it sits unmoved, which the flight is measured from
    const at = copy.getBoundingClientRect();
    const place = (rect: DOMRect, scale: number) =>
        `translate(${rect.left + rect.width / 2 - (at.left + at.width / 2)}px, ` +
        `${rect.top + rect.height / 2 - (at.top + at.height / 2)}px) scale(${scale})`;
    const flight = copy.animate(
        [
            { transform: place(from, fromScale), opacity: fade === 'in' ? 0 : 1 },
            { opacity: 1, offset: fade === 'in' ? 0.25 : 0.7 },
            { transform: place(to, toScale), opacity: fade === 'in' ? 1 : 0 },
        ],
        { duration: FLIGHT.duration, easing: FLIGHT.easing, fill: 'forwards' }
    );
    const land = () => copy.remove();
    flight.onfinish = land;
    flight.oncancel = land;
}

/**
 * An exercise just skipped is put aside (RUN-16): a copy of `button` flies from the middle of
 * `from` (the ring, where the exercise was) into it, so it's clear where the exercise went and
 * why the button's there. `first` is the button showing for the first time, so it waits,
 * unseen, for the copy to land; otherwise its count pops as it does. Either way the button
 * gives a small bump on landing. With `reduced` motion, the button just fades in, or its count
 * changes.
 */
export function flyInto(
    button: HTMLElement,
    layer: HTMLElement,
    from: DOMRect,
    first: boolean,
    reduced: boolean
) {
    if (reduced) {
        if (first) {
            button.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
        }
        return;
    }
    flyCopy(button, layer, from, button.getBoundingClientRect(), {
        fromScale: FROM_RING_SCALE,
        fade: 'in',
    });
    // Out of sight till the copy lands
    if (first) {
        button.animate([{ opacity: 0 }, { opacity: 0 }], { duration: FLIGHT.duration });
    }
    button.animate(BUMP, ARRIVE);
    button
        .querySelector('.later__count')
        ?.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.3)' }, { transform: 'none' }], {
            ...ARRIVE,
            fill: 'backwards',
        });
}

/**
 * An exercise put aside has been picked to do next (RUN-16): a copy of `button` flies from
 * `from`, where the button was, down onto the Up next card's icon, `card` (now showing it),
 * so it's clear it's been put next. The card's words wait for it, then come in as it lands,
 * with a small bump. With `reduced` motion, its words just fade in.
 */
export function flyOnto(
    button: HTMLElement,
    layer: HTMLElement,
    from: DOMRect,
    card: HTMLElement,
    reduced: boolean
) {
    const text = card.querySelector<HTMLElement>('.up-next__text');
    if (reduced) {
        text?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
        return;
    }
    const icon = card.querySelector<HTMLElement>('.up-next__kind') ?? card;
    const to = icon.getBoundingClientRect();
    flyCopy(button, layer, from, to, { toScale: to.width / from.width, fade: 'out' });
    text?.animate([{ opacity: 0 }, { opacity: 1 }], {
        ...ARRIVE,
        duration: 200,
        fill: 'backwards',
    });
    card.animate(CARD_BUMP, ARRIVE);
}
