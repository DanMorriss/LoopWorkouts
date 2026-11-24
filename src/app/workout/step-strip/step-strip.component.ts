import { Component, input } from '@angular/core';
import { StepKind } from '../../models/workout';

/** A step of the round as a segment of the strip: its kind, and done, in progress or to go. */
export interface StripStep {
    kind: StepKind;
    /** `skipped`: put aside to do later, so behind it but not done. */
    state: 'done' | 'current' | 'left' | 'skipped';
}

/**
 * The round's steps as a strip of segments in their kinds' colours, under the round line: the
 * shape of the round, and where in it you are. Screen readers hear "step 2 of 5" with each
 * step instead.
 */
@Component({
    selector: 'app-step-strip',
    template: `
        <div class="step-strip" aria-hidden="true">
            @for (step of steps(); track $index) {
                <span
                    class="step-strip__step"
                    [class]="['step-strip__step--' + step.kind, 'step-strip__step--' + step.state]"
                ></span>
            }
        </div>
    `,
    styleUrl: './step-strip.component.scss',
})
export class StepStripComponent {
    readonly steps = input.required<readonly StripStep[]>();
}
