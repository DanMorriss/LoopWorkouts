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

/** An exercise put aside, with how many of its sets are. */
type LaterGroup = ReturnType<WorkoutView['aside']>[number] & { sets: number };

/**
 * The exercises skipped to do later (RUN-16), beside Pause on the left, as Skip, which puts
 * them here, is on the right: a button, "Later", with a count on it when there's more than one
 * exercise, opening a menu over it that asks to do the one next, or lists them to pick one.
 * Picked, it's Up next, with Undo.
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
    /**
     * What's put aside, by exercise: each set skipped of Leg press is one row, "Leg press ·
     * 3 sets", in the order first skipped, and picking it does the first of them next. A row a
     * set made the list long, and the count grow with every set (2026-11-23).
     */
    protected readonly items = computed(() => {
        const groups = new Map<string, LaterGroup>();
        for (const item of this.view.aside()) {
            const group = groups.get(item.name);
            if (group) {
                group.sets++;
            } else {
                groups.set(item.name, { ...item, sets: 1 });
            }
        }
        return [...groups.values()].map((group) => ({
            ...group,
            detail: group.sets > 1 ? `${group.sets} sets · next ${group.detail}` : group.detail,
        }));
    });
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
