import { ApplicationRef, inject, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { spring, springCurve } from '../spring';
import { pathOf } from './current-url';
import { findSpot, FocusSpot, focusSpot } from './focus-spot';
import { LeaveCheck } from './leave-check';
import { letInputThrough } from './let-input-through';
import { prefersReducedMotion } from '../reduced-motion';

/** On <html> while a page slides, naming the parts that move. */
export const SLIDING_CLASS = 'page-sliding';

/**
 * On <html> while the page cross-fades instead, with reduced motion (here and in
 * WorkoutMorph): the slide's and the morph's named parts stay unnamed, so the whole page fades.
 */
export const FADING_CLASS = 'page-fading';

/** On the page sliding over another while it slides, painting it as the page is. */
const OVER_CLASS = 'page-slide-over';

/** Into a page further in (`in`, e.g. an exercise from the list), or back out of it (`out`). */
export type SlideWay = 'in' | 'out';

/**
 * Going into an exercise from the Exercises list and back (or Settings, Privacy or Terms from
 * Account) slides the page across, as a phone does: the new page comes in from the right over
 * the list, which moves a little way left and fades; going back, the page leaves to the right
 * and the list comes back. Every other navigation changes page at once, so this starts its own
 * view transition around those, as WorkoutMorph does for the workout. It names the two pages
 * itself for the slide (slide-over for the one further in, slide-under for the one it's over;
 * styles/_page-slide.scss moves them), so any page can slide in over any other.
 *
 * Coming back, focus goes back to what opened the page further in (a card, a link, a button),
 * so a keyboard or screen reader carries on from there rather than from the top. The
 * browser's own Back, which doesn't slide, does the same.
 */
@Service()
export class PageSlide {
    private readonly router = inject(Router);
    private readonly appRef = inject(ApplicationRef);
    private readonly leaveCheck = inject(LeaveCheck);
    /** How far down each page was scrolled when another slid in over it, to come back to. */
    private readonly scrolled = new Map<string, number>();
    /** What had focus on each page (or was clicked) when another slid in over it, to go back to. */
    private readonly focused = new Map<string, FocusSpot>();
    /** The link follow() is following, for navigate() to note as what opened the page. */
    private clicked?: EventTarget | null;
    /** See takeCaught(). */
    private caught = 0;
    /** The slide going on, or the last to have gone. */
    private latest?: ViewTransition;

    constructor() {
        // The browser's Back (or forward) to a page that was left for one further in
        this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
            if (
                event instanceof NavigationEnd &&
                this.router.currentNavigation()?.trigger === 'popstate'
            ) {
                const path = pathOf(event.urlAfterRedirects);
                afterNextFrame(() => this.refocus(path));
            }
        });
    }

    /**
     * For a link's (click): goes to `url`, sliding `way`. A click that opens a new tab or
     * window instead (a modifier key, or a middle click) is left to the browser and the link's
     * href.
     */
    follow(event: MouseEvent, url: string, way: SlideWay) {
        if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        event.preventDefault();
        // The link clicked, as Safari doesn't focus a link that's tapped
        this.clicked = event.currentTarget;
        try {
            this.navigate(url, way);
        } finally {
            this.clicked = undefined;
        }
    }

    /**
     * Goes to `url`, sliding `way`. With reduced motion the pages cross-fade instead; in a
     * browser without view transitions, it just goes. After a swipe back, `velocity` (px/s to the right) hands the
     * finger's speed on, so the page carries on at the speed it was let go. It carries on from
     * where the finger left it too, as the old picture is taken with the page still moved
     * along (SwipeBackDirective).
     *
     * The page going in opens at its top, and the one coming back is scrolled where it was left,
     * however many pages deep it was, with focus on what had it when it was left.
     */
    navigate(url: string, way: SlideWay, velocity?: number) {
        this.go(url, way, velocity, this.clicked ?? document.activeElement);
    }

    /** navigate(), with what opened the page going in (`opener`), to focus again coming back. */
    private go(url: string, way: SlideWay, velocity: number | undefined, opener: unknown) {
        // Before the slide starts, as the screen is frozen during one
        const asking = this.leaveCheck.confirm();
        if (asking) {
            void asking.then((leave) => {
                if (leave) {
                    this.go(url, way, velocity, opener);
                }
            });
            return;
        }
        if (way === 'in') {
            const leaving = pathOf(this.router.url);
            this.scrolled.set(leaving, window.scrollY);
            const page = routedPage();
            const spot = page && opener instanceof Element ? focusSpot(opener, page) : undefined;
            if (spot) {
                this.focused.set(leaving, spot);
            } else {
                this.focused.delete(leaving);
            }
        }
        const top = way === 'in' ? 0 : (this.scrolled.get(pathOf(url)) ?? 0);
        // Coming back, what had focus there has it again, once the page is drawn
        let refocused = way === 'in';
        const refocus = () => {
            refocused ||= this.refocus(pathOf(url));
        };
        // The page going further in slides over, and the one it's over slides under, whichever
        // pages they are: named on each as it's pictured, before going and once there
        const named: HTMLElement[] = [];
        const name = (part: 'slide-over' | 'slide-under') => {
            const page = routedPage();
            if (page) {
                page.style.setProperty('view-transition-name', part);
                page.classList.toggle(OVER_CLASS, part === 'slide-over');
                named.push(page);
            }
        };
        // With reduced motion the pages cross-fade instead, briefly, so it's still clear
        // the page changed
        const reduced = prefersReducedMotion();
        const slides = !!document.startViewTransition && !reduced;
        const go = async () => {
            await this.router.navigateByUrl(url);
            // Render now, so the new page is what's scrolled (and what the browser slides in)
            this.appRef.tick();
            if (slides) {
                name(way === 'in' ? 'slide-over' : 'slide-under');
            }
            window.scrollTo({ top, behavior: 'instant' });
            refocus();
        };
        if (!document.startViewTransition) {
            void go().then(() => afterNextFrame(refocus));
            return;
        }
        if (slides) {
            name(way === 'in' ? 'slide-under' : 'slide-over');
        }
        const root = document.documentElement;
        const classes = reduced ? [FADING_CLASS] : [SLIDING_CLASS, `${SLIDING_CLASS}--${way}`];
        root.classList.add(...classes);
        if (velocity !== undefined && !reduced) {
            // A spring already moving at the finger's speed, as a fraction of the way across
            // (the page's width) per second
            const timing = spring(0.3, {
                velocity: Math.max(0, velocity) / Math.max(1, root.clientWidth),
            });
            root.style.setProperty('--slide-easing', timing.easing);
            root.style.setProperty('--slide-duration', `${timing.duration}ms`);
        }
        const transition = document.startViewTransition(go);
        this.latest = transition;
        // A press mid-slide ends it and lands, rather than doing nothing till it's over. On a
        // page sliding in, it notes where the page was, so a swipe back can take it from there.
        letInputThrough(
            transition,
            way === 'in' && !reduced ? () => this.catchArriving() : undefined
        );
        // Interrupted (e.g. another view transition starting) rejects `ready`; nothing waits on it
        transition.ready.catch(() => undefined);
        transition.finished.finally(() => {
            // A page that draws part of itself a moment later (a list loading) has it by now
            refocus();
            for (const page of named) {
                page.style.removeProperty('view-transition-name');
                page.classList.remove(OVER_CLASS);
            }
            // Cut short by another slide, it leaves that one's look alone, as that's what
            // makes the new one slide; only this one's way is its own to take off
            if (this.latest !== transition) {
                root.classList.remove(...classes.filter((name) => name !== SLIDING_CLASS));
                return;
            }
            root.classList.remove(...classes);
            root.style.removeProperty('--slide-easing');
            root.style.removeProperty('--slide-duration');
        });
    }

    /**
     * Focuses what had focus on the page at `path` when another slid in over it, if it's
     * there, and if focus hasn't gone somewhere already (a page that put it on something
     * itself). Whether it did.
     */
    private refocus(path: string): boolean {
        const spot = this.focused.get(path);
        const page = routedPage();
        const target = spot && page ? findSpot(spot, page) : undefined;
        const active = document.activeElement;
        if (!target || (active && active !== document.body && active.isConnected)) {
            return false;
        }
        // Where the scroll put it, rather than scrolling to it
        target.focus({ preventScroll: true });
        return true;
    }

    /**
     * How far right of its place (px) a page sliding in was showing when a press stopped it
     * (0 if none did), for that press's pointerdown only: SwipeBackDirective puts the page back
     * there, and the finger takes it on from where it was seen.
     */
    takeCaught(): number {
        const caught = this.caught;
        this.caught = 0;
        return caught;
    }

    /** Notes where the page sliding in is on screen now, as a press is about to stop it. */
    private catchArriving() {
        const arriving = document.documentElement
            .getAnimations({ subtree: true })
            .find(
                (animation) =>
                    (animation.effect as KeyframeEffect | null)?.pseudoElement ===
                    '::view-transition-new(slide-over)'
            );
        if (!arriving) {
            return;
        }
        // From the right edge (100vw) to its place, on the app's spring (--ease-spring)
        const seconds = Number(arriving.currentTime ?? 0) / 1000;
        this.caught = (1 - Math.min(1, SLIDE_SPRING.progress(seconds))) * window.innerWidth;
        // The press is sent on straight away; nothing after it should find this
        queueMicrotask(() => (this.caught = 0));
    }
}

/** The spring a page slides in on: --ease-spring, a 0.3s response with no bounce. */
const SLIDE_SPRING = springCurve(0.3);

/** Runs `then` once the next frame is drawn. */
function afterNextFrame(then: () => void) {
    requestAnimationFrame(() => setTimeout(then));
}

/** The page the router is showing: the element it puts after its outlet in <main>. */
function routedPage(): HTMLElement | null {
    return document.querySelector<HTMLElement>('main router-outlet + *');
}
