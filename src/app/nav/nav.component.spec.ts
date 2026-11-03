import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { WorkoutStore } from '../shared/state/workout-store.service';
import { makeWorkout } from '../shared/testing/make-workout';
import { NavComponent } from './nav.component';

@Component({ template: '' })
class BlankPage {}

describe('NavComponent', () => {
    let fixture: ComponentFixture<NavComponent>;
    let element: HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NavComponent],
            providers: [provideRouter([{ path: '**', component: BlankPage }])],
        }).compileComponents();

        fixture = TestBed.createComponent(NavComponent);
        element = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => {
        // A run started here would otherwise carry over into the next test
        sessionStorage.clear();
        localStorage.clear();
    });

    function runWorkout(name: string) {
        const store = TestBed.inject(WorkoutStore);
        store.setActiveWorkout(store.addWorkout(makeWorkout({ title: name })));
    }

    async function go(url: string) {
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
    }

    describe("the workout's title", () => {
        const title = () => element.querySelector('h1') as HTMLElement;
        const workoutTitle = () => title().querySelector('.site-title__workout');

        it('is in the heading on the workout page, for phones to show in place of Loop Workouts', async () => {
            runWorkout('  Sprints ');
            await go('/workout');

            expect(title().classList).toContain('site-title--workout');
            expect(workoutTitle()?.textContent).toBe('Sprints');
        });

        it('is left out on other pages', async () => {
            runWorkout('Sprints');
            await go('/library');

            expect(title().classList).not.toContain('site-title--workout');
            expect(workoutTitle()).toBeNull();
            expect(title().textContent!.trim()).toBe('Loop Workouts');
        });

        it('is left out for an untitled workout, which keeps Loop Workouts', async () => {
            runWorkout('');
            await go('/workout');

            expect(workoutTitle()).toBeNull();
        });
    });

    describe('the back link on the workout page', () => {
        const back = () => element.querySelector<HTMLAnchorElement>('.nav__back');

        it('is only on the workout page, where there are no tabs', async () => {
            await go('/library');
            expect(back()).toBeNull();

            await go('/workout');
            expect(back()).not.toBeNull();
        });

        it('goes back to the page you came from, named for its tab', async () => {
            await go('/history');
            await go('/workout');

            expect(back()!.getAttribute('href')).toBe('/history');
            expect(back()!.getAttribute('aria-label')).toBe('Back to Progress');
        });

        it('keeps the address of the page you came from, e.g. a muscle filter', async () => {
            await go('/exercises?muscles=quads,glutes');
            await go('/workout');

            expect(back()!.getAttribute('href')).toBe('/exercises?muscles=quads,glutes');
            expect(back()!.getAttribute('aria-label')).toBe('Back to Exercises');
        });

        it('names setup for the Workouts tab it belongs to', async () => {
            await go('/setup');
            await go('/workout');

            expect(back()!.getAttribute('aria-label')).toBe('Back to Workouts');
        });

        it('goes to the library when the workout page was opened directly', async () => {
            await go('/workout');

            expect(back()!.getAttribute('href')).toBe('/library');
        });
    });
});
