import { Component, inject, output } from '@angular/core';
import { LaterStep } from '../../models/later';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { FinishLaterListComponent } from '../finish-later-list/finish-later-list.component';
import { LaterPicks } from '../later-picks';
import { WorkoutView } from '../workout-view';

/**
 * The workout's reached its end with exercises skipped to do later still put aside (RUN-16):
 * do them before finishing? With one, "Do Plank before you finish?", with Do it now and Finish;
 * with more, Do them all, in the list's order (dragged to change it), each to pick on its own,
 * and Finish. ‹ Back, Escape or a click outside finish too. One
 * picked runs now, then the run finishes, or asks again about any left
 * (`ActiveRunService.askingFinish`). Focus starts on Do it now, or Do them all. Where
 * it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-finish-later-dialog',
    imports: [DialogComponent, FinishLaterListComponent],
    template: `
        @let items = this.items();
        <app-dialog
            labelledBy="finish-later-title"
            describedBy="finish-later-hint"
            [width]="380"
            (closed)="finish()"
        >
            @if (items.length === 1) {
                @let only = items[0];
                <h2 id="finish-later-title" class="finish-later__title">
                    Do {{ only.name }} before you finish?
                </h2>
                <p id="finish-later-hint" class="finish-later__hint">
                    You skipped it earlier · {{ only.detail }}
                </p>
                <div class="finish-later__actions">
                    <button
                        type="button"
                        class="btn-main"
                        cdkFocusInitial
                        (click)="doNow(only.later)"
                    >
                        Do it now
                    </button>
                    <button type="button" class="btn-pill" (click)="finish()">Finish</button>
                </div>
            } @else {
                <h2 id="finish-later-title" class="finish-later__title">
                    Do them before you finish?
                </h2>
                <p id="finish-later-hint" class="finish-later__hint">
                    You skipped these earlier. Drag to change the order, or pick one to do on its
                    own.
                </p>
                <app-finish-later-list
                    label="Skipped exercises, in order"
                    [items]="items"
                    (picked)="doNow($event)"
                    (moved)="picks.move($event.from, $event.to)"
                />
                <div class="finish-later__actions">
                    <button type="button" class="btn-main" cdkFocusInitial (click)="doAll()">
                        Do them all
                    </button>
                    <button type="button" class="btn-pill" (click)="finish()">Finish</button>
                </div>
            }
        </app-dialog>
    `,
    styleUrl: './finish-later-dialog.component.scss',
})
export class FinishLaterDialogComponent {
    protected readonly picks = new LaterPicks();
    protected readonly items = inject(WorkoutView).aside;

    /** One was picked, and runs now: focus is the page's to place, on its controls. */
    readonly picked = output<void>();

    protected doNow(later: LaterStep) {
        if (this.picks.doBeforeFinish(later)) {
            this.picked.emit();
        }
    }

    protected doAll() {
        if (this.picks.doAllBeforeFinish()) {
            this.picked.emit();
        }
    }

    protected finish() {
        this.picks.finish();
    }
}
