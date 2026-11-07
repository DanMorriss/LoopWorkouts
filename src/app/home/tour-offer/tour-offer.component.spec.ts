import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourService } from '../../tour/tour.service';
import { TourOfferComponent } from './tour-offer.component';

@Component({
    imports: [TourOfferComponent],
    template: `<h2 id="home-title" tabindex="-1">Good evening</h2>
        <app-tour-offer />`,
})
class Host {}

describe('TourOfferComponent (NAV-8)', () => {
    let fixture: ComponentFixture<Host>;

    beforeEach(() => localStorage.clear());
    afterEach(() => {
        fixture?.destroy();
        localStorage.clear();
    });

    function create() {
        fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
    }
    const el = () => fixture.nativeElement as HTMLElement;
    const button = (name: string) =>
        [...el().querySelectorAll<HTMLButtonElement>('button')].find(
            (b) => b.textContent!.trim() === name
        )!;

    it('offers the tour, and Take the tour starts it', () => {
        create();
        expect(el().querySelector('.offer__title')!.textContent).toBe(
            'New here? Take a 1-minute tour'
        );

        button('Take the tour').click();
        fixture.detectChanges();

        expect(TestBed.inject(TourService).stop()).toBe(0);
        expect(el().querySelector('.offer')).toBeNull();
    });

    it('goes with Not now, putting focus on the greeting, and stays gone', async () => {
        create();

        button('Not now').click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(el().querySelector('.offer')).toBeNull();
        expect(document.activeElement?.id).toBe('home-title');
        expect(TestBed.inject(TourService).stop()).toBeNull();

        fixture.destroy();
        TestBed.resetTestingModule();
        create();
        expect(el().querySelector('.offer')).toBeNull();
    });
});
