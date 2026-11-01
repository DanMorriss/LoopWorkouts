import { Component, computed, input } from '@angular/core';
import { MUSCLE_LABELS } from '../../models/exercise';
import { MuscleBalance, MuscleStatus, TrainingGoal, WeeklyAim } from '../../models/muscle-balance';

const statusText = (status: MuscleStatus, { low, high }: WeeklyAim) =>
    ({
        under: `under ${low}`,
        'in-range': `within ${low} to ${high}`,
        over: `over ${high}`,
    })[status];

/**
 * A bar per muscle group for this week's sets, against the sets a week it aims for, shaded as
 * a band on its track: short of it is under, past it is over. Small muscles aim lower, and
 * every muscle lower when training for fitness. The band's edges are drawn over the fill, so
 * the aim still shows once the bar has passed it: a line on the track, or a notch cut in the
 * fill where the fill covers it.
 */
@Component({
    selector: 'app-muscle-bars',
    templateUrl: './muscle-bars.component.html',
    styleUrl: './muscle-bars.component.scss',
})
export class MuscleBarsComponent {
    readonly balance = input.required<readonly MuscleBalance[]>();
    readonly goal = input.required<TrainingGoal>();

    /** The sets at the right end of the tracks: room past the highest band, or the most done. */
    private readonly scale = computed(() =>
        Math.max(...this.balance().map(({ sets, aim }) => Math.max(aim.high * 1.25, sets)))
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
                band: {
                    left: (aim.low / this.scale()) * 100,
                    width: ((aim.high - aim.low) / this.scale()) * 100,
                    right: (aim.high / this.scale()) * 100,
                    // Each edge lies just inside the band, so a bar that ends on the aim's
                    // low edge leaves it on the track, and one that ends on its high edge covers it
                    lowCovered: sets > aim.low,
                    highCovered: sets >= aim.high,
                },
                description: `${count} ${sets === 1 ? 'set' : 'sets'}, ${statusText(status, aim)}`,
            };
        })
    );
}
