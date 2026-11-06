import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Component } from '@angular/core';
import { AppComponent } from './app.component';
import { TOUR_LOADER } from './tour/tour-loader';
import { TourService } from './tour/tour.service';

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RouterModule.forRoot([]), AppComponent],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it(`should have as title 'loop-workouts'`, () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app.title).toEqual('loop-workouts');
    });

    describe('the tour (NAV-8)', () => {
        @Component({ selector: 'app-fake-tour', template: 'Tour' })
        class FakeTour {}

        const settle = async (fixture: {
            whenStable(): Promise<unknown>;
            detectChanges(): void;
        }) => {
            fixture.detectChanges();
            await fixture.whenStable();
            await new Promise((resolve) => setTimeout(resolve));
            fixture.detectChanges();
        };

        it('loads it once it starts, and takes it away as it ends', async () => {
            TestBed.overrideProvider(TOUR_LOADER, { useValue: () => Promise.resolve(FakeTour) });
            const fixture = TestBed.createComponent(AppComponent);
            const tour = TestBed.inject(TourService);
            await settle(fixture);
            expect(fixture.nativeElement.querySelector('app-fake-tour')).toBeNull();

            tour.start();
            await settle(fixture);
            expect(fixture.nativeElement.querySelector('app-fake-tour')).not.toBeNull();

            tour.end();
            await settle(fixture);
            expect(fixture.nativeElement.querySelector('app-fake-tour')).toBeNull();
        });

        it("ends it if its code won't load, so it can be started again", async () => {
            let fail = true;
            TestBed.overrideProvider(TOUR_LOADER, {
                useValue: () =>
                    fail ? Promise.reject(new Error('Network down')) : Promise.resolve(FakeTour),
            });
            const fixture = TestBed.createComponent(AppComponent);
            const tour = TestBed.inject(TourService);
            await settle(fixture);

            tour.start();
            await settle(fixture);
            expect(tour.stop()).toBeNull();

            fail = false;
            tour.start();
            await settle(fixture);
            expect(fixture.nativeElement.querySelector('app-fake-tour')).not.toBeNull();
        });
    });
});
