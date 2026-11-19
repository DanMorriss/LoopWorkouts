import { flyInto } from './later-fly';

describe('flyInto', () => {
    let parent: HTMLElement;
    let button: HTMLButtonElement;

    beforeEach(() => {
        parent = document.createElement('div');
        parent.innerHTML =
            '<button id="later" aria-label="2 skipped exercises">' +
            '<span class="later__count">2</span></button>';
        document.body.appendChild(parent);
        button = parent.querySelector('button')!;
    });

    afterEach(() => parent.remove());

    const copy = () => parent.querySelector<HTMLElement>('.later__copy');
    const from = new DOMRect(0, 400, 300, 300);

    it('flies a copy in from the ring, hidden from screen readers, gone once it lands', async () => {
        flyInto(button, from, false, false);

        expect(copy()).not.toBeNull();
        expect(copy()!.getAttribute('aria-hidden')).toBe('true');
        expect(copy()!.inert).toBe(true);
        expect(copy()!.id).toBe('');
        expect(copy()!.querySelector('.later__count')).toBeNull();
        // The count waits for it, then pops
        expect(button.querySelector('.later__count')!.getAnimations()).toHaveLength(1);

        for (const flight of copy()!.getAnimations()) {
            flight.finish();
        }
        await vi.waitFor(() => expect(copy()).toBeNull());
    });

    it('with reduced motion, only fades a new button in', () => {
        flyInto(button, from, true, true);

        expect(copy()).toBeNull();
        expect(button.getAnimations()).toHaveLength(1);
        expect(button.querySelector('.later__count')!.getAnimations()).toHaveLength(0);
    });
});
