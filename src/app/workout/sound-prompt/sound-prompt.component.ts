import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { HelpLinkComponent } from '../../help/help-link/help-link.component';
import { AlarmService } from '../../shared/alarms/alarm.service';
import { SettingsStore } from '../../shared/state/settings-store.service';

/**
 * After a reload the browser blocks sound until the page is tapped again, while the workout
 * carries on: "Sound off · tap to turn on", with a ? to Help, on the ring's top edge, where it's
 * seen from where the time is read. Under the controls, a phone propped up out of reach hid it.
 * Placed in the ring's stage, which it's positioned against.
 */
@Component({
    selector: 'app-sound-prompt',
    imports: [MatIconModule, HelpLinkComponent],
    template: `
        @if (locked()) {
            <div class="sound-prompt">
                <button
                    type="button"
                    class="btn-pill sound-prompt__button"
                    (click)="alarms.unlock()"
                >
                    <mat-icon aria-hidden="true">volume_off</mat-icon>
                    Sound off · tap to turn on
                </button>
                <app-help-link topic="no-sound" />
            </div>
        }
    `,
    styles: `
        // In the stage's layout, so the pill is placed against it
        :host {
            display: contents;
        }

        // On the ring's top edge, over it, so nothing moves when it goes. A solid pill (with its
        // ? beside the button), edged in the accent, as it's the one thing on the page to act on.
        .sound-prompt {
            position: absolute;
            top: 0;
            left: 50%;
            z-index: 2;
            translate: -50% -50%;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            // Its own width (out of the flow, it'd shrink to half the stage's), within the ring's
            width: max-content;
            max-width: calc(100% - 1rem);
            padding-inline-end: 0.25rem;
            border: 1px solid var(--accent);
            border-radius: 999px;
            background: var(--raised);
            box-shadow: 0 6px 16px var(--shadow);
        }

        // On the narrowest phones its words wrap, rather than pushing the ? out of the pill
        .sound-prompt__button {
            flex-shrink: 1;
            text-wrap: balance;
            border-color: transparent;
            color: var(--text-strong);
            font-weight: 600;
        }
    `,
})
export class SoundPromptComponent {
    protected readonly alarms = inject(AlarmService);
    private readonly settings = inject(SettingsStore);

    /** Sound is on, but the browser is waiting for a tap before it will play any. */
    protected readonly locked = computed(
        () => this.alarms.supported && this.settings.sound() && !this.alarms.unlocked()
    );
}
