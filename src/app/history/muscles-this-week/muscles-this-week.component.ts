import {
    Component,
    computed,
    inject,
    input,
    signal,
    viewChild,
    ViewContainerRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
    CarouselComponent,
    SlideDirective,
} from '../../shared/components/carousel/carousel.component';
import { MUSCLE_LABELS, MuscleGroup } from '../../models/exercise';
import { inLastSevenDays } from '../../models/history';
import { muscleBalance, setsByMuscle } from '../../models/muscle-balance';
import { lazyComponent } from '../../shared/lazy-component';
import { PageSlide } from '../../shared/navigation/page-slide';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { ShownHistory } from '../shown-history';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { MuscleBarsComponent } from '../muscle-bars/muscle-bars.component';
import type { BodyMapComponent } from '../../shared/components/body-map/body-map.component';

let nextId = 0;

/** The body map's code, loaded once for both its slides. */
const loadBodyMap = () =>
    import('../../shared/components/body-map/body-map.component').then(
        (loaded) => loaded.BodyMapComponent
    );

/**
 * A card with the muscles used in the last seven days, on the Progress page and Today: a body
 * map shaded by sets (PRG-6), swiped to the list of muscles it shows, then a bar per muscle
 * group against the sets a week aimed for (PRG-8). Tapping a muscle on the map, the list or a
 * bar picks it in all three, with a way to the exercises for it between the map and the bars.
 * Nothing shows with no sets in the week, so a blank map is never shown. `compact` (Today)
 * leaves the bars out, with See this week's progress, a button to them on Progress.
 */
@Component({
    selector: 'app-muscles-this-week',
    imports: [CarouselComponent, IconComponent, MuscleBarsComponent, RouterLink, SlideDirective],
    template: `
        @if (musclesWorked().hasData) {
            <section class="muscles-week" [attr.aria-labelledby]="id">
                <h3
                    class="muscles-week__title"
                    [class.muscles-week__title--label]="compact()"
                    [id]="id"
                >
                    Muscles worked this week
                </h3>
                <app-carousel label="Muscles worked this week" itemName="View">
                    <ng-template appSlide="Body map">
                        <!-- Its drawings (58 KiB) load only once there's something to show on
                             it, so a new guest's Today and Progress never wait on them; its
                             space is kept till then -->
                        <div class="muscles-week__map">
                            <ng-container #map />
                            <div class="muscles-week__map-space" aria-hidden="true">
                                <span class="muscles-week__figure-space"></span>
                                <span class="muscles-week__figure-space"></span>
                            </div>
                        </div>
                    </ng-template>
                    <ng-template appSlide="Muscle list">
                        <div class="muscles-week__list">
                            <ng-container #list />
                        </div>
                    </ng-template>
                </app-carousel>
                <!-- Room kept for the button, so the bars don't move as a muscle's picked -->
                <div class="muscles-week__pick" aria-live="polite">
                    @if (picked(); as picked) {
                        <a
                            class="btn-pill muscles-week__exercises"
                            [href]="picked.url"
                            (click)="slide.follow($event, picked.url, 'in')"
                        >
                            Exercises for {{ picked.label }}
                            <app-icon>chevron_right</app-icon>
                        </a>
                    } @else {
                        <p class="muscles-week__hint">Tap a muscle to find exercises for it</p>
                    }
                </div>
                @if (compact()) {
                    <a class="btn-pill muscles-week__more" routerLink="/history">
                        <app-icon>insights</app-icon>
                        See this week's progress
                        <app-icon>chevron_right</app-icon>
                    </a>
                } @else {
                    <app-muscle-bars
                        class="muscles-week__bars"
                        [balance]="musclesWorked().balance"
                        [selected]="selected()"
                        (muscleTapped)="pick($event)"
                    />
                }
            </section>
        }
    `,
    styleUrl: './muscles-this-week.component.scss',
})
export class MusclesThisWeekComponent {
    /** Just the body map, with a link to the bars on Progress (Today). */
    readonly compact = input(false);

    private readonly history = inject(ShownHistory);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    protected readonly slide = inject(PageSlide);
    private readonly now = Date.now();
    protected readonly id = `muscles-week-title-${nextId++}`;

    /** Sets per muscle in the last seven days. */
    private readonly weekSets = computed(() =>
        setsByMuscle(inLastSevenDays(this.history.entries(), this.now), (id) =>
            this.exercises.byId(id)
        )
    );

    /**
     * A muscle with a set or more shades as main on the body map, under that as supporting;
     * the bars go most worked first.
     */
    protected readonly musclesWorked = computed(() => {
        const balance = muscleBalance(this.weekSets(), this.settings.weeklySets());
        return {
            hasData: this.weekSets().size > 0,
            main: balance.filter(({ sets }) => sets >= 1).map(({ muscle }) => muscle),
            supporting: balance
                .filter(({ sets }) => sets > 0 && sets < 1)
                .map(({ muscle }) => muscle),
            balance,
        };
    });

    /** The muscle picked on the map, the list or the bars, or null. */
    protected readonly selected = signal<MuscleGroup | null>(null);

    /** The picked muscle's name, and the Exercises list cut down to it, with ‹ back here. */
    protected readonly picked = computed(() => {
        const muscle = this.selected();
        return muscle === null
            ? null
            : {
                  label: MUSCLE_LABELS[muscle],
                  url: `/exercises?muscles=${muscle}&from=${this.compact() ? 'home' : 'history'}`,
              };
    });

    /** Picks `muscle`, or unpicks it if it's picked. */
    protected pick(muscle: MuscleGroup) {
        this.selected.update((picked) => (picked === muscle ? null : muscle));
    }

    /** The body map, made in `#map` once there's something to show on it, and its list in `#list`. */
    private readonly mapSlot = viewChild('map', { read: ViewContainerRef });
    private readonly listSlot = viewChild('list', { read: ViewContainerRef });

    constructor() {
        const show = (slot: typeof this.mapSlot, inputs: Record<string, unknown>) =>
            lazyComponent<BodyMapComponent>({
                load: loadBodyMap,
                slot,
                when: () => this.musclesWorked().hasData,
                inputs: () => {
                    const { main, supporting } = this.musclesWorked();
                    return { main, supporting, selected: this.selected(), ...inputs };
                },
                made: (ref) => ref.instance.muscleTapped.subscribe((muscle) => this.pick(muscle)),
            });
        show(this.mapSlot, { figureOnly: true, tappable: true });
        show(this.listSlot, { listOnly: true, selectable: true });
    }
}
