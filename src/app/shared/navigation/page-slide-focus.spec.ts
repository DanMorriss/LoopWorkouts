import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';

import { fakeReducedMotion } from '../testing/fake-reduced-motion';
import { PageSlide } from './page-slide';

/** A list of exercises, each sliding in its page. */
@Component({
    template: `
        <h1>Exercises</h1>
        @for (id of ids; track id) {
            <a [href]="'/exercises/' + id" (click)="slide.follow($event, '/exercises/' + id, 'in')">
                {{ id }}
            </a>
        }
        <button type="button" (click)="slide.navigate('/exercises/new', 'in')">New</button>
    `,
})
class ListPage {
    protected readonly slide = inject(PageSlide);
    protected readonly ids = ['squat', 'plank', 'lunge'];
}

/** An exercise's page, with its way back. */
@Component({
    template: `<a href="/exercises" (click)="slide.follow($event, '/exercises', 'out')">‹ Back</a>`,
})
class ExercisePage {
    protected readonly slide = inject(PageSlide);
}

@Component({ imports: [RouterOutlet], template: '<main><router-outlet /></main>' })
class Shell {}

describe('PageSlide and focus', () => {
    let router: Router;
    let shell: HTMLElement;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                // A Back that doesn't take the test's own page back
                provideLocationMocks(),
                provideRouter([
                    { path: 'exercises', component: ListPage },
                    { path: 'exercises/:id', component: ExercisePage },
                ]),
            ],
        });
        router = TestBed.inject(Router);
        // As the app does as it starts, so Back reaches the router
        router.setUpLocationChangeListener();
        const fixture = TestBed.createComponent(Shell);
        shell = fixture.nativeElement;
        document.body.appendChild(shell);
        await router.navigateByUrl('/exercises');
        fixture.detectChanges();
        await fixture.whenStable();
        return () => fixture.destroy();
    });

    const landed = (url: string) =>
        vi.waitFor(() => expect(router.url).toBe(url), { timeout: 2000 });
    const link = (text: string) =>
        [...shell.querySelectorAll<HTMLElement>('a, button')].find(
            (element) => element.textContent?.trim() === text
        )!;
    /** Waits till the element named `text` has focus. */
    const focusOn = (text: string) =>
        vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe(text), {
            timeout: 2000,
        });

    for (const reduced of [false, true]) {
        it(`puts focus back on the link that opened the page${reduced ? ', with reduced motion' : ''}`, async () => {
            fakeReducedMotion(reduced);

            link('plank').focus();
            link('plank').click();
            await landed('/exercises/plank');
            await vi.waitFor(() => expect(link('‹ Back')).toBeTruthy());

            link('‹ Back').click();
            await landed('/exercises');
            await focusOn('plank');
        });
    }

    it('puts it back on a link that was tapped, though a tap gives it no focus', async () => {
        fakeReducedMotion(false);

        // As Safari: the tap clicks the link without focusing it
        link('lunge').click();
        await landed('/exercises/lunge');
        await vi.waitFor(() => expect(link('‹ Back')).toBeTruthy());
        link('‹ Back').click();

        await landed('/exercises');
        await focusOn('lunge');
    });

    it('puts it back on a button that slid a page in from code', async () => {
        fakeReducedMotion(false);

        link('New').focus();
        link('New').click();
        await landed('/exercises/new');
        await vi.waitFor(() => expect(link('‹ Back')).toBeTruthy());
        TestBed.inject(PageSlide).navigate('/exercises', 'out');

        await landed('/exercises');
        await focusOn('New');
    });

    it("puts it back after the browser's own Back, too", async () => {
        fakeReducedMotion(false);

        link('squat').focus();
        link('squat').click();
        await landed('/exercises/squat');
        await vi.waitFor(() => expect(link('‹ Back')).toBeTruthy());
        TestBed.inject(Location).back();

        await landed('/exercises');
        await focusOn('squat');
    });
});
