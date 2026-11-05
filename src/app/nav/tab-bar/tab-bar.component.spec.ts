import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { TabBarComponent } from './tab-bar.component';

@Component({ template: '' })
class BlankPage {}

describe('TabBarComponent', () => {
    let fixture: ComponentFixture<TabBarComponent>;
    let element: HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TabBarComponent],
            providers: [provideRouter([{ path: '**', component: BlankPage }])],
        }).compileComponents();

        fixture = TestBed.createComponent(TabBarComponent);
        element = fixture.nativeElement;
        fixture.detectChanges();
    });

    const tabs = () => [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    const label = (tab: HTMLAnchorElement) =>
        tab.querySelector('.tab-bar__label')!.textContent!.trim();
    const current = () => tabs().map((tab) => [label(tab), tab.getAttribute('aria-current')]);

    async function go(url: string) {
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
    }

    it('is a main navigation linking to every page, labelled under its icon', () => {
        expect(element.querySelector('nav')!.getAttribute('aria-label')).toBe('Main');
        expect(tabs().map((tab) => [label(tab), tab.getAttribute('href')])).toEqual([
            ['Today', '/home'],
            ['Workouts', '/library'],
            ['Exercises', '/exercises'],
            ['Progress', '/history'],
            ['You', '/account'],
        ]);
    });

    it('marks the page you are on, and slides the highlight to it', async () => {
        await go('/history');

        expect(current().filter(([, mark]) => mark)).toEqual([['Progress', 'page']]);
        expect(element.querySelector('.tab-bar__tab--chosen')!.getAttribute('href')).toBe(
            '/history'
        );
        expect(element.querySelector<HTMLElement>('nav')!.style.getPropertyValue('--chosen')).toBe(
            '3'
        );
    });

    it('marks Workouts while making a workout or browsing the ready-made ones', async () => {
        for (const url of [
            '/setup',
            '/ready-made',
            '/ready-made/gym-legs',
            '/library/some-workout',
            '/library/some-workout/plank',
        ]) {
            await go(url);
            expect(current().filter(([, mark]) => mark)).toEqual([['Workouts', 'true']]);
        }
    });

    it('marks Today on the weekly plan, which slides in over it', async () => {
        await go('/plan');
        expect(current().filter(([, mark]) => mark)).toEqual([['Today', 'true']]);
    });

    it("marks Today on a ready-made plan's workout, which slides in over its card", async () => {
        await go('/ready-made-plans/gym-legs?from=today');
        expect(current().filter(([, mark]) => mark)).toEqual([['Today', 'true']]);
    });

    it('marks Workouts on its own page, as the place you are in', async () => {
        await go('/library');

        expect(tabs()[1].getAttribute('aria-current')).toBe('page');
    });

    it("marks Exercises on an exercise's page, and keeps the filter's address out of it", async () => {
        await go('/exercises/builtin:squat');
        expect(tabs()[2].getAttribute('aria-current')).toBe('true');

        await go('/exercises?muscles=quads');
        expect(tabs()[2].getAttribute('aria-current')).toBe('page');
    });

    it('marks You in Settings and the legal pages, which slide in over it', async () => {
        for (const url of ['/settings', '/help', '/privacy', '/terms']) {
            await go(url);
            expect(current().filter(([, mark]) => mark)).toEqual([['You', 'true']]);
        }
    });

    it('is not on the workout page, which has the whole screen', async () => {
        await go('/workout');

        expect(element.querySelector('nav')).toBeNull();
    });

    it('is not on the welcome screen, which is one choice', async () => {
        await go('/welcome');

        expect(element.querySelector('nav')).toBeNull();
    });
});
