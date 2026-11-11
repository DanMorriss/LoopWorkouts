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
import { TOURS, TourStop } from './tour-stops';
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
 * A tour, of the app (NAV-8) or of Create (BLD-17), over every page while it's on: it opens each stop's page,
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

    private readonly stops = computed(() => TOURS[this.tour.tour()].stops);
    protected readonly count = computed(() => this.stops().length);
    protected readonly index = computed(() => this.tour.stop() ?? 0);
    protected readonly stop = computed(() => this.stops()[this.index()]);
    protected readonly last = computed(() => this.index() === this.count() - 1);

    /** The part lit up, once found, and what's said about it. */
    private readonly part = signal<{ element: Element; text: string } | null>(null);
    protected readonly text = computed(() => this.part()?.text ?? this.stop().text);
    protected readonly lights = signal<Light[]>([]);

    /** What had focus as the tour opened, for a tour that puts it back (`returnFocus`). */
    private openedFrom: HTMLElement | null = null;

    /** Each stop's search for its part, so an earlier one still looking gives up. */
    private search = 0;
    private frame = 0;
    /** Room added under the page, so a part near its end can be scrolled up above the card. */
    private room = 0;

    constructor() {
        effect(() => {
            const index = this.tour.stop();
            if (index !== null) {
                untracked(() => void this.show(this.stops()[index]));
            }
        });
        inject(DestroyRef).onDestroy(() => {
            this.search++;
            cancelAnimationFrame(this.frame);
            this.makeRoom(0);
        });
    }

    protected next() {
        if (this.last()) {
            this.finish(TOURS[this.tour.tour()].doneFocus);
        } else {
            this.tour.next();
        }
    }

    protected back() {
        this.tour.back();
    }

    /** Ends the tour where it is, with focus on the page's title, or what the tour says. */
    protected skip() {
        const focus = TOURS[this.tour.tour()].skipFocus;
        if (focus) {
            this.finish(focus);
            return;
        }
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
        // The tab that takes you there, or the whole tab bar at the end, as pills; none for a
        // stop that stays on its page
        const stop = this.stop();
        const tabSelector =
            stop.tab === 'all' ? '[data-tour-tabs]' : stop.path && `[data-tour-tab="${stop.path}"]`;
        const tab = tabSelector
            ? this.document.querySelector(tabSelector)?.getBoundingClientRect()
            : undefined;
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
        const back = TOURS[this.tour.tour()].returnFocus ? this.openedFrom : null;
        const element = back?.isConnected
            ? back
            : typeof focus === 'string'
              ? this.document.getElementById(focus)
              : focus;
        element?.focus();
        this.openedFrom = null;
        this.tour.end();
    }

    /** Opens the stop's page, if it has one, then looks for its part there and lights it up. */
    private async show(stop: TourStop) {
        const search = ++this.search;
        this.part.set(null);
        // Before the card takes focus: where it goes back to, for a tour that puts it back
        const active = this.document.activeElement;
        if (
            this.index() === 0 &&
            active instanceof HTMLElement &&
            active !== this.document.body &&
            !active.closest('app-tour')
        ) {
            this.openedFrom = active;
        }
        this.focusTitle();
        // Before the page opens, so it opens with its examples
        this.tour.sampleHistory.set(stop.sampleHistory ?? false);
        if (stop.path) {
            await this.router.navigateByUrl(stop.path);
        }
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
                const element = found.element;
                this.part.set({ element, text: found.text });
                // Once the card has its words, as their length moves its top
                afterNextRender(
                    () => {
                        if (search === this.search) {
                            this.bringIntoView(element);
                        }
                    },
                    { injector: this.injector }
                );
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
        const top = Math.max(0, box.top + window.scrollY - at);
        this.makeRoom(top);
        window.scrollTo({
            top,
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

    /**
     * Makes the page long enough to scroll to `top`, e.g. for Create's Save, which on a short
     * page can't otherwise come up above the card; 0 takes the room away.
     */
    private makeRoom(top: number) {
        const main = this.document.querySelector('main');
        if (!main) {
            return;
        }
        const root = this.document.documentElement;
        const furthest = () => root.scrollHeight - window.innerHeight;
        const set = (room: number) => {
            this.room = room;
            main.style.paddingBottom = room ? `calc(var(--bars-height) + ${room}px)` : '';
        };
        set(top ? Math.max(0, Math.ceil(top - (furthest() - this.room))) : 0);
        // A page shorter than the screen, e.g. the workout's, takes some of the room before
        // it scrolls at all, so what's still short is added again
        const short = Math.ceil(top - furthest());
        if (this.room && short > 0) {
            set(this.room + short);
        }
    }

    /** The new stop's title takes focus, so a screen reader reads it and its line. */
    private focusTitle() {
        afterNextRender(() => this.title().nativeElement.focus(), { injector: this.injector });
    }
}
