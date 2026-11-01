import type { AnimationCallbackEvent } from '@angular/core';

import { rollIn, rollOut } from './step-roll';

describe('step rolls', () => {
    let text: HTMLElement;

    beforeEach(() => {
        text = document.createElement('div');
        text.textContent = 'Squats';
        document.body.append(text);
    });

    afterEach(() => text.remove());

    const event = (animationComplete = vi.fn()): AnimationCallbackEvent => ({
        target: text,
        animationComplete,
    });

    it('rolls up into place, and says when it has', async () => {
        const done = vi.fn();
        rollIn(event(done), 'up');

        const [animation] = text.getAnimations();
        expect((animation.effect as KeyframeEffect).getKeyframes()[0]['transform']).toBe(
            'rotateX(-75deg)'
        );
        await animation.finished;
        // Called a few promise steps after it finishes, or by its timer if that's first
        await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    });

    it('rolls away from wherever it had got to when caught still rolling in', async () => {
        rollIn(event(), 'up');
        await new Promise((resolve) => setTimeout(resolve, 60));
        const seen = getComputedStyle(text).transform;
        expect(seen).not.toBe('none');

        const done = vi.fn();
        rollOut(event(done), 'up');

        // One animation, from where it was on screen, not from the middle
        const animations = text.getAnimations();
        expect(animations).toHaveLength(1);
        const [from, to] = (animations[0].effect as KeyframeEffect).getKeyframes();
        expect(new DOMMatrix(from['transform'] as string).m23).toBeCloseTo(
            new DOMMatrix(seen).m23,
            2
        );
        expect(to['transform']).toBe('rotateX(75deg)');
        await animations[0].finished;
        // Called a few promise steps after it finishes, or by its timer if that's first
        await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    });

    it('only cross-fades with reduced motion', () => {
        rollIn(event(), 'fade');

        const [from] = (text.getAnimations()[0].effect as KeyframeEffect).getKeyframes();
        expect(from['transform']).toBeUndefined();
        expect(from['opacity']).toBe('0');
    });

    it('lets the text go once its time is up, even if the page is not being drawn', () => {
        vi.useFakeTimers();
        const done = vi.fn();
        rollOut(event(done), 'up');

        vi.advanceTimersByTime(1000);

        expect(done).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
