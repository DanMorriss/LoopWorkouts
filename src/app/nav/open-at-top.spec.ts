import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { openNewPagesAtTop } from './open-at-top';
import { PageSlide } from './page-slide';

@Component({ template: '' })
class BlankPage {}

describe('openNewPagesAtTop', () => {
    let router: Router;
    let tall: HTMLElement;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideLocationMocks(),
                provideRouter([{ path: '**', component: BlankPage }]),
            ],
        });
        router = TestBed.inject(Router);
        router.setUpLocationChangeListener();
        await router.navigateByUrl('/home');
        TestBed.runInInjectionContext(openNewPagesAtTop);

        tall = document.createElement('div');
        tall.style.height = '5000px';
        document.body.append(tall);
    });

    afterEach(() => {
        tall.remove();
        window.scrollTo({ top: 0, behavior: 'instant' });
    });

    const scrollDown = () => {
        window.scrollTo({ top: 600, behavior: 'instant' });
        expect(window.scrollY).toBe(600);
    };

    it('opens a new page at its top', async () => {
        scrollDown();

        await router.navigateByUrl('/library');

        expect(window.scrollY).toBe(0);
    });

    it('stays where it is when only the address of the page changes', async () => {
        scrollDown();

        await router.navigateByUrl('/home?muscles=quads');

        expect(window.scrollY).toBe(600);
    });

    it('leaves the scroll to the browser on its own back and forward', async () => {
        await router.navigateByUrl('/library');
        scrollDown();

        TestBed.inject(Location).back();
        await vi.waitFor(() => expect(router.url).toBe('/home'));

        expect(window.scrollY).toBe(600);
    });

    it('still lets a page sliding back return to where it was left', async () => {
        fakeReducedMotion(true);
        const slide = TestBed.inject(PageSlide);
        scrollDown();

        slide.navigate('/plan', 'in');
        await vi.waitFor(() => expect(router.url).toBe('/plan'), { timeout: 2000 });
        await vi.waitFor(() => expect(window.scrollY).toBe(0));

        slide.navigate('/home', 'out');
        await vi.waitFor(() => expect(router.url).toBe('/home'), { timeout: 2000 });
        await vi.waitFor(() => expect(window.scrollY).toBe(600));
    });
});
