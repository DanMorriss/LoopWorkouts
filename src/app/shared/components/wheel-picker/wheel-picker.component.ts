import {
    afterNextRender,
    afterRenderEffect,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    model,
    signal,
    viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { injectPrefersReducedMotion } from '../../reduced-motion';
import { WheelDrag } from './wheel-drag';

export interface WheelPickerOption {
    value: number;
    label: string;
    /** What screen readers say for this option, if not the label, e.g. "until stopped" for "∞". */
    spokenLabel?: string;
}

/** Digits typed within this many ms of each other build one number, e.g. "4" then "5" is 45. */
const TYPING_PAUSE = 1000;

/** An open wheel that has been turned closes this many ms after it stops. */
const CLOSE_AFTER_TURN = 400;
/** One opened but not turned yet waits longer, so a tap can open it and a second tap pick. */
const CLOSE_AFTER_OPEN = 1000;

/**
 * An iPhone-style wheel picker. Closed, it shows just the selected number; pressing it
 * opens the wheel over the page around that number, so a finger can press and drag in one
 * go. Scroll, swipe or drag the list and the number that settles in the middle is selected;
 * clicking a number selects it and closes the wheel. It also closes on its own once it's
 * stopped turning (or after a second, if opened and not turned). For
 * keyboard and screen reader users it's a spin button (Up/Down, Page Up/Down, Home/End),
 * and typing a number jumps to it.
 *
 * Works with Signal Forms: bind it with `[formField]`.
 */
@Component({
    selector: 'app-wheel-picker',
    templateUrl: './wheel-picker.component.html',
    styleUrl: './wheel-picker.component.scss',
    host: { '[class.wheel-picker--open]': 'open()' },
})
export class WheelPickerComponent implements FormValueControl<number> {
    readonly value = model(0);
    readonly options = input.required<readonly WheelPickerOption[]>();
    /** id of the element that labels this picker. */
    readonly labelledBy = input<string>();

    private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
    private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
    private readonly reducedMotion = injectPrefersReducedMotion();
    protected readonly mouseDrag = new WheelDrag({
        viewport: () => this.viewport().nativeElement,
        track: () => this.track().nativeElement,
        rowHeight: () => this.rowHeight(),
        indexAtScroll: () => this.indexAtScroll(),
        lastIndex: () => this.options().length - 1,
        selectIndex: (index) => this.selectIndex(index),
        reducedMotion: this.reducedMotion,
    });

    protected readonly selectedIndex = computed(() =>
        Math.max(
            0,
            this.options().findIndex((option) => option.value === this.value())
        )
    );
    protected readonly valueText = computed(() => {
        const option = this.options()[this.selectedIndex()];
        return option?.spokenLabel ?? option?.label;
    });
    // Lowest and highest values, not first and last: an option like ∞ can sit at the end with a low value
    protected readonly lowest = computed(() => Math.min(...this.options().map((o) => o.value)));
    protected readonly highest = computed(() => Math.max(...this.options().map((o) => o.value)));

    /** Open shows the numbers around the selected one; closed shows only that one. */
    protected readonly open = signal(false);
    private closeTimer: ReturnType<typeof setTimeout> | undefined;
    /** A finger, pen or mouse button is down on the wheel; it never closes meanwhile. */
    private pressed = false;
    /** The current press opened the wheel, so its click mustn't close it straight away. */
    private openedByPress = false;
    /** It has turned since it opened, so it can close sooner. */
    private turned = false;

    /** The first scroll to the value jumps there; after that the wheel glides. */
    private shown = false;
    private settleTimer: ReturnType<typeof setTimeout> | undefined;
    /** Digits typed so far, and when the last one was typed. */
    private typed = { text: '', at: 0 };

    constructor() {
        // Keep the wheel showing the value, whether it changed here or from outside (the form,
        // or a switch that sets it). It jumps on first show, and glides after that.
        afterRenderEffect(() => {
            const index = this.selectedIndex();
            const viewport = this.viewport().nativeElement;
            const behavior: ScrollBehavior =
                this.shown && !this.reducedMotion() ? 'smooth' : 'instant';
            this.shown = true;
            if (this.indexAtScroll() !== index) {
                viewport.scrollTo({ top: index * this.rowHeight(), behavior });
            }
        });

        // Hiding the wheel or moving it in the page (e.g. while a list item is dragged) resets
        // its scroll, which is how it shows the value. It changes size when that happens, so
        // line the value back up then.
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const observer = new ResizeObserver(() => this.realign());
            observer.observe(this.viewport().nativeElement);
            destroyRef.onDestroy(() => observer.disconnect());
        });
        destroyRef.onDestroy(() => {
            clearTimeout(this.closeTimer);
            this.mouseDrag.stopGlide();
        });
    }

    focus(options?: FocusOptions) {
        this.viewport().nativeElement.focus(options);
    }

    /** Jumps the wheel back to the selected value, if it's showing and has drifted off it. */
    private realign() {
        const viewport = this.viewport().nativeElement;
        // Not while pressed: opening resizes the wheel, and a finger may already be turning it
        if (viewport.clientHeight === 0 || this.pressed || this.mouseDrag.gliding) {
            return;
        }
        const top = this.selectedIndex() * this.rowHeight();
        if (Math.abs(viewport.scrollTop - top) >= 0.5) {
            viewport.scrollTo({ top, behavior: 'instant' });
        }
    }

    protected onScroll() {
        // Still turning, so not idle yet
        if (this.open()) {
            this.turned = true;
        }
        this.scheduleClose();
        // Browsers without the scrollend event: settle once scrolling has paused
        if (!('onscrollend' in window)) {
            clearTimeout(this.settleTimer);
            this.settleTimer = setTimeout(() => this.settle(), 120);
        }
    }

    /** Scrolling has stopped: select whatever is in the middle. */
    protected settle() {
        // A mouse drag, or the glide after one, settles itself when it's done
        if (this.mouseDrag.moving) {
            return;
        }
        const index = this.indexAtScroll();
        const option = this.options()[index];
        if (option && option.value !== this.value()) {
            this.value.set(option.value);
        }

        // Chrome can stop a pixel short when one smooth scroll interrupts another (e.g.
        // typing "2" then "5"), so line the row up with the band exactly
        const viewport = this.viewport().nativeElement;
        const rowTop = index * this.rowHeight();
        if (Math.abs(viewport.scrollTop - rowTop) >= 0.5) {
            viewport.scrollTo({ top: rowTop, behavior: 'instant' });
        }
    }

    protected onItemClick(index: number) {
        this.selectIndex(index);
        if (this.openedByPress) {
            // The press that opened the wheel: leave it open to pick from
            this.openedByPress = false;
        } else {
            this.close();
        }
    }

    protected onKeydown(event: KeyboardEvent) {
        // A key mid-glide takes over, rather than the glide landing on its own row after it
        this.mouseDrag.endGlide();
        if (event.key === 'Escape' && this.open()) {
            event.preventDefault();
            this.close();
            return;
        }
        // A decimal point too, for wheels with halves, e.g. 22.5 (a comma where that's the point)
        if (/^[0-9.,]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            this.openWheel();
            this.typeDigit(event.key === ',' ? '.' : event.key);
            return;
        }

        const last = this.options().length - 1;
        const current = this.selectedIndex();
        const target = {
            ArrowUp: current - 1,
            ArrowDown: current + 1,
            PageUp: current - 5,
            PageDown: current + 5,
            Home: 0,
            End: last,
        }[event.key];
        if (target === undefined) {
            return;
        }
        event.preventDefault();
        // Open, so keyboard users see the numbers either side too
        this.openWheel();
        this.selectIndex(Math.min(last, Math.max(0, target)));
    }

    /** Focus has moved elsewhere. */
    protected onFocusOut() {
        this.close();
    }

    /** A mouse wheel or trackpad turning it: open, so the numbers either side show too. */
    protected onWheel() {
        this.openWheel();
    }

    protected onPointerDown(event: PointerEvent) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }
        // Opens on press rather than on click, so a finger can carry straight on and turn it
        this.pressed = true;
        this.openedByPress = !this.open();
        this.openWheel();
        // Caught mid-glide: it stops where it is, under the pointer
        this.mouseDrag.stopGlide();
        this.mouseDrag.press(event);
    }

    /**
     * The press has ended. A finger that starts scrolling the wheel cancels its pointer
     * straight away, though it's still down, so for touch that waits for touchend instead.
     */
    protected onPointerUp(event: PointerEvent) {
        if (event.type === 'pointerup' || event.pointerType === 'mouse') {
            this.release();
        }
        this.mouseDrag.end(event);
    }

    protected release() {
        this.pressed = false;
        this.scheduleClose();
    }

    private openWheel() {
        if (!this.open()) {
            this.turned = false;
        }
        this.open.set(true);
        this.scheduleClose();
    }

    private close() {
        clearTimeout(this.closeTimer);
        this.open.set(false);
    }

    /** (Re)starts the countdown to closing, unless the wheel is closed or being pressed. */
    private scheduleClose() {
        clearTimeout(this.closeTimer);
        if (this.open() && !this.pressed) {
            const delay = this.turned ? CLOSE_AFTER_TURN : CLOSE_AFTER_OPEN;
            this.closeTimer = setTimeout(() => this.close(), delay);
        }
    }

    /**
     * Jump to a typed number. Quick digits (and a decimal point) build one number; if that
     * number isn't on the wheel (e.g. 75 on a 0-59 wheel), start again from the digit just
     * typed.
     */
    private typeDigit(digit: string) {
        const now = Date.now();
        const continuing = now - this.typed.at <= TYPING_PAUSE;
        const indexOf = (text: string) =>
            this.options().findIndex((option) => option.value === Number(text));

        let text = continuing ? this.typed.text + digit : digit;
        let index = indexOf(text);
        if (index === -1 && continuing) {
            text = digit;
            index = indexOf(text);
        }
        this.typed = { text, at: now };
        if (index !== -1) {
            this.selectIndex(index);
        }
    }

    private selectIndex(index: number) {
        const option = this.options()[index];
        if (!option) {
            return;
        }
        const behavior: ScrollBehavior = this.reducedMotion() ? 'instant' : 'smooth';
        if (option.value !== this.value()) {
            this.value.set(option.value);
        } else {
            // Same value, but the wheel may sit between rows (e.g. after a drag): snap back
            this.viewport().nativeElement.scrollTo({ top: index * this.rowHeight(), behavior });
        }
    }

    // Exactly, not rounded to a whole pixel as offsetHeight is: a row sized in rem or vw can
    // be 33.6px, and rounding it would land a long way down the list a row out. Its layout
    // height, as the drum's tilt would shrink a measurement of it on screen.
    private rowHeight(): number {
        const item =
            this.viewport().nativeElement.querySelector<HTMLElement>('.wheel-picker__item');
        return (item && parseFloat(getComputedStyle(item).height)) || 1;
    }

    private indexAtScroll(): number {
        const index = Math.round(this.viewport().nativeElement.scrollTop / this.rowHeight());
        return Math.min(this.options().length - 1, Math.max(0, index));
    }
}
