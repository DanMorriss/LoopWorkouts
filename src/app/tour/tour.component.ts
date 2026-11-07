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

/** Where a light is, on the screen: on the stop's part, or its tab. */
interface Light {
    id: 'part' | 'tab';
    top: number;
    left: number;
    width: number;
    height: number;
    radius: number;
}

/**
 * The tour of the app (NAV-8), over every page while it's on: it opens each stop's page,
 * lights up its part and the tab it's under (the rest dimmed), and says what it is in a card
 * just above the tab bar, with Back, Skip tour and Next. The page can't be pressed meanwhile. Not `app-dialog`,
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
    protected readonly lights = signal<Light[]>([]);

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

    /** Keeps the lights on the part and its tab as the page scrolls or the screen changes size. */
    protected measure() {
        const lights: Light[] = [];
        const part = this.part()?.element.getBoundingClientRect();
        if (part) {
            // Above the card, and on the screen
            const floor = this.card().nativeElement.getBoundingClientRect().top - MARGIN;
            const top = Math.max(MARGIN, part.top - PADDING);
            const bottom = Math.min(floor, part.bottom + PADDING);
            if (bottom - top >= 24) {
                lights.push({
                    id: 'part',
                    top,
                    left: part.left - PADDING,
                    width: part.width + PADDING * 2,
                    height: bottom - top,
                    radius: 14,
                });
            }
        }
        // The tab that takes you there, or the whole tab bar at the end, as pills
        const stop = this.stop();
        const tab = this.document
            .querySelector(
                stop.tab === 'all' ? '[data-tour-tabs]' : `[data-tour-tab="${stop.path}"]`
            )
            ?.getBoundingClientRect();
        if (tab) {
            const gap = stop.tab === 'all' ? 3 : 1;
            lights.push({
                id: 'tab',
                top: tab.top - gap,
                left: tab.left - gap,
                width: tab.width + gap * 2,
                height: tab.height + gap * 2,
                radius: (tab.height + gap * 2) / 2,
            });
        }
        this.lights.set(lights);
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
        this.focusTitle();
        // Before the page opens, so it opens with its examples
        this.tour.sampleHistory.set(stop.sampleHistory ?? false);
        await this.router.navigateByUrl(stop.path);
        // Its tab lights up straight away, its part once it's found
        this.measure();
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
