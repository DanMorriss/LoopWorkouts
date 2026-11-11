import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { FADING_CLASS } from '../shared/navigation/page-slide';
import { MORPHING_CLASS, WorkoutMorph } from './workout-morph';

@Component({ template: '' })
class BlankPage {}

describe('WorkoutMorph', () => {
    let morph: WorkoutMorph;
    let router: Router;
    const root = document.documentElement;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter([{ path: '**', component: BlankPage }])],
        });
        morph = TestBed.inject(WorkoutMorph);
        router = TestBed.inject(Router);
        await router.navigateByUrl('/library');
    });

    afterEach(() =>
        root.classList.remove(
            MORPHING_CLASS,
            `${MORPHING_CLASS}--open`,
            `${MORPHING_CLASS}--close`,
            FADING_CLASS
        )
    );

    const click = (init: MouseEventInit = {}) =>
        new MouseEvent('click', { button: 0, cancelable: true, ...init });

    /** Waits for the navigation inside the view transition to land. */
    const landed = (url: string) =>
        vi.waitFor(() => expect(router.url).toBe(url), { timeout: 2000 });

    it('opens the workout inside a view transition, marking which way it goes', async () => {
        fakeReducedMotion(false);
        const start = vi.spyOn(document, 'startViewTransition');
        const event = click();

        morph.follow(event, '/workout');

        expect(event.defaultPrevented).toBe(true);
        expect(start).toHaveBeenCalledTimes(1);
        expect(root.classList).toContain(MORPHING_CLASS);
        expect(root.classList).toContain(`${MORPHING_CLASS}--open`);
        await landed('/workout');
    });

    it('marks folding back to the bar as closing, and keeps the address it goes back to', async () => {
        fakeReducedMotion(false);

        morph.follow(click(), '/exercises?muscles=quads');

        expect(root.classList).toContain(`${MORPHING_CLASS}--close`);
        await landed('/exercises?muscles=quads');
    });

    it('takes its names off the page once the morph is over', async () => {
        fakeReducedMotion(false);
        const start = vi.spyOn(document, 'startViewTransition');

        morph.follow(click(), '/workout');
        await start.mock.results[0].value.finished;

        expect(root.classList).not.toContain(MORPHING_CLASS);
        expect(root.classList).not.toContain(`${MORPHING_CLASS}--open`);
    });

    it('leaves a click for a new tab or window to the browser', () => {
        fakeReducedMotion(false);
        const start = vi.spyOn(document, 'startViewTransition');

        for (const init of [
            { metaKey: true },
            { ctrlKey: true },
            { shiftKey: true },
            { button: 1 },
        ]) {
            const event = click(init);
            morph.follow(event, '/workout');
            expect(event.defaultPrevented).toBe(false);
        }

        expect(start).not.toHaveBeenCalled();
        expect(router.url).toBe('/library');
    });

    it('cross-fades with reduced motion, rather than morphing', async () => {
        fakeReducedMotion(true);
        const start = vi.spyOn(document, 'startViewTransition');

        morph.follow(click(), '/workout');

        expect(start).toHaveBeenCalledTimes(1);
        expect(root.classList).toContain(FADING_CLASS);
        expect(root.classList).not.toContain(MORPHING_CLASS);
        await landed('/workout');
        await start.mock.results[0].value.finished;
        expect(root.classList).not.toContain(FADING_CLASS);
    });
});
