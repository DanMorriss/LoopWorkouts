import {
    ComponentRef,
    effect,
    signal,
    Signal,
    Type,
    untracked,
    ViewContainerRef,
} from '@angular/core';

/**
 * Shows a component whose code loads on its own in `slot` (a `viewChild` of an
 * `<ng-container #name />`, read as a ViewContainerRef) once `when()` is true, setting its
 * inputs from `inputs()` whenever they change; `made` hears of it as it's made, to listen to
 * its outputs. By hand rather than with @defer or NgComponentOutlet, which would each bring
 * more of Angular into the first load, for every page (8 kB and 2 kB). Offline with it not
 * loaded, nothing shows: keep its space, so the page doesn't jump when it comes. Call it in an
 * injection context.
 */
export function lazyComponent<T>(options: {
    load: () => Promise<Type<T>>;
    slot: Signal<ViewContainerRef | undefined>;
    inputs: () => Record<string, unknown>;
    when?: () => boolean;
    made?: (ref: ComponentRef<T>) => void;
}): void {
    const type = signal<Type<T> | null>(null);
    let shown: ComponentRef<T> | null = null;
    let loading = false;

    effect(() => {
        if ((options.when?.() ?? true) && !loading && !untracked(type)) {
            loading = true;
            options.load().then(
                (loaded) => type.set(loaded),
                () => (loading = false)
            );
        }
    });
    effect(() => {
        const slot = options.slot();
        const loaded = type();
        const inputs = options.inputs();
        if (!slot || !loaded) {
            return;
        }
        // Made again if what it's in has gone and come back, which empties its slot
        if (!shown || slot.length === 0) {
            shown = slot.createComponent(loaded);
            options.made?.(shown);
        }
        for (const [name, value] of Object.entries(inputs)) {
            shown.setInput(name, value);
        }
    });
}
