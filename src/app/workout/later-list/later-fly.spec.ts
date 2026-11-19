import { flyInto, flyOnto } from './later-fly';

describe('later-fly', () => {
    let layer: HTMLElement;
    let button: HTMLButtonElement;
    let card: HTMLElement;

    beforeEach(() => {
        layer = document.createElement('div');
        layer.innerHTML =
            '<button id="later" aria-label="2 skipped exercises">' +
            '<span class="later__count">2</span></button>';
        card = document.createElement('div');
        card.innerHTML =
            '<span class="up-next__kind"></span><span class="up-next__text">Push-up</span>';
        document.body.append(layer, card);
        button = layer.querySelector('button')!;
    });

    afterEach(() => {
        layer.remove();
        card.remove();
    });

    const copy = () => layer.querySelector<HTMLElement>('.later__copy');
    const text = () => card.querySelector<HTMLElement>('.up-next__text')!;
    const ring = new DOMRect(0, 400, 300, 300);

    /** Lands the copy, and waits for it to go. */
    async function land() {
        for (const flight of copy()!.getAnimations()) {
            flight.finish();
        }
        await vi.waitFor(() => expect(copy()).toBeNull());
    }

    describe('flyInto', () => {
        it('flies a copy up from the ring, hidden from screen readers, gone once it lands', async () => {
            flyInto(button, layer, ring, false, false);

            expect(copy()).not.toBeNull();
            expect(copy()!.getAttribute('aria-hidden')).toBe('true');
            expect(copy()!.inert).toBe(true);
            expect(copy()!.id).toBe('');
            expect(copy()!.querySelector('.later__count')).toBeNull();
            // The count waits for it, then pops
            expect(button.querySelector('.later__count')!.getAnimations()).toHaveLength(1);

            await land();
        });

        it('with reduced motion, only fades a new button in', () => {
            flyInto(button, layer, ring, true, true);

            expect(copy()).toBeNull();
            expect(button.getAnimations()).toHaveLength(1);
            expect(button.querySelector('.later__count')!.getAnimations()).toHaveLength(0);
        });
    });

    describe('flyOnto', () => {
        it('flies a copy down to the Up next card, whose words wait for it', async () => {
            const from = button.getBoundingClientRect();
            // The last one picked: the button's gone, and the copy flies all the same
            button.remove();
            flyOnto(button, layer, from, card, false);

            expect(copy()).not.toBeNull();
            expect(copy()!.inert).toBe(true);
            expect(text().getAnimations()).toHaveLength(1);
            expect(card.getAnimations()).toHaveLength(1);

            await land();
        });

        it('with reduced motion, only fades the card in', () => {
            flyOnto(button, layer, button.getBoundingClientRect(), card, true);

            expect(copy()).toBeNull();
            expect(text().getAnimations()).toHaveLength(1);
            expect(card.getAnimations()).toHaveLength(0);
        });
    });
});
