import {
    afterNextRender,
    Component,
    effect,
    ElementRef,
    inject,
    Injector,
    untracked,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { UndoService } from '../../shared/undo/undo.service';
import { injectCurrentUrl } from '../current-url';

/**
 * The Undo bar, floating above the tabs (and the workout's bar) after a delete: what
 * happened, Undo, and a close button. Focus goes to Undo as it appears, so it's one key away;
 * screen readers hear what happened as it does. It goes when it's used, closed (or Escape),
 * replaced, or the page changes. A notice (UndoService.notify()) has no Undo, and leaves focus
 * where it is; it may have a link instead (View library), and a quiet one isn't read out, as
 * its page already says it. See UndoService.
 */
@Component({
    selector: 'app-undo-bar',
    imports: [MatIconModule, RouterLink],
    templateUrl: './undo-bar.component.html',
    styleUrl: './undo-bar.component.scss',
})
export class UndoBarComponent {
    protected readonly undo = inject(UndoService);
    private readonly url = injectCurrentUrl();
    private readonly injector = inject(Injector);
    private readonly undoButton = viewChild<ElementRef<HTMLButtonElement>>('undoButton');

    /** The message as a sentence, ending in a full stop unless it ends in one already. */
    protected sentence(message: string): string {
        return /[.!?]$/.test(message) ? message : `${message}.`;
    }

    constructor() {
        // An offer belongs to the page it was made on
        effect(() => {
            const url = this.url();
            const offer = untracked(this.undo.offer);
            if (offer && offer.url !== url) {
                this.undo.clear();
            }
        });

        // Each new offer takes focus, so Undo is one key away
        effect(() => {
            if (this.undo.offer()?.undo) {
                afterNextRender(() => this.undoButton()?.nativeElement.focus(), {
                    injector: this.injector,
                });
            }
        });
    }
}
