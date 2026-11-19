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
import { RouterLink } from '@angular/router';
import { UndoService } from '../../shared/undo/undo.service';
import { injectCurrentUrl } from '../../shared/navigation/current-url';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * The Undo bar, floating above the tabs (and the workout's bar) after a delete: what
 * happened, Undo, and a close button. Focus goes to Undo as it appears, so it's one key away
 * (unless the offer's `keepFocus`, where the page moves it somewhere more useful);
 * screen readers hear what happened as it does. It goes when it's used, closed (or Escape),
 * replaced, or the page changes. A notice (UndoService.notify()) has no Undo, and leaves focus
 * where it is; it may have a link instead (View library), and a quiet one isn't read out, as
 * its page already says it. See UndoService.
 */
@Component({
    selector: 'app-undo-bar',
    imports: [IconComponent, RouterLink],
    templateUrl: './undo-bar.component.html',
    styleUrl: './undo-bar.component.scss',
})
export class UndoBarComponent {
    protected readonly undo = inject(UndoService);
    private readonly url = injectCurrentUrl();
    private readonly injector = inject(Injector);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
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

        // An offer `untilNextPress` goes with the next press anywhere but the bar. Listened for
        // once it's showing, so the press that made it isn't the one that takes it away.
        effect((onCleanup) => {
            if (!this.undo.offer()?.untilNextPress) {
                return;
            }
            const document = this.host.ownerDocument;
            const pressed = (event: Event) => {
                if (!this.host.contains(event.target as Node)) {
                    this.undo.dismiss();
                }
            };
            document.addEventListener('click', pressed, { capture: true });
            onCleanup(() => document.removeEventListener('click', pressed, { capture: true }));
        });

        // Each new offer takes focus, so Undo is one key away, unless the page puts it elsewhere
        effect(() => {
            const offer = this.undo.offer();
            if (offer?.undo && !offer.keepFocus) {
                afterNextRender(() => this.undoButton()?.nativeElement.focus(), {
                    injector: this.injector,
                });
            }
        });
    }
}
