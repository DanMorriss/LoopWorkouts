import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { formatSeconds } from '../../../shared/format-time';

/**
 * Send another code (SYN-3), for when the email doesn't come or the code's expired: off, and
 * counting down, until Supabase will send another to the address (`allowedAt`), so it isn't
 * pressed only to be told to wait.
 */
@Component({
    selector: 'app-resend-code',
    template: `
        <p class="resend">
            Didn't get it?
            <button
                type="button"
                class="resend__button"
                [disabled]="secondsLeft() > 0 || busy()"
                (click)="resend.emit()"
            >
                {{ label() }}
            </button>
        </p>
    `,
    styleUrl: './resend-code.component.scss',
})
export class ResendCodeComponent {
    /** When another code can be sent, in milliseconds since 1970. */
    readonly allowedAt = input.required<number>();
    /** Waiting on the server, as for the other buttons. */
    readonly busy = input(false);
    readonly resend = output<void>();

    private readonly now = signal(Date.now());
    protected readonly secondsLeft = computed(() =>
        Math.max(0, Math.ceil((this.allowedAt() - this.now()) / 1000))
    );
    /** e.g. "Send another code in 42s"; not read out each second, as it's not live. */
    protected readonly label = computed(() => {
        const left = this.secondsLeft();
        if (left === 0) {
            return 'Send another code';
        }
        return `Send another code in ${left <= 60 ? `${left}s` : formatSeconds(left)}`;
    });

    constructor() {
        const timer = setInterval(() => this.now.set(Date.now()), 1000);
        inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
}
