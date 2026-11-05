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
});
