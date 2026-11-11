import { userEvent } from 'vitest/browser';

import { letInputThrough } from './let-input-through';

describe('letInputThrough', () => {
    let button: HTMLButtonElement;
    let clicks: number;
    let downs: number;

    beforeEach(() => {
        clicks = 0;
        downs = 0;
        button = document.createElement('button');
        button.textContent = 'Edit';
        button.style.cssText = 'position: fixed; left: 20px; top: 20px; width: 120px; height: 50px';
        button.addEventListener('click', () => clicks++);
        button.addEventListener('pointerdown', () => downs++);
        document.body.append(button);
    });

    afterEach(() => button.remove());

    /** A slow view transition, so a press lands while it's still running. */
    async function slowTransition(): Promise<ViewTransition> {
        const style = document.createElement('style');
        style.textContent =
            '::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation-duration: 5s; }';
        document.head.append(style);
        const transition = document.startViewTransition(() => undefined);
        transition.finished.finally(() => style.remove());
        await transition.ready;
        return transition;
    }

    it('ends a transition at a press, which lands on what it was over', async () => {
        const transition = await slowTransition();
        const caught = vi.fn();
        letInputThrough(transition, caught);

        // Mid-transition the browser sends every press to <html>; a real click, not one made up
        await userEvent.click(button, { force: true });

        expect(caught).toHaveBeenCalledTimes(1);
        expect(downs).toBe(1);
        expect(clicks).toBe(1);
        await transition.finished;
    });

    it('leaves presses alone once the transition is over', async () => {
        const transition = await slowTransition();
        letInputThrough(transition);
        transition.skipTransition();
        await transition.finished;

        await userEvent.click(button);

        expect(downs).toBe(1);
        expect(clicks).toBe(1);
    });

    it("ignores a press a script makes up, which the browser hasn't sent to <html>", async () => {
        const transition = await slowTransition();
        const caught = vi.fn();
        letInputThrough(transition, caught);

        document.documentElement.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

        expect(caught).not.toHaveBeenCalled();
        transition.skipTransition();
        await transition.finished;
    });
});
