import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { UndoService } from '../../shared/undo/undo.service';
import { UndoBarComponent } from './undo-bar.component';

@Component({ template: '' })
class BlankPage {}

describe('UndoBarComponent', () => {
    let fixture: ComponentFixture<UndoBarComponent>;
    let element: HTMLElement;
    let undo: UndoService;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [UndoBarComponent],
            providers: [provideRouter([{ path: '**', component: BlankPage }])],
        });
        await TestBed.inject(Router).navigateByUrl('/library');
        undo = TestBed.inject(UndoService);
        fixture = TestBed.createComponent(UndoBarComponent);
        element = fixture.nativeElement;
        document.body.appendChild(element);
        fixture.detectChanges();
    });

    afterEach(() => element.remove());

    const bar = () => element.querySelector('.undo-bar');
    const undoButton = () =>
        [...element.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Undo');
    const closeButton = () => element.querySelector<HTMLButtonElement>('[aria-label="Close"]');

    function offer(message = 'Deleted "Legs day"') {
        const calls = { undone: 0, dismissed: 0 };
        undo.offerUndo({
            message,
            undo: () => calls.undone++,
            dismissed: () => calls.dismissed++,
        });
        fixture.detectChanges();
        TestBed.tick();
        return calls;
    }

    it('shows nothing until something can be undone', () => {
        expect(bar()).toBeNull();
        expect(element.querySelector('[role="status"]')).not.toBeNull();
    });

    it('says what happened, inside a live region, with focus on Undo', () => {
        offer();

        expect(element.querySelector('[role="status"]')!.textContent).toContain(
            'Deleted "Legs day".'
        );
        expect(document.activeElement).toBe(undoButton());
        expect(undoButton()!.getAttribute('aria-describedby')).toBe('undo-bar-message');
        // Heard once, from the live region
        expect(element.querySelector('.undo-bar__message')!.getAttribute('aria-hidden')).toBe(
            'true'
        );
    });

    it("leaves focus where the page put it for an offer that's to keep it, still saying it", () => {
        const before = document.activeElement;

        undo.offerUndo({ message: 'Swapped to Goblet squat', undo: () => {}, keepFocus: true });
        fixture.detectChanges();
        TestBed.tick();

        expect(undoButton()).toBeDefined();
        expect(document.activeElement).toBe(before);
        expect(element.querySelector('[role="status"]')!.textContent).toContain(
            'Swapped to Goblet squat.'
        );
    });

    it('takes it back on Undo, and goes', () => {
        const calls = offer();

        undoButton()!.click();
        fixture.detectChanges();

        expect(calls).toEqual({ undone: 1, dismissed: 0 });
        expect(undo.offer()).toBeNull();
    });

    it('closes without undoing on the close button or Escape', () => {
        let calls = offer();
        closeButton()!.click();
        fixture.detectChanges();
        expect(calls).toEqual({ undone: 0, dismissed: 1 });
        expect(undo.offer()).toBeNull();

        calls = offer();
        undoButton()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();
        expect(calls).toEqual({ undone: 0, dismissed: 1 });
    });

    it('says a notice with no Undo, leaving focus where it is', () => {
        const before = document.activeElement;

        undo.notify('Signed in as me@example.com');
        fixture.detectChanges();

        expect(element.querySelector('[role="status"]')!.textContent).toContain(
            'Signed in as me@example.com.'
        );
        expect(undoButton()).toBeUndefined();
        expect(document.activeElement).toBe(before);
        closeButton()!.click();
        fixture.detectChanges();
        expect(bar()).toBeNull();
    });

    it('shows a quiet notice, with its link, outside the live region', async () => {
        const before = document.activeElement;

        undo.notify('Added 2 workouts.', {
            quiet: true,
            link: { label: 'View history', url: '/history' },
        });
        fixture.detectChanges();

        expect(element.querySelector('[role="status"]')!.textContent!.trim()).toBe('');
        // Ends in a full stop already, so it isn't given another; and it's the one copy to hear
        const message = element.querySelector('.undo-bar__message')!;
        expect(message.textContent).toBe('Added 2 workouts.');
        expect(message.hasAttribute('aria-hidden')).toBe(false);
        const link = element.querySelector<HTMLAnchorElement>('a.undo-bar__action')!;
        expect(link.textContent!.trim()).toBe('View history');
        expect(link.getAttribute('href')).toBe('/history');
        expect(link.getAttribute('aria-describedby')).toBe('undo-bar-message');
        expect(document.activeElement).toBe(before);

        link.click();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(TestBed.inject(Router).url).toBe('/history');
        // Seen, so it goes as the page changes
        expect(undo.offer()).toBeNull();
    });

    it("doesn't go by itself after a while", async () => {
        offer();

        await new Promise((resolve) => setTimeout(resolve, 100));
        fixture.detectChanges();

        expect(bar()).not.toBeNull();
    });

    it('lets the offer go when the page changes', async () => {
        const calls = offer();

        await TestBed.inject(Router).navigateByUrl('/history');
        fixture.detectChanges();

        expect(undo.offer()).toBeNull();
        expect(calls).toEqual({ undone: 0, dismissed: 0 });
    });

    it('shows only the latest offer', () => {
        offer('Deleted "Legs day"');
        offer('Deleted "Arms"');

        expect(element.querySelector('.undo-bar__message')!.textContent).toBe('Deleted "Arms".');
    });
});
