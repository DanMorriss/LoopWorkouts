import {
    Component,
    computed,
    DestroyRef,
    DOCUMENT,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { email, form, FormField, pattern, required } from '@angular/forms/signals';
import { AccountService, SendResult } from '../account.service';
import { SIGN_IN_PROVIDERS, SignInProvider } from '../account-client';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CodeInputComponent, CODE_LENGTH } from './code-input/code-input.component';
import { ResendCodeComponent } from './resend-code/resend-code.component';
import { counted } from '../../shared/format-count';

const PROVIDER_NAMES: Record<SignInProvider, string> = { google: 'Google', apple: 'Apple' };
/** How long Supabase makes an address wait between sign-in emails, by default. */
const RESEND_AFTER_MS = 60_000;

/** Too many sign-in emails, saying how long to wait when Supabase does. */
function tooManyMessage(wait: number | null): string {
    return wait
        ? `Too many sign-in emails for now. Wait ${counted(wait, 'second')}, then try again.`
        : 'Too many sign-in emails for now. Wait a while, then try again.';
}

/**
 * Signing in (SYN-3, SYN-7): with Google (and Apple, once it's set up), which go there and
 * come back signed in, or by email: a 6-digit code is sent, and typed here, never leaving the app.
 * Whether to keep notes with the account is asked once signed in (SYN-10, NotesAskComponent).
 * Shown signed out on the You tab, with an `intro`, and in the welcome screen's card.
 * Says what it's doing under itself, read out as it changes.
 */
@Component({
    selector: 'app-sign-in',
    imports: [CodeInputComponent, FormField, IconComponent, ResendCodeComponent],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.scss',
    // Supabase's code loads as soon as the form's used, so it's there by the time it's sent
    host: { '(focusin)': 'account.prepare()', '(pointerdown)': 'account.prepare()' },
})
export class SignInComponent {
    /** Why sign in, over the buttons, and what the email field is described by, if given. */
    readonly intro = input<string>();
    /** Signed in here, with the code; Google and Apple come back to the You tab. */
    readonly signedIn = output<void>();

    protected readonly account = inject(AccountService);
    private readonly focus = injectFocusAfterRender();
    private readonly document = inject(DOCUMENT);

    /** Where the email was sent, once it has been: then the code is asked for. */
    protected readonly sentTo = signal<string | null>(null);
    /** When Send another code can be pressed. */
    protected readonly resendAt = signal(0);
    /** Waiting on the server, so the buttons can't be pressed twice. */
    protected readonly busy = signal(false);
    /** What the last thing done did, read out as it changes. */
    protected readonly message = signal('');

    private readonly emailModel = signal({ email: '' });
    protected readonly emailForm = form(this.emailModel, (fields) => {
        required(fields.email, { message: 'Enter your email address.' });
        email(fields.email, { message: "That isn't an email address. Check it and try again." });
    });
    protected readonly emailError = computed(() =>
        this.emailForm.email().touched()
            ? this.emailForm.email().errors().at(0)?.message
            : undefined
    );
    /** The email field's error, then why sign in, of those there are. */
    protected readonly emailDescribedBy = computed(
        () =>
            [this.emailError() && 'account-email-error', this.intro() && 'account-why']
                .filter(Boolean)
                .join(' ') || null
    );

    private readonly codeModel = signal({ code: '' });
    protected readonly codeForm = form(this.codeModel, (fields) => {
        required(fields.code, { message: 'Enter the code from the email.' });
        // Every box filled (CodeInputComponent leaves a space for an empty one)
        pattern(fields.code, new RegExp(`^\\d{${CODE_LENGTH}}$`), {
            message: 'The code is the 6 digits in the email, e.g. 123456.',
        });
    });
    protected readonly codeError = computed(() =>
        this.codeForm.code().touched() ? this.codeForm.code().errors().at(0)?.message : undefined
    );

    private readonly codeInput = viewChild(CodeInputComponent);

    /** The provider being gone to, until the page has left for it. */
    private leavingFor: string | null = null;

