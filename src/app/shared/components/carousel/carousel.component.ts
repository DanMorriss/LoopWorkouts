import { NgTemplateOutlet } from '@angular/common';
import {
    Component,
    computed,
    contentChildren,
    Directive,
    effect,
    ElementRef,
    inject,
    input,
    signal,
    TemplateRef,
    viewChild,
    viewChildren,
} from '@angular/core';
import { injectPrefersReducedMotion } from '../../reduced-motion';

/**
 * One of a carousel's slides: `<ng-template appSlide>…</ng-template>`, or
 * `<ng-template appSlide="Chart">` to name it, for its dot and screen readers, in place of the
 * carousel's `itemName`.
 */
@Directive({ selector: 'ng-template[appSlide]' })
export class SlideDirective {
    readonly template = inject(TemplateRef);
    readonly name = input('', { alias: 'appSlide' });
}

/**
 * Slides side by side, one shown at a time, swiped between (the browser's own scrolling,
 * snapping to each), with a dot for each under them to go to it. With one slide, it's shown
 * alone, with no dots. Tabbing into a slide off to the side scrolls it into view.
 *
 * Slides are as tall as the tallest, and what's in each is stretched to fill it; or, with
 * `fitShown`, each keeps its own height and the carousel is as tall as the one in view, so a
 * short slide beside a long one doesn't leave a gap over the dots.
 */
@Component({
    selector: 'app-carousel',
    imports: [NgTemplateOutlet],
    template: `
        <div
            class="carousel"
            role="group"
            aria-roledescription="carousel"
            [attr.aria-label]="label()"
        >
            <div
                #track
                class="carousel__track"
                [class.carousel__track--fit]="fitShown()"
                [style.height.px]="fitShown() ? shownHeight() : null"
                (scroll)="onScroll()"
            >
                @for (slide of slides(); track slide; let i = $index) {
                    <div
                        #slide
                        class="carousel__slide"
                        role="group"
                        aria-roledescription="slide"
                        [attr.aria-label]="position(i)"
                    >
                        <ng-container *ngTemplateOutlet="slide.template" />
                    </div>
                }
            </div>
            @if (slides().length > 1) {
                <div class="carousel__dots">
                    @for (slide of slides(); track slide; let i = $index) {
                        <button
                            type="button"
                            class="carousel__dot"
                            [attr.aria-label]="position(i)"
                            [attr.aria-current]="i === shown() ? 'true' : null"
                            (click)="show(i)"
                        >
                            <span class="carousel__pip" aria-hidden="true"></span>
                        </button>
                    }
                </div>
            }
        </div>
    `,
    styleUrl: './carousel.component.scss',
})
export class CarouselComponent {
    /** What the slides are, e.g. "Suggested plans". */
    readonly label = input.required<string>();
    /** What each slide is, for its dot and screen readers: "Plan" gives "Plan 2 of 5". */
    readonly itemName = input.required<string>();
    /** Whether the carousel is as tall as the slide in view, rather than the tallest. */
    readonly fitShown = input(false);

    protected readonly slides = contentChildren(SlideDirective);
    private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
    private readonly slideElements = viewChildren<ElementRef<HTMLElement>>('slide');
    private readonly reducedMotion = injectPrefersReducedMotion();

    private readonly current = signal(0);
    /** The slide in view: the last, if slides have gone from after it. */
    readonly shown = computed(() => Math.min(this.current(), this.slides().length - 1));

    /** With `fitShown`, the height of the slide in view, followed as it changes. */
    protected readonly shownHeight = signal<number | null>(null);

    constructor() {
        effect((onCleanup) => {
            const slide = this.slideElements()[this.shown()]?.nativeElement;
            if (!this.fitShown() || !slide) {
                return;
            }
            const observer = new ResizeObserver(() => this.shownHeight.set(slide.offsetHeight));
            observer.observe(slide);
            onCleanup(() => observer.disconnect());
        });
    }

    protected position(index: number): string {
        const name = this.slides()[index]?.name() || this.itemName();
        return `${name} ${index + 1} of ${this.slides().length}`;
    }

    /** Goes to slide `index`, gliding there unless motion is reduced. */
    protected show(index: number) {
        const slide = this.slideElements()[index]?.nativeElement;
        if (!slide) {
            return;
        }
        this.current.set(index);
        this.track().nativeElement.scrollTo({
            left: slide.offsetLeft,
            behavior: this.reducedMotion() ? 'auto' : 'smooth',
        });
    }

    /** The slide nearest the track's left edge is the one in view, swiped or tabbed to. */
    protected onScroll() {
        const left = this.track().nativeElement.scrollLeft;
        const away = this.slideElements().map((slide) =>
            Math.abs(slide.nativeElement.offsetLeft - left)
        );
        this.current.set(away.indexOf(Math.min(...away)));
    }
}
