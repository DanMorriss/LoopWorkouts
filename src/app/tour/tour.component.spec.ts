import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { TourComponent } from './tour.component';
import { TourName, TourService } from './tour.service';
import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';

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
        <button data-tour="new-workout">New</button>
        <div data-tour="workout">Sprints</div>`,
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
    template: `<h2>Steps</h2>
        <label data-tour="workout-title">Title <input id="title" /></label>
        <div data-tour="step-header">Reps</div>
        <div data-tour="step-exercise">Exercise</div>
        <div data-tour="step-sets">Sets</div>
        <div data-tour="add-steps"><button data-tour="add-step">+ Step</button></div>
        <div data-tour="repeat">Rounds</div>
        <div data-tour="save">Save</div>`,
})
class CreatePage {}

// A page shorter than the screen, with its big part low on it, as the workout page is
@Component({
    template: `<div style="height: 30vh"></div>
        <div data-tour="stage" style="height: 45vh">Bubble</div>
        <button id="workout-pause" data-tour="controls">Pause</button>`,
})
class WorkoutPage {}

@Component({
    imports: [RouterOutlet, TourComponent],
    template: `<main><router-outlet /></main>
        <nav data-tour-tabs>
            @for (path of tabs; track path) {
                <a [attr.data-tour-tab]="path" [href]="path">{{ path }}</a>
            }
        </nav>
        @if (tour.stop() !== null) {
            <app-tour />
        }`,
})
class Host {
    protected readonly tour = TestBed.inject(TourService);
    protected readonly tabs = ['/home', '/library', '/exercises', '/history', '/account'];
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
                    { path: 'setup', component: CreatePage },
                    { path: 'workout', component: WorkoutPage },
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

    /** Where each ring lit up starts, from the top of the screen. */
    const lit = () =>
        [...el().querySelectorAll<HTMLElement>('.tour__light')].map((ring) =>
            Math.round(parseFloat(ring.style.top))
        );
    const tabTop = (path: string) =>
        Math.round(
            el().querySelector(`[data-tour-tab="${path}"]`)!.getBoundingClientRect().top - 1
        );

    /** Lets the page open, the part be found, and the light follow it. */
    async function settle() {
        for (let i = 0; i < 4; i++) {
            await fixture.whenStable();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            fixture.detectChanges();
        }
    }

    async function start(name: TourName = 'app') {
        fixture = TestBed.createComponent(Host);
        tour.start(name);
        fixture.detectChanges();
        await settle();
    }

    it("starts on Today, lighting up Getting started, with focus on the stop's title", async () => {
        await start();

        expect(router.url).toBe('/home');
        expect(text('.tour__count')).toBe('1 of 7');
        expect(text('.tour__title')).toBe('Today');
        expect(text('.tour__text')).toContain('Start here: add a few workouts');
        // Getting started, and Today's tab, the way back to it
        expect(lit()).toEqual([
            Math.round(
                el().querySelector('[data-tour="get-started"]')!.getBoundingClientRect().top - 6
            ),
            tabTop('/home'),
        ]);
        expect(document.activeElement?.id).toBe('tour-title');
        // No Back on the first stop
        expect(button('Back')).toBeUndefined();
        expect(el().querySelector('.tour__card')!.getAttribute('role')).toBe('dialog');
    });

    it('has Progress show example workouts while it is on its stop, and only then', async () => {
        await start();
        for (let i = 0; i < 4; i++) {
            button('Next')!.click();
            await settle();
            expect(tour.sampleHistory()).toBe(router.url === '/history');
        }
        expect(text('.tour__title')).toBe('Progress');

        button('Next')!.click();
        await settle();
        expect(tour.sampleHistory()).toBe(false);
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
        expect(lit().at(-1)).toBe(tabTop('/library'));
        expect(text('.tour__count')).toBe('2 of 7');
        expect(text('.tour__title')).toBe('Workouts');
        expect(text('.tour__text')).toBe('Tap a card for its details, or ▶ to start it.');
        expect(document.activeElement?.id).toBe('tour-title');

        // Then making your own, on the same page
        button('Next')!.click();
        await settle();
        expect(router.url).toBe('/library');
        expect(text('.tour__title')).toBe('Your own workouts');
        expect(lit()[0]).toBe(
            Math.round(
                el().querySelector('[data-tour="new-workout"]')!.getBoundingClientRect().top - 6
            )
        );

        button('Back')!.click();
        await settle();
        expect(text('.tour__title')).toBe('Workouts');

        button('Back')!.click();
        await settle();
        expect(router.url).toBe('/home');
        expect(text('.tour__title')).toBe('Today');
    });

    it('ends back on Today, lighting up the whole tab bar, and Done puts focus on the greeting', async () => {
        await start();
        for (let i = 0; i < 6; i++) {
            button('Next')!.click();
            await settle();
        }

        expect(router.url).toBe('/home');
        expect(text('.tour__title')).toBe("That's it");
        expect(lit()).toEqual([
            Math.round(el().querySelector('nav')!.getBoundingClientRect().top - 3),
        ]);
        expect(text('.tour__text')).toContain('The tabs take you to each part');
        expect(button('Skip tour')).toBeUndefined();

        button('Done')!.click();
        await settle();
        expect(tour.stop()).toBeNull();
        expect(el().querySelector('app-tour')).toBeNull();
        expect(document.activeElement?.id).toBe('home-title');
    });

    it('skips with Escape, staying on the page with focus on its title', async () => {
        await start();
        for (let i = 0; i < 3; i++) {
            button('Next')!.click();
            await settle();
        }

        el()
            .querySelector('.tour__card')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle();

        expect(tour.stop()).toBeNull();
        expect(router.url).toBe('/exercises');
        expect(document.activeElement?.textContent).toBe('Exercises');
        expect(tour.offered()).toBe(false);
    });

    describe("Create's tour (BLD-17)", () => {
        beforeEach(async () => {
            await router.navigateByUrl('/setup');
            await start('create');
        });

        it('stays on Create, lighting up each part and no tab', async () => {
            expect(router.url).toBe('/setup');
            expect(text('.tour__count')).toBe('1 of 8');
            expect(text('.tour__title')).toBe('Make a workout');
            const title = el().querySelector('[data-tour="workout-title"]')!;
            expect(lit()).toEqual([Math.round(title.getBoundingClientRect().top - 6)]);

            button('Next')!.click();
            await settle();
            expect(router.url).toBe('/setup');
            expect(text('.tour__title')).toBe('Steps');
            expect(lit()).toHaveLength(1);
        });

        it('explains supersets on + Step, as Join with next needs a second step', async () => {
            for (let i = 0; i < 5; i++) {
                button('Next')!.click();
                await settle();
            }
            expect(text('.tour__title')).toBe('Supersets');
            expect(text('.tour__text')).toContain('tap Join with next under the first');
            const add = el().querySelector('[data-tour="add-step"]')!;
            expect(lit()).toEqual([Math.round(add.getBoundingClientRect().top - 6)]);
        });

        it('Done leaves focus on the workout title', async () => {
            for (let i = 0; i < 7; i++) {
                button('Next')!.click();
                await settle();
            }
            expect(text('.tour__title')).toBe('Save or start');
            expect(button('Skip tour')).toBeUndefined();

            button('Done')!.click();
            await settle();
            expect(tour.stop()).toBeNull();
            expect(router.url).toBe('/setup');
            expect(document.activeElement?.id).toBe('title');
            // Any room made under the page to bring Save up above the card has gone
            expect(el().querySelector('main')!.style.paddingBottom).toBe('');
        });

        it('Skip tour leaves focus on the workout title too', async () => {
            button('Skip tour')!.click();
            await settle();

            expect(tour.stop()).toBeNull();
            expect(document.activeElement?.id).toBe('title');
        });
    });

    describe("the workout page's tour (RUN-13)", () => {
        beforeEach(async () => {
            fakeReducedMotion(true);
            await router.navigateByUrl('/workout');
            await start('workout');
        });

        it('scrolls a part low on a page shorter than the screen up above the card', () => {
            const stage = el().querySelector('[data-tour="stage"]')!.getBoundingClientRect();
            const card = el().querySelector('.tour__card')!.getBoundingClientRect();

            expect(text('.tour__title')).toBe('Your first workout');
            expect(stage.top).toBeGreaterThanOrEqual(0);
            expect(stage.bottom).toBeLessThanOrEqual(card.top);
            expect(lit()).toEqual([Math.round(stage.top - 6)]);
        });

        it('Done leaves focus on Pause, with the room under the page gone', async () => {
            for (let i = 0; i < 5; i++) {
                button('Next')!.click();
                await settle();
            }
            expect(text('.tour__title')).toBe('Off you go');

            button('Done')!.click();
            await settle();
            expect(tour.stop()).toBeNull();
            expect(document.activeElement?.id).toBe('workout-pause');
            expect(el().querySelector('main')!.style.paddingBottom).toBe('');
        });
    });
});
