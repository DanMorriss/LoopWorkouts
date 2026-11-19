import { Component, computed, input } from '@angular/core';
import { MUSCLE_LABELS } from '../../models/exercise';
import { MuscleBalance, TrainingGoal } from '../../models/muscle-balance';

/**
 * A bar per muscle group for this week's sets, against the sets a week it aims for, marked by
 * a line across its track: short of it is under, at it or past it is reached, however far.
 * Small muscles aim lower, and every muscle lower when training for fitness. The line is drawn
 * over the fill, so the aim still shows once the bar has passed it: a line on the track, or a
 * notch cut in the fill where the fill covers it.
 */
@Component({
    selector: 'app-muscle-bars',
    templateUrl: './muscle-bars.component.html',
    styleUrl: './muscle-bars.component.scss',
})
export class MuscleBarsComponent {
    readonly balance = input.required<readonly MuscleBalance[]>();
    readonly goal = input.required<TrainingGoal>();

    /** The sets at the right end of the tracks: twice the highest aim, or the most done. */
    private readonly scale = computed(() =>
        Math.max(...this.balance().map(({ sets, aim }) => Math.max(aim * 2, sets)))
    );

    protected readonly rows = computed(() =>
        this.balance().map(({ muscle, sets, aim, status }) => {
            const count = Number.isInteger(sets) ? `${sets}` : sets.toFixed(1);
            return {
                muscle,
                label: MUSCLE_LABELS[muscle],
                count,
                status,
                width: (sets / this.scale()) * 100,
                aim: {
                    left: (aim / this.scale()) * 100,
                    // The line lies just past the aim, so a bar that ends on the aim leaves it
                    // on the track, and one past it covers it
                    covered: sets > aim,
                },
                description: `${count} ${sets === 1 ? 'set' : 'sets'}, ${
                    status === 'under' ? `under ${aim}` : `${aim} reached`
                }`,
            };
        })
    );
}
