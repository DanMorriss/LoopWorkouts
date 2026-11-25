/**
 * Whether focus is going somewhere outside the element a `focusout` is heard on, as tabbing
 * out of a menu does, rather than to something inside it or nowhere (a click on the page),
 * which a click elsewhere handles.
 */
export function focusLeft(event: FocusEvent): boolean {
    const wrap = event.currentTarget;
    return (
        wrap instanceof Node &&
        event.relatedTarget instanceof Node &&
        !wrap.contains(event.relatedTarget)
    );
}
