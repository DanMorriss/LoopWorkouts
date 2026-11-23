import {
    afterRenderEffect,
    Component,
    ElementRef,
    input,
    model,
    output,
    viewChildren,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

/** How many digits the sign-in code has (Supabase's Email OTP Length). */
export const CODE_LENGTH = 6;
const LAST = CODE_LENGTH - 1;
const LABELS = Array.from({ length: CODE_LENGTH }, (_, i) => `Digit ${i + 1} of ${CODE_LENGTH}`);

/**
 * The sign-in code (SYN-3), typed one digit to a box: each digit moves on to the next box,
 * and pasting the code, or a phone filling it in from the email, fills them all. Backspace
 * clears a box, or the one before when it's empty; the arrow keys move between them.
 *
 * Works with Signal Forms (`[formField]`): its value is the digits typed, with a space for a
 * box left empty between them (e.g. "12 456"), so a code with a gap isn't taken as whole.
 * The first box has `inputId`, so focusing it by id starts the code.
 */
@Component({
    selector: 'app-code-input',
    template: `
        <div class="code-input" role="group" [attr.aria-labelledby]="labelledBy()">
            @for (label of labels; track $index) {
                <input
                    #box
                    class="picker-field__input code-input__digit"
                    type="text"
                    inputmode="numeric"
                    [attr.id]="$first ? inputId() : null"
                    [attr.autocomplete]="$first ? 'one-time-code' : 'off'"
                    [attr.aria-label]="label"
                    [attr.aria-invalid]="hasError()"
                    [attr.aria-describedby]="describedBy() ?? null"
                    [disabled]="disabled()"
                    (focus)="focused($index)"
                    (input)="typed($index)"
                    (keydown)="key($event, $index)"
                    (paste)="pasted($event, $index)"
                />
            }
        </div>
    `,
    styleUrl: './code-input.component.scss',
    host: { '(focusout)': 'left($event)' },
})
export class CodeInputComponent implements FormValueControl<string> {
    readonly value = model('');
    readonly disabled = input(false);
    /** The first box's id. */
    readonly inputId = input.required<string>();
    /** What names the code, e.g. its visible label. */
    readonly labelledBy = input.required<string>();
    readonly describedBy = input<string | null>();
    /** Whether an error is showing for it, for screen readers. */
    readonly hasError = input(false);
    /** Focus has left the code, for Signal Forms' touched. */
    readonly touch = output<void>();

    protected readonly labels = LABELS;
    private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

    constructor() {
        // Each box shows its digit, however the value changed (typed, pasted or reset)
        afterRenderEffect(() => {
            const digits = this.digits();
            this.boxes().forEach((box, i) => (box.nativeElement.value = digits[i]));
        });
    }

    /** Focuses the first empty box, for Signal Forms (e.g. on an invalid submission). */
    focus() {
        this.box(this.firstEmpty()).focus();
    }

    /**
     * A box past the digits typed so far goes back to the first empty one, so the code is
     * typed in order; boxes up to there can be gone back to, to fix one.
     */
    protected focused(position: number) {
        if (position > Math.min(this.value().length, LAST)) {
            this.box(this.firstEmpty()).focus();
            return;
        }
        // So a digit typed replaces the one there
        this.box(position).select();
    }

    protected typed(position: number) {
        const box = this.box(position);
        let digits = box.value.replace(/\D/g, '');
        const old = this.digits()[position];
        // A digit typed beside the one already there, rather than over it
        if (old && digits.length === 2) {
            digits = digits[0] === old ? digits[1] : digits[0];
        }
        if (digits) {
            this.fill(digits, position);
        } else {
            this.clear(position);
        }
        // Letters, or a second digit, don't stay in the box
        box.value = this.digits()[position];
    }

    protected pasted(event: ClipboardEvent, position: number) {
        event.preventDefault();
        const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
        if (digits) {
            this.fill(digits, position);
        }
    }

    protected key(event: KeyboardEvent, position: number) {
        const digits = this.digits();
        switch (event.key) {
            case 'Backspace':
                event.preventDefault();
                if (digits[position]) {
                    this.clear(position);
                } else if (position > 0) {
                    this.clear(position - 1);
                    this.box(position - 1).focus();
                }
                break;
            case 'Delete':
                event.preventDefault();
                this.clear(position);
                break;
            case 'ArrowLeft':
                if (position > 0) {
                    event.preventDefault();
                    this.box(position - 1).focus();
                }
                break;
            case 'ArrowRight':
                if (position < LAST) {
                    event.preventDefault();
                    this.box(position + 1).focus();
                }
                break;
        }
    }

    /** Touched once focus leaves all the boxes, not on moving between them. */
    protected left(event: FocusEvent) {
        const host = event.currentTarget as HTMLElement;
        if (!host.contains(event.relatedTarget as Node | null)) {
            this.touch.emit();
        }
    }

    /** The whole code from the first box (pasted, or filled in by the phone), or digits from here. */
    private fill(typed: string, position: number) {
        const whole = typed.length >= CODE_LENGTH;
        const start = whole ? 0 : position;
        const digits = this.digits();
        [...typed.slice(0, CODE_LENGTH - start)].forEach((digit, i) => (digits[start + i] = digit));
        this.set(digits);
        this.box(Math.min(start + typed.length, LAST)).focus();
    }

    private clear(position: number) {
        const digits = this.digits();
        digits[position] = '';
        this.set(digits);
    }

    /** Each box's digit, or '' for an empty one. */
    private digits(): string[] {
        const code = this.value();
        return Array.from({ length: CODE_LENGTH }, (_, i) => (code[i] ?? '').trim());
    }

    private set(digits: string[]) {
        this.value.set(
            digits
                .map((digit) => digit || ' ')
                .join('')
                .trimEnd()
        );
    }

    private firstEmpty(): number {
        const empty = this.digits().indexOf('');
        return empty === -1 ? LAST : empty;
    }

    private box(position: number): HTMLInputElement {
        return this.boxes()[position].nativeElement;
    }
}
