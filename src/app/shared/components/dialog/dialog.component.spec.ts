import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

    it('holds what it is given in the card, with ‹ Back first', () => {
        const card = el('.dialog-card');
        expect(card.firstElementChild!.tagName).toBe('APP-DIALOG-BACK');
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
});
