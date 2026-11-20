import { computed, ElementRef, Injector, Signal, signal } from '@angular/core';
import { changeSmoothly } from '../shared/layout-change';
import { WorkoutSetupModel } from './step-model';

/**
 * What's open in Create, rather than what's in the workout: which steps show their name box
 * and wheels, the set row open on its wheels, the kind menu and the tooltip, and the
 * steps sliding to their places as they open and close. The form keeps one as `view`.
 */
export class SetupView {
    /** Keys of the steps showing their name box and wheels; the rest show a one-line summary. */
    readonly expandedKeys = signal<ReadonlySet<number>>(new Set());

    readonly anyExpanded = computed(() => {
        const expanded = this.expandedKeys();
        return this.model().steps.some((step) => expanded.has(step.key));
    });

    /** Whether the tooltip by the Steps heading is showing. */
    readonly infoOpen = signal(false);

    /** The set row open on its wheels (BLD-11), as `key-set`, if one is: one at a time. */
    readonly openSetRow = signal<string | null>(null);

    /** The key of the step whose kind menu is open, if one is. */
    readonly kindMenuFor = signal<number | null>(null);

    constructor(
        private readonly model: Signal<WorkoutSetupModel>,
        private readonly host: ElementRef<HTMLElement>,
        private readonly injector: Injector
    ) {
        this.expandedKeys.set(this.allKeys());
    }

    /**
     * As a workout's loaded: a saved one opens as a list of summaries, so the whole workout fits
     * on screen; a new one with its steps open. The kind menu closes.
     */
    reset(expanded: boolean) {
        this.kindMenuFor.set(null);
        this.expandedKeys.set(expanded ? this.allKeys() : new Set());
    }

    isExpanded(key: number): boolean {
        return this.expandedKeys().has(key);
    }

    /** Opens or closes one step. Its button stays in place, so focus stays on it. */
    toggleStep(key: number) {
        this.smoothChange(() =>
            this.expandedKeys.update((keys) => {
                const next = new Set(keys);
                if (!next.delete(key)) {
                    next.add(key);
                }
                return next;
            })
        );
    }

    setAllExpanded(expanded: boolean) {
        this.smoothChange(() => this.expandedKeys.set(expanded ? this.allKeys() : new Set()));
    }

    isSetRowOpen(key: number, set: number): boolean {
        return this.openSetRow() === `${key}-${set}`;
    }

    /** Opens a set's row on its wheels, closing any other; or closes it. Rows slide to fit. */
    toggleSetRow(key: number, set: number) {
        const id = `${key}-${set}`;
        this.smoothChange(() => this.openSetRow.update((open) => (open === id ? null : id)));
    }

    toggleKindMenu(key: number) {
        this.kindMenuFor.update((open) => (open === key ? null : key));
    }

    /** A click anywhere outside the open kind menu or the tooltip closes it. */
    closePopups(event: MouseEvent) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target?.closest('app-step-kind-menu')) {
            this.kindMenuFor.set(null);
        }
        if (!target?.closest('.info')) {
            this.infoOpen.set(false);
        }
    }

    /**
     * Opens or closes steps with the steps and everything under them sliding to their new
     * places, rather than the page jumping (and rather than animating a step's height, which
     * would lay the page out again every frame).
     */
    smoothChange(change: () => void) {
        changeSmoothly(
            this.host.nativeElement,
            'form > *, .step, .wheel-row',
            this.injector,
            change
        );
    }

    private allKeys(): Set<number> {
        return new Set(this.model().steps.map((step) => step.key));
    }
}
