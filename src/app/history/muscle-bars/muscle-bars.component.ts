import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { MUSCLE_LABELS, MuscleGroup } from '../../models/exercise';
import { prefersReducedMotion } from '../../shared/reduced-motion';
import { MuscleBalance } from '../../models/muscle-balance';

/**
 * A bar per muscle group for this week's sets, against the sets a week it aims for, marked by
 * a line across its track: short of it is under, at it or past it is reached, however far.
 * Small muscles aim lower (`weeklyAim()`), and every muscle's aim is set on Profile. The line is drawn
 * over the fill, so the aim still shows once the bar has passed it: a line on the track, or a
 * notch cut in the fill where the fill covers it.
 *
 * The bars grow in from the left the first time they're scrolled into view, one just after
 * another; with reduced motion they're simply there. Each row is a toggle for its muscle,
 * pressed while it's `selected`, saying it was tapped.
 */
@Component({
    selector: 'app-muscle-bars',
    templateUrl: './muscle-bars.component.html',
    styleUrl: './muscle-bars.component.scss',
})
export class MuscleBarsComponent {
    readonly balance = input.required<readonly MuscleBalance[]>();
    /** The muscle picked on the page, or null. */
    readonly selected = input<MuscleGroup | null>(null);
    readonly muscleTapped = output<MuscleGroup>();

    /** Whether the bars are at their length: once they've been in view, or straight away. */
    protected readonly grown = signal(prefersReducedMotion());

    constructor() {
        const host = inject(ElementRef<HTMLElement>).nativeElement;
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            if (this.grown()) {
                return;
            }
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        this.grown.set(true);
                        observer.disconnect();
                    }
                },
                // A little of the list on screen, not just its top edge
                { threshold: 0.15 }
            );
            observer.observe(host);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

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
