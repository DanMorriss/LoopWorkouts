import {
    afterNextRender,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    output,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LaterStep } from '../../models/later';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { UndoService } from '../../shared/undo/undo.service';
import { LaterPicks } from '../later-picks';
import { WorkoutView } from '../workout-view';
import { flyInto, flyOnto } from './later-fly';
import { LaterOptionComponent } from '../later-option/later-option.component';

/**
 * The exercises skipped to do later (RUN-16), at the top of the workout page: a small button
 * with a count on it when there's more than one, opening a menu under it that asks to do the
 * one next, or lists them to pick one. Picked, it's Up next, with Undo.
 */
@Component({
    selector: 'app-later-list',
    imports: [LaterOptionComponent, MatIconModule],
    templateUrl: './later-list.component.html',
    styleUrl: './later-list.component.scss',
    host: {
        '(document:click)': 'clickedAway($event)',
        '(keydown.escape)': 'escape($event)',
    },
})
export class LaterListComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly injector = inject(Injector);
    private readonly picks = new LaterPicks();
    private readonly undo = inject(UndoService);
    private readonly view = inject(WorkoutView);
    private readonly reducedMotion = injectPrefersReducedMotion();
    protected readonly items = this.view.aside;
    /** The Up next card, which one picked flies down to (see `flyOnto()`). */
    readonly nextCard = input<() => HTMLElement | undefined>(() => undefined);
    /** The last one has been picked, so the button's gone: focus is the page's to place. */
    readonly emptied = output<void>();

    protected readonly open = signal(false);
    private readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');

    /** The Undo bar's offer to take back a pick, and the step it was made on. */
    private pickOffer: { id: number | undefined; step: string } | null = null;

    constructor() {
        // Undo goes once the step it was picked on has ended, when the pick's started
        effect(() => {
            const step = this.view.stepKey();
            if (this.pickOffer && this.pickOffer.step !== step) {
                if (untracked(this.undo.offer)?.id === this.pickOffer.id) {
                    untracked(() => this.undo.clear());
                }
                this.pickOffer = null;
            }
        });
    }

    /**
     * An exercise has just been put aside by Skip: it flies from `from`, the ring, into the
     * button, so it's clear why the button's there (see `flyInto()`).
     */
    flyIn(from: HTMLElement | undefined) {
        const start = from?.getBoundingClientRect();
        const first = !this.button();
        afterNextRender(
            () => {
                const button = this.button()?.nativeElement;
                if (button && start) {
                    flyInto(button, this.host, start, first, this.reducedMotion());
                }
            },
            { injector: this.injector }
        );
    }

    protected readonly label = computed(() => {
        const items = this.items();
        return items.length === 1
            ? `Skipped: ${items[0].name}`
            : `${items.length} skipped exercises`;
    });

    protected toggle() {
        this.open.update((open) => !open);
        if (this.open()) {
            // Into the menu, on its first button, so it can be gone through with Tab
            afterNextRender(
                () => this.host.querySelector<HTMLElement>('.menu__item, .later__yes')?.focus(),
                { injector: this.injector }
            );
        }
    }

    /** Closed, with focus back on the button. */
    protected close() {
        this.open.set(false);
        this.button()?.nativeElement.focus();
    }

    protected escape(event: Event) {
        if (this.open()) {
            // The page's own Escape resumes a paused run; this one only closes the menu
            event.stopPropagation();
            this.close();
        }
    }

    protected clickedAway(event: Event) {
        if (this.open() && !this.host.contains(event.target as Node)) {
            this.open.set(false);
        }
    }

    /**
     * `later` is done next, after the step on now, with Undo till it starts. It flies down
     * from the button to the Up next card, so it's clear it's been put next.
     */
    protected doNext(later: LaterStep, name: string) {
        this.open.set(false);
        // Measured now, as the button goes once the last one's picked
        const button = this.button()?.nativeElement;
        const from = button?.getBoundingClientRect();
        if (!this.picks.doNext(later)) {
            return;
        }
        // Out of the way once anything else is pressed, or the pick starts
        this.undo.offerUndo({
            message: `${name} is up next`,
            keepFocus: true,
            untilNextPress: true,
            undo: () => this.picks.undoNext(later),
        });
        this.pickOffer = { id: this.undo.offer()?.id, step: this.view.stepKey() };
        afterNextRender(
            () => {
                const card = this.nextCard()();
                if (button && from && card) {
                    flyOnto(button, this.host, from, card, this.reducedMotion());
                }
                const left = this.button()?.nativeElement;
                if (left) {
                    left.focus();
                } else {
                    this.emptied.emit();
                }
            },
            { injector: this.injector }
        );
    }
}
