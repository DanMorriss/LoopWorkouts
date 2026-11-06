import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { TourComponent } from './tour.component';
import { TourService } from './tour.service';

// Stand-ins for the pages, each with the part the tour lights up
@Component({
    template: `<h2 id="home-title" tabindex="-1">Good evening</h2>
        @if (planned) {
            <div data-tour="week">The week</div>
        } @else {
            <div data-tour="get-started">Get started</div>
        }`,
})
class TodayPage {
    static planned = false;
    protected readonly planned = TodayPage.planned;
}

@Component({
    template: `<h2>Workouts</h2>
        <button data-tour="workout-start">Start</button>`,
})
class WorkoutsPage {}

@Component({
    template: `<h2>Exercises</h2>
        <a data-tour="exercise" href="/">Squat</a>`,
})
class ExercisesPage {}

@Component({
    template: `<h2>Progress</h2>
        <p data-tour="progress-empty">Nothing yet</p>`,
})
class ProgressPage {}

@Component({
    template: `<h2>You</h2>
        <section data-tour="sync">Sync</section>`,
})
class YouPage {}

@Component({
    imports: [RouterOutlet, TourComponent],
    template: `<main><router-outlet /></main>
        @if (tour.stop() !== null) {
            <app-tour />
        }`,
})
class Host {
    protected readonly tour = TestBed.inject(TourService);
}

describe('TourComponent (NAV-8)', () => {
    let fixture: ComponentFixture<Host>;
    let tour: TourService;
    let router: Router;

    beforeEach(async () => {
        localStorage.clear();
        TodayPage.planned = false;
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'home', component: TodayPage },
                    { path: 'library', component: WorkoutsPage },
                    { path: 'exercises', component: ExercisesPage },
                    { path: 'history', component: ProgressPage },
                    { path: 'account', component: YouPage },
                ]),
            ],
        });
        tour = TestBed.inject(TourService);
        router = TestBed.inject(Router);
    });
    afterEach(() => {
        fixture?.destroy();
        localStorage.clear();
    });

    const el = () => fixture.nativeElement as HTMLElement;
    const text = (selector: string) => el().querySelector(selector)?.textContent?.trim();
    const button = (name: string) =>
        [...el().querySelectorAll<HTMLButtonElement>('.tour__card button')].find(
            (b) => b.textContent!.trim() === name
        );

    /** Lets the page open, the part be found, and the light follow it. */
    async function settle() {
        for (let i = 0; i < 4; i++) {
            await fixture.whenStable();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            fixture.detectChanges();
        }
    }

    async function start() {
        fixture = TestBed.createComponent(Host);
        tour.start();
        fixture.detectChanges();
        await settle();
    }

    it("starts on Today, lighting up Getting started, with focus on the stop's title", async () => {
        await start();

        expect(router.url).toBe('/home');
        expect(text('.tour__count')).toBe('1 of 6');
        expect(text('.tour__title')).toBe('Today');
        expect(text('.tour__text')).toContain('Start here: add a few workouts');
        expect(el().querySelector('.tour__light')).not.toBeNull();
        expect(document.activeElement?.id).toBe('tour-title');
        // No Back on the first stop
        expect(button('Back')).toBeUndefined();
        expect(el().querySelector('.tour__card')!.getAttribute('role')).toBe('dialog');
    });

    it('lights up the week on Today once there are workouts or a plan', async () => {
        TodayPage.planned = true;
        await start();

        expect(text('.tour__text')).toBe(
            "Your week: what's planned and what's done. Edit plan changes it."
        );
    });

    it('opens each page in turn with Next, and goes back with Back', async () => {
        await start();

        button('Next')!.click();
        await settle();
        expect(router.url).toBe('/library');
        expect(text('.tour__count')).toBe('2 of 6');
        expect(text('.tour__title')).toBe('Workouts');
        expect(document.activeElement?.id).toBe('tour-title');

        button('Back')!.click();
        await settle();
        expect(router.url).toBe('/home');
        expect(text('.tour__title')).toBe('Today');
    });

    it('ends back on Today, lighting up nothing, and Done puts focus on the greeting', async () => {
        await start();
        for (let i = 0; i < 5; i++) {
            button('Next')!.click();
            await settle();
        }

        expect(router.url).toBe('/home');
        expect(text('.tour__title')).toBe("That's it");
        expect(el().querySelector('.tour__light')).toBeNull();
        expect(button('Skip tour')).toBeUndefined();

        button('Done')!.click();
        await settle();
        expect(tour.stop()).toBeNull();
        expect(el().querySelector('app-tour')).toBeNull();
        expect(document.activeElement?.id).toBe('home-title');
    });

    it('skips with Escape, staying on the page with focus on its title', async () => {
        await start();
        button('Next')!.click();
        await settle();
        button('Next')!.click();
        await settle();

        el()
            .querySelector('.tour__card')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle();

        expect(tour.stop()).toBeNull();
        expect(router.url).toBe('/exercises');
        expect(document.activeElement?.textContent).toBe('Exercises');
        expect(tour.offered()).toBe(false);
    });
});
