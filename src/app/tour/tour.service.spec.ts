import { TestBed } from '@angular/core/testing';
import { TOUR_KEY, TourService } from './tour.service';

describe('TourService (NAV-8)', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('is offered until it is taken, then not again on this device', () => {
        const tour = TestBed.inject(TourService);
        expect(tour.offered()).toBe(true);

        tour.start();

        expect(tour.offered()).toBe(false);
        expect(tour.stop()).toBe(0);
        expect(localStorage.getItem(TOUR_KEY)).toBe('seen');
    });

    it('is not offered once turned down', () => {
        TestBed.inject(TourService).stopOffering();
        TestBed.resetTestingModule();

        expect(TestBed.inject(TourService).offered()).toBe(false);
    });

    it('steps forwards and back between its stops, and ends', () => {
        const tour = TestBed.inject(TourService);
        tour.start();
        tour.back();
        expect(tour.stop()).toBe(0);

        tour.next();
        tour.next();
        expect(tour.stop()).toBe(2);
        tour.back();
        expect(tour.stop()).toBe(1);

        tour.end();
        expect(tour.stop()).toBeNull();
        tour.next();
        expect(tour.stop()).toBeNull();
    });
});
