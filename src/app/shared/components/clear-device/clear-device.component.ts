import {
    afterNextRender,
    Component,
    ElementRef,
    inject,
    Injector,
    signal,
    viewChild,
} from '@angular/core';
import { DeviceDataService } from '../../state/device-data.service';

/**
 * Clear this device (SYN-9), on You → Your data. It can't be undone,
 * so rather than going ahead with an Undo, as deleting does elsewhere, the button first opens
 * a warning in place, with Clear everything and Cancel.
 */
@Component({
    selector: 'app-clear-device',
    template: `
        @if (asking()) {
            <div class="clear-device__ask" role="group" aria-labelledby="clear-device-warning">
                <p class="clear-device__warning" id="clear-device-warning" tabindex="-1" #warning>
                    This removes your workouts, history, exercises and settings from this device. It
                    can't be undone, so export a backup first to keep them.
                </p>
                <div class="clear-device__actions">
                    <button
                        type="button"
                        class="btn-pill btn-pill--danger"
                        [disabled]="clearing()"
                        (click)="clear()"
                    >
                        Clear everything
                    </button>
                    <button type="button" class="btn-pill" (click)="cancel()">Cancel</button>
                </div>
            </div>
        } @else {
            <button type="button" class="btn-pill btn-pill--danger" #start (click)="ask()">
                Clear this device
            </button>
        }
    `,
    styles: `
        :host {
            display: block;
        }

        .clear-device__warning {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-danger);

            &:focus {
                outline: none;
            }
        }

        .clear-device__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 0.75rem;
        }
    `,
})
export class ClearDeviceComponent {
    private readonly device = inject(DeviceDataService);
    private readonly injector = inject(Injector);
    private readonly warning = viewChild<ElementRef<HTMLElement>>('warning');
    private readonly start = viewChild<ElementRef<HTMLButtonElement>>('start');

    protected readonly asking = signal(false);
    protected readonly clearing = signal(false);

    /** Opens the warning, and moves focus to it so it's read out. */
    protected ask() {
        this.asking.set(true);
        afterNextRender(() => this.warning()?.nativeElement.focus(), { injector: this.injector });
    }

    /** Closes the warning, focus going back to the button that opened it. */
    protected cancel() {
        this.asking.set(false);
        afterNextRender(() => this.start()?.nativeElement.focus(), { injector: this.injector });
    }

    protected async clear() {
        this.clearing.set(true);
        await this.device.clear();
    }
}
