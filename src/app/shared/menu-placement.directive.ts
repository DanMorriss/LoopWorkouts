import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/**
 * On a ⋮ menu placed under its button (`top: calc(100% + 0.2rem)` in its page's styles; the
 * looks are styles/_menu.scss), opens it above the button instead when it wouldn't fit between
 * the button and the bars over the bottom of the page (the tabs, and the workout's and Undo
 * bars) but would above, as on the last card of a list, where the page can't scroll any
 * further. It still grows out of the button, from the corner nearest it.
 */
@Directive({ selector: '[appMenuPlacement]' })
export class MenuPlacementDirective {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    constructor() {
        afterNextRender({
            earlyRead: () => this.fitsBelow(),
            write: (fits) => {
                if (!fits) {
                    this.placeAbove();
                }
            },
        });
    }

    private fitsBelow(): boolean {
        const button = this.host.offsetParent;
        if (!button) {
            return true;
        }
        const box = button.getBoundingClientRect();
        // Laid out, rather than as drawn, as it grows in from smaller
        const gap = this.host.offsetTop - button.clientHeight;
        const height = this.host.offsetHeight + gap;
        return box.bottom + height <= barsTop() || box.top < height;
    }

    private placeAbove() {
        const style = this.host.style;
        style.top = 'auto';
        style.bottom = 'calc(100% + 0.2rem)';
        // Grows from its bottom corner, by the button, rather than its top
        const [x] = getComputedStyle(this.host).transformOrigin.split(' ');
        style.transformOrigin = `${x} 100%`;
    }
}

/** How far down the screen the bars over the page's bottom start, or its bottom without any. */
function barsTop(): number {
    const bars = document.querySelector('.bottom-bars')?.getBoundingClientRect();
    return bars && bars.height > 0 ? bars.top : window.innerHeight;
}
