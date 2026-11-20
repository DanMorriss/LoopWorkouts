import { signal } from '@angular/core';
import { SheetDrag, SheetDragOptions } from './sheet-drag';

describe('SheetDrag', () => {
    let scrim: HTMLElement;
    let sheet: HTMLElement;
    let grabber: HTMLElement;
    let content: HTMLElement;
    let gone: number;
    let drag: SheetDrag;
    const reduced = signal(false);

    function make(options: Partial<SheetDragOptions> = {}) {
        drag = new SheetDrag({
            sheet: () => sheet,
            grabber: () => grabber,
            scrim: () => scrim,
            cardAway: { transform: 'scale(0.96)', opacity: 0 },
            reducedMotion: reduced,
            goneAway: () => gone++,
            ...options,
        });
        grabber.addEventListener('pointerdown', (event) => drag.grab(event));
        grabber.addEventListener('pointermove', (event) => drag.drag(event));
        grabber.addEventListener('pointerup', (event) => drag.letGo(event));
        sheet.addEventListener('touchstart', (event) => drag.onBodyTouchStart(event));
        sheet.addEventListener('touchmove', (event) => drag.onBodyTouchMove(event));
        sheet.addEventListener('touchend', (event) => drag.onBodyTouchEnd(event));
    }

    beforeEach(() => {
        reduced.set(false);
        gone = 0;
        scrim = document.createElement('div');
        scrim.style.cssText = 'position: fixed; inset: 0;';
        sheet = document.createElement('div');
        sheet.style.cssText = 'position: absolute; bottom: 0; left: 0; right: 0; height: 400px;';
        grabber = document.createElement('div');
        grabber.style.height = '24px';
        content = document.createElement('p');
        content.textContent = 'Content';
        sheet.append(grabber, content);
        scrim.append(sheet);
        document.body.append(scrim);
    });

    afterEach(() => scrim.remove());

    const offset = () => new DOMMatrix(getComputedStyle(sheet).transform).m42;
    const pointer = (type: string, y: number) =>
        grabber.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientY: y, bubbles: true }));
    /** Waits long enough that the finger reads as still as it lets go. */
    const still = () => new Promise((resolve) => setTimeout(resolve, 120));
    const target = (animation: Animation) =>
        new DOMMatrix(
            String((animation.effect as KeyframeEffect).getKeyframes().at(-1)!['transform'])
        ).m42;

    it('follows the finger down, and resists being pulled up', () => {
        make();
        pointer('pointerdown', 100);
        pointer('pointermove', 160);
        expect(offset()).toBe(60);
        expect(Number(scrim.style.getPropertyValue('--dim'))).toBeCloseTo(1 - 60 / 400);

        pointer('pointermove', -100);
        expect(offset()).toBeLessThan(0);
        expect(offset()).toBeGreaterThan(-200);
    });

    it('goes once let go past halfway, at rest, and only once it has got there', async () => {
        make();
        pointer('pointerdown', 100);
        pointer('pointermove', 350);
        await still();
        pointer('pointerup', 350);

        const [spring] = sheet.getAnimations();
        expect(target(spring)).toBe(400);
        expect(gone).toBe(0);
        await spring.finished;
        await vi.waitFor(() => expect(gone).toBe(1));
        expect(drag.draggedAway()).toBe(true);
    });

    it('springs home, staying, when let go at rest short of halfway', async () => {
        make();
        pointer('pointerdown', 100);
        pointer('pointermove', 150);
        await still();
        pointer('pointerup', 150);

        const [spring] = sheet.getAnimations();
        expect(target(spring)).toBe(0);
        await spring.finished;
        expect(gone).toBe(0);
    });

    it('stays when caught on its way away and brought back up', async () => {
        make();
        pointer('pointerdown', 100);
        pointer('pointermove', 350);
        await still();
        pointer('pointerup', 350);
        const [spring] = sheet.getAnimations();

        // Caught mid-way: it stops where it is, and follows the finger up from there
        pointer('pointerdown', 500);
        expect(sheet.getAnimations()).toHaveLength(0);
        pointer('pointermove', 300);
        await still();
        pointer('pointerup', 300);

        expect(target(sheet.getAnimations()[0])).toBe(0);
        await new Promise((resolve) => setTimeout(resolve, 600));
        expect(spring.playState).toBe('idle');
        expect(gone).toBe(0);
        expect(offset()).toBe(0);
    });

    it('carries on in when caught rising in and just held, even past halfway down', async () => {
        make();
        // Rising in, three quarters of the way down still
        const rising = sheet.animate(
            [{ transform: 'translateY(400px)' }, { transform: 'translateY(0px)' }],
            { duration: 10_000 }
        );
        rising.currentTime = 2500;

        pointer('pointerdown', 500);
        expect(offset()).toBeCloseTo(300, -1);
        await still();
        pointer('pointerup', 500);

        const [spring] = sheet.getAnimations();
        expect(target(spring)).toBe(0);
        await spring.finished;
        expect(gone).toBe(0);
    });

    it('goes from where it is as it closes some other way, and can no longer be caught', async () => {
        make();
        pointer('pointerdown', 100);
        pointer('pointermove', 140);

        const leaving = drag.leave();

        const [away] = sheet.getAnimations();
        const [from] = (away.effect as KeyframeEffect).getKeyframes();
        expect(new DOMMatrix(String(from['transform'])).m42).toBe(40);
        expect(target(away)).toBe(400);
        pointer('pointerdown', 300);
        expect(sheet.getAnimations()).toEqual([away]);
        await leaving;
    });

    it('shrinks and fades as a card on a wider screen, without dragging', () => {
        grabber.style.display = 'none';
        make();
        const fire = (type: string, y: number) => {
            const touch = new Touch({ identifier: 2, target: content, clientX: 20, clientY: y });
            const event = new TouchEvent(type, {
                touches: type === 'touchend' ? [] : [touch],
                changedTouches: [touch],
                bubbles: true,
                cancelable: true,
            });
            content.dispatchEvent(event);
            return event.defaultPrevented;
        };
        fire('touchstart', 100);
        expect(fire('touchmove', 200)).toBe(false);
        expect(offset()).toBe(0);

        void drag.leave();
        const [, to] = (sheet.getAnimations()[0].effect as KeyframeEffect).getKeyframes();
        expect(to['opacity']).toBe('0');
        expect(to['transform']).toBe('scale(0.96)');
    });

    it("leaves a touch it doesn't own alone, e.g. in a dialog over it", () => {
        make({ ownsTouch: (element) => element !== content });
        const touch = new Touch({ identifier: 4, target: content, clientX: 20, clientY: 100 });
        const moved = new Touch({ identifier: 4, target: content, clientX: 20, clientY: 200 });
        content.dispatchEvent(
            new TouchEvent('touchstart', {
                touches: [touch],
                changedTouches: [touch],
                bubbles: true,
            })
        );
        const move = new TouchEvent('touchmove', {
            touches: [moved],
            changedTouches: [moved],
            bubbles: true,
            cancelable: true,
        });
        content.dispatchEvent(move);

        expect(move.defaultPrevented).toBe(false);
        expect(offset()).toBe(0);
    });
});
