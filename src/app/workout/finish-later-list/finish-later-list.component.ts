import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import {
    afterNextRender,
    Component,
    ElementRef,
    inject,
    Injector,
    input,
    output,
    signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LaterStep } from '../../models/later';
import { DropSpring } from '../../shared/drop-spring';
import { LaterOptionComponent } from '../later-option/later-option.component';
import { WorkoutView } from '../workout-view';

type Item = ReturnType<WorkoutView['aside']>[number];

/**
 * The exercises still put aside at the finish (RUN-16), in the order Do them all runs them:
 * each one to pick and do on its own, dragged by its handle to another place, or moved up a
 * place with its ↑, for a keyboard or a screen reader. Says where one moved to screen readers.
 */
@Component({
    selector: 'app-finish-later-list',
    imports: [CdkDrag, CdkDragHandle, CdkDropList, LaterOptionComponent, MatIconModule],
    template: `
        @let all = items();
        <ol
            class="later-rows"
            cdkDropList
            cdkDropListLockAxis="y"
            [attr.aria-label]="label()"
            (cdkDropListDropped)="dropped($event)"
        >
            @for (item of all; track item.key; let i = $index) {
                <li
                    class="later-row"
                    cdkDrag
                    [attr.data-key]="item.key"
                    (cdkDragMoved)="drop.moved($event)"
                    (cdkDragReleased)="drop.released($event)"
                >
                    <!-- Pointer only, so hidden from screen readers: they use ↑ -->
                    <span
                        class="later-row__handle"
                        cdkDragHandle
                        aria-hidden="true"
                        title="Drag to reorder"
                    >
                        <mat-icon>drag_indicator</mat-icon>
                    </span>
                    <div class="later-row__pick">
                        <button
                            type="button"
                            appLaterOption
                            [name]="item.name"
                            [detail]="item.detail"
                            (click)="picked.emit(item.later)"
                        ></button>
                    </div>
                    <button
                        type="button"
                        class="btn-icon later-row__up"
                        [attr.aria-label]="'Move ' + item.name + ' up'"
                        [disabled]="i === 0"
                        (click)="moveUp(i, item)"
                    >
                        <mat-icon aria-hidden="true">arrow_upward</mat-icon>
                    </button>
                </li>
            }
        </ol>
        <p class="sr-only" role="status">{{ said() }}</p>
    `,
    styleUrl: './finish-later-list.component.scss',
})
export class FinishLaterListComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly injector = inject(Injector);

    readonly items = input.required<Item[]>();
    /** What the list is, for screen readers. */
    readonly label = input.required<string>();
    /** One was pressed, to do now. */
    readonly picked = output<LaterStep>();
    /** One was dragged or moved up, from `from` in the list to `to`. */
    readonly moved = output<{ from: number; to: number }>();

    protected readonly drop = new DropSpring();
    /** Where the last one moved, said to screen readers. */
    protected readonly said = signal('');

    protected dropped(event: CdkDragDrop<unknown>) {
        if (event.previousIndex !== event.currentIndex) {
            this.move(event.previousIndex, event.currentIndex, this.items()[event.previousIndex]);
        }
    }

    /** Up a place, with focus kept on its ↑, or on it once it's first, where ↑ is off. */
    protected moveUp(i: number, item: Item) {
        this.move(i, i - 1, item);
        afterNextRender(
            () => {
                const row = this.host.querySelector(`[data-key="${item.key}"]`);
                const to = i - 1 === 0 ? '.menu__item' : '.later-row__up';
                row?.querySelector<HTMLElement>(to)?.focus();
            },
            { injector: this.injector }
        );
    }

    private move(from: number, to: number, item: Item) {
        this.moved.emit({ from, to });
        this.said.set(`${item.name} moved to ${to + 1} of ${this.items().length}`);
    }
}
