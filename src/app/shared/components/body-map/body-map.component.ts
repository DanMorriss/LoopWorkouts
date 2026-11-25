import { Component, computed, inject, input, output, signal } from '@angular/core';
import { PageSlide } from '../../navigation/page-slide';
import { MUSCLE_LABELS, MuscleGroup } from '../../../models/exercise';
import { SettingsStore } from '../../state/settings-store.service';
import { BODY_FIGURES } from './body-shapes';

/** How a shape is shaded: by how hard its muscle works, or not at all (head, hands, feet). */
type Shade = 'main' | 'supporting' | 'idle' | 'other';

let nextId = 0;

/**
 * Which muscles an exercise works (EXR-8): a front and back figure, shaded bright for the
 * main muscles and darker for supporting ones, with the muscles listed underneath. The list
 * is the figure's key and says the same in words, so screen readers get that, not the drawing.
 * The figure is male or female, as chosen in settings (SET-5).
 *
 * With `tappable`, tapping a muscle on the figure says which it was, for picking muscles
 * with (the editor's chips do the same for keyboards and screen readers). With `toggles` as
 * well, each muscle is a toggle button for keyboards and screen readers too, pressed when
 * it's main: for a filter, where tapping turns a muscle on or off (the Exercises list).
 * `removableLabels` gives each listed muscle a remove button. `figureOnly` leaves the list
 * out, for showing the figure itself (the setup's choice of body), and `listOnly` the figure,
 * where something else draws it (an exercise's 3D demo). `linksFrom` makes each
 * listed muscle a link to exercises for it (the Plan page). `selectable` makes each a toggle
 * instead, and `selected` rings one muscle on the figure and presses it in the list, for
 * picking a muscle shown in several places at once (the muscles worked this week).
 */
@Component({
    selector: 'app-body-map',
    templateUrl: './body-map.component.html',
    styleUrl: './body-map.component.scss',
})
export class BodyMapComponent {
    /** The muscles doing most of the work. */
    readonly main = input<readonly MuscleGroup[]>([]);
    /** Muscles that help or hold steady. A muscle in both counts as main. */
    readonly supporting = input<readonly MuscleGroup[]>([]);
    readonly tappable = input(false);
    readonly toggles = input(false);
    readonly removableLabels = input(false);
    readonly figureOnly = input(false);
    /**
     * What's said under the figure while no muscles are listed: "No muscles listed." for an
     * exercise's, or a hint for a map that's there to pick muscles on.
     */
    readonly emptyText = input('No muscles listed.');
    readonly listOnly = input(false);
    /**
     * Each listed muscle a link to the Exercises list cut down to it, which slides in over the
     * page it names (`?from=`, e.g. `plan`), with ‹ back to it. Null for none.
     */
    readonly linksFrom = input<string | null>(null);
    /**
     * The muscle picked elsewhere on the page, ringed on the figure and pressed in the list
     * (Progress and Today's muscles this week), or null.
     */
    readonly selected = input<MuscleGroup | null>(null);
    /** Each listed muscle a toggle, pressed while it's `selected`, saying it was tapped. */
    readonly selectable = input(false);
    /** What the two lists are headed, e.g. "Aim reached" and "Under aim" for a week's sets. */
    readonly headings = input({ main: 'Main', supporting: 'Supporting' });
    protected readonly slide = inject(PageSlide);

    /** The Exercises list cut down to `muscle`, opened from `from`. */
    protected exercisesUrl(muscle: MuscleGroup, from: string): string {
        return `/exercises?muscles=${muscle}&from=${encodeURIComponent(from)}`;
    }
    readonly muscleTapped = output<MuscleGroup>();
    readonly muscleCleared = output<MuscleGroup>();

    private readonly settings = inject(SettingsStore);
    protected readonly id = `body-map-${nextId++}`;
    protected readonly hoveredMuscle = signal<MuscleGroup | null>(null);
    /** The muscle a finger, pen or mouse button is down on, ringed as a hovered one is. */
    protected readonly pressedMuscle = signal<MuscleGroup | null>(null);

    protected readonly sides = computed(() => {
        const figure = BODY_FIGURES[this.settings.bodyFigure()];
        const main = new Set(this.main());
        const supporting = new Set(this.supporting());
        const shadeOf = (muscle: MuscleGroup | null): Shade => {
            if (muscle === null) {
                return 'other';
            }
            if (main.has(muscle)) {
                return 'main';
            }
            return supporting.has(muscle) ? 'supporting' : 'idle';
        };
        return (['front', 'back'] as const).map((side) => ({
            name: side === 'front' ? 'Front' : 'Back',
            viewBox: figure[side].viewBox,
            outline: figure[side].outline,
            shapes: figure[side].shapes.map((shape) => ({
                muscle: shape.muscle,
                shade: shadeOf(shape.muscle),
                paths: shape.paths,
            })),
        }));
    });

    /** The listed muscles, main then supporting, each once; none with `figureOnly`. */
    protected readonly groups = computed(() => {
        if (this.figureOnly()) {
            return [];
        }
        const main = [...new Set(this.main())];
        const supporting = [...new Set(this.supporting())].filter(
            (muscle) => !main.includes(muscle)
        );
        return [
            { kind: 'main', heading: this.headings().main, muscles: main },
            { kind: 'supporting', heading: this.headings().supporting, muscles: supporting },
        ].filter(({ muscles }) => muscles.length > 0);
    });

    protected muscleLabel(muscle: MuscleGroup): string {
        return MUSCLE_LABELS[muscle];
    }

    protected toggleByKey(event: KeyboardEvent, muscle: MuscleGroup | null): void {
        if (!this.toggles() || muscle === null || (event.key !== 'Enter' && event.key !== ' ')) {
            return;
        }
        event.preventDefault();
        this.muscleTapped.emit(muscle);
    }

    protected tapMuscle(muscle: MuscleGroup | null): void {
        if (!this.tappable() || muscle === null) {
            return;
        }
        this.muscleTapped.emit(muscle);
    }

    protected clearMuscle(muscle: MuscleGroup): void {
        if (!this.removableLabels()) {
            return;
        }
        this.muscleCleared.emit(muscle);
    }

    protected setHover(muscle: MuscleGroup | null): void {
        if (!this.tappable()) {
            return;
        }
        this.hoveredMuscle.set(muscle);
    }

    /** A muscle's toggle focused rings it, as a mouse over it does. */
    protected focusShape(event: FocusEvent): void {
        const muscle = (event.target as Element).getAttribute('data-muscle');
        this.setHover(muscle as MuscleGroup | null);
    }

    /**
     * A mouse over a muscle rings it. Only a mouse: a finger's tap would otherwise leave it
     * ringed until the next tap elsewhere, as a touch screen's :hover sticks.
     */
    protected pointerOver(event: PointerEvent, muscle: MuscleGroup | null): void {
        if (event.pointerType === 'mouse') {
            this.setHover(muscle);
        }
    }

    protected pointerOff(): void {
        this.setHover(null);
        this.pressedMuscle.set(null);
    }

    /** Rings the muscle the moment it's pressed, before the tap lands, as a button lights up. */
    protected press(event: PointerEvent, muscle: MuscleGroup | null): void {
        if (this.tappable() && muscle !== null && event.isPrimary) {
            this.pressedMuscle.set(muscle);
        }
    }
}
