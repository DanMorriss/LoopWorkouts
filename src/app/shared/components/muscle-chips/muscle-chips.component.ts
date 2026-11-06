import { Component, model } from '@angular/core';
import { MUSCLE_LABELS, MuscleGroup } from '../../../models/exercise';

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

/**
 * The main-muscle chips the Exercises list (EXR-6) and Browse in Create (BLD-16) are cut down
 * by: All muscles, then one toggle per muscle, in one row that scrolls sideways so the list
 * starts high on a phone. Bind the picked ones with `[(selected)]`.
 */
@Component({
    selector: 'app-muscle-chips',
    template: `
        <div class="muscle-chips" role="group" aria-label="Main muscle">
            <button
                type="button"
                class="muscle-chips__chip"
                [attr.aria-pressed]="selected().length === 0"
                (click)="selected.set([])"
            >
                All muscles
            </button>
            @for (m of muscles; track m) {
                <button
                    type="button"
                    class="muscle-chips__chip"
                    [attr.aria-pressed]="selected().includes(m)"
                    (click)="toggle(m)"
                >
                    {{ labels[m] }}
                </button>
            }
        </div>
    `,
    styleUrl: './muscle-chips.component.scss',
})
export class MuscleChipsComponent {
    /** The main muscles picked, or empty for all. */
    readonly selected = model<MuscleGroup[]>([]);

    protected readonly muscles = MUSCLES;
    protected readonly labels = MUSCLE_LABELS;

    /** Picks `muscle`, or takes it out if it's picked. */
    toggle(muscle: MuscleGroup) {
        this.selected.update((picked) =>
            picked.includes(muscle) ? picked.filter((m) => m !== muscle) : [...picked, muscle]
        );
    }
}
