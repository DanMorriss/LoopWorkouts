/**
 * Where an element is on a page, in a way that finds the same element again once the page has
 * been taken down and drawn afresh: what it is (a link by its address, else its id, else its
 * tag and label) and which of the page's elements like that it is.
 */
export interface FocusSpot {
    readonly selector: string;
    readonly index: number;
}

/** The spot of `element` on `page`, or nothing if it isn't on it. */
export function focusSpot(element: Element, page: Element): FocusSpot | undefined {
    if (element === page || !page.contains(element)) {
        return undefined;
    }
    const selector = selectorFor(element);
    const index = [...page.querySelectorAll(selector)].indexOf(element);
    return index < 0 ? undefined : { selector, index };
}

/** The element at `spot` on `page`, if it's there. */
export function findSpot(spot: FocusSpot, page: Element): HTMLElement | SVGElement | undefined {
    const found = page.querySelectorAll(spot.selector)[spot.index];
    return found instanceof HTMLElement || found instanceof SVGElement ? found : undefined;
}

function selectorFor(element: Element): string {
    const tag = CSS.escape(element.localName);
    const href = element.getAttribute('href');
    if (href) {
        return `${tag}[href="${CSS.escape(href)}"]`;
    }
    if (element.id) {
        return `#${CSS.escape(element.id)}`;
    }
    const label = element.getAttribute('aria-label');
    return label ? `${tag}[aria-label="${CSS.escape(label)}"]` : tag;
}
