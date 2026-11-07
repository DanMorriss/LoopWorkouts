import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchFieldComponent } from './search-field.component';

@Component({
    imports: [SearchFieldComponent],
    template: `<app-search-field inputId="find" label="Find" [(value)]="query" />`,
})
class HostComponent {
    readonly query = signal('squat');
}

describe('SearchFieldComponent', () => {
    it('is labelled, shows its value, and sends back what is typed', async () => {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        const field = fixture.nativeElement.querySelector('#find') as HTMLInputElement;

        expect(field.labels![0].textContent).toContain('Find');
        expect(field.value).toBe('squat');

        field.value = 'lunge';
        field.dispatchEvent(new Event('input'));
        expect(fixture.componentInstance.query()).toBe('lunge');

        fixture.componentInstance.query.set('');
        await fixture.whenStable();
        expect(field.value).toBe('');
    });

    it('shows an × only with something typed, which clears it and keeps focus in the box', async () => {
        const fixture = TestBed.createComponent(HostComponent);
        await fixture.whenStable();
        const el = fixture.nativeElement as HTMLElement;
        const clear = () =>
            el.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');

        clear()!.click();
        await fixture.whenStable();

        expect(fixture.componentInstance.query()).toBe('');
        expect(document.activeElement).toBe(el.querySelector('#find'));
        expect(clear()).toBeNull();
    });
});
