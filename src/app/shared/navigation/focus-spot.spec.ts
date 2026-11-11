import { findSpot, focusSpot } from './focus-spot';

describe('focusSpot', () => {
    /** A page as drawn, and drawn again from scratch, as a page coming back is. */
    const draw = () => {
        const page = document.createElement('div');
        page.innerHTML = `
            <a href="/exercises/squat">Squat</a>
            <a href="/exercises/plank">Plank</a>
            <a href="/exercises/plank">Plank, again</a>
            <button id="new">New</button>
            <button aria-label="Options">⋮</button>
            <button aria-label="Options">⋮</button>
            <button>Plain</button>
            <svg><a href="/exercises?muscles=quads"><path /></a></svg>`;
        return page;
    };

    it('finds the same element on the page drawn again', () => {
        const before = draw();
        const after = draw();
        const at = (selector: string, nth = 0) => before.querySelectorAll(selector)[nth];
        for (const element of [
            at('a', 1),
            at('a', 2),
            at('#new'),
            at('[aria-label]', 1),
            at('button', 3),
            at('svg a'),
        ]) {
            const spot = focusSpot(element, before)!;
            const found = findSpot(spot, after)!;
            expect(found.outerHTML).toBe(element.outerHTML);
            expect([...after.querySelectorAll('*')].indexOf(found)).toBe(
                [...before.querySelectorAll('*')].indexOf(element)
            );
        }
    });

    it('has no spot for what is off the page, or the page itself', () => {
        const page = draw();
        expect(focusSpot(document.body, page)).toBeUndefined();
        expect(focusSpot(page, page)).toBeUndefined();
    });

    it('finds nothing once the element has gone', () => {
        const page = draw();
        const button = page.querySelector('#new')!;
        const spot = focusSpot(button, page)!;
        button.remove();
        expect(findSpot(spot, page)).toBeUndefined();
    });
});
