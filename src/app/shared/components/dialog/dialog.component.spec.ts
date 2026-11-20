import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeReducedMotion } from '../../testing/fake-reduced-motion';
import { DialogComponent } from './dialog.component';

@Component({
    imports: [DialogComponent],
    template: `
        <app-dialog
            labelledBy="title"
            describedBy="hint"
            [alert]="true"
            [width]="420"
            (closed)="closes.set(closes() + 1)"
        >
            <h2 id="title">Title</h2>
            <p id="hint">Hint</p>
            <button type="button" id="other">Other</button>
            <button type="button" id="first" cdkFocusInitial>First</button>
        </app-dialog>
    `,
})
class HostComponent {
    readonly closes = signal(0);
}

describe('DialogComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    const el = <T extends HTMLElement>(selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector<T>(selector)!;

    beforeEach(async () => {
        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('names the card as a modal dialog', () => {
        const card = el('.dialog-card');
        expect(card.getAttribute('role')).toBe('alertdialog');
        expect(card.getAttribute('aria-modal')).toBe('true');
        expect(card.getAttribute('aria-labelledby')).toBe('title');
        expect(card.getAttribute('aria-describedby')).toBe('hint');
    });

    it('holds what it is given in the card, with ‹ Back at its top', () => {
        const card = el('.dialog-card');
        expect(card.firstElementChild!.classList).toContain('dialog-top');
        expect(card.querySelector('.dialog-top > app-dialog-back')).not.toBeNull();
        expect(card.querySelector('#title')).not.toBeNull();
    });

    it('starts focus on what asks for it', () => {
        expect(document.activeElement).toBe(el('#first'));
    });

    it('closes with ‹ Back, Escape and a click outside, but not a click inside', () => {
        el('.dialog-back').click();
        expect(fixture.componentInstance.closes()).toBe(1);

        el('.dialog-overlay').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(fixture.componentInstance.closes()).toBe(2);

        el('.dialog-overlay').click();
        expect(fixture.componentInstance.closes()).toBe(3);

        el('.dialog-card').click();
        el('#other').click();
        expect(fixture.componentInstance.closes()).toBe(3);
    });

    it('keeps the card inside a narrow screen', () => {
        expect(el('.dialog-card').style.width).toBe('min(420px, 100%)');
    });

    // The test browser is phone-sized, so the dialog is a sheet
    describe('on a phone, a sheet', () => {
        const card = () => el('.dialog-card');
        const offset = () => new DOMMatrix(getComputedStyle(card()).transform).m42;
        /** Lets it finish rising in. */
        const settle = () =>
            el('.dialog-overlay')
                .getAnimations({ subtree: true })
                .forEach((animation) => animation.finish());

        /** Presses the grabber, moves it `dy` px down (negative is up), and maybe lets go. */
        function dragBy(dy: number, letGo = true) {
            const at = (type: string, y: number) =>
                el('.dialog-grabber').dispatchEvent(
                    new PointerEvent(type, { pointerId: 1, clientY: y, bubbles: true })
                );
            at('pointerdown', 100);
            at('pointermove', 100 + dy / 2);
            at('pointermove', 100 + dy);
            if (letGo) {
                at('pointerup', 100 + dy);
            }
        }

        it('sits along the bottom of the screen, with a grabber at its top', () => {
            settle();
            expect(getComputedStyle(el('.dialog-grabber')).display).not.toBe('none');
            expect(Math.round(card().getBoundingClientRect().bottom)).toBe(window.innerHeight);
        });

        it('follows the grabber down, brightening the page behind as it goes', () => {
            settle();

            dragBy(80, false);

            expect(offset()).toBe(80);
            const dim = Number(el('.dialog-overlay').style.getPropertyValue('--dim'));
            expect(dim).toBeLessThan(1);
            expect(fixture.componentInstance.closes()).toBe(0);
        });

        it('springs back up, still open, when let go a little way down', async () => {
            settle();

            dragBy(20, false);
            // Still, so it's let go at rest rather than flicked
            await new Promise((resolve) => setTimeout(resolve, 120));
            el('.dialog-grabber').dispatchEvent(
                new PointerEvent('pointerup', { pointerId: 1, clientY: 120, bubbles: true })
            );

            const [spring] = card().getAnimations();
            const [from, to] = (spring.effect as KeyframeEffect).getKeyframes();
            expect(new DOMMatrix(String(from['transform'])).m42).toBe(20);
            expect(new DOMMatrix(String(to['transform'])).m42).toBe(0);
            expect(fixture.componentInstance.closes()).toBe(0);
        });

        it('stops where it is when grabbed as it rises in', () => {
            const rising = offset();
            expect(rising).toBeGreaterThan(0);

            dragBy(0, false);

            expect(offset()).toBeCloseTo(rising, -1);
            expect(card().getAnimations()).toHaveLength(0);
        });

        it('is dragged by a finger moving down on its content, while scrolled to the top', () => {
            settle();
            const target = el('#hint');
            const fire = (type: string, y: number) => {
                const touch = new Touch({ identifier: 3, target, clientX: 50, clientY: y });
                const event = new TouchEvent(type, {
                    touches: type === 'touchend' ? [] : [touch],
                    changedTouches: [touch],
                    bubbles: true,
                    cancelable: true,
                });
                target.dispatchEvent(event);
                return event.defaultPrevented;
            };

            fire('touchstart', 100);
            expect([fire('touchmove', 140), fire('touchmove', 190)]).toEqual([true, true]);
            expect(offset()).toBe(90);
        });

        it('goes from where it is as the element using it leaves', async () => {
            settle();
            dragBy(30, false);

            // As animate.leave="dialog-leave" does (styles/_dialog.scss)
            (fixture.nativeElement as HTMLElement).classList.add('dialog-leave');

            await vi.waitFor(() => expect(card().getAnimations()).toHaveLength(1));
            const [from, to] = (card().getAnimations()[0].effect as KeyframeEffect).getKeyframes();
            expect(new DOMMatrix(String(from['transform'])).m42).toBe(30);
            expect(new DOMMatrix(String(to['transform'])).m42).toBe(card().offsetHeight);
        });

        describe('with reduced motion', () => {
            beforeEach(async () => {
                fixture.destroy();
                fakeReducedMotion(true);
                fixture = TestBed.createComponent(HostComponent);
                fixture.detectChanges();
                await fixture.whenStable();
            });

            it('closes once pulled past halfway down, marked as gone', async () => {
                settle();

                dragBy(card().offsetHeight * 0.75);

                await vi.waitFor(() => expect(fixture.componentInstance.closes()).toBe(1));
                expect(
                    fixture.debugElement.query((node) => node.name === 'app-dialog').nativeElement
                        .classList
                ).toContain('dialog--gone');
            });

            it('fades, rather than sinking, as the element using it leaves', async () => {
                settle();

                (fixture.nativeElement as HTMLElement).classList.add('dialog-leave');

                await vi.waitFor(() => expect(card().getAnimations()).toHaveLength(1));
                const [, to] = (card().getAnimations()[0].effect as KeyframeEffect).getKeyframes();
                expect(to['opacity']).toBe('0');
                expect(to['transform']).toBeUndefined();
            });
        });
    });
});
