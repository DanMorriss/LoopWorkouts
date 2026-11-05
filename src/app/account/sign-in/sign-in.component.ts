import {
    Component,
    computed,
    DestroyRef,
    DOCUMENT,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { email, form, FormField, pattern, required } from '@angular/forms/signals';
import { AccountService } from '../account.service';
import { SIGN_IN_PROVIDERS, SignInProvider } from '../account-client';
import { injectFocusAfterRender } from '../../shared/focus-after-render';

const PROVIDER_NAMES: Record<SignInProvider, string> = { google: 'Google', apple: 'Apple' };

/**
 * Signing in (SYN-3, SYN-7): with Google (and Apple, once it's set up), which go there and
 * come back signed in, or by an email link, then the code from the same email typed here.
 * Shown signed out on the You tab and on the welcome screen, each with its own `intro`.
 * Says what it's doing under itself, read out as it changes.
 */
@Component({
    selector: 'app-sign-in',
    imports: [FormField],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.scss',
})
export class SignInComponent {
    /** Why sign in, over the buttons, and what the email field is described by. */
    readonly intro = input.required<string>();
    /** Signed in here, with the code; Google and email links come back to the You tab. */
    readonly signedIn = output<void>();

    protected readonly account = inject(AccountService);
    private readonly focus = injectFocusAfterRender();
    private readonly document = inject(DOCUMENT);

    /** Where the email was sent, once it has been: then the code is asked for. */
    protected readonly sentTo = signal<string | null>(null);
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

    private readonly codeModel = signal({ code: '' });
    protected readonly codeForm = form(this.codeModel, (fields) => {
        required(fields.code, { message: 'Enter the code from the email.' });
        pattern(fields.code, /^\s*\d{6,10}\s*$/, {
            message: 'The code is the number in the email, e.g. 123456.',
        });
    });
    protected readonly codeError = computed(() =>
        this.codeForm.code().touched() ? this.codeForm.code().errors().at(0)?.message : undefined
    );

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
    protected async sendLink(event: Event) {
        event.preventDefault();
        this.emailForm.email().markAsTouched();
        if (this.emailForm().invalid()) {
            this.focus('account-email');
            return;
        }
        const address = this.emailModel().email.trim();
        this.busy.set(true);
        const result = await this.account.sendLink(address);
        this.busy.set(false);
        if (result === 'sent') {
            this.message.set('');
            this.account.linkProblem.set(null);
            this.sentTo.set(address);
            this.focus('account-sent');
        } else {
            this.message.set(
                result === 'too-many'
                    ? 'Too many sign-in emails for now. Wait a while, then try again.'
                    : "The email couldn't be sent. Check your connection and try again."
            );
        }
    }

    protected async enterCode(event: Event) {
        event.preventDefault();
        const address = this.sentTo();
        this.codeForm.code().markAsTouched();
        if (!address || this.codeForm().invalid()) {
            this.focus('account-code');
            return;
        }
        this.busy.set(true);
        const signedIn = await this.account.enterCode(address, this.codeModel().code.trim());
        this.busy.set(false);
        if (signedIn) {
            this.signedIn.emit();
        } else {
            this.message.set(
                "That code didn't work: it may be wrong, or expired. Check it, or send another email."
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

    /** Moves focus to an element once it's on the page. */
}
