import { Component, computed, input } from '@angular/core';
import { MuscleGroup } from '../../../models/exercise';
import {
    drawFigure,
    ExerciseMotion,
    motionBox,
    muscleTone,
    PlacedPart,
    Point,
    Pose,
} from '../../../models/exercise-motion';
import { flatPose } from '../../../models/exercise-skeleton';

/**
 * The figure of an exercise's demo in one pose (EXR-13), drawn as the body map is: a
 * silhouette with each muscle on it outlined and shaded, main and supporting, and the rest
 * left unworked. Every pose of a motion is drawn in the same box, so the figure doesn't jump
 * about as it moves. Hidden from screen readers: the how-to steps say the same in words.
 */
@Component({
    selector: 'app-exercise-figure',
    templateUrl: './exercise-figure.component.html',
    styleUrl: './exercise-figure.component.scss',
    host: { 'aria-hidden': 'true' },
})
export class ExerciseFigureComponent {
    readonly motion = input.required<ExerciseMotion>();
    readonly pose = input.required<Pose>();
    readonly main = input<readonly MuscleGroup[]>([]);
    readonly supporting = input<readonly MuscleGroup[]>([]);

    protected readonly box = computed(() => motionBox(this.motion(), flatPose));
    protected readonly viewBox = computed(() => {
        const box = this.box();
        return `${box.x} ${box.y} ${box.width} ${box.height}`;
    });
    protected readonly layers = computed(() => {
        const layers = drawFigure(this.pose(), this.motion(), flatPose);
        return [
            { name: 'kit', items: layers.kit },
            { name: 'far', items: layers.far },
            { name: 'body', items: layers.body },
            { name: 'near', items: layers.near },
        ];
    });

    protected toneOf(muscle: MuscleGroup | null): string {
        return muscleTone(muscle, this.main(), this.supporting());
    }

    protected pointsOf(points: readonly Point[]): string {
        return points.map((point) => point.join(',')).join(' ');
    }

    /** Moves a part's drawing into place: see `placePoint()`. */
    protected transformOf(part: PlacedPart): string {
        const turn = `translate(${part.at[0]} ${part.at[1]}) rotate(${-part.angle})`;
        const stretch = part.stretch ?? 1;
        return part.mirror || stretch !== 1
            ? `${turn} scale(${part.mirror ? -1 : 1} ${stretch})`
            : turn;
    }
}
