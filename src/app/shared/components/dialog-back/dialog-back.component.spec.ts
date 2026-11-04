import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogBackComponent } from './dialog-back.component';

@Component({
    imports: [DialogBackComponent],
    template: `<app-dialog-back [label]="label()" (back)="backs = backs + 1" />`,
})
class HostComponent {
    label = signal('Back');
    backs = 0;
}

describe('DialogBackComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });
    afterEach(() => fixture.destroy());

    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    /** What a screen reader hears: the icon is hidden from it. */
    const spoken = () =>
        [...button().childNodes]
            .filter((node) =>
                node instanceof Element
                    ? node.ariaHidden !== 'true'
                    : node.nodeType === Node.TEXT_NODE
            )
            .map((node) => node.textContent)
            .join('')
            .replace(/\s+/g, ' ')
            .trim();

    it('says Back where the way back depends on where the dialog opened', () => {
        expect(spoken()).toBe('Back');
    });

    it('names where it goes back to, e.g. "Back to Workouts"', () => {
        host.label.set('Workouts');
        fixture.detectChanges();

        expect(spoken()).toBe('Back to Workouts');
        // On screen it's ‹ Workouts, as a page's back link is
        expect(button().querySelector('.sr-only')!.textContent).toBe('Back to');
    });

    it('goes back when pressed', () => {
        button().click();

        expect(host.backs).toBe(1);
    });
});
