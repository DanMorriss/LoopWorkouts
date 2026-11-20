import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TopBarComponent } from './top-bar.component';

@Component({
    imports: [TopBarComponent],
    template: `
        <div>
            <app-top-bar [url]="url()" label="You" />
            <h2>Settings</h2>
            <div style="height: 3000px"></div>
        </div>
    `,
})
class PageComponent {
    url = signal<string | undefined>('/account');
}

describe('TopBarComponent', () => {
    let fixture: ComponentFixture<PageComponent>;

    beforeEach(async () => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        fixture = TestBed.createComponent(PageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    });
    afterEach(() => {
        fixture.destroy();
        scrollTo(0, 0);
    });

    const bar = () => fixture.nativeElement.querySelector('app-top-bar') as HTMLElement;
    const small = () => bar().querySelector<HTMLElement>('.top-bar__title');
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

    async function scrollToY(y: number) {
        scrollTo(0, y);
        dispatchEvent(new Event('scroll'));
        await frame();
        await frame();
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('has ‹ back to the page it slid in over', () => {
        const link = bar().querySelector('.back-link') as HTMLAnchorElement;
        expect(link.getAttribute('href')).toBe('/account');
        expect(link.textContent!.replace('chevron_left', '').trim()).toBe('You');
    });

    it("has no ‹ on a tab's own page", async () => {
        fixture.componentInstance.url.set(undefined);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(bar().querySelector('.back-link')).toBeNull();
    });

    it('is clear, without the title, at the top of the page', () => {
        expect(small()).toBeNull();
        expect(bar().classList).not.toContain('top-bar--under');
    });

    it("shows the page's title, small and hidden from screen readers, once its own has scrolled up behind it", async () => {
        await scrollToY(1000);

        expect(bar().classList).toContain('top-bar--under');
        expect(small()?.textContent).toBe('Settings');
        expect(small()?.getAttribute('aria-hidden')).toBe('true');
        // Still at the top of the screen, as the page scrolls under it
        expect(Math.round(bar().getBoundingClientRect().top)).toBe(0);

        await scrollToY(0);
        await vi.waitFor(() => expect(small()).toBeNull());
        expect(bar().classList).not.toContain('top-bar--under');
    });
});
