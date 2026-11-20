import { Component, inject, output } from '@angular/core';
import { LaterStep } from '../../models/later';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { LaterOptionComponent } from '../later-option/later-option.component';
import { LaterPicks } from '../later-picks';
import { WorkoutView } from '../workout-view';

/**
 * The workout's reached its end with exercises skipped to do later still put aside (RUN-16):
 * do one before finishing? With one, "Do Plank before you finish?", with Do it now and Finish;
 * with more, each to pick, and Finish. ‹ Back, Escape or a click outside finish too. One
 * picked runs now, then the run finishes, or asks again about any left
 * (`ActiveRunService.askingFinish`). Focus starts on Do it now, or the first one listed. Where
 * it's used, it has animate.leave="dialog-leave".
 */
@Component({
    selector: 'app-finish-later-dialog',
    imports: [DialogComponent, LaterOptionComponent],
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
                    Do one before you finish?
                </h2>
                <p id="finish-later-hint" class="finish-later__hint">You skipped these earlier.</p>
                <div class="finish-later__list" role="group" aria-labelledby="finish-later-title">
                    @for (item of items; track item.key; let first = $first) {
                        <button
                            type="button"
                            appLaterOption
                            [name]="item.name"
                            [detail]="item.detail"
                            [attr.cdkFocusInitial]="first ? '' : null"
                            (click)="doNow(item.later)"
                        ></button>
                    }
                </div>
                <div class="finish-later__actions">
                    <button type="button" class="btn-pill" (click)="finish()">Finish</button>
                </div>
            }
        </app-dialog>
    `,
    styleUrl: './finish-later-dialog.component.scss',
})
export class FinishLaterDialogComponent {
    private readonly picks = new LaterPicks();
    protected readonly items = inject(WorkoutView).aside;

    /** One was picked, and runs now: focus is the page's to place, on its controls. */
    readonly picked = output<void>();

    protected doNow(later: LaterStep) {
        if (this.picks.doBeforeFinish(later)) {
            this.picked.emit();
        }
    }

    protected finish() {
        this.picks.finish();
    }
}