    constructor() {
        // Back from Google without signing in, the browser can show this page as it was
        // left, still "Going to Google…" with the buttons off; so it's put back as it was.
        const view = this.document.defaultView;
        const shown = (event: PageTransitionEvent) => {
            if (event.persisted && this.leavingFor) {
                this.leavingFor = null;
                this.busy.set(false);
                this.message.set('');
            }
        };
        view?.addEventListener('pageshow', shown);
        inject(DestroyRef).onDestroy(() => view?.removeEventListener('pageshow', shown));
    }

    /** Whether `provider` is offered, being set up in Supabase (SIGN_IN_PROVIDERS). */
    protected offers(provider: SignInProvider): boolean {
        return SIGN_IN_PROVIDERS.includes(provider);
    }

    /** Off to Google or Apple to sign in, coming back to the You tab signed in (SYN-7). */
    protected async signInWith(provider: SignInProvider) {
        const name = PROVIDER_NAMES[provider];
        this.busy.set(true);
        this.leavingFor = name;
        this.message.set(`Going to ${name}…`);
        if (!(await this.account.signInWith(provider))) {
            this.leavingFor = null;
            this.busy.set(false);
            this.message.set(`Couldn't reach ${name}. Check your connection and try again.`);
        }
    }

    /**
     * Sends the sign-in email. Handled here rather than as a form submission, as the form
     * goes once it's sent, and a form taken away mid-submission stays "submitting".
     */
    protected async sendCode(event: Event) {
        event.preventDefault();
        this.emailForm.email().markAsTouched();
        if (this.emailForm().invalid()) {
            this.focus('account-email');
            return;
        }
        const address = this.emailModel().email.trim();
        this.busy.set(true);
        const result = await this.account.sendCode(address);
        this.busy.set(false);
        if (result.status === 'sent') {
            this.message.set('');
            this.account.signInProblem.set(null);
            this.sentTo.set(address);
            this.resendAt.set(Date.now() + RESEND_AFTER_MS);
            this.focus('account-sent');
        } else {
            this.showNotSent(result);
        }
    }

    /** Another code to the same address: the email didn't come, or the code's expired. */
    protected async resend() {
        const address = this.sentTo();
        if (!address || this.busy()) {
            return;
        }
        this.busy.set(true);
        const result = await this.account.sendCode(address);
        this.busy.set(false);
        // Focus goes back to the code either way, as this button's off while it waits
        if (result.status === 'sent') {
            this.codeForm().reset({ code: '' });
            this.resendAt.set(Date.now() + RESEND_AFTER_MS);
            this.message.set(`We've sent another code to ${address}.`);
            // The emptied code's first box, once it's shown empty
            this.focus('account-code');
        } else {
            this.showNotSent(result);
            this.codeInput()?.focus();
        }
    }

    /** Why the email wasn't sent; if Supabase says how long to wait, Send another code waits too. */
    private showNotSent(result: Exclude<SendResult, { status: 'sent' }>) {
        if (result.status === 'too-many') {
            if (result.wait) {
                this.resendAt.set(Date.now() + result.wait * 1000);
            }
            this.message.set(tooManyMessage(result.wait));
        } else {
            this.message.set("The email couldn't be sent. Check your connection and try again.");
        }
    }

    /** Signs in with the code: on Sign in, or as soon as its last digit is entered. */
    protected async enterCode(event?: Event) {
        event?.preventDefault();
        // Already being checked, e.g. filled in and then Sign in pressed
        if (this.busy()) {
            return;
        }
        const address = this.sentTo();
        this.codeForm.code().markAsTouched();
        if (!address || this.codeForm().invalid()) {
            // The first box left to fill
            this.codeInput()?.focus();
            return;
        }
        this.busy.set(true);
        const signedIn = await this.account.enterCode(address, this.codeModel().code);
        this.busy.set(false);
        if (signedIn) {
            this.signedIn.emit();
        } else {
            this.message.set(
                "That code didn't work: it may be wrong, or expired. Check it, or send another code."
            );
        }
    }

    /** Back to the email field, e.g. to fix a typo in it. */
    protected useAnotherEmail() {
        this.sentTo.set(null);
        this.message.set('');
        this.codeModel.set({ code: '' });
        this.focus('account-email');
    }
}
