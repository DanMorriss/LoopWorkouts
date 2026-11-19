import {
    afterNextRender,
    Component,
    DOCUMENT,
    ElementRef,
    EnvironmentInjector,
    inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActiveRunService } from '../../shared/run/active-run.service';

/** The workout page's main button, Pause, which is greyed out while the exercise waits. */
const PAUSE_ID = 'workout-pause';

/**
 * Start, in the face under the time, for a timed exercise waiting for it after a long rest
 * (RUN-14), so it's plain the exercise hasn't begun. Pause, under the Up next card, is greyed
 * out meanwhile. Focus on Pause as the wait begins moves here, as Pause can't keep it; once
 * Start is pressed this goes, and focus moves to Pause.
 */
@Component({
    selector: 'app-wait-start',
    imports: [MatIconModule],
    template: `
        <button
            type="button"
            class="btn-main btn-main--small wait-start"
            aria-keyshortcuts="Space"
            (click)="start()"
        >
            <mat-icon aria-hidden="true">play_arrow</mat-icon>
            Start
        </button>
    `,
    styles: `
        :host {
            display: block;
            margin-top: 0.5rem;
        }
    `,
})
export class WaitStartComponent {
    private readonly run = inject(ActiveRunService);
    private readonly document = inject(DOCUMENT);
    // The app's, as this is gone with the press by the time focus moves
    private readonly appInjector = inject(EnvironmentInjector);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    constructor() {
        // Pause is greyed out in the same change, but keeps focus till the page is next drawn
        if (this.document.activeElement?.id === PAUSE_ID) {
            afterNextRender(() => this.host.querySelector('button')?.focus());
        }
    }

    protected start() {
        const hadFocus = this.host.contains(this.document.activeElement);
        this.run.startExercise();
        if (hadFocus) {
            afterNextRender(() => this.document.getElementById(PAUSE_ID)?.focus(), {
                injector: this.appInjector,
            });
        }
    }
}
