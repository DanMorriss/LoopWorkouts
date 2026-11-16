import { Component, inject } from '@angular/core';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch/toggle-switch.component';
import { WorkoutSetupForm } from '../workout-setup-form';

/**
 * Carry straight on after rests: a workout that runs as an interval timer does, e.g. a circuit
 * timed to the second, whose timed exercises never wait for Start after a long rest (RUN-14).
 * Shown only when one would.
 */
@Component({
    selector: 'app-setup-carry-on',
    imports: [ToggleSwitchComponent],
    template: `
        @if (setup.couldWait()) {
            <div class="carry-on">
                <div class="carry-on__text">
                    <span class="carry-on__name" id="carry-on-label">
                        Carry straight on after rests
                    </span>
                    <span class="carry-on__hint" id="carry-on-hint">
                        Off, a timed exercise after a rest of 30 seconds or more waits for Start.
                        On, it starts as the rest ends, as in a circuit timed to the second.
                    </span>
                </div>
                <app-toggle-switch
                    [checked]="setup.model().carryOn"
                    (checkedChange)="setup.setCarryOn($event)"
                    labelledBy="carry-on-label"
                    describedBy="carry-on-hint"
                />
            </div>
        }
    `,
    styles: `
        @use 'switch-row' as *;

        .carry-on {
            @include switch-row;
            margin-bottom: 1rem;
        }

        .carry-on__text {
            @include switch-row-text;
        }

        .carry-on__name {
            @include switch-row-name;
        }

        .carry-on__hint {
            @include switch-row-hint;
        }
    `,
})
export class SetupCarryOnComponent {
    protected readonly setup = inject(WorkoutSetupForm);
}
