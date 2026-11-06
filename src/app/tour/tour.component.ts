import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    DOCUMENT,
    effect,
    ElementRef,
    inject,
    Injector,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { TOUR_STOPS } from './tour-stops';
import { TourService } from './tour.service';

/** How long a stop waits for its part to show, e.g. on a page still loading. */
const WAIT_MS = 2500;
/** How long the light follows its part while the page scrolls it into view. */
const FOLLOW_MS = 900;
/** Room round the part lit up, and between it and the screen's edges or the card. */
const PADDING = 6;
const MARGIN = 12;

/** Where the light is, on the screen. */
interface Light {
    top: number;
    left: number;
    width: number;
    height: number;
}

/**
 * The tour of the app (NAV-8), over every page while it's on: it opens each stop's page,
 * lights up its part (a ring whose shadow dims the rest) and says what it is in a card at the
 * bottom, with Back, Skip tour and Next. The page can't be pressed meanwhile. Not `app-dialog`,
 * which is a card in the middle of the page that a click outside closes; focus is trapped in
 * the card the same way.
 */
@Component({
    selector: 'app-tour',
    imports: [CdkTrapFocus],
    templateUrl: './tour.component.html',
    styleUrl: './tour.component.scss',
    host: {
        '(window:scroll)': 'measure()',
        '(window:resize)': 'measure()',
        '(keydown.escape)': 'skip()',
    },
})
export class TourComponent {
    private readonly tour = inject(TourService);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private readonly reducedMotion = injectPrefersReducedMotion();
    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');
    private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

    protected readonly count = TOUR_STOPS.length;
    protected readonly index = computed(() => this.tour.stop() ?? 0);
    protected readonly stop = computed(() => TOUR_STOPS[this.index()]);
    protected readonly last = computed(() => this.index() === TOUR_STOPS.length - 1);

    /** The part lit up, once found, and what's said about it. */
    private readonly part = signal<{ element: Element; text: string } | null>(null);
    protected readonly text = computed(() => this.part()?.text ?? this.stop().text);
    protected readonly light = signal<Light | null>(null);

    /** Each stop's search for its part, so an earlier one still looking gives up. */
    private search = 0;
    private frame = 0;

    constructor() {
        effect(() => {
            const index = this.tour.stop();
            if (index !== null) {
                untracked(() => void this.show(index));
            }
        });
        inject(DestroyRef).onDestroy(() => {
            this.search++;
            cancelAnimationFrame(this.frame);
        });
    }

    protected next() {
        if (this.last()) {
            this.finish('home-title');
        } else {
            this.tour.next();
        }
    }

    protected back() {
        this.tour.back();
    }

    /** Ends the tour where it is, with focus on the page's title. */
    protected skip() {
        const heading = this.document.querySelector<HTMLElement>('main h2');
        if (heading && !heading.hasAttribute('tabindex')) {
            heading.setAttribute('tabindex', '-1');
        }
        this.finish(heading);
    }

    /** Keeps the light on its part as the page scrolls or the screen changes size. */
    protected measure() {
        const part = this.part();
        if (!part) {
            this.light.set(null);
            return;
        }
        const box = part.element.getBoundingClientRect();
        // Above the card, and on the screen
        const floor = this.card().nativeElement.getBoundingClientRect().top - MARGIN;
        const top = Math.max(MARGIN, box.top - PADDING);
        const bottom = Math.min(floor, box.bottom + PADDING);
        this.light.set(
            bottom - top < 24
                ? null
                : {
                      top,
                      left: box.left - PADDING,
                      width: box.width + PADDING * 2,
                      height: bottom - top,
                  }
        );
    }

    private finish(focus: string | HTMLElement | null) {
        const element = typeof focus === 'string' ? this.document.getElementById(focus) : focus;
        element?.focus();
        this.tour.end();
    }

    /** Opens the stop's page, then looks for its part there and lights it up. */
    private async show(index: number) {
        const search = ++this.search;
        const stop = TOUR_STOPS[index];
        this.part.set(null);
        this.light.set(null);
        this.focusTitle();
        await this.router.navigateByUrl(stop.path);
        const started = performance.now();
        while (search === this.search && stop.parts.length) {
            const found = stop.parts
                .map((part) => ({
                    element: this.document.querySelector(`main [data-tour="${part.part}"]`),
                    text: part.text,
                }))
                .find((part) => part.element);
            if (found?.element) {
                this.part.set({ element: found.element, text: found.text });
                this.bringIntoView(found.element);
                return;
            }
            if (performance.now() - started > WAIT_MS) {
                return;
            }
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }
    }

    /**
     * Scrolls the part to the middle of the screen above the card, so what's round it shows
     * too, or to its top if it's too tall for that; the light follows it.
     */
    private bringIntoView(element: Element) {
        const box = element.getBoundingClientRect();
        const room = this.card().nativeElement.getBoundingClientRect().top;
        const at = Math.max(MARGIN * 2, (room - box.height) / 2);
        window.scrollTo({
            top: Math.max(0, box.top + window.scrollY - at),
            behavior: this.reducedMotion() ? 'auto' : 'smooth',
        });
        const until = performance.now() + FOLLOW_MS;
        const follow = () => {
            this.measure();
            if (performance.now() < until) {
                this.frame = requestAnimationFrame(follow);
            }
        };
        cancelAnimationFrame(this.frame);
        follow();
    }

    /** The new stop's title takes focus, so a screen reader reads it and its line. */
    private focusTitle() {
        afterNextRender(() => this.title().nativeElement.focus(), { injector: this.injector });
    }
}
