import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { PageSlide } from '../nav/page-slide';

describe('the Privacy notice and Terms of use', () => {
    const navigate = vi.fn();

    beforeEach(() => {
        navigate.mockReset();
        TestBed.configureTestingModule({
            providers: [
                provideRouter(routes),
                {
                    provide: PageSlide,
                    useValue: {
                        // As the real one does, so the link doesn't load the page
                        follow: (event: MouseEvent, ...rest: unknown[]) => {
                            event.preventDefault();
                            navigate(...rest);
                        },
                        navigate,
                    },
                },
            ],
        });
    });

    it('has a privacy notice, saying what stays on the device and what syncs', async () => {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/privacy');
        const page: HTMLElement = harness.routeNativeElement!;

        expect(page.querySelector('h2')!.textContent!.trim()).toBe('Privacy notice');
        expect(page.querySelector('[aria-labelledby="legal-title"]')).not.toBeNull();
        expect(page.textContent).toContain('without one, none of it is sent anywhere');
        expect(page.textContent).toContain("Syncing, while you're signed in.");
        expect(page.textContent).toContain('Counting visits.');
        expect(page.textContent).toContain('Loop Workouts is run by Dan Morriss');
        expect(page.querySelector('a[href="https://ico.org.uk/make-a-complaint/"]')).not.toBeNull();
        expect(page.textContent).toContain('Last updated');
    });

    it('has terms of use, linking to the privacy notice', async () => {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/terms');
        const page: HTMLElement = harness.routeNativeElement!;

        expect(page.querySelector('h2')!.textContent!.trim()).toBe('Terms of use');
        expect(page.textContent).toContain('the law of England and Wales');
        page.querySelector<HTMLAnchorElement>('a[href="/privacy"]')!.click();
        await harness.fixture.whenStable();

        expect(TestBed.inject(Router).url).toBe('/privacy');
    });

    it('goes back to Account, sliding out', async () => {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/privacy');
        const back = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.back-link')!;

        expect(back.getAttribute('href')).toBe('/account');
        expect(back.textContent).toContain('You');
        back.click();

        expect(navigate).toHaveBeenCalledWith('/account', 'out');
    });
});
