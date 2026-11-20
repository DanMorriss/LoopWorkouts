import {
    afterNextRender,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    signal,
} from '@angular/core';
import { PageSlide } from '../../shared/navigation/page-slide';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * The bar at the top of a page, kept there as it scrolls (NAV-11): the ‹ link back to the page
 * it slid in over (an exercise over the list, Settings over You), where it has one, and the
 * page's title, small, once its own big title has scrolled up out of sight, as an iPhone's
 * large titles do. Clear over the top of the page, it turns to the bars' frosted material once
 * the page scrolls under it, softening into a blur below rather than ending in a hard line.
 *
 * Put it first in the page, in the box that holds the whole page, so it sticks for as long as
 * the page scrolls. The title it shows is the page's own: the first <h2> after it there.
 */
@Component({
    selector: 'app-top-bar',
    imports: [IconComponent],
    template: `
        @if (url(); as url) {
            <a [href]="url" class="back-link" (click)="slide.follow($event, url, 'out')">
                <app-icon>chevron_left</app-icon>
                <!-- The space keeps it apart from the icon's name for anything reading the text -->
                <span class="back-link__label"> {{ label() }}</span>
            </a>
        }
        <!-- The page's heading says it to a screen reader already -->
        @if (titleShown()) {
            <span
                class="top-bar__title"
                aria-hidden="true"
                animate.enter="top-bar__title--in"
                animate.leave="top-bar__title--out"
                >{{ title() }}</span
            >
        }
    `,
    styleUrl: './top-bar.component.scss',
    host: { '[class.top-bar--under]': 'under()' },
})
export class TopBarComponent {
    /** Where ‹ goes, e.g. "/account"; none on a tab's own page. */
    readonly url = input<string>();
    /** The page it goes back to, e.g. "You". */
    readonly label = input('');

    protected readonly slide = inject(PageSlide);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    /** The page has scrolled under it, so it's frosted. */
    protected readonly under = signal(false);
    /** The page's big title has gone up behind it, so it shows the title small. */
    protected readonly titleShown = signal(false);
    protected readonly title = signal('');

    constructor() {
        let frame = 0;
        const onScroll = () => {
            if (!frame) {
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    this.check();
                });
            }
        };
        afterNextRender(() => {
            addEventListener('scroll', onScroll, { passive: true });
            addEventListener('resize', onScroll, { passive: true });
            this.check();
        });
        inject(DestroyRef).onDestroy(() => {
            cancelAnimationFrame(frame);
            removeEventListener('scroll', onScroll);
            removeEventListener('resize', onScroll);
        });
    }

    private check() {
        const bar = this.host.getBoundingClientRect();
        this.under.set(scrollY > 0 && bar.top <= 0);
        const heading = this.heading();
        this.titleShown.set(!!heading && heading.getBoundingClientRect().bottom <= bar.bottom);
        this.title.set(heading?.textContent?.trim() ?? '');
    }

    /** The page's title: the first <h2> after the bar in the box that holds them. */
    private heading(): HTMLElement | undefined {
        const headings = this.host.parentElement?.querySelectorAll<HTMLElement>('h2') ?? [];
        return [...headings].find(
            (heading) =>
                this.host.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING
        );
    }
}
