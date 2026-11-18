import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LaterStep } from '../../models/later';
import { UndoService } from '../../shared/undo/undo.service';
import { LaterPicks } from '../later-picks';
import { WorkoutView } from '../workout-view';

/**
 * The exercises skipped to do later (RUN-16), at the top of the workout page: a small button
 * with a count on it when there's more than one, opening a menu under it that asks to do the
 * one next, or lists them to pick one. Picked, it's Up next, with Undo.
 */
@Component({
    selector: 'app-later-list',
    imports: [MatIconModule],
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
    protected readonly items = inject(WorkoutView).aside;
    /** The last one has been picked, so the button's gone: focus is the page's to place. */
    readonly emptied = output<void>();

    protected readonly open = signal(false);
    private readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');

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

    /** `later` is done next, after the step on now, with Undo till it starts. */
    protected doNext(later: LaterStep, name: string) {
        this.open.set(false);
        if (!this.picks.doNext(later)) {
            return;
        }
        this.undo.offerUndo({
            message: `${name} is up next`,
            keepFocus: true,
            undo: () => this.picks.undoNext(later),
        });
        afterNextRender(
            () => {
                const button = this.button()?.nativeElement;
                if (button) {
                    button.focus();
                } else {
                    this.emptied.emit();
                }
            },
            { injector: this.injector }
        );
    }
}
