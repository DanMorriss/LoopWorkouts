import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    output,
    viewChild,
} from '@angular/core';
import { DialogBackComponent } from '../dialog-back/dialog-back.component';
import { growFromClick } from '../../dialog-origin';
import { injectPrefersReducedMotion } from '../../reduced-motion';
import { SheetDrag } from '../../sheet-drag';

/**
 * What every dialog over the page is: the dimmed, blurred page behind, and a card scrolling
 * within itself, with ‹ Back at its top. Focus is trapped inside, starting on what has
 * `cdkFocusInitial`, or the first thing that takes focus. ‹ Back, Escape or a click outside
 * close it; Escape goes no further, so a dialog opened over another, such as the workout
 * summary, closes only itself.
 *
 * On a phone it's a sheet: it rises from the bottom of the screen, and can be dragged back
 * down by its grabber, or anywhere on it while it's scrolled to the top (SheetDrag). On a
 * wider screen it's a card in the middle, growing out of what opened it (growFromClick).
 *
 *     <app-dialog labelledBy="thing-title" (closed)="closed.emit()">
 *         <h2 id="thing-title">Thing</h2>
 *     </app-dialog>
 *
 * The component using it has animate.leave="dialog-leave" where it's used, which keeps it on
 * the page while it goes as it came, from wherever it is (styles/_dialog.scss).
 */
@Component({
    selector: 'app-dialog',
    imports: [CdkTrapFocus, DialogBackComponent],
    template: `
        <div
            #overlay
            class="dialog-overlay"
            role="presentation"
            (click)="closed.emit()"
            (keydown.escape)="$event.stopPropagation(); closed.emit()"
            (animationstart)="leaving($event)"
        >
            <!-- Scrolled to the top, a finger moving down anywhere on it drags the sheet -->
            <div
                #card
                class="dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                aria-modal="true"
                [attr.role]="alert() ? 'alertdialog' : 'dialog'"
                [attr.aria-labelledby]="labelledBy()"
                [attr.aria-describedby]="describedBy()"
                [style.width]="cardWidth()"
                (click)="$event.stopPropagation()"
                (scroll)="sheet.onBodyScroll($event)"
                (touchstart)="sheet.onBodyTouchStart($event)"
                (touchmove)="sheet.onBodyTouchMove($event)"
                (touchend)="sheet.onBodyTouchEnd($event)"
                (touchcancel)="sheet.onBodyTouchEnd($event)"
            >
                <div class="dialog-top">
                    <!-- Drags the sheet down to close it, on a phone; pointer only, as ‹ Back
                         and Escape do the same -->
                    <div
                        #grabber
                        class="dialog-grabber"
                        aria-hidden="true"
                        (pointerdown)="sheet.grab($event)"
                        (pointermove)="sheet.drag($event)"
                        (pointerup)="sheet.letGo($event)"
                        (pointercancel)="sheet.letGo($event)"
                    ></div>
                    <app-dialog-back (back)="closed.emit()" />
                </div>
                <ng-content />
            </div>
        </div>
    `,
    styleUrl: './dialog.component.scss',
})
export class DialogComponent {
    /** The id of its title. */
    readonly labelledBy = input.required<string>();
    /** The id of what says more about it, if anything does. */
    readonly describedBy = input<string | null>(null);
    /** Whether it asks something that can't be left unanswered: an `alertdialog`. */
    readonly alert = input(false);
    /** How wide the card can get, in px; narrower screens fit it to them. */
    readonly width = input(480);
    readonly closed = output<void>();

    protected readonly cardWidth = computed(() => `min(${this.width()}px, 100%)`);
    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');
    private readonly overlay = viewChild.required<ElementRef<HTMLElement>>('overlay');
    private readonly grabber = viewChild.required<ElementRef<HTMLElement>>('grabber');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    protected readonly sheet = new SheetDrag({
        sheet: () => this.card().nativeElement,
        grabber: () => this.grabber().nativeElement,
        scrim: () => this.overlay().nativeElement,
        // Its own content's, not a dialog's opened over it
        ownsTouch: (target) => target.closest('app-dialog') === this.host,
        // A card shrinks back into what opened it as it fades
        cardAway: { transform: 'scale(0.96)', opacity: 0 },
        reducedMotion: injectPrefersReducedMotion(),
        goneAway: () => {
            // Already gone, so nothing more to wait for as it's taken off the page
            // (styles/_dialog.scss). Set straight away, as closing it takes it off before a
            // binding would show.
            this.host.classList.add('dialog--gone');
            this.closed.emit();
        },
    });

    constructor() {
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }

    /**
     * The overlay's dialog-leave-start, as the element using it starts to leave
     * (styles/_dialog.scss): the card goes from wherever it is, caught on its way in included.
     */
    protected leaving(event: AnimationEvent) {
        if (event.target === event.currentTarget && event.animationName === 'dialog-leave-start') {
            void this.sheet.leave();
        }
    }
}
