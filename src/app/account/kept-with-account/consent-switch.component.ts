import { DatePipe } from '@angular/common';
import { Component, input, signal, viewChild } from '@angular/core';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch/toggle-switch.component';
import type { HealthConsent } from '../consent.service';

/**
 * A switch giving or withdrawing consent to keeping something that may be health data with the
 * account (SYN-10, CAL-6), its name and hint beside it, as Settings lists switches. Given, the
 * hint says when, then the projected `[given]` text; not, the `[not-given]` text. If `save`
 * fails, the switch goes back and it says so.
 */
@Component({
    selector: 'app-consent-switch',
    imports: [DatePipe, ToggleSwitchComponent],
    template: `
        @let isGiven = given();
        <div class="consent-switch">
            <div class="consent-switch__text">
                <span class="consent-switch__name" [id]="switchId() + '-label'">{{ name() }}</span>
                <span class="consent-switch__hint" [id]="switchId() + '-hint'">
                    @if (isGiven) {
                        Agreed on {{ isGiven.at | date: 'd MMMM y' }}.
                        <ng-content select="[given]" />
                    } @else {
                        <ng-content select="[not-given]" />
                    }
                </span>
            </div>
            <app-toggle-switch
                [checked]="!!isGiven"
                (checkedChange)="keep($event)"
                [disabled]="busy()"
                [labelledBy]="switchId() + '-label'"
                [describedBy]="switchId() + '-hint'"
            />
        </div>
        @if (failed()) {
            <p class="consent-switch__problem" role="alert">
                That couldn't be saved. Check your connection and try again.
            </p>
        }
    `,
    styles: `
        @use 'switch-row' as *;

        :host {
            display: block;
        }

        .consent-switch {
            @include switch-row;
        }

        .consent-switch__text {
            @include switch-row-text;
        }

        .consent-switch__name {
            @include switch-row-name;
        }

        .consent-switch__hint {
            @include switch-row-hint;
        }

        .consent-switch__problem {
            margin: 0.5rem 0 0;
            font-size: 0.85rem;
            color: var(--text-danger);
        }
    `,
})
export class ConsentSwitchComponent {
    /** The switch's id; its name and hint are `<id>-label` and `<id>-hint`. */
    readonly switchId = input.required<string>();
    readonly name = input.required<string>();
    /** The account's consent, or null if it hasn't given it. */
    readonly given = input.required<HealthConsent | null>();
    /** Gives or withdraws it on the account, resolving to whether that was saved. */
    readonly save = input.required<(keep: boolean) => Promise<boolean>>();

    /** The switch, put back by hand if a change can't be saved, as its binding hasn't changed. */
    private readonly switch = viewChild.required(ToggleSwitchComponent);
    /** Waiting on the server, so it can't be switched twice. */
    protected readonly busy = signal(false);
    /** The last change couldn't be saved. */
    protected readonly failed = signal(false);

    protected async keep(keep: boolean) {
        this.busy.set(true);
        this.failed.set(false);
        const saved = await this.save()(keep);
        this.busy.set(false);
        if (!saved) {
            this.switch().checked.set(!!this.given());
            this.failed.set(true);
        }
    }
}
